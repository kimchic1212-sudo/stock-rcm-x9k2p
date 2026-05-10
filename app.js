/* ================================================================
   RACEMENT BUSAN - PREMIUM INVENTORY & ANALYTICS SYSTEM V3.0
   ================================================================ */

// 1. 전역 스타일 및 애니메이션 설정
const style = document.createElement('style');
style.innerHTML = `
    #uploadPanel, #settingsPanel, .modal-content { max-height: 85vh !important; overflow-y: auto !important; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    #detailModal { z-index: 9999 !important; }
    .card img { opacity: 0; transition: opacity 0.3s ease-in-out; }
    .card img.loaded { opacity: 1 !important; }
    /* 커스텀 스크롤바 디자인 */
    .custom-scroll::-webkit-scrollbar { width: 6px; }
    .custom-scroll::-webkit-scrollbar-track { background: transparent; }
    .custom-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
    .custom-scroll::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
`;
document.head.appendChild(style);

const ADMIN_PWD = "1212";
const SESSION_FLAG = "racement_admin_session";
const GH_CONFIG_KEY = "racement_gh_config_v1";
const GH_PAT_KEY = "racement_gh_pat_v1";
const CACHE_KEY = "racement_inventory_cache_v1";
const DATA_PATH = "inventory.json";
const REQUESTS_PATH = "requests.json"; 
const TRANSFERS_PATH = "transfers.json"; 
const PROMOTIONS_PATH = "promotions.json"; 
const SALES_GUIDE_PATH = "sales_guide.json"; 
const SALES_HISTORY_PATH = "sales_history.json"; 
const CAT_ORDER = { "신발":0, "의류":1, "용품":2 };

let GH = { owner:"", repo:"", branch:"main" };
let RAW=[], PRODUCTS=[], filtered=[];
let IMAGES = {}; 
let MEMOS = []; 
let TRANSFERS = []; 
let PROMOTIONS = {}; 
let SALES_GUIDES = {}; 
let SALES_HISTORY = { meta: {}, items: {} }; 
let visibleCount=60;
let CURRENT_META = null;
let CURRENT_PRODUCT = null;

let FAVS = JSON.parse(localStorage.getItem('FAVS') || '[]');
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const fmt = n => (n??0).toLocaleString("ko-KR");
const krw = n => "₩" + fmt(n);

// 유틸리티 함수들
function loadGhConfig(){ try{ const c=localStorage.getItem(GH_CONFIG_KEY); if(c) GH=Object.assign(GH, JSON.parse(c)); }catch(e){} }
function saveGhConfig(){ localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(GH)); }
function getPat(){ return localStorage.getItem(GH_PAT_KEY) || ""; }
function setPat(v){ if(v) localStorage.setItem(GH_PAT_KEY, v); else localStorage.removeItem(GH_PAT_KEY); }
function checkPat() { if(!getPat()) { alert("⚠️ 설정 탭에서 GitHub 토큰(PAT)을 등록해주세요."); return false; } return true; }
function escapeHtml(s){ return String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function detectGender(code, sex){
  const g = String(sex||"").trim();
  if(g==="남성"||g==="남"||g.toUpperCase()==="M") return "M";
  if(g==="여성"||g==="여"||g.toUpperCase()==="W") return "W";
  return "U";
}
const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
function getChosung(str){
  let r = ""; const s = String(str||"");
  for(let i=0;i<s.length;i++){
    const code = s.charCodeAt(i);
    if(code >= 0xAC00 && code <= 0xD7A3) r += CHO[Math.floor((code - 0xAC00) / 588)];
    else r += s[i].toLowerCase();
  }
  return r;
}
function isAllChosung(str) { return /^[ㄱ-ㅎ]+$/.test(str); }

// 데이터 로드 및 인덱싱
async function loadData(force = false){
  const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
  if (!force && cached && (Date.now() - (cached._timestamp||0) < 60000)) {
      RAW = cached.rows || []; CURRENT_META = cached.meta; IMAGES = cached.images || {};
      MEMOS = cached.memos || []; TRANSFERS = cached.transfers || []; PROMOTIONS = cached.promotions || {};
      SALES_GUIDES = cached.salesGuides || {}; SALES_HISTORY = cached.salesHistory || { meta: {}, items: {} };
      applyMeta(CURRENT_META); rebuildIndex(); render(); return;
  }
  try {
      const [invRes, imgRes, memoRes, trRes, promoRes, sgRes, shRes] = await Promise.all([
          fetch("./" + DATA_PATH + "?t=" + Date.now()),
          fetch("./images.json?t=" + Date.now()).catch(()=>null),
          fetch("./" + REQUESTS_PATH + "?t=" + Date.now()).catch(()=>null),
          fetch("./" + TRANSFERS_PATH + "?t=" + Date.now()).catch(()=>null),
          fetch("./" + PROMOTIONS_PATH + "?t=" + Date.now()).catch(()=>null),
          fetch("./" + SALES_GUIDE_PATH + "?t=" + Date.now()).catch(()=>null),
          fetch("./" + SALES_HISTORY_PATH + "?t=" + Date.now()).catch(()=>null)
      ]);
      if(!invRes.ok) throw new Error("재고 로드 실패");
      const invData = await invRes.json();
      RAW = invData.rows || []; CURRENT_META = invData.meta;
      if(imgRes && imgRes.ok) IMAGES = await imgRes.json();
      if(memoRes && memoRes.ok) MEMOS = await memoRes.json();
      if(trRes && trRes.ok) TRANSFERS = await trRes.json();
      if(promoRes && promoRes.ok) PROMOTIONS = await promoRes.json();
      if(sgRes && sgRes.ok) SALES_GUIDES = await sgRes.json();
      if(shRes && shRes.ok) SALES_HISTORY = await shRes.json();
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rows: RAW, meta: CURRENT_META, images: IMAGES, memos: MEMOS, transfers: TRANSFERS, promotions: PROMOTIONS, salesGuides: SALES_GUIDES, salesHistory: SALES_HISTORY, _timestamp: Date.now() }));
      applyMeta(CURRENT_META); rebuildIndex(); render();
  } catch(e) { console.error(e); }
}

function rebuildIndex(){
  const map = new Map();
  const allSizes = new Set();
  const now = Date.now();
  // 5월 프로모션 기간 설정
  const t1 = new Date('2026-05-08T00:00:00+09:00').getTime();
  const t2 = new Date('2026-05-15T00:00:00+09:00').getTime();
  const t3 = new Date('2026-05-22T00:00:00+09:00').getTime();
  const t4 = new Date('2026-05-29T23:59:59+09:00').getTime();
  let activeWeeklyCat = (now >= t1 && now < t2) ? "FOOTWEAR" : (now >= t2 && now < t3 ? "APPAREL" : (now >= t3 && now <= t4 ? "ACC/GEAR" : null));

  for(const r of RAW){
    const code = r["품번"]; if(!code) continue;
    if(r["규격"]) allSizes.add(String(r["규격"]).trim());
    if(!map.has(code)){
      map.set(code, { 품번:code, 품명:r["품명"], 브랜드:r["브랜드"], 카테고리:r["카테고리2"]||r["카테고리"], 성별:r["성별"], gender:detectGender(code, r["성별"]), 소비자가:Number(r["소비자가"]||0), shopNo:String(r["상품번호(샵바이)"]||""), sizes:[], periodSales: 0 });
    }
    const p = map.get(code);
    const busan = Number(r["매장 (부산)"] ?? r["매장(부산)"] ?? 0);
    const sinsa = Number(r["매장 (신사동)"] ?? r["매장(신사동)"] ?? 0);
    const center = Number(r["물류센터"] ?? 0);
    const found = p.sizes.find(s=>String(s.size)===String(r["규격"]));
    if(found){ found.busan+=busan; found.sinsa+=sinsa; found.center+=center; }
    else p.sizes.push({ size:r["규격"], busan, sinsa, center });
  }

  PRODUCTS = Array.from(map.values()).map(p=>{
    p.busanTotal = p.sizes.reduce((a,b)=>a+b.busan,0);
    p.sinsaTotal = p.sizes.reduce((a,b)=>a+b.sinsa,0);
    p.centerTotal = p.sizes.reduce((a,b)=>a+b.center,0);
    p.hasMemo = MEMOS.some(m => m.code === p.품번);
    // 프로모션 적용
    if (PROMOTIONS && PROMOTIONS.items && PROMOTIONS.items[p.품번]) {
        const promo = PROMOTIONS.items[p.품번];
        if (promo.targetCat === activeWeeklyCat && promo.weeklyPrice < p.소비자가) {
            p.currentPromoPrice = promo.weeklyPrice; p.promoType = 'weekly'; p.promoRate = promo.weeklyRate;
        } else if (promo.finalPrice < p.소비자가) {
            p.currentPromoPrice = promo.finalPrice; p.promoType = 'general'; p.promoRate = promo.finalRate;
        }
    }
    p._hayClean = [p.품번, p.품명, p.브랜드].join("").replace(/[\s\-_]/g, "").toLowerCase();
    p._chosung = getChosung(p._hayClean);
    return p;
  });
  updateFilters(allSizes);
}

function updateFilters(allSizes) {
    const sortedSizes = Array.from(allSizes).sort((a,b) => isNaN(parseInt(a)) ? a.localeCompare(b) : parseInt(a)-parseInt(b));
    if($("#sizeSel")) $("#sizeSel").innerHTML = `<option value="ALL">📏 전체 사이즈</option>` + sortedSizes.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    const brands = Array.from(new Set(PRODUCTS.map(p=>p.브랜드).filter(Boolean))).sort();
    if($("#brandChips")) {
        $("#brandChips").innerHTML = '<button class="chip" data-brand="ALL" data-active="1">전체 브랜드</button>' + brands.map(b => `<button class="chip" data-brand="${escapeHtml(b)}">${escapeHtml(b)}</button>`).join("");
        $$('#brandChips .chip').forEach(btn => btn.onclick = () => { $$('#brandChips .chip').forEach(c=>c.dataset.active=(c===btn?"1":"0")); visibleCount=60; render(); });
    }
}

// 메인 리스트 렌더링
function card(p){
  const el = document.createElement("article");
  el.className = "card card-hover p-4 flex flex-col relative bg-white";
  el.onclick = (e) => { if(!e.target.closest('button')) openDetail(p); };
  const imgSrc = IMAGES[p.shopNo] || null;
  const isFav = FAVS.includes(p.품번);
  
  el.innerHTML = `
    <div class="flex justify-between items-start mb-2 z-10 relative">
        <div class="flex flex-wrap gap-1 text-[11px] font-bold text-gray-500">
            ${p.currentPromoPrice ? `<span class="bg-red-600 text-white px-1.5 py-0.5 rounded">SALE</span>` : ''}
            <span class="bg-gray-100 px-1.5 py-0.5 rounded">${p.브랜드}</span>
            <span class="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">${p.성별}</span>
        </div>
        <button class="fav-btn p-1.5 text-gray-300"><i data-lucide="bookmark" class="w-6 h-6 ${isFav?'fill-yellow-400 text-yellow-400':''}"></i></button>
    </div>
    <div class="flex justify-between items-start w-full min-h-[120px] mb-2">
       <div class="flex-1 min-w-0 pr-[130px]">
          <div class="font-extrabold text-[17px] leading-tight mb-1 truncate">${p.품명}</div>
          <div class="text-[14px] font-bold text-[#555]">${p.품번}</div>
       </div>
       ${imgSrc ? `<img src="${imgSrc}" loading="lazy" onload="this.classList.add('loaded')" class="absolute top-10 right-4 w-[110px] h-[110px] object-contain">` : ''}
    </div>
    <div class="grid gap-1 mb-4 mt-auto" style="grid-template-columns:repeat(auto-fill, minmax(44px, 1fr))">
      ${p.sizes.map(s=> `<div class="size-cell tnum ${s.busan===0?'zero':''}"><span class="sz">${s.size}</span><span class="qty">${s.busan}</span></div>`).join("")}
    </div>
    <div class="flex justify-between items-end border-t border-gray-50 pt-2">
        <div class="text-[12px] font-bold text-gray-400">부산 <span class="text-blue-600 font-black">${p.busanTotal}</span></div>
        <div class="text-right">
            ${p.currentPromoPrice ? `<div class="text-[10px] text-gray-400 line-through">${krw(p.소비자가)}</div><div class="text-[16px] font-black text-red-600">${krw(p.currentPromoPrice)}</div>` : `<div class="text-[16px] font-black text-gray-900">${krw(p.소비자가)}</div>`}
        </div>
    </div>
  `;
  el.querySelector('.fav-btn').onclick=(e)=>{ e.stopPropagation(); if(FAVS.includes(p.품번)) FAVS=FAVS.filter(id=>id!==p.품번); else FAVS.push(p.품번); localStorage.setItem('FAVS', JSON.stringify(FAVS)); render(); };
  return el;
}

function render(){
  const grid = $("#grid"); if(!grid) return;
  const f = getFilters();
  let filteredList = PRODUCTS.filter(p => {
      if(f.cat!=="ALL" && p.카테고리!==f.cat) return false;
      if(f.brand!=="ALL" && p.브랜드!==f.brand) return false;
      if(f.q) {
          const cleanQ = f.q.replace(/[\s\-_]/g, "");
          if(isAllChosung(cleanQ)) { if(!p._chosung.includes(cleanQ)) return false; }
          else { if(!p._hayClean.includes(cleanQ)) return false; }
      }
      return true;
  });
  grid.innerHTML = "";
  const fragment = document.createDocumentFragment();
  filteredList.slice(0, visibleCount).forEach(p => fragment.appendChild(card(p)));
  grid.appendChild(fragment);
  if(window.lucide) lucide.createIcons();
}

function getFilters(){
  return {
    cat: ($$('button.chip[data-cat]').find(b=>b.dataset.active==="1")||{}).dataset?.cat || "ALL",
    brand: ($$('#brandChips .chip').find(b=>b.dataset.active==="1")||{}).dataset?.brand || "ALL",
    q: $("#q") ? $("#q").value.trim().toLowerCase() : ""
  };
}

// 🔥 분석 리포트 V3 모듈
async function loadChartJS() {
    return new Promise((resolve) => {
        if (window.Chart) return resolve();
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

// 도넛 중앙 퍼센트 표시 플러그인
const doughnutPercentagePlugin = {
    id: 'doughnutPercentage',
    afterDraw(chart) {
        const { ctx, data } = chart;
        ctx.save();
        const meta = chart.getDatasetMeta(0);
        if(!meta.total) return;
        meta.data.forEach((element, index) => {
            const value = data.datasets[0].data[index];
            const percentage = Math.round((value / meta.total) * 100);
            if (percentage >= 5) {
                const { x, y } = element.tooltipPosition();
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 3;
                ctx.fillText(percentage + '%', x, y);
            }
        });
        ctx.restore();
    }
};

window.openAnalyticsReport = async () => {
    await loadChartJS();
    let modal = $("#analyticsDashboard");
    if (!modal) {
        modal = document.createElement("div"); modal.id = "analyticsDashboard";
        modal.className = "modal-backdrop fixed inset-0 z-[105] bg-gray-50/95 backdrop-blur-sm flex flex-col transition-opacity duration-300 opacity-0";
        document.body.appendChild(modal);
    }
    let dPeriod = "30", dStart = "", dEnd = "", dCat = "ALL", dBrand = "ALL";
    let catChartInst = null, brandChartInst = null;

    modal.innerHTML = `
        <div class="modal-outer absolute inset-0 cursor-pointer"></div>
        <div class="relative w-full h-full lg:h-[90%] lg:w-[90%] lg:mt-[3%] lg:mx-auto bg-gray-50 flex flex-col shadow-2xl lg:rounded-[2rem] z-10 overflow-hidden border border-gray-200">
            <header class="bg-white border-b border-gray-100 px-5 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                <div>
                    <h1 class="text-xl font-black text-gray-900 flex items-center gap-2"><i data-lucide="pie-chart" class="w-6 h-6 text-blue-500"></i> 인사이트 리포트</h1>
                    <p id="dashTotalSummary" class="text-xs font-bold text-gray-500 mt-1"></p>
                </div>
                <div class="flex items-center gap-2">
                    <select id="dashDateSel" class="ipt text-sm font-bold bg-gray-100 border-none rounded-xl px-3 py-2 outline-none">
                        <option value="1">오늘</option><option value="7">최근 7일</option><option value="30" selected>최근 1개월</option><option value="90">1분기</option><option value="ALL">전체 누적</option>
                    </select>
                    <button id="closeDashboardBtn" class="p-2 bg-gray-100 rounded-full hover:bg-red-500 hover:text-white transition-colors"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
            </header>
            <main class="flex-1 overflow-hidden p-4 lg:p-6 flex flex-col gap-4">
                <div class="flex gap-2 overflow-x-auto no-scrollbar">
                    <select id="dashCatSel" class="ipt text-sm font-black bg-white border border-gray-200 rounded-xl px-3 py-2 text-blue-700 outline-none"><option value="ALL">📦 전체 카테고리</option><option value="신발">👟 신발</option><option value="의류">👕 의류</option><option value="용품">🎒 용품</option></select>
                    <select id="dashBrandSel" class="ipt text-sm font-black bg-white border border-gray-200 rounded-xl px-3 py-2 text-emerald-700 outline-none"><option value="ALL">🏷️ 전체 브랜드</option></select>
                </div>
                <div class="h-full grid grid-cols-1 lg:grid-cols-3 gap-5 overflow-hidden">
                    <section class="lg:col-span-1 flex flex-col gap-5 overflow-y-auto custom-scroll pr-1">
                        <div class="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm"><h2 class="text-xs font-black text-gray-400 mb-3 uppercase">Category Mix</h2><div class="relative h-44"><canvas id="catChart"></canvas></div></div>
                        <div class="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm"><h2 class="text-xs font-black text-gray-400 mb-3 uppercase">Brand Mix (TOP 5)</h2><div class="relative h-44"><canvas id="brandChart"></canvas></div></div>
                    </section>
                    <section class="lg:col-span-2 flex flex-col bg-white rounded-[1.5rem] border border-gray-100 overflow-hidden shadow-sm">
                        <div class="px-5 py-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <h2 class="text-sm font-black text-gray-800">상세 판매 랭킹</h2><span id="dashListCount" class="text-[10px] font-bold text-gray-400"></span>
                        </div>
                        <div id="dashListBody" class="flex-1 overflow-y-auto p-4 space-y-2 custom-scroll"></div>
                    </section>
                </div>
            </main>
        </div>
    `;

    const updateDashboardData = () => {
        let cutoffDate = "0000-00-00", endDate = "9999-99-99", d = new Date(), today = d.toISOString().split('T')[0];
        if (dPeriod === "1") { cutoffDate = today; endDate = today; } 
        else if (dPeriod !== "ALL") { d.setDate(d.getDate() - Number(dPeriod)); cutoffDate = d.toISOString().split('T')[0]; }

        let totalS = 0, totalR = 0, catD = { "신발":0, "의류":0, "용품":0 }, brandD = {}, items = [];
        PRODUCTS.forEach(p => {
            let s = 0; if (SALES_HISTORY.items && SALES_HISTORY.items[p.품번]) {
                for (let date in SALES_HISTORY.items[p.품번]) if (date >= cutoffDate && date <= endDate) s += SALES_HISTORY.items[p.품번][date];
            }
            if (s > 0) items.push({ ...p, dashSales: s, dashRevenue: s * (p.currentPromoPrice || p.소비자가 || 0) });
        });

        let availableB = [...new Set(items.map(p => p.브랜드))].filter(Boolean).sort();
        if($("#dashBrandSel").options.length <= 1) $("#dashBrandSel").innerHTML = `<option value="ALL">🏷️ 전체 브랜드</option>` + availableB.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');

        let filtered = items.filter(p => (dCat === "ALL" || p.카테고리 === dCat) && (dBrand === "ALL" || p.브랜드 === dBrand));
        filtered.sort((a, b) => b.dashSales - a.dashSales);
        filtered.forEach(p => { totalS += p.dashSales; totalR += p.dashRevenue; catD[p.카테고리] = (catD[p.카테고리]||0) + p.dashSales; brandD[p.브랜드] = (brandD[p.브랜드]||0) + p.dashSales; });

        $("#dashTotalSummary").innerHTML = `수량 <span class="text-blue-600 font-black">${fmt(totalS)}개</span> • 매출 <span class="text-orange-600 font-black">${krw(totalR)}</span>`;
        $("#dashListCount").textContent = `${filtered.length}개 품목`;

        $("#dashListBody").innerHTML = filtered.map((p, idx) => `
            <div class="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 hover:border-blue-400 transition-all cursor-pointer" onclick="openDetail(PRODUCTS.find(x=>x.품번==='${p.품번}'))">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-6 text-xs font-black text-gray-300">${idx+1}</div>
                    ${IMAGES[p.shopNo] ? `<img src="${IMAGES[p.shopNo]}" class="w-10 h-10 rounded-lg object-contain bg-white border">` : `<div class="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-[8px] text-gray-300">NO IMG</div>`}
                    <div class="min-w-0"><div class="text-[10px] font-bold text-gray-400 truncate">${p.브랜드}</div><div class="text-[13px] font-black text-gray-800 truncate">${p.품명}</div></div>
                </div>
                <div class="text-right shrink-0 ml-3">
                    <div class="text-sm font-black text-gray-900">${fmt(p.dashSales)}개</div><div class="text-[10px] font-bold text-blue-600">${krw(p.dashRevenue)}</div>
                </div>
            </div>`).join('');
        renderCharts(catD, brandD);
        if(window.lucide) lucide.createIcons();
    };

    const renderCharts = (catD, brandD) => {
        if (catChartInst) catChartInst.destroy(); if (brandChartInst) brandChartInst.destroy();
        const cfg = { type: 'doughnut', plugins: [doughnutPercentagePlugin], options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, font: { weight: 'bold', size: 10 } } } } } };
        catChartInst = new Chart($("#catChart"), { ...cfg, data: { labels: Object.keys(catD), datasets: [{ data: Object.values(catD), backgroundColor: ['#3b82f6', '#8b5cf6', '#f97316'], borderWidth: 0 }] } });
        const sortedB = Object.entries(brandD).sort((a,b)=>b[1]-a[1]);
        const topB = sortedB.slice(0, 5);
        if(sortedB.length > 5) topB.push(["기타", sortedB.slice(5).reduce((a,b)=>a+b[1],0)]);
        brandChartInst = new Chart($("#brandChart"), { ...cfg, data: { labels: topB.map(b=>b[0]), datasets: [{ data: topB.map(b=>b[1]), backgroundColor: ['#10b981', '#0ea5e9', '#f43f5e', '#8b5cf6', '#f59e0b', '#e5e7eb'], borderWidth: 0 }] } });
    };

    $("#dashDateSel").onchange = (e) => { dPeriod = e.target.value; updateDashboardData(); };
    $("#dashCatSel").onchange = (e) => { dCat = e.target.value; updateDashboardData(); };
    $("#dashBrandSel").onchange = (e) => { dBrand = e.target.value; updateDashboardData(); };
    const closeDash = () => { modal.classList.add("opacity-0"); setTimeout(() => modal.classList.add("hidden"), 300); };
    $("#closeDashboardBtn").onclick = closeDash; modal.querySelector(".modal-outer").onclick = closeDash;
    updateDashboardData(); setTimeout(() => modal.classList.remove("opacity-0"), 10);
};

// ... [상세창, 메모, 이동요청 등 나머지 함수들은 기존 코드 유지] ...

window.addEventListener('DOMContentLoaded', () => {
    loadGhConfig(); loadData();
    // ESC 닫기 이벤트
    document.addEventListener("keydown", (e) => { if(e.key === "Escape") { $$('.modal-backdrop').forEach(m => m.classList.add("hidden")); } });
});
