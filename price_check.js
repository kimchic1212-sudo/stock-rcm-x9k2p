// price_check.js — racement.co.kr 가격 변동 감지 → 텔레그램 알림
const https = require('https');
const fs = require('fs');

const CLIENT_ID = 'rc1WMJc07cwefntDdmOCoQ==';
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const PRICES_FILE = 'prices.json';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'clientId': CLIENT_ID, 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Parse error: ' + data.substring(0, 200))); }
      });
    }).on('error', reject);
  });
}

async function sendTelegram(text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => { res.resume(); resolve(); });
    req.on('error', e => { console.error('Telegram error:', e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

async function getAllProducts() {
  const all = [];
  let page = 1;
  while (true) {
    const data = await get(
      `https://shop-api.e-ncp.com/products?pageSize=100&pageNumber=${page}&hasTotalCount=true&saleStatusType=ON_SALE`
    );
    if (!data.items || data.items.length === 0) break;
    all.push(...data.items);
    console.log(`Fetched page ${page}: ${all.length}/${data.totalCount}`);
    if (all.length >= data.totalCount) break;
    page++;
  }
  return all;
}

function loadInventoryNos() {
  try {
    if (!fs.existsSync('inventory.json')) return null;
    const raw = fs.readFileSync('inventory.json', 'utf-8').trim();
    if (!raw || raw === '{}' || raw === '[]') return null;
    const inv = JSON.parse(raw);
    const rows = inv.rows || (Array.isArray(inv) ? inv : null);
    if (!rows || rows.length === 0) return null;
    const nos = new Set(
      rows.map(r => String(r['상품번호(샵바이)'] || r['shopNo'] || '')).filter(Boolean)
    );
    console.log(`Inventory filter: ${nos.size} products`);
    return nos;
  } catch(e) {
    console.log('inventory.json load failed:', e.message);
    return null;
  }
}

function formatPrice(n) {
  return Number(n).toLocaleString('ko-KR') + '원';
}

function discountStr(amt, type) {
  if (!amt || amt === 0) return '없음';
  return type === 'RATE' ? `-${amt}%` : `-${formatPrice(amt)}`;
}

async function main() {
  const prevPrices = fs.existsSync(PRICES_FILE)
    ? JSON.parse(fs.readFileSync(PRICES_FILE, 'utf-8'))
    : {};

  const inventoryNos = loadInventoryNos();
  const products = await getAllProducts();

  const newPrices = {};
  const changes = [];
  const isFirst = Object.keys(prevPrices).length === 0;

  for (const p of products) {
    const no = String(p.productNo);
    if (inventoryNos && !inventoryNos.has(no)) continue;

    const salePrice = p.salePrice || 0;
    const discountAmt = p.immediateDiscountAmt || 0;
    const discountType = p.immediateDiscountUnitType || 'RATE';

    newPrices[no] = {
      name: p.productName,
      salePrice,
      discountAmt,
      discountType,
      checkedAt: new Date().toISOString()
    };

    if (!isFirst && prevPrices[no]) {
      const prev = prevPrices[no];
      if (prev.salePrice !== salePrice || prev.discountAmt !== discountAmt) {
        changes.push({ name: p.productName, no, prev, cur: newPrices[no] });
      }
    }
  }

  // 가격 파일 저장
  fs.writeFileSync(PRICES_FILE, JSON.stringify(newPrices, null, 2), 'utf-8');
  console.log(`Checked ${Object.keys(newPrices).length} products | Changes: ${changes.length}`);

  if (isFirst) {
    console.log('First run — baseline saved, no notification sent.');
    return;
  }

  if (changes.length === 0) {
    console.log('No price changes.');
    return;
  }

  // 텔레그램 전송 (10개씩 묶어서)
  const KST = new Date(Date.now() + 9 * 3600 * 1000).toLocaleString('ko-KR', { timeZone: 'UTC' });
  let msg = `⚠️ <b>RACEMENT 가격 변동 감지</b>\n🕐 ${KST}\n\n`;

  for (const c of changes.slice(0, 15)) {
    const priceDiff = c.cur.salePrice - c.prev.salePrice;
    const arrow = priceDiff < 0 ? '🔻' : '🔺';
    msg += `${arrow} <b>${c.name}</b>\n`;
    msg += `  판매가: ${formatPrice(c.prev.salePrice)} → <b>${formatPrice(c.cur.salePrice)}</b>`;
    if (priceDiff !== 0) msg += ` (${priceDiff > 0 ? '+' : ''}${formatPrice(priceDiff)})`;
    msg += '\n';
    if (c.prev.discountAmt !== c.cur.discountAmt) {
      msg += `  할인: ${discountStr(c.prev.discountAmt, c.prev.discountType)} → <b>${discountStr(c.cur.discountAmt, c.cur.discountType)}</b>\n`;
    }
    msg += '\n';
  }

  if (changes.length > 15) {
    msg += `...외 ${changes.length - 15}개 상품 추가 변동\n`;
  }

  await sendTelegram(msg);
  console.log('Telegram notification sent.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
