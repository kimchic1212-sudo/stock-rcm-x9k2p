/**
 * RACEMENT POS Sync - GitHub Actions용
 * page.waitForResponse 방식 - 가장 안정적
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
  const txt = (content && content.length > 0) ? content : `(empty at ${new Date().toISOString()})`;
  await ghRequest('PUT', path, {
    message: `debug: ${name} ${new Date().toISOString()}`,
    content: Buffer.from(txt).toString('base64'),
    branch: CONFIG.ghBranch, ...(sha && { sha })
  }).catch(e => log(`debug 업로드 실패: ${e.message}`));
}

function parseItems(d, todayItems, debugLog) {
  const items = d.dlt_item || d.dltItem || d.items || d.list || [];
  debugLog.push(`  items: ${items.length}개 / keys: ${Object.keys(d).join(',')}`);
  if (items[0]) debugLog.push(`  첫아이템: ${JSON.stringify(items[0]).substring(0, 200)}`);
  for (const item of items) {
    if (item.NSALES_YN === 'Y') continue;
    const nm = item.ITEM_NM || item.itemNm || item.ITEM_NAME || '';
    const m = nm.match(/\[([^\],]+),\s*([^\]]+)\]/);
    if (!m) { if(nm) debugLog.push(`  불일치: "${nm}"`); continue; }
    const code = m[1].trim(), size = m[2].trim();
    const qty = Math.abs(parseInt(item.SALES_QTY || item.salesQty) || 1);
    if (!todayItems[code]) todayItems[code] = {};
    if (!todayItems[code][size]) todayItems[code][size] = 0;
    todayItems[code][size] += qty;
    debugLog.push(`  수집: ${code}/${size}/${qty}`);
  }
}

async function fetchPOSSales() {
  const debugLog = [`시작: ${new Date().toISOString()}`];

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  debugLog.push('브라우저 시작 OK');

  try {
    const context = await browser.newContext({
      locale: 'ko-KR',
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    debugLog.push('페이지 생성 OK');

    const todayItems = {};
    let tradeNos = [];

    // ── 로그인 ──
    log('로그인 중...');
    await page.goto(CONFIG.posUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    debugLog.push(`goto OK: ${page.url()}`);

    await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(300);

    for (const sel of ['input[type="text"]', 'input:not([type="hidden"]):not([type="password"])']) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 2000 })) { await el.click(); await el.fill(CONFIG.posId); break; }
      } catch(e) {}
    }
    await page.locator('input[type="password"]').first().fill(CONFIG.posPw);

    // Enter 전에 selTodaySalesList waitForResponse 등록 (자동 로드 대비)
    const salesListPromise = page.waitForResponse(
      resp => resp.url().includes('selTodaySalesList'),
      { timeout: 35000 }
    );
    const firstItemPromise = page.waitForResponse(
      resp => resp.url().includes('selItemSalesList'),
      { timeout: 35000 }
    );

    debugLog.push('waitForResponse 등록 완료 → Enter');
    await page.keyboard.press('Enter');
    log('로그인 Enter 입력');

    // selTodaySalesList 응답 대기
    let salesResp;
    try {
      salesResp = await salesListPromise;
      debugLog.push(`selTodaySalesList 응답: status=${salesResp.status()} url=${salesResp.url()}`);
      const salesData = await salesResp.json();
      tradeNos = (salesData.dlt_result || []).map(t => t.TRADE_NO);
      debugLog.push(`거래수: ${tradeNos.length}`);
      if (salesData.dlt_result && salesData.dlt_result[0]) {
        debugLog.push(`첫거래: ${JSON.stringify(salesData.dlt_result[0])}`);
      }
      log(`selTodaySalesList: ${tradeNos.length}건`);
    } catch(e) {
      debugLog.push(`selTodaySalesList 실패: ${e.message}`);
      log(`selTodaySalesList 실패: ${e.message}`);
    }

    // 첫 번째 selItemSalesList 응답 대기
    try {
      const firstItem = await firstItemPromise;
      debugLog.push(`selItemSalesList #1 응답: status=${firstItem.status()}`);
      const d = await firstItem.json();
      parseItems(d, todayItems, debugLog);
    } catch(e) {
      debugLog.push(`selItemSalesList #1 실패: ${e.message}`);
    }

    log(`현재: 거래 ${tradeNos.length}건 / 품번 ${Object.keys(todayItems).length}개`);

    // ── 나머지 행 클릭 (2번째 거래부터) ──
    if (tradeNos.length > 1) {
      debugLog.push(`행 클릭 시작 (${tradeNos.length - 1}회)`);
      const tableInfo = await page.evaluate(() =>
        Array.from(document.querySelectorAll('table')).map((t, i) => ({
          i, rows: t.querySelectorAll('tbody tr').length,
          ths: t.querySelectorAll('thead th,thead td').length
        }))
      );
      debugLog.push(`tables: ${JSON.stringify(tableInfo)}`);

      const main = tableInfo.find(t => t.ths >= 4 && t.rows >= 1)
                 || tableInfo.reduce((b, t) => (!b || t.rows > b.rows) ? t : b, null);
      const mainIdx = main?.i ?? 0;
      const rowsLoc = page.locator('table').nth(mainIdx).locator('tbody tr');
      const bbox = await rowsLoc.nth(0).boundingBox().catch(() => null);
      if (bbox) {
        await page.mouse.click(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
        await page.waitForTimeout(500);
      }

      for (let i = 1; i < tradeNos.length; i++) {
        const nextItemPromise = page.waitForResponse(
          resp => resp.url().includes('selItemSalesList'),
          { timeout: 4000 }
        );
        await page.keyboard.press('ArrowDown');
        try {
          const resp = await nextItemPromise;
          const d = await resp.json();
          parseItems(d, todayItems, debugLog);
        } catch(e) {
          debugLog.push(`  행 ${i} 응답 실패: ${e.message}`);
        }
      }
    }

    debugLog.push(`완료: 품번 ${Object.keys(todayItems).length}개`);
    log(`수집 완료: ${Object.keys(todayItems).length}개 품번`);

    await uploadDebugFile('parse_debug.txt', debugLog.join('\n'));
    log(`디버그 업로드 (${debugLog.length}줄)`);

    return todayItems;

  } finally {
    await browser.close();
  }
}

(async () => {
  log('=== POS 동기화 시작 ===');
  const debugLog = [];
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
    log(`완료! ${codes.length}품번 / ${total}개`);
    process.exit(0);
  } catch(err) {
    log(`오류: ${err.message}`);
    console.error(err.stack || err);
    // 에러 내용도 디버그 파일에 기록
    await uploadDebugFile('error_log.txt', `${new Date().toISOString()}\n${err.message}\n${err.stack||''}`);
    process.exit(1);
  }
})();
