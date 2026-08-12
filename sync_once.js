/**
 * RACEMENT POS Sync - GitHub Actions용
 * 로그인 후 스크린샷 + 패시브 리스너 + 메뉴 폴백
 * 로그인 연속 실패 감지 시 자동으로 스스로 멈춤 (계정 잠김 방지)
 */
const { chromium } = require('playwright');
const https = require('https');

const CONFIG = {
  posUrl:   'https://cloudposoffice.shinsegae.com/',
  posId:    process.env.POS_ID    || '001001',
  posPw:    process.env.POS_PW    || '',
  // 2026-07-29: 판매데이터가 비공개 저장소로 이전됨 — 기본 github.token은 자기 저장소(공개)만 쓸 수 있어
  // 별도 시크릿(DATA_REPO_PAT, stock-rcm-data 쓰기 권한 포함)을 사용
  ghToken:  process.env.DATA_REPO_PAT || process.env.GITHUB_TOKEN || '',
  ghOwner:  'kimchic1212-sudo',
  ghRepo:   'stock-rcm-data',
  ghBranch: 'main',
  salesFile:'sales_history.json',
  statusFile:'sync_status.json',
  // 워크플로우 자체(공개 저장소)를 끄려면 그 저장소 권한이 필요 — github.token으로 충분(같은 저장소)
  wfOwner:  'kimchic1212-sudo',
  wfRepo:   'stock-rcm-x9k2p',
  wfToken:  process.env.GITHUB_TOKEN || '',
  wfFile:   'pos_sync.yml',
  maxConsecutiveFailures: 3,
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

function ghRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com', path, method,
      headers: {
        Authorization: `Bearer ${token || CONFIG.ghToken}`,
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

// GitHub Contents API는 응답 본문이 1MB 넘으면 content를 비워서 돌려줌(encoding:"none")
// → download_url(인증 필요, private repo)로 원문을 직접 받아옴
function fetchRawUrl(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { Authorization: `Bearer ${token || CONFIG.ghToken}`, 'User-Agent': 'RACEMENT-GHA' }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end();
  });
}

async function loadSalesHistory() {
  const res = await ghRequest('GET', `/repos/${CONFIG.ghOwner}/${CONFIG.ghRepo}/contents/${CONFIG.salesFile}`);
  if (res.status !== 200) return { data: { meta: {}, items: {} }, sha: null };
  if (!res.body.content && res.body.download_url) {
    const raw = await fetchRawUrl(res.body.download_url);
    return { data: JSON.parse(raw), sha: res.body.sha };
  }
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

async function loadSyncStatus() {
  const res = await ghRequest('GET', `/repos/${CONFIG.ghOwner}/${CONFIG.ghRepo}/contents/${CONFIG.statusFile}`);
  if (res.status !== 200) return { data: { consecutiveFailures: 0, locked: false }, sha: null };
  try {
    return { data: JSON.parse(Buffer.from(res.body.content, 'base64').toString('utf8')), sha: res.body.sha };
  } catch(e) {
    return { data: { consecutiveFailures: 0, locked: false }, sha: res.body.sha };
  }
}

async function saveSyncStatus(data, sha) {
  const res = await ghRequest('PUT', `/repos/${CONFIG.ghOwner}/${CONFIG.ghRepo}/contents/${CONFIG.statusFile}`, {
    message: `sync-status: ${new Date().toLocaleString()}`,
    content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
    branch: CONFIG.ghBranch, ...(sha && { sha })
  });
  if (res.status !== 200 && res.status !== 201) log(`상태 저장 실패: ${res.status}`);
}

async function disableSyncWorkflow(reason) {
  try {
    const wfRes = await ghRequest('GET', `/repos/${CONFIG.wfOwner}/${CONFIG.wfRepo}/actions/workflows/${CONFIG.wfFile}`, null, CONFIG.wfToken);
    const wfId = wfRes.body && wfRes.body.id;
    if (!wfId) { log(`워크플로우 ID 조회 실패: ${JSON.stringify(wfRes.body).slice(0,150)}`); return false; }
    const disRes = await ghRequest('PUT', `/repos/${CONFIG.wfOwner}/${CONFIG.wfRepo}/actions/workflows/${wfId}/disable`, null, CONFIG.wfToken);
    log(`워크플로우 자동 비활성화 (${reason}): status=${disRes.status}`);
    return disRes.status === 204;
  } catch(e) {
    log(`워크플로우 비활성화 실패: ${e.message}`);
    return false;
  }
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
    const rawQty = parseInt(item.SALES_QTY || item.salesQty);
    // NaN만 제외. 음수(반품)는 그대로 합산해 당일 순매출에서 자동 차감되도록 함
    if (!rawQty && rawQty !== 0) continue;
    if (rawQty === 0) continue;
    const qty = rawQty;
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
  let dialogMsg = null;

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

    // 네이티브 alert/confirm 창 — 메시지만 기록하고 자동으로 닫아서 스크립트가 멈추지 않게 함
    page.on('dialog', async (dialog) => {
      dialogMsg = dialog.message();
      debugLog.push(`[DIALOG] ${dialogMsg}`);
      await dialog.accept().catch(() => {});
    });

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

    // ── 로그인 실패 판정: 알림창 메시지 또는 비밀번호 입력칸이 여전히 보이면 실패 ──
    const pwStillVisible = await page.locator('input[type="password"]').first().isVisible().catch(() => false);
    const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
    const lockKeywords = ['차단', '잠금', '연속 실패', '비밀번호가 일치하지'];
    const lockHit = lockKeywords.find(k => (dialogMsg || '').includes(k) || bodyText.includes(k));
    const loginFailed = pwStillVisible || !!lockHit;

    if (loginFailed) {
      debugLog.push(`로그인 실패 감지 — dialog:"${dialogMsg||''}" pwVisible:${pwStillVisible} keyword:"${lockHit||''}"`);
      return { todayItems: {}, loginFailed: true, failReason: dialogMsg || lockHit || '비밀번호 입력칸이 로그인 시도 후에도 그대로 남아있음' };
    }

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
  return { todayItems, loginFailed: false };
}

(async () => {
  log('=== POS 동기화 시작 ===');
  const { data: status, sha: statusSha } = await loadSyncStatus();

  try {
    const { todayItems, loginFailed, failReason } = await fetchPOSSales();

    if (loginFailed) {
      const failCount = (status.consecutiveFailures || 0) + 1;
      log(`로그인 실패 (연속 ${failCount}회): ${failReason}`);

      if (failCount >= CONFIG.maxConsecutiveFailures) {
        await disableSyncWorkflow(`로그인 ${failCount}회 연속 실패`);
        await saveSyncStatus({
          consecutiveFailures: failCount,
          locked: true,
          lockedAt: new Date().toISOString(),
          reason: failReason,
          message: `POS 자동 로그인이 ${failCount}회 연속 실패해서 동기화를 자동으로 멈췄습니다. 비밀번호를 확인하고 GitHub에서 워크플로우를 다시 켜주세요.`,
        }, statusSha);
        log('연속 실패 한도 도달 — 워크플로우 정지, 상태 기록 완료');
      } else {
        await saveSyncStatus({
          ...status,
          consecutiveFailures: failCount,
          locked: false,
          lastFailAt: new Date().toISOString(),
          reason: failReason,
        }, statusSha);
      }
      process.exit(0); // 실패를 GHA 자체 실패로 만들지 않음 — 별도 상태 파일로만 추적
    }

    // 로그인 성공 — 실패 카운터 리셋
    if ((status.consecutiveFailures || 0) > 0 || status.locked) {
      await saveSyncStatus({ consecutiveFailures: 0, locked: false, recoveredAt: new Date().toISOString() }, statusSha);
    }

    const codes = Object.keys(todayItems);
    if (codes.length === 0) { log('판매 없음'); process.exit(0); }

    const { data: history, sha } = await loadSalesHistory();
    if (!history.items) history.items = {};
    const dateKey = todayKey();

    for (const [code, sizes] of Object.entries(todayItems)) {
      if (!history.items[code]) history.items[code] = {};
      history.items[code][dateKey] = {};
      for (const [size, qty] of Object.entries(sizes)) {
        // 반품이 판매보다 많아 순수량이 0 이하면 오늘 판매 없음으로 처리 (음수로 남기지 않음)
        if (qty > 0) history.items[code][dateKey][size] = { '부산(김종훈)': qty };
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
