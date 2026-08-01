/**
 * price_sync.js — racement.co.kr 공홈 할인가를 재고조회시스템 "기획전" 레이어에 자동 반영
 *
 * 엑셀로 관리하는 inventory.json의 소비자가(정가)는 건드리지 않는다.
 * 대신 앱이 이미 갖고 있는 기획전(promotions.json) 메커니즘에 자동 생성 항목을
 * 하나 써서, 화면에는 "정가 대비 할인가"로 자동 표시되게 한다.
 * (기획전 우선순위: 이 자동 항목은 배열 맨 뒤에 붙여서, 관리자가 수동으로
 *  만든 기획전이 있으면 그게 항상 우선 적용되도록 함 — findPromoForCode가 첫 매치를 씀)
 */
const https = require('https');
const { chromium } = require('playwright');

const DATA_OWNER = 'kimchic1212-sudo';
const DATA_REPO  = 'stock-rcm-data';
const DATA_BRANCH = 'main';
const GH_TOKEN = process.env.DATA_REPO_PAT || process.env.GITHUB_TOKEN || '';
const AUTO_PROMO_ID = 'auto-price-sync';
const AUTO_PROMO_NAME = '공홈 가격 자동반영';
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
// 이전 대비 매칭 개수가 이 비율 밑으로 떨어지면 "스크래핑 실패"로 간주하고 저장을 건너뜀
// (예전 항목이 적으면 오탐 나기 쉬우니 최소 개수 이상일 때만 이 안전장치 적용)
const DROP_GUARD_RATIO = 0.5;
const DROP_GUARD_MIN_PREV = 20;

function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

function sendTelegram(text) {
  return new Promise((resolve) => {
    if (!BOT_TOKEN || !CHAT_ID) { log('[Telegram skip] BOT_TOKEN/CHAT_ID 미설정'); resolve(); return; }
    const body = JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => { res.resume(); resolve(); });
    req.on('error', e => { console.error('[Telegram error]', e.message); resolve(); });
    req.write(body); req.end();
  });
}

function ghRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com', path, method,
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'RACEMENT-price-sync',
        ...(bodyStr && { 'Content-Length': Buffer.byteLength(bodyStr) })
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// 큰 파일(Contents API의 1MB 인라인 한도 초과)도 안전하게 읽기 위해 Git Blob API 사용
async function loadJsonFile(path) {
  const meta = await ghRequest('GET', `/repos/${DATA_OWNER}/${DATA_REPO}/contents/${path}`);
  if (meta.status !== 200) return { data: null, sha: null };
  if (meta.body.content) {
    return { data: JSON.parse(Buffer.from(meta.body.content, 'base64').toString('utf8')), sha: meta.body.sha };
  }
  const blob = await ghRequest('GET', `/repos/${DATA_OWNER}/${DATA_REPO}/git/blobs/${meta.body.sha}`);
  return { data: JSON.parse(Buffer.from(blob.body.content, blob.body.encoding).toString('utf8')), sha: meta.body.sha };
}

async function saveJsonFile(path, data, message) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { sha } = await loadJsonFile(path); // 매 시도마다 최신 sha 재확인 (동시쓰기 대비)
    const res = await ghRequest('PUT', `/repos/${DATA_OWNER}/${DATA_REPO}/contents/${path}`, {
      message, branch: DATA_BRANCH,
      content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
      ...(sha && { sha }),
    });
    if (res.status === 200 || res.status === 201) return true;
    if (res.status === 409 || res.status === 422) { log(`저장 충돌(${res.status}), 재시도 ${attempt + 1}/3`); continue; }
    throw new Error(`GitHub 저장 실패: ${res.status} ${JSON.stringify(res.body)}`);
  }
  throw new Error('저장 실패: 재시도 초과');
}

// ── racement.co.kr CLEARANCE(SALE) 카테고리 전체 수집 (price_report.js와 동일 방식) ──
async function getDiscountedProducts() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const all = [];

  async function fetchPage(pageNum) {
    const page = await browser.newPage();
    let items = [], total = 0;
    await page.route('**/products/search**', async route => {
      let url = route.request().url();
      url = url.replace(/pageSize=\d+/, 'pageSize=100').replace(/pageNumber=\d+/, `pageNumber=${pageNum}`);
      if (!url.includes('hasTotalCount')) url += '&hasTotalCount=true';
      await route.continue({ url });
    });
    await new Promise(resolve => {
      page.on('response', async resp => {
        if (resp.url().includes('products/search') && resp.url().includes('categoryNos=933747')) {
          try {
            const j = await resp.json();
            if (j.items) { items = j.items; total = j.totalCount || 0; resolve(); }
          } catch (e) {}
        }
      });
      page.goto('https://racement.co.kr/products?categoryNo=933747', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      setTimeout(resolve, 25000);
    });
    await page.close();
    log(`Page ${pageNum}: ${items.length} / ${total}`);
    return { items, total };
  }

  const first = await fetchPage(1);
  all.push(...first.items);
  const totalPages = Math.ceil(first.total / 100);
  for (let p = 2; p <= totalPages; p++) {
    const { items } = await fetchPage(p);
    all.push(...items);
  }

  await browser.close();
  const unique = Object.values(all.reduce((acc, p) => { acc[p.productNo] = p; return acc; }, {}));
  return unique.filter(p => p.immediateDiscountAmt > 0);
}

async function main() {
  if (!GH_TOKEN) throw new Error('DATA_REPO_PAT(또는 GITHUB_TOKEN) 미설정');

  log('inventory.json 로드 중...');
  const { data: inv } = await loadJsonFile('inventory.json');
  if (!inv || !inv.rows) throw new Error('inventory.json 로드 실패');

  // 상품번호(샵바이) → 품번 매핑 (한 품번에 사이즈별로 여러 행이 있지만 샵바이번호는 동일)
  const shopNoToCode = new Map();
  for (const r of inv.rows) {
    const shopNo = String(r['상품번호(샵바이)'] || '').trim();
    const code = String(r['품번'] || '').trim();
    if (shopNo && code && !shopNoToCode.has(shopNo)) shopNoToCode.set(shopNo, code);
  }
  log(`재고 상품 매핑: ${shopNoToCode.size}개 품번 (샵바이번호 보유)`);

  log('공홈 할인 상품 수집 중...');
  const discounted = await getDiscountedProducts();
  log(`공홈 할인 상품: ${discounted.length}개`);

  const items = {};
  let matched = 0;
  for (const p of discounted) {
    const code = shopNoToCode.get(String(p.productNo));
    if (!code) continue;
    const finalPrice = p.salePrice - p.immediateDiscountAmt;
    if (finalPrice <= 0) continue;
    items[code] = {
      targetCat: '', weeklyPrice: null, weeklyRate: 0,
      finalPrice, finalRate: 0,
      eventPrice: null, eventRate: 0, couponRate: 0,
    };
    matched++;
  }
  log(`재고 매칭 성공: ${matched}개 품번 → 자동 기획전 반영`);

  log('promotions.json 로드 중 (이전 결과와 비교용)...');
  const { data: promoData } = await loadJsonFile('promotions.json');
  const promotions = (promoData && Array.isArray(promoData.promotions)) ? promoData.promotions : [];
  const prevAuto = promotions.find(pr => pr.id === AUTO_PROMO_ID);
  const prevCount = prevAuto ? Object.keys(prevAuto.items || {}).length : 0;
  log(`이전 자동반영 품번 수: ${prevCount}개`);

  // ── 안전장치: 스크래핑이 일부만 되거나 실패해서 매칭 개수가 급감하면,
  //    잘 반영되던 할인가들이 전부 정가로 되돌아가는 "역행"을 막기 위해 저장을 건너뜀 ──
  if (prevCount >= DROP_GUARD_MIN_PREV && matched < prevCount * DROP_GUARD_RATIO) {
    const warnMsg = `⚠️ <b>가격 자동동기화 건너뜀</b>\n이전 ${prevCount}개 → 이번 ${matched}개로 급감 (공홈 스크래핑 실패 의심)\n기존 할인가는 그대로 유지했습니다. 확인이 필요합니다.`;
    log(`[SKIP] 이전(${prevCount}) 대비 급감(${matched}) — 저장 건너뜀, 기존 데이터 유지`);
    await sendTelegram(warnMsg);
    process.exit(1);
  }

  if (process.env.DRY_RUN) {
    log('[DRY_RUN] 저장 생략. 계산된 항목 일부:');
    console.log(JSON.stringify(Object.fromEntries(Object.entries(items).slice(0, 5)), null, 2));
    return;
  }

  log('promotions.json 갱신 중...');
  const withoutAuto = promotions.filter(pr => pr.id !== AUTO_PROMO_ID);
  const autoPromo = {
    id: AUTO_PROMO_ID,
    meta: { name: AUTO_PROMO_NAME, period: '' },
    items,
  };
  // 맨 뒤에 추가 — 관리자가 수동으로 만든 기획전이 같은 품번을 갖고 있으면 그쪽이 우선 적용됨
  const nextPromotions = matched > 0 ? [...withoutAuto, autoPromo] : withoutAuto;

  await saveJsonFile('promotions.json', { promotions: nextPromotions },
    `price_sync: 공홈 가격 자동반영 (${matched}개, ${new Date().toISOString()})`);

  log(`완료! ${matched}개 품번 자동 할인가 반영됨`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
