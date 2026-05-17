/**
 * RACEMENT POS Sync - GitHub Actions용
 * 로그인 후 스크린샷 + 패시브 리스너 + 메뉴 폴백
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
  if (res.status !== 200 && res.status !== 201) throw new Error(`GitHub 실패: ${res.status}`);
}

async function uploadDebugFile(name, content) {
  const path = `/repos/${CONFIG.ghOwner}/${CONFIG.ghRepo}/contents/debug/${name}`;
  const cur = await ghRequest('GET', path).catch(() => ({ status: 404 }));
  const sha = cur.status === 200 ? cur.body.sha : undefined;
  const txt = (content && content.length > 0) ? content : `(empty ${new Date().toISOString()})`;
  await ghRequest('PUT', path, {
    message: `debug: ${name}`,
    content: Buffer.from(typeof txt === 'string' ? txt : JSON.stringify(txt)).toString('base64'),
    branch: CONFIG.ghBranch, ...(sha && { sha })
  }).catch(e => log(`debug 업로드 실패: ${e.message}`));
}

async function uploadScreenshot(name, page) {
  try {
    const buf = await page.screenshot({ fullPage: false });
    await uploadDebugFile(name, buf.toString('base64'));
    // base64이므로 별도 처리 필요 없음 (uploadDebugFile이 다시 base64 encode함 → 이중 인코딩 방지)
    const path = `/repos/${CONFIG.ghOwner}/${CONFIG.ghRepo}/contents/debug/${name}`;
    const cur = await ghRequest('GET', path).catch(() => ({ status: 404 }));
    const sha = cur.status === 200 ? cur.body.sha : undefined;
    await ghRequest('PUT', path, {
      message: `debug: ${name}`,
      content: buf.toString('base64'),
      branch: CONFIG.ghBranch, ...(sha && { sha })
    }).catch(() => {});
  } catch(e) { log(`스크린샷 실패: ${e.message}`); }
}

function parseItems(d, todayItems, debugLog) {
  const items = d.dlt_item || d.dltItem || d.items || d.list || [];
  debugLog.push(`  items: ${items.length}개 / keys: ${Object.keys(d).join(',')}`);
  if (items[0]) debugLog.push(`  첫아이템: ${JSON.stringify(items[0]).substring(0, 150)}`);
  let cnt = 0;
  for (const item of items) {
    if (item.NSALES_YN === 'Y') continue;
    const nm = item.ITEM_NM || item.itemNm || item.ITEM_NAME || '';
    const m = nm.match(/\[([^\],]+),\s*([^\]]+)\]/);
    if (!m) continue;
    const code = m[1].trim(), size = m[2].trim();
    const qty = Math.abs(parseInt(item.SALES_QTY || item.salesQty) || 1);
    if (!todayItems[code]) todayItems[code] = {};
    if (!todayItems[code][size]) todayItems[code][size] = 0;
    todayItems[code][size] += qty;
    cnt++;
  }
  debugLog.push(`  파싱 성공: ${cnt}건`);
}

async function fetchPOSSales() {
  const debugLog = [`시작: ${new Date().toISOString()}`];
  const todayItems = {};
  let tradeNos = [];
  let itemCallCount = 0;
  const itemPromises = [];

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  debugLog.push('브라우저 OK');

  try {
    const context = await browser.newContext({
      locale: 'ko-KR',
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // ── 패시브 리스너 (body 없이 URL + 상태만 기록) ──
    page.on('response', response => {
      const url = response.url();
      if (url.includes('selTodaySalesList') || url.includes('selItemSalesList') ||
          url.includes('/main/login') || url.includes('/main/init')) {
        debugLog.push(`[RES] ${response.status()} ${url.split('/').slice(-1)[0]}`);
      }
      // selTodaySalesList: Promise로 body 읽기
      if (url.includes('selTodaySalesList')) {
        const p = response.json().then(d => {
          tradeNos = (d.dlt_result || []).map(t => t.TRADE_NO);
          debugLog.push(`selTodaySalesList: ${tradeNos.length}건`);
          log(`selTodaySalesList: ${tradeNos.length}건`);
        }).catch(e => debugLog.push(`selTodaySalesList json 실패: ${e.message}`));
        itemPromises.push(p);
      }
      if (url.includes('selItemSalesList')) {
        itemCallCount++;
        const p = response.json().then(d => {
          parseItems(d, todayItems, debugLog);
        }).catch(e => debugLog.push(`selItemSalesList json 실패: ${e.message}`));
        itemPromises.push(p);
      }
    });

    // ── 로그인 ──
    log('로그인 중...');
    await page.goto(CONFIG.posUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    debugLog.push(`goto OK: ${page.url()}`);

    await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(500);

    // ID 입력
    for (const sel of ['input[type="text"]', 'input:not([type="hidden"]):not([type="password"])']) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 2000 })) { await el.click(); await el.fill(CONFIG.posId); break; }
      } catch(e) {}
    }
    await page.locator('input[type="password"]').first().fill(CONFIG.posPw);
    debugLog.push('폼 입력 완료');
    await page.keyboard.press('Enter');
    log('Enter 입력');

    // ── 로그인 완료 대기 (최대 20초) ──
    await Promise.race([
      page.waitForResponse(r => r.url().includes('/main/init'), { timeout: 20000 }),
      page.waitForTimeout(20000)
    ]).catch(() => {});
    await page.waitForTimeout(3000);

    debugLog.push(`로그인 후 URL: ${page.url()}`);
    log(`현재 URL: ${page.url()}`);

    // 스크린샷 (로그인 직후)
    await uploadScreenshot('after_login.png', page);
    debugLog.push('스크린샷 업로드');

    // ── selTodaySalesList가 안 왔으면 메뉴 직접 클릭 시도 ──
    if (tradeNos.length === 0) {
      debugLog.push('자동 로드 없음 → 메뉴 클릭 시도');
      // 모든 프레임에서 시도
      for (const frame of page.frames()) {
        try { await frame.locator('text=영업').first().click({ force: true, timeout: 3000 }); debugLog.push('영업 클릭'); } catch(e) {}
      }
      await page.waitForTimeout(2000);
      for (const frame of page.frames()) {
        try { await frame.locator('text=영업 속보').first().click({ force: true, timeout: 3000 }); debugLog.push('영업속보 클릭'); } catch(e) {}
      }
      await page.waitForTimeout(2000);

      // 당일매출조회 클릭
      for (const frame of page.frames()) {
        const res = await frame.evaluate(() => {
          const el = document.getElementById('mf_wfm_side_gen_menu2_0_gen_menu3_2_btn_menu3');
          if (el) {
            let e = el;
            while (e && e !== document.body) { e.style.display='block'; e.style.visibility='visible'; e.style.opacity='1'; e=e.parentElement; }
            el.click(); return '클릭OK(ID)';
          }
          for (const a of document.querySelectorAll('a,span,td,button,li')) {
            if (a.textContent.trim() === '당일매출조회') { a.click(); return `클릭OK(${a.tagName})`; }
          }
          return null;
        }).catch(() => null);
        if (res) debugLog.push(`[${frame.url().split('/').pop().slice(0,20)}] ${res}`);
      }

      // 추가 대기
      await page.waitForTimeout(10000);
      await uploadScreenshot('after_menu_click.png', page);
      debugLog.push(`메뉴 클릭 후 거래: ${tradeNos.length}건`);
    }

    log(`거래 ${tradeNos.length}건 / 품번 ${Object.keys(todayItems).length}개`);

    // ── 나머지 행 클릭 ──
    if (tradeNos.length > 1) {
      const tableInfo = await page.evaluate(() =>
        Array.from(document.querySelectorAll('table')).map((t, i) => ({
          i, rows: t.querySelectorAll('tbody tr').length,
          ths: t.querySelectorAll('thead th,thead td').length
        }))
      );
      const main = tableInfo.find(t => t.ths >= 4 && t.rows >= 1)
                 || tableInfo.reduce((b, t) => (!b || t.rows > b.rows) ? t : b, null);
      const mainIdx = main?.i ?? 0;
      const bbox = await page.locator('table').nth(mainIdx).locator('tbody tr').nth(0).boundingBox().catch(() => null);
      if (bbox) {
        await page.mouse.click(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
        await page.waitForTimeout(800);
      }
      for (let i = 1; i < tradeNos.length; i++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(700);
      }
    }

    await Promise.all(itemPromises);
    debugLog.push(`완료: 품번 ${Object.keys(todayItems).length}개`);
    log(`수집 완료: ${Object.keys(todayItems).length}개 품번`);

  } finally {
    await uploadDebugFile('parse_debug.txt', debugLog.join('\n'));
    await browser.close();
  }
  return todayItems;
}

(async () => {
  log('=== POS 동기화 시작 ===');
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
        history.items[code][dateKey][size] = { '부산(김종훈)': qty };
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
    log(`완료! ${codes.length}품번 / ${total}개`);
    process.exit(0);
  } catch(err) {
    log(`오류: ${err.message}`);
    await uploadDebugFile('error_log.txt', `${new Date().toISOString()}\n${err.message}\n${err.stack||''}`);
    process.exit(1);
  }
})();
