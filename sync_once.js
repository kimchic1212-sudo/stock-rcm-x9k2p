/**
 * RACEMENT POS Sync - GitHub Actions용
 * 발견: 로그인 후 sla003m(당일매출조회) 자동 로드됨 → 메뉴 클릭 불필요
 * 목표: selItemSalesList 응답 내용 로깅 + 파싱 수정
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

async function uploadDebugFile(name, content, isBase64 = false) {
  const path = `/repos/${CONFIG.ghOwner}/${CONFIG.ghRepo}/contents/debug/${name}`;
  const cur = await ghRequest('GET', path).catch(() => ({ status: 404 }));
  const sha = cur.status === 200 ? cur.body.sha : undefined;
  await ghRequest('PUT', path, {
    message: `debug: ${name}`,
    content: isBase64 ? content : Buffer.from(content).toString('base64'),
    branch: CONFIG.ghBranch,
    ...(sha && { sha })
  }).catch(e => log(`  debug 업로드 실패: ${e.message}`));
}

async function fetchPOSSales() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
           '--disable-gpu', '--window-size=1920,1080']
  });
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
  const debugLog   = [];  // 파싱 디버그용

  page.on('response', async response => {
    const url = response.url();

    if (url.includes('selTodaySalesList')) {
      debugLog.push(`=== selTodaySalesList 응답 수신 (status: ${response.status()}) ===`);
      try {
        const text = await response.text();
        debugLog.push(`raw(200자): ${text.substring(0, 200)}`);
        const d = JSON.parse(text);
        tradeNos = (d.dlt_result || []).map(t => t.TRADE_NO);
        log(`selTodaySalesList: 거래 ${tradeNos.length}건`);
        debugLog.push(`keys: ${Object.keys(d).join(', ')}`);
        debugLog.push(`거래수: ${tradeNos.length}`);
        if (d.dlt_result && d.dlt_result.length > 0) {
          debugLog.push(`첫번째 거래: ${JSON.stringify(d.dlt_result[0])}`);
        }
      } catch(e) {
        debugLog.push(`파싱 오류: ${e.message}`);
        log(`  selTodaySalesList 파싱 오류: ${e.message}`);
      }
    }

    if (url.includes('selItemSalesList')) {
      apiCallCount++;
      const callNum = apiCallCount;
      debugLog.push(`=== selItemSalesList #${callNum} 응답 수신 (status: ${response.status()}) ===`);
      const p = (async () => {
        try {
          const text = await response.text();
          debugLog.push(`raw(200자): ${text.substring(0, 200)}`);
          const d = JSON.parse(text);
          const items = d.dlt_item || d.dltItem || d.items || d.list || [];
          debugLog.push(`keys: ${Object.keys(d).join(', ')}`);
          debugLog.push(`items 배열 길이: ${items.length}`);
          if (items.length > 0) {
            debugLog.push(`첫번째 아이템: ${JSON.stringify(items[0])}`);
          }
          for (const item of items) {
            if (item.NSALES_YN === 'Y') continue;
            const nm = item.ITEM_NM || item.itemNm || item.ITEM_NAME || item.itemName || '';
            debugLog.push(`  ITEM_NM: "${nm}" / NSALES_YN: ${item.NSALES_YN} / SALES_QTY: ${item.SALES_QTY}`);
            const m = nm.match(/\[([^\],]+),\s*([^\]]+)\]/);
            if (!m) { debugLog.push(`    → 정규식 불일치`); continue; }
            const code = m[1].trim(), size = m[2].trim();
            const qty  = Math.abs(parseInt(item.SALES_QTY || item.salesQty) || 1);
            if (!todayItems[code])       todayItems[code] = {};
            if (!todayItems[code][size]) todayItems[code][size] = 0;
            todayItems[code][size] += qty;
            debugLog.push(`    → 수집: ${code} / ${size} / ${qty}개`);
          }
        } catch(e) {
          debugLog.push(`오류: ${e.message}`);
        }
      })();
      pending.push(p);
    }
  });

  try {
    // ── 로그인 ──
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

    // ── 로그인 후 sla003m 자동 로드 대기 ──
    // 발견: 로그인 후 당일매출조회 페이지(sla003m)가 자동 로드됨
    log('sla003m 자동 로드 대기...');
    await Promise.race([
      page.waitForResponse(r => r.url().includes('selTodaySalesList'), { timeout: 25000 }),
      page.waitForTimeout(25000)
    ]).catch(() => {});

    log(`로그인+자동로드 완료. 거래 ${tradeNos.length}건`);

    // ── 첫 selItemSalesList도 대기 ──
    await Promise.race([
      page.waitForResponse(r => r.url().includes('selItemSalesList'), { timeout: 10000 }),
      page.waitForTimeout(10000)
    ]).catch(() => {});
    await page.waitForTimeout(1000);

    // ── 행 순차 클릭 (나머지 거래 수집) ──
    const totalRows = tradeNos.length;
    log(`행 클릭 시작: ${totalRows}건`);

    if (totalRows > 1) {
      // 테이블 첫 행 클릭해서 포커스 잡기
      const tableInfo = await page.evaluate(() =>
        Array.from(document.querySelectorAll('table')).map((t, i) => ({
          i, ths: t.querySelectorAll('thead th,thead td').length,
          rows: t.querySelectorAll('tbody tr').length
        }))
      );
      debugLog.push(`tables: ${JSON.stringify(tableInfo)}`);
      const main = tableInfo.find(t => t.ths >= 4 && t.rows >= 1)
                 || tableInfo.reduce((b, t) => (!b || t.rows > b.rows) ? t : b, null);
      const mainIdx = main?.i ?? 0;

      const rowsLoc = page.locator('table').nth(mainIdx).locator('tbody tr');
      const bbox    = await rowsLoc.nth(0).boundingBox().catch(() => null);
      if (bbox) {
        await page.mouse.click(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
        log('  첫 행 클릭');
        await page.waitForTimeout(1000);
      }
      for (let i = 1; i < totalRows; i++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(700);
      }
    }

    await Promise.all(pending);
    await uploadDebugFile('parse_debug.txt', debugLog.join('\n'));
    log(`수집 완료: API ${apiCallCount}회 / ${Object.keys(todayItems).length}개 품번`);
    log(`파싱 디버그 → debug/parse_debug.txt 업로드 완료`);

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
