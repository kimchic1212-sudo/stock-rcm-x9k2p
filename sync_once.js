/**
 * RACEMENT POS Sync - GitHub Actions용 (1회 실행 후 종료)
 * POS_ID, POS_PW, GITHUB_TOKEN 은 GitHub Secrets에서 주입
 */
const { chromium } = require('playwright');
const https = require('https');

const CONFIG = {
  posUrl:   'https://cloudposoffice.shinsegae.com/',
  posId:    process.env.POS_ID    || '001001',
  posPw:    process.env.POS_PW    || '',
  ghToken:  process.env.GITHUB_TOKEN || '',
  ghOwner:  'kimchic1212-sudo',
  ghRepo:   'stock-rcm-x9k2p',
  ghBranch: 'main',
  salesFile:'sales_history.json',
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

function ghRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com', path, method,
      headers: {
        Authorization: `Bearer ${CONFIG.ghToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'RACEMENT-GHA',
        ...(bodyStr && { 'Content-Length': Buffer.byteLength(bodyStr) })
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function loadSalesHistory() {
  const res = await ghRequest('GET', `/repos/${CONFIG.ghOwner}/${CONFIG.ghRepo}/contents/${CONFIG.salesFile}`);
  if (res.status !== 200) return { data: { meta: {}, items: {} }, sha: null };
  return { data: JSON.parse(Buffer.from(res.body.content, 'base64').toString('utf8')), sha: res.body.sha };
}

async function uploadSalesHistory(data, sha) {
  const res = await ghRequest('PUT', `/repos/${CONFIG.ghOwner}/${CONFIG.ghRepo}/contents/${CONFIG.salesFile}`, {
    message: `sync: POS ${new Date().toLocaleString()}`,
    content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
    branch: CONFIG.ghBranch, ...(sha && { sha })
  });
  if (res.status !== 200 && res.status !== 201) throw new Error(`GitHub 실패: ${res.status} / ${JSON.stringify(res.body)}`);
}

async function fetchPOSSales() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({
    locale: 'ko-KR',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const todayItems = {};
  const pending    = [];
  let tradeNos     = [];
  let apiCallCount = 0;

  page.on('response', async response => {
    const url = response.url();
    // 디버그: 주요 API 요청 로깅
    if (url.includes('Pos') || url.includes('pos') || url.includes('Sale') || url.includes('sale')) {
      log(`  [API] ${url.split('/').slice(-1)[0].substring(0,60)}`);
    }
    if (url.includes('selTodaySalesList')) {
      try {
        const d = await response.json();
        tradeNos = (d.dlt_result || []).map(t => t.TRADE_NO);
        log(`거래번호 ${tradeNos.length}건`);
      } catch(e) { log(`  selTodaySalesList 파싱 오류: ${e.message}`); }
    }
    if (url.includes('selItemSalesList')) {
      apiCallCount++;
      const p = (async () => {
        try {
          const d = await response.json();
          for (const item of (d.dlt_item || [])) {
            if (item.NSALES_YN === 'Y') continue;
            const m = (item.ITEM_NM || '').match(/\[([^\],]+),\s*([^\]]+)\]/);
            if (!m) continue;
            const code = m[1].trim(), size = m[2].trim();
            const qty  = Math.abs(parseInt(item.SALES_QTY) || 1);
            if (!todayItems[code])       todayItems[code] = {};
            if (!todayItems[code][size]) todayItems[code][size] = 0;
            todayItems[code][size] += qty;
          }
        } catch(e) {}
      })();
      pending.push(p);
    }
  });

  try {
    log('로그인 중...');
    await page.goto(CONFIG.posUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(500);

    for (const sel of ['input[type="text"]', 'input:not([type="hidden"]):not([type="password"])']) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 2000 })) { await el.click(); await el.fill(CONFIG.posId); break; }
      } catch(e) {}
    }
    await page.locator('input[type="password"]').first().fill(CONFIG.posPw);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(8000);
    log('로그인 완료');

    await page.locator('text=영업').first().click({ force: true, timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await page.locator('text=영업 속보').first().click({ force: true, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const el = document.getElementById('mf_wfm_side_gen_menu2_0_gen_menu3_2_btn_menu3');
      if (el) {
        let e = el;
        while (e && e !== document.body) { e.style.display='block'; e.style.visibility='visible'; e.style.opacity='1'; e=e.parentElement; }
        el.click();
      } else {
        for (const a of document.querySelectorAll('a')) {
          if (a.textContent.trim() === '당일매출조회') { a.click(); break; }
        }
      }
    });
    // selTodaySalesList 응답 명시적 대기 (최대 15초)
    if(tradeNos.length === 0) {
      log('selTodaySalesList 대기 중...');
      await page.waitForResponse(r => r.url().includes('selTodaySalesList'), { timeout: 15000 })
        .then(async r => {
          try { const d = await r.json(); tradeNos = (d.dlt_result||[]).map(t=>t.TRADE_NO); } catch(e){}
        }).catch(() => log('  selTodaySalesList timeout - 0건으로 진행'));
    }
    await page.waitForTimeout(3000);
    log(`당일매출조회 완료 (${tradeNos.length}건)`);

    const tableInfo = await page.evaluate(() =>
      Array.from(document.querySelectorAll('table')).map((t, i) => ({
        i, ths: t.querySelectorAll('thead th,thead td').length,
        rows: t.querySelectorAll('tbody tr').length
      }))
    );
    const main = tableInfo.find(t => t.ths >= 8 && t.rows >= 1)
               || tableInfo.reduce((b, t) => (!b || t.ths > b.ths) ? t : b, null);
    const mainIdx   = main?.i ?? 0;
    const totalRows = tradeNos.length || (main?.rows || 0);

    const rowsLoc = page.locator('table').nth(mainIdx).locator('tbody tr');
    const bbox    = await rowsLoc.nth(0).boundingBox().catch(() => null);
    if (bbox) {
      await page.mouse.click(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
      await page.waitForTimeout(1000);
    }
    for (let i = 1; i < totalRows; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(800);
    }
    await Promise.all(pending);
    log(`수집 완료: API ${apiCallCount}회 / ${Object.keys(todayItems).length}개 품번`);
  } finally {
    await browser.close();
  }
  return todayItems;
}

(async () => {
  log('=== POS 동기화 시작 (GitHub Actions) ===');
  try {
    const todayItems = await fetchPOSSales();
    const codes = Object.keys(todayItems);
    if (codes.length === 0) { log('판매 없음'); process.exit(0); }

    const { data: history, sha } = await loadSalesHistory();
    if (!history.items) history.items = {};
    const dateKey = todayKey();

    for (const [code, sizes] of Object.entries(todayItems)) {
      if (!history.items[code]) history.items[code] = {};
      history.items[code][dateKey] = {};
      for (const [size, qty] of Object.entries(sizes)) {
        history.items[code][dateKey][size] = { '부산': qty };
      }
    }
    history.meta = {
      ...(history.meta || {}),
      lastSynced:   new Date().toISOString(),
      lastSyncDate: dateKey,
      syncSource:   'Spharos Cloud POS',
    };
    await uploadSalesHistory(history, sha);
    const total = Object.values(todayItems).reduce((s, sz) => s + Object.values(sz).reduce((a,b)=>a+b,0), 0);
    log(`완료! ${codes.length}품번 / ${total}개 -> GitHub 반영`);
    process.exit(0);
  } catch(err) {
    log(`오류: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
})();
