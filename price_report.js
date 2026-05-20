// price_report.js — 현재 할인 현황 요약 → 텔레그램 발송 (즉시 or 변동분)
const https = require('https');
const fs = require('fs');

const CLIENT_ID = 'rc1WMJc07cwefntDdmOCoQ==';
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const MODE = process.env.REPORT_MODE || 'summary'; // 'summary' | 'changes'
const PRICES_FILE = 'prices.json';

// ── 카테고리 매핑 ──────────────────────────────────────────
// depth1: FOOTWEAR=846976, APPAREL=846977, ACC=846978
// depth2 NEW: 신발=933689, 의류=933690, 용품=933691
const CAT_MAP = {};
// FOOTWEAR 관련 카테고리 IDs
[846976,933689,847004,847005,847001,847000,847002,861070,847003,
 847007,847006,847008,877608,847009,847010,847011,847012].forEach(id => CAT_MAP[id] = '신발');
// APPAREL 관련
[846977,933690,847039,847046,847040,847041,847042,847043,847044,
 847045,847047,847048,847049,847050,847060,847065].forEach(id => CAT_MAP[id] = '의류');
// ACC 관련
[846978,933691,847174,847175,847176,847087,847088,847089,847090].forEach(id => CAT_MAP[id] = '용품');

function getCategory(displayCategoryNos) {
  if (!displayCategoryNos) return '기타';
  const ids = String(displayCategoryNos).split('|').map(Number);
  for (const id of ids) {
    if (CAT_MAP[id]) return CAT_MAP[id];
  }
  return '기타';
}

// ── API 헬퍼 ───────────────────────────────────────────────
function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'clientId': CLIENT_ID, 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

async function sendTelegram(text) {
  if (!BOT_TOKEN || !CHAT_ID) { console.log('[Telegram skip] no token/chat_id'); return; }
  // 4096자 초과 시 분할 발송
  const chunks = [];
  while (text.length > 0) { chunks.push(text.slice(0, 4000)); text = text.slice(4000); }
  for (const chunk of chunks) {
    await new Promise(resolve => {
      const body = JSON.stringify({ chat_id: CHAT_ID, text: chunk, parse_mode: 'HTML' });
      const req = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }, res => { res.resume(); resolve(); });
      req.on('error', e => { console.error('Telegram error:', e.message); resolve(); });
      req.write(body); req.end();
    });
  }
}

// ── 전체 상품 수집 ─────────────────────────────────────────
async function getAllProducts() {
  const all = [];
  let page = 1;
  while (true) {
    const data = await get(
      `https://shop-api.e-ncp.com/products?pageSize=100&pageNumber=${page}&hasTotalCount=true&saleStatusType=ON_SALE`
    );
    if (!data.items || data.items.length === 0) break;
    all.push(...data.items);
    process.stdout.write(`\rFetching products: ${all.length}/${data.totalCount || '?'}`);
    if (data.totalCount && all.length >= data.totalCount) break;
    page++;
  }
  console.log();
  return all;
}

// ── 숫자 포맷 ──────────────────────────────────────────────
function fmt(n) { return Number(n).toLocaleString('ko-KR') + '원'; }
function discPct(salePrice, discAmt) {
  if (!salePrice || !discAmt) return 0;
  return Math.round(discAmt / salePrice * 100);
}

// ── 요약 리포트 (즉시 발송용) ──────────────────────────────
async function sendSummaryReport(products) {
  const discounted = products.filter(p => p.immediateDiscountAmt > 0);
  if (discounted.length === 0) {
    await sendTelegram('ℹ️ 현재 할인 중인 상품이 없습니다.');
    return;
  }

  // 카테고리별 그룹핑
  const byCat = { '신발': {}, '의류': {}, '용품': {}, '기타': {} };
  for (const p of discounted) {
    const cat = getCategory(p.displayCategoryNos);
    const pct = discPct(p.salePrice, p.immediateDiscountAmt);
    const key = `${pct}%`;
    if (!byCat[cat][key]) byCat[cat][key] = [];
    byCat[cat][key].push(p);
  }

  const KST = new Date(Date.now() + 9*3600*1000).toISOString().replace('T',' ').slice(0,16);
  let msg = `🏷️ <b>RACEMENT 현재 할인 현황</b>\n📅 ${KST} 기준\n총 ${discounted.length}개 상품\n`;

  const catOrder = ['신발','의류','용품','기타'];
  for (const cat of catOrder) {
    const byPct = byCat[cat];
    const pcts = Object.keys(byPct).sort((a,b)=>parseInt(a)-parseInt(b));
    if (pcts.length === 0) continue;

    const catEmoji = { '신발':'👟', '의류':'👕', '용품':'🎒', '기타':'📦' }[cat];
    msg += `\n━━━━━━━━━━━━━━━━\n${catEmoji} <b>${cat}</b>\n`;

    for (const pct of pcts) {
      const items = byPct[pct];
      msg += `\n🔸 <b>${pct} 할인</b> (${items.length}개)\n`;
      for (const p of items) {
        const origPrice = p.salePrice;
        const discPrice = origPrice - p.immediateDiscountAmt;
        msg += `  • ${p.productName}\n    ${fmt(origPrice)} → <b>${fmt(discPrice)}</b>\n`;
      }
    }
  }

  await sendTelegram(msg);
  console.log(`Summary sent: ${discounted.length} discounted products`);
}

// ── 변동 리포트 (매일 체크용) ─────────────────────────────
async function sendChangesReport(products) {
  const prevPrices = fs.existsSync(PRICES_FILE)
    ? JSON.parse(fs.readFileSync(PRICES_FILE, 'utf-8'))
    : {};

  const newPrices = {};
  const newDisc = [], removedDisc = [], changedDisc = [];

  for (const p of products) {
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
        changedDisc.push({
          p,
          prevPct: discPct(prev.salePrice, prev.discAmt),
          newPct: discPct(salePrice, discAmt),
          prevPrice: prev.salePrice - prev.discAmt,
          newPrice: salePrice - discAmt,
        });
      }
    }
  }

  // prices.json 저장
  fs.writeFileSync(PRICES_FILE, JSON.stringify(newPrices, null, 2), 'utf-8');

  const total = newDisc.length + removedDisc.length + changedDisc.length;
  if (total === 0) {
    console.log('No discount changes today.');
    return;
  }

  const KST = new Date(Date.now() + 9*3600*1000).toISOString().replace('T',' ').slice(0,16);
  let msg = `⚠️ <b>RACEMENT 가격 변동 알림</b>\n📅 ${KST}\n총 ${total}개 항목 변동\n`;

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
      msg += `  • ${p.productName} (${prevPct}% 할인 종료)\n`;
    });
  }

  await sendTelegram(msg);
  console.log(`Changes report sent: ${total} changes`);
}

// ── 메인 ──────────────────────────────────────────────────
async function main() {
  console.log(`Mode: ${MODE}`);
  const products = await getAllProducts();
  console.log(`Total products: ${products.length}`);

  if (MODE === 'summary') {
    await sendSummaryReport(products);
  } else {
    await sendChangesReport(products);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
