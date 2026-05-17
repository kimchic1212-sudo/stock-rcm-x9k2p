/**
 * RACEMENT POS Sync - GitHub Actions용
 * 이중 캡처: page.route(fn) + page.on('response') 동시 사용
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
  const txt = content && content.length > 0 ? content : '(empty)';
  await ghRequest('PUT', path, {
    message: `debug: ${name} ${new Date().toISOString()}`,
    content: Buffer.from(txt).toString('base64'),
    branch: CONFIG.ghBranch, ...(sha && { sha })
  }).catch(e => log(`debug 업로드 실패: ${e.message}`));
}

async function fetchPOSSales() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const context = await browser.newContext({
    locale: 'ko-KR',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const todayItems = {};
  let tradeNos = [];
  let apiCallCount = 0;
  const debugLog = [];
  const allBodyPromises = [];

  debugLog.push(`시작: ${new Date().toISOString()}`);

  // ── 방법 1: page.route() - 함수 형태로 URL 매칭 ──
  await page.route(url => url.includes('selTodaySalesList'), async route => {
    debugLog.push(`[ROUTE] selTodaySalesList 인터셉트`);
    try {
      const resp = await route.fetch();
      const body = await resp.text();
      debugLog.push(`[ROUTE] status=${resp.status()} len=${body.length}`);
      debugLog.push(`[ROUTE] raw: ${body.substring(0, 200)}`);
      try {
        const d = JSON.parse(body);
        tradeNos = (d.dlt_result || []).map(t => t.TRADE_NO);
        debugLog.push(`[ROUTE] 거래수: ${tradeNos.length}`);
      } catch(pe) { debugLog.push(`[ROUTE] JSON 파싱 실패: ${pe.message}`); }
      await route.fulfill({ response: resp });
    } catch(e) {
      debugLog.push(`[ROUTE] 오류: ${e.message}`);
      await route.continue();
    }
  });

  await page.route(url => url.includes('selItemSalesList'), async route => {
    apiCallCount++;
    const n = apiCallCount;
    debugLog.push(`[ROUTE] selItemSalesList #${n} 인터셉트`);
    const p = (async () => {
      try {
        const resp = await route.fetch();
        const body = await resp.text();
        debugLog.push(`[ROUTE#${n}] status=${resp.status()} len=${body.length}`);
        debugLog.push(`[ROUTE#${n}] raw: ${body.substring(0, 200)}`);
        try {
          const d = JSON.parse(body);
          const items = d.dlt_item || d.dltItem || d.items || d.list || [];
          debugLog.push(`[ROUTE#${n}] keys=${Object.keys(d).join(',')} items=${items.length}`);
          if (items[0]) debugLog.push(`[ROUTE#${n}] 첫아이템: ${JSON.stringify(items[0])}`);
          for (const item of items) {
            if (item.NSALES_YN === 'Y') continue;
            const nm = item.ITEM_NM || item.itemNm || item.ITEM_NAME || '';
            const m = nm.match(/\[([^\],]+),\s*([^\]]+)\]/);
            if (!m) { debugLog.push(`  불일치: "${nm}"`); continue; }
            const code = m[1].trim(), size = m[2].trim();
            const qty = Math.abs(parseInt(item.SALES_QTY || item.salesQty) || 1);
            if (!todayItems[code]) todayItems[code] = {};
            if (!todayItems[code][size]) todayItems[code][size] = 0;
            todayItems[code][size] += qty;
            debugLog.push(`  수집: ${code}/${size}/${qty}`);
          }
        } catch(pe) { debugLog.push(`[ROUTE#${n}] JSON 실패: ${pe.message}`); }
        await route.fulfill({ response: resp });
      } catch(e) {
        debugLog.push(`[ROUTE#${n}] 오류: ${e.message}`);
        await route.continue();
      }
    })();
    allBodyPromises.push(p);
  });

  // ── 방법 2: page.on('response') - 백업으로 동시 사용 ──
  // route()가 안 잡히면 이쪽에서 잡힘
  page.on('response', response => {
    const url = response.url();
    // 모든 POST 응답 로그
    if (response.request().method() === 'POST') {
      debugLog.push(`[RES-POST] ${response.status()} ${url.split('/').slice(-1)[0]}`);
    }
    if (url.includes('selTodaySalesList')) {
      debugLog.push(`[RES] selTodaySalesList fired`);
      const p = response.json()
        .then(d => {
          if (tradeNos.length === 0) { // route()가 이미 처리 안 한 경우만
            tradeNos = (d.dlt_result || []).map(t => t.TRADE_NO);
            debugLog.push(`[RES] 거래: ${tradeNos.length}건`);
          }
        })
        .catch(e => debugLog.push(`[RES] json 실패: ${e.message}`));
      allBodyPromises.push(p);
    }
    if (url.includes('selItemSalesList')) {
      debugLog.push(`[RES] selItemSalesList fired`);
    }
  });

  try {
    log('로그인 중...');
    debugLog.push('goto 시작');
    await page.goto(CONFIG.posUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    debugLog.push('goto 완료');

    await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(500);

    for (const sel of ['input[type="text"]', 'input:not([type="hidden"]):not([type="password"])']) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 2000 })) { await el.click(); await el.fill(CONFIG.posId); break; }
      } catch(e) {}
    }
    await page.locator('input[type="password"]').first().fill(CONFIG.posPw);
    debugLog.push('로그인 Enter 전');
    await page.keyboard.press('Enter');

    // 페이지 자동 전환 + sla003m 로드 대기
    log('자동 로드 대기 (20초)...');
    await page.waitForTimeout(20000);

    debugLog.push(`대기 완료: 거래=${tradeNos.length} apiCall=${apiCallCount}`);
    log(`자동로드 완료: 거래 ${tradeNos.length}건 / API ${apiCallCount}회`);

    // 현재 URL 확인
    debugLog.push(`현재 URL: ${page.url()}`);

    // 나머지 행 클릭
    if (tradeNos.length > 1) {
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
        await page.waitForTimeout(800);
      }
      for (let i = 1; i < tradeNos.length; i++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(700);
      }
      await page.waitForTimeout(2000);
    }

    await Promise.all(allBodyPromises);
    log(`수집 완료: ${Object.keys(todayItems).length}개 품번`);

  } catch(e) {
    debugLog.push(`오류: ${e.message}`);
    log(`오류: ${e.message}`);
  } finally {
    debugLog.push(`종료: 총 ${debugLog.length}줄`);
    await uploadDebugFile('parse_debug.txt', debugLog.join('\n'));
    log(`디버그 업로드 (${debugLog.length}줄)`);
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
    process.exit(1);
  }
})();
