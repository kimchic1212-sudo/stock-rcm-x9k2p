// price_report.js — 현재 할인 현황 요약 → 텔레그램 발송 (즉시 or 변동분)
const https = require('https');
const fs = require('fs');
const { chromium } = require('playwright');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const MODE = process.env.REPORT_MODE || 'summary'; // 'summary' | 'changes'
const PRICES_FILE = 'prices.json';

// ── 카테고리 매핑 ──────────────────────────────────────────
const CAT_MAP = {};
[846976,933689,847004,847005,847001,847000,847002,861070,847003,
 847007,847006,847008,877608,847009,847010,847011,847012].forEach(id => CAT_MAP[id]='신발');
[846977,933690,847039,847046,847040,847041,847042,847043,847044,
 847045,847047,847048,847049,847050,847060,847065].forEach(id => CAT_MAP[id]='의류');
[846978,933691,847174,847175,847176,847087,847088,847089,847090].forEach(id => CAT_MAP[id]='용품');

function getCategory(displayCategoryNos) {
  if (!displayCategoryNos) return '기타';
  const ids = String(displayCategoryNos).split('|').map(Number);
  for (const id of ids) { if (CAT_MAP[id]) return CAT_MAP[id]; }
  return '기타';
}

// ── 텔레그램 발송 ──────────────────────────────────────────
async function sendTelegram(text) {
  if (!BOT_TOKEN || !CHAT_ID) { console.log('[Telegram skip] no token/chat_id'); return; }
  const chunks = [];
  let t = text;
  while (t.length > 0) { chunks.push(t.slice(0, 4000)); t = t.slice(4000); }
  for (const chunk of chunks) {
    await new Promise(resolve => {
      const body = JSON.stringify({ chat_id: CHAT_ID, text: chunk, parse_mode: 'HTML' });
      const req = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }, res => { res.resume(); resolve(); });
      req.on('error', e => { console.error('Telegram:', e.message); resolve(); });
      req.write(body); req.end();
    });
    await new Promise(r => setTimeout(r, 300));
  }
}

// ── Playwright로 전체 상품 수집 ────────────────────────────
async function getAllProducts() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const all = [];

  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('e-ncp.com/products') && url.includes('pageSize') && !url.includes('review') && !url.includes('inquir') && !url.includes('coupon')) {
      try {
        const json = await resp.json();
        if (json.items && json.items.length > 0 && json.totalCount > 0) {
          all.push(...json.items);
          process.stdout.write(`\rProducts collected: ${all.length}/${json.totalCount}`);
        }
      } catch(e) {}
    }
  });

  // 메인 페이지 로드 → 첫 배치 수집
  await page.goto('https://racement.co.kr/products', { waitUntil: 'networkidle', timeout: 30000 }).catch(()=>{});

  // 추가 페이지 API 직접 호출 (중복 제거용 map 사용)
  const seen = new Set(all.map(p => p.productNo));

  // SALE 카테고리 전용 수집 (할인 상품 확실히 포함)
  await page.goto('https://racement.co.kr/products?categoryNo=933747', { waitUntil: 'networkidle', timeout: 30000 }).catch(()=>{});

  await browser.close();
  console.log(`\nTotal unique collected: ${all.length}`);
  return all;
}

// ── 숫자 포맷 ──────────────────────────────────────────────
function fmt(n) { return Number(n).toLocaleString('ko-KR') + '원'; }
function discPct(salePrice, discAmt) {
  if (!salePrice || !discAmt) return 0;
  return Math.round(discAmt / salePrice * 100);
}

// ── 요약 리포트 ────────────────────────────────────────────
async function sendSummaryReport(products) {
  // 중복 제거
  const unique = Object.values(
    products.reduce((acc, p) => { acc[p.productNo] = p; return acc; }, {})
  );
  const discounted = unique.filter(p => p.immediateDiscountAmt > 0);
  console.log(`Unique products: ${unique.length} | Discounted: ${discounted.length}`);

  if (discounted.length === 0) {
    await sendTelegram('ℹ️ 현재 할인 중인 상품이 없습니다.');
    return;
  }

  const byCat = { '신발': {}, '의류': {}, '용품': {}, '기타': {} };
  for (const p of discounted) {
    const cat = getCategory(p.displayCategoryNos);
    const pct = discPct(p.salePrice, p.immediateDiscountAmt);
    const key = `${pct}%`;
    if (!byCat[cat][key]) byCat[cat][key] = [];
    byCat[cat][key].push(p);
  }

  const KST = new Date(Date.now() + 9*3600*1000).toISOString().replace('T',' ').slice(0,16);
  let msg = `🏷️ <b>RACEMENT 현재 할인 현황</b>\n📅 ${KST} 기준 | 총 ${discounted.length}개 상품\n`;

  for (const [cat, byPct] of [['신발','👟'],['의류','👕'],['용품','🎒'],['기타','📦']].map(([c,e])=>[c,e,byCat[c]])) {
    const pctKeys = Object.keys(byPct).sort((a,b)=>parseInt(a)-parseInt(b));
    if (pctKeys.length === 0) continue;
    const emoji = { '신발':'👟', '의류':'👕', '용품':'🎒', '기타':'📦' }[cat];
    msg += `\n━━━━━━━━━━━━━━━\n${emoji} <b>${cat}</b>\n`;
    for (const pct of pctKeys) {
      const items = byPct[pct];
      msg += `\n🔸 <b>${pct} 할인</b> (${items.length}개)\n`;
      for (const p of items) {
        const discPrice = p.salePrice - p.immediateDiscountAmt;
        msg += `  • ${p.productName}\n    ${fmt(p.salePrice)} → <b>${fmt(discPrice)}</b>\n`;
      }
    }
  }

  await sendTelegram(msg);
  console.log('Summary sent!');
}

// ── 변동 리포트 ────────────────────────────────────────────
async function sendChangesReport(products) {
  const unique = Object.values(
    products.reduce((acc, p) => { acc[p.productNo] = p; return acc; }, {})
  );

  const prevPrices = fs.existsSync(PRICES_FILE)
    ? JSON.parse(fs.readFileSync(PRICES_FILE, 'utf-8')) : {};

  const newPrices = {};
  const newDisc=[], removedDisc=[], changedDisc=[];

  for (const p of unique) {
    const no = String(p.productNo);
    const salePrice = p.salePrice || 0;
    const discAmt = p.immediateDiscountAmt || 0;
    newPrices[no] = { name: p.productName, salePrice, discAmt, displayCategoryNos: p.displayCategoryNos, checkedAt: new Date().toISOString() };

    const prev = prevPrices[no];
    if (prev) {
      if (prev.discAmt === 0 && discAmt > 0) {
        newDisc.push({ p, pct: discPct(salePrice, discAmt) });
      } else if (prev.discAmt > 0 && discAmt === 0) {
        removedDisc.push({ p, prevPct: discPct(prev.salePrice, prev.discAmt) });
      } else if (prev.discAmt !== discAmt || prev.salePrice !== salePrice) {
        changedDisc.push({ p,
          prevPct: discPct(prev.salePrice, prev.discAmt),
          newPct: discPct(salePrice, discAmt),
          prevPrice: prev.salePrice - prev.discAmt,
          newPrice: salePrice - discAmt,
        });
      }
    }
  }

  fs.writeFileSync(PRICES_FILE, JSON.stringify(newPrices, null, 2), 'utf-8');

  const total = newDisc.length + removedDisc.length + changedDisc.length;
  if (total === 0) { console.log('No changes today.'); return; }

  const KST = new Date(Date.now() + 9*3600*1000).toISOString().replace('T',' ').slice(0,16);
  let msg = `⚠️ <b>RACEMENT 가격 변동 알림</b>\n📅 ${KST} | 총 ${total}개 변동\n`;

  if (newDisc.length > 0) {
    msg += `\n🔻 <b>신규 할인 시작</b> (${newDisc.length}개)\n`;
    newDisc.forEach(({p, pct}) => {
      msg += `  • ${p.productName}\n    ${fmt(p.salePrice)} → <b>${fmt(p.salePrice - p.immediateDiscountAmt)}</b> (-${pct}%)\n`;
    });
  }
  if (changedDisc.length > 0) {
    msg += `\n🔄 <b>할인율 변경</b> (${changedDisc.length}개)\n`;
    changedDisc.forEach(({p, prevPct, newPct, prevPrice, newPrice}) => {
      const arrow = newPct > prevPct ? '🔺' : '🔻';
      msg += `  ${arrow} ${p.productName}\n    ${prevPct}% → <b>${newPct}%</b>  (${fmt(prevPrice)} → <b>${fmt(newPrice)}</b>)\n`;
    });
  }
  if (removedDisc.length > 0) {
    msg += `\n✅ <b>할인 종료</b> (${removedDisc.length}개)\n`;
    removedDisc.forEach(({p, prevPct}) => {
      msg += `  • ${p.productName} (${prevPct}% 종료)\n`;
    });
  }

  await sendTelegram(msg);
  console.log(`Changes report sent: ${total} changes`);
}

// ── 메인 ──────────────────────────────────────────────────
async function main() {
  console.log(`Mode: ${MODE}`);
  const products = await getAllProducts();
  if (MODE === 'summary') await sendSummaryReport(products);
  else await sendChangesReport(products);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
