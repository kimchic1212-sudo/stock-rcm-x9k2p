/**
 * RACEMENT POS Sync - GitHub Actions용
 * 전략: 로그인 → 전체 요청 URL 캡처 → 직접 API 호출 시도
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

// GitHub에 디버그 스크린샷 업로드
async function uploadDebugFile(name, content, isBase64 = false) {
  const path = `/repos/${CONFIG.ghOwner}/${CONFIG.ghRepo}/contents/debug/${name}`;
  // 기존 sha 조회
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

  // ── 모든 요청/응답 URL 캡처 (디버그용) ──
  const capturedUrls = [];
  let salesApiUrl = null;   // selTodaySalesList의 실제 URL
  let salesApiBase = null;  // 기본 경로 (직접 호출용)

  page.on('request', req => {
    const u = req.url();
    if (!u.startsWith('data:') && !u.includes('.png') && !u.includes('.jpg') && !u.includes('.gif') && !u.includes('.woff')) {
      capturedUrls.push(`REQ ${req.method()} ${u}`);
    }
  });

  page.on('response', async response => {
    const url = response.url();
    capturedUrls.push(`RES ${response.status()} ${url}`);

    if (url.includes('selTodaySalesList')) {
      salesApiUrl = url;
      try {
        const d = await response.json();
        tradeNos = (d.dlt_result || []).map(t => t.TRADE_NO);
        log(`selTodaySalesList 캡처! 거래 ${tradeNos.length}건 / URL: ${url}`);
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
    // ── 1단계: 로그인 ──
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

    // 로그인 완료 대기 (index_left_nav 또는 10초)
    await Promise.race([
      page.waitForResponse(r => r.url().includes('index_left_nav'), { timeout: 20000 }),
      page.waitForTimeout(10000)
    ]).catch(() => {});
    await page.waitForTimeout(3000);
    log('로그인 완료');

    // ── 로그인 직후 스크린샷 ──
    const sc1 = await page.screenshot({ fullPage: false }).catch(() => null);
    if (sc1) await uploadDebugFile('after_login.png', sc1.toString('base64'), true);

    // ── 프레임 정보 로깅 ──
    for (const f of page.frames()) {
      const fu = f.url();
      log(`  Frame: ${fu.substring(0, 120)}`);
    }

    // ── 2단계: 쿠키 캡처 후 직접 API 호출 시도 ──
    const cookies = await context.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    log(`  쿠키 ${cookies.length}개 캡처`);

    // ── 3단계: 메뉴 클릭 (기존 방식) ──
    // 모든 프레임에서 영업 메뉴 시도
    for (const frame of page.frames()) {
      try { await frame.locator('text=영업').first().click({ force: true, timeout: 3000 }); log('  영업 클릭'); } catch(e) {}
    }
    await page.waitForTimeout(2000);
    for (const frame of page.frames()) {
      try { await frame.locator('text=영업 속보').first().click({ force: true, timeout: 3000 }); log('  영업속보 클릭'); } catch(e) {}
    }
    await page.waitForTimeout(2000);

    // 당일매출조회 클릭 함수
    const clickDailySales = async () => {
      for (const frame of page.frames()) {
        const res = await frame.evaluate(() => {
          const el = document.getElementById('mf_wfm_side_gen_menu2_0_gen_menu3_2_btn_menu3');
          if (el) {
            let e = el;
            while (e && e !== document.body) {
              e.style.display = 'block'; e.style.visibility = 'visible'; e.style.opacity = '1';
              e = e.parentElement;
            }
            el.click(); return '클릭OK(ID)';
          }
          for (const a of document.querySelectorAll('a,span,td,button,li')) {
            if (a.textContent.trim() === '당일매출조회') { a.click(); return `클릭OK(text:${a.tagName})`; }
          }
          // WebSquare 내부 함수 직접 호출 시도
          if (typeof wfm !== 'undefined') {
            try { wfm.getFrame('wfm_contents').loadURL('/PosMenuAction.do?method=selTodaySalesList'); return 'wfm시도'; } catch(e) {}
          }
          // 전체 텍스트 노드 스캔
          const all = Array.from(document.querySelectorAll('*')).filter(e => {
            const t = e.textContent.trim();
            return t === '당일매출조회' && e.children.length === 0;
          });
          if (all.length) { all[0].click(); return `클릭OK(scan:${all[0].tagName})`; }
          return null;
        }).catch(() => null);
        if (res) log(`  [${frame.url().split('/').pop().substring(0,30)}] ${res}`);
      }
    };

    await clickDailySales();

    // selTodaySalesList 최대 25초 대기
    log('selTodaySalesList 대기...');
    const gotSales = await page.waitForResponse(
      r => r.url().includes('selTodaySalesList'), { timeout: 25000 }
    ).then(async r => {
      try { const d = await r.json(); tradeNos = (d.dlt_result || []).map(t => t.TRADE_NO); return true; } catch(e) { return false; }
    }).catch(() => false);

    if (!gotSales) {
      log('  1차 실패 — 재시도...');
      await clickDailySales();
      await page.waitForResponse(
        r => r.url().includes('selTodaySalesList'), { timeout: 15000 }
      ).then(async r => {
        try { const d = await r.json(); tradeNos = (d.dlt_result || []).map(t => t.TRADE_NO); } catch(e) {}
      }).catch(() => {});
    }

    // ── 4단계: selTodaySalesList URL 캡처 실패시 page.evaluate로 직접 호출 ──
    if (tradeNos.length === 0) {
      log('  UI 방식 실패 — 직접 fetch 시도...');
      const posOrigin = new URL(CONFIG.posUrl).origin;

      // 캡처된 URL에서 API 패턴 추출
      const anyApiUrl = capturedUrls
        .filter(u => u.includes('REQ POST'))
        .map(u => u.replace('REQ POST ', '').trim())
        .find(u => u.includes(posOrigin) && !u.includes('.js') && !u.includes('.css'));

      log(`  후보 API URL: ${anyApiUrl || '없음'}`);

      // 공통 WebSquare URL 패턴 시도
      const directResult = await page.evaluate(async (origin) => {
        const candidates = [
          { url: origin + '/WiRES.action', type: 'form' },
          { url: origin + '/action.do', type: 'form' },
          { url: origin + '/PosMenuAction.do', type: 'form' },
          { url: origin + '/SalesReportAction.do', type: 'form' },
          { url: origin + '/CommonBizAction.do', type: 'form' },
        ];
        const params = [
          'SERVICE_ID=selTodaySalesList',
          'method=selTodaySalesList',
          'cmd=selTodaySalesList',
          'action=selTodaySalesList',
        ];
        for (const cand of candidates) {
          for (const p of params) {
            try {
              const r = await fetch(cand.url, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: p,
              });
              const txt = await r.text();
              if (txt.includes('TRADE_NO') || txt.includes('dlt_result')) {
                return { url: cand.url, param: p, data: txt.substring(0, 500) };
              }
            } catch(e) {}
          }
        }
        return null;
      }, posOrigin);

      if (directResult) {
        log(`  직접 호출 성공! URL: ${directResult.url} / param: ${directResult.param}`);
        try {
          const parsed = JSON.parse(directResult.data);
          tradeNos = (parsed.dlt_result || []).map(t => t.TRADE_NO);
          log(`  거래번호 ${tradeNos.length}건`);
        } catch(e) { log('  파싱 실패: ' + e.message); }
      } else {
        log('  직접 호출도 실패');
      }
    }

    // ── 5단계: 메뉴 클릭 후 스크린샷 ──
    const sc2 = await page.screenshot({ fullPage: false }).catch(() => null);
    if (sc2) await uploadDebugFile('after_menu_click.png', sc2.toString('base64'), true);

    // ── 6단계: 수집된 URL 로그 업로드 ──
    const urlLog = capturedUrls.slice(0, 200).join('\n');
    await uploadDebugFile('captured_urls.txt', urlLog);
    log(`캡처된 URL ${capturedUrls.length}개 → debug/captured_urls.txt 업로드`);

    await page.waitForTimeout(2000);
    log(`당일매출조회: 거래 ${tradeNos.length}건`);

    // ── 7단계: 행 순차 클릭 (거래별 상세 수집) ──
    if (tradeNos.length > 0) {
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
