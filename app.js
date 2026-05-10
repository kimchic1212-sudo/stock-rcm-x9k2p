/**
 * RACEMENT Inventory & Sales Analysis System v4.1
 * Features: Inventory, Memos, Transfers, Weekly Promotions, AI Sales Guide, SaaS Analytics Dashboard
 */

// 🔥 1. 전역 스타일 및 레이아웃 최적화 주입 🔥
const style = document.createElement('style');
style.innerHTML = `
    :root { --dashboard-width: 420px; }
    #main-container { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); display: grid; grid-template-columns: 1fr; gap: 20px; }
    
    /* 데스크톱 분석 모드 활성화 시 레이아웃 스위칭 */
    @media (min-width: 1024px) {
        body.dashboard-active #main-container { grid-template-columns: var(--dashboard-width) 1fr; }
        body.dashboard-active #analyticsPanel { display: block !important; position: sticky; top: 80px; height: calc(100vh - 120px); }
        body.dashboard-active #analyticsModal { display: none !important; }
    }

    .modal-backdrop:not(.hidden) { display: flex !important; align-items: center; justify-content: center; padding: 15px; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
    .modal-content { max-height: 92vh !important; overflow-y: auto !important; -webkit-overflow-scrolling: touch; position: relative; background: var(--bg); border-radius: 20px; }
    
    /* 레이어 우선순위 (Z-index) */
    #detailModal { z-index: 9999 !important; }
    #salesGuideModal { z-index: 9500 !important; }
    #analyticsModal { z-index: 8500 !important; }
    #allMemosModal, #transfersModal, #adminModal { z-index: 7000 !important; }

    .chart-container { position: relative; margin: auto; height: 220px; width: 100%; }
    .stat-card { transition: transform 0.3s ease; border: 1px solid rgba(255,255,255,0.1); }
    .stat-card:hover { transform: translateY(-3px); }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;
document.head.appendChild(style);

// --- 환경 설정 및 전역 변수 ---
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
let IMAGES = {}; let MEMOS = []; let TRANSFERS = []; let PROMOTIONS = {}; 
let SALES_GUIDES = {}; let SALES_HISTORY = { meta: {}, items: {} }; 
let chartInstances = {};
let visibleCount=60;
let CURRENT_META = null;
let CURRENT_PRODUCT = null;

let FAVS = JSON.parse(localStorage.getItem('FAVS') || '[]');
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const fmt = n => (n??0).toLocaleString("ko-KR");
const krw = n => "₩" + fmt(n);

// --- 유틸리티 함수 ---
function loadGhConfig(){ try{ const c=localStorage.getItem(GH_CONFIG_KEY); if(c) GH=Object.assign(GH, JSON.parse(c)); }catch(e){} }
function saveGhConfig(){ localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(GH)); }
function getPat(){ return localStorage.getItem(GH_PAT_KEY) || ""; }
function setPat(v){ if(v) localStorage.setItem(GH_PAT_KEY, v); else localStorage.removeItem(GH_PAT_KEY); }

function detectGender(code, sex){
  const g = String(sex||"").trim();
  if(g==="남성"||g==="남"||g.toUpperCase()==="M") return "M";
  if(g==="여성"||g==="여"||g.toUpperCase()==="W") return "W";
  return "U";
}

function escapeHtml(s){ return String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
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

async function copyText(text, btn){
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){ await navigator.clipboard.writeText(text); } 
    else {
      const ta = document.createElement("textarea"); ta.value = text; ta.style.position="fixed"; ta.style.opacity="0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    if(btn){
      const orig = btn.innerHTML; btn.classList.add("copied"); btn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> 복사됨';
      if(window.lucide) lucide.createIcons();
      setTimeout(()=>{ btn.innerHTML = orig; btn.classList.remove("copied"); if(window.lucide) lucide.createIcons(); }, 1200);
    }
  }catch(e){ alert("복사 실패"); }
}

// --- 데이터 동기화 (GitHub API) ---
async function safeFetchJson(path) {
    try {
        const res = await fetch("./" + path + "?t=" + Date.now());
        if(!res.ok) return null;
        return await res.json();
    } catch(e) { return null; }
}

async function loadData(force = false){
  const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
  if (!force && cached && (Date.now() - (cached._timestamp||0) < 60000)) {
      RAW = cached.rows || []; CURRENT_META = cached.meta; IMAGES = cached.images; MEMOS = cached.memos; TRANSFERS = cached.transfers; PROMOTIONS = cached.promotions; SALES_GUIDES = cached.salesGuides; SALES_HISTORY = cached.salesHistory;
      applyMeta(CURRENT_META); rebuildIndex(); render(); return;
  }
  try {
      const invRes = await fetch("./" + DATA_PATH + "?t=" + Date.now());
      if(!invRes.ok) throw new Error("재고 파일 없음");
      const invData = await invRes.json();
      RAW = invData.rows || []; CURRENT_META = invData.meta || null;
      
      const [img, mem, tra, pro, gui, his] = await Promise.all([
          safeFetchJson("images.json"), safeFetchJson(REQUESTS_PATH), safeFetchJson(TRANSFERS_PATH),
          safeFetchJson(PROMOTIONS_PATH), safeFetchJson(SALES_GUIDE_PATH), safeFetchJson(SALES_HISTORY_PATH)
      ]);

      IMAGES = img || {}; MEMOS = mem || []; TRANSFERS = tra || [];
      PROMOTIONS = pro || {}; SALES_GUIDES = gui || {}; 
      SALES_HISTORY = his || { meta:{}, items:{} };

      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rows: RAW, meta: CURRENT_META, images: IMAGES, memos: MEMOS, transfers: TRANSFERS, promotions: PROMOTIONS, salesGuides: SALES_GUIDES, salesHistory: SALES_HISTORY, _timestamp: Date.now() }));
      applyMeta(CURRENT_META); rebuildIndex(); render();
  } catch(e) { console.error(e); }
}

async function ghPut(url, body){ return fetch(url, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) }); }
function utf8ToB64(str){ return btoa(unescape(encodeURIComponent(str))); }

async function commitInventoryToGitHub(rows, meta){
  const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${DATA_PATH}`;
  let sha = null;
  try{ const r = await fetch(apiBase + "?t=" + Date.now(), { headers:{ Authorization:"Bearer "+getPat() } }); if(r.ok){ const j=await r.json(); sha=j.sha; } }catch(e){}
  const body = { message:"update inventory", content: utf8ToB64(JSON.stringify({ meta, rows })), branch: GH.branch, sha };
  await ghPut(apiBase, body);
}

// --- 비즈니스 로직 (기획전 주차 계산 등) ---
function getActiveWeeklyCategory() {
    const now = Date.now();
    const t1 = new Date('2026-05-08T00:00:00+09:00').getTime();
    const t2 = new Date('2026-05-15T00:00:00+09:00').getTime();
    const t3 = new Date('2026-05-22T00:00:00+09:00').getTime();
    const t4 = new Date('2026-05-29T23:59:59+09:00').getTime();
    if (now >= t1 && now < t2) return "FOOTWEAR";
    if (now >= t2 && now < t3) return "APPAREL";
    if (now >= t3 && now <= t4) return "ACC/GEAR";
    return null;
}

function rebuildIndex(){
  const map = new Map();
  const prevRaw = JSON.parse(localStorage.getItem('PREV_RAW') || '[]');
  const allSizes = new Set(); 
  const activeWeeklyCat = getActiveWeeklyCategory(); 
  
  for(const r of RAW){
    const code = r["품번"]; if(!code) continue;
    if(r["규격"]) allSizes.add(String(r["규격"]).trim()); 
    if(!map.has(code)){
      map.set(code, { 품번:code, 품명:r["품명"], 브랜드:r["브랜드"], 카테고리:r["카테고리2"]||r["카테고리"], 성별:r["성별"], gender:detectGender(code, r["성별"]), 소비자가:Number(r["소비자가"]||0), shopNo:String(r["상품번호(샵바이)"]||""), sizes:[], hasMemo: false, periodSales: 0 });
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
    const prevTotal = prevRaw.filter(pr=>pr["품번"]===p.품번).reduce((a,b)=>a+Number(b["매장 (부산)"] ?? b["매장(부산)"] ?? 0),0);
    p.delta = prevRaw.length ? p.busanTotal - prevTotal : 0;
    p.hasMemo = MEMOS.some(m => m.code === p.품번);

    // 기획전 가격 자동 계산
    if (PROMOTIONS && PROMOTIONS.items && PROMOTIONS.items[p.품번]) {
        const promo = PROMOTIONS.items[p.품번];
        if (promo.targetCat === activeWeeklyCat && promo.weeklyPrice) {
            p.currentPromoPrice = promo.weeklyPrice; p.promoType = 'weekly';
            p.promoRate = promo.weeklyRate || ((p.소비자가 - promo.weeklyPrice) / p.소비자가);
            p.promoEndDate = (promo.targetCat === 'FOOTWEAR') ? '5/15' : (promo.targetCat === 'APPAREL' ? '5/22' : '5/29');
        } else if (promo.finalPrice) {
            p.currentPromoPrice = promo.finalPrice; p.promoType = 'general';
            p.promoRate = promo.finalRate || ((p.소비자가 - promo.finalPrice) / p.소비자가);
            p.promoEndDate = '5/29'; 
        }
    }
    const rawHay = [p.품번||"", p.품명||"", p.브랜드||""].join(" ");
    p._hay = rawHay.toLowerCase(); p._hayClean = rawHay.replace(/[\s\-_]/g, "").toLowerCase(); 
    p._chosung = getChosung(p._hayClean); 
    return p;
  });
  
  // 동적 UI 생성 (사이즈, 판매분석 등)
  setupDynamicFilters(allSizes);
  renderStats();
}

function setupDynamicFilters(allSizes) {
    // 사이즈 드롭다운
    const sortedSizes = Array.from(allSizes).sort((a,b) => parseInt(a) - parseInt(b));
    if(!$("#sizeSel") && $("#sortSel")) {
        const sel = document.createElement("select");
        sel.id = "sizeSel"; sel.className = "ipt text-[13px] font-bold ml-2 bg-white";
        $("#sortSel").parentNode.insertBefore(sel, $("#sortSel"));
        sel.onchange = () => { visibleCount=60; render(); };
    }
    if($("#sizeSel")) {
        const cur = $("#sizeSel").value || "ALL";
        $("#sizeSel").innerHTML = `<option value="ALL">📏 전체 사이즈</option>` + sortedSizes.map(s => `<option value="${escapeHtml(s)}" ${s===cur?'selected':''}>${escapeHtml(s)}</option>`).join("");
    }

    // 판매분석 드롭다운
    if(!$("#salesPeriodWrap") && $("#sortSel")) {
        const wrap = document.createElement("div"); wrap.id = "salesPeriodWrap"; wrap.className="flex items-center gap-1.5 ml-2";
        wrap.innerHTML = `
            <select id="salesPeriodSel" class="ipt text-[13px] font-bold bg-orange-50 text-orange-700">
                <option value="">📊 판매분석 끔</option><option value="7">최근 7일</option><option value="30">최근 30일</option><option value="CUSTOM">📅 직접지정</option><option value="ALL">전체실적</option>
            </select>
            <div id="customDateWrap" class="hidden items-center gap-1 bg-white p-1 border rounded">
                <input type="date" id="customStartDate" class="text-[10px] border-none"> ~ <input type="date" id="customEndDate" class="text-[10px] border-none">
                <button id="customDateApply" class="bg-orange-500 text-white px-1.5 py-0.5 rounded text-[10px]">적용</button>
            </div>
            <button id="openAnalyticsBtn" class="hidden px-2 py-1.5 bg-gray-800 text-white text-[12px] font-black rounded flex items-center gap-1 shadow-sm shrink-0">
                <i data-lucide="pie-chart" class="w-3.5 h-3.5"></i> 리포트
            </button>
        `;
        $("#sortSel").parentNode.insertBefore(wrap, $("#sortSel").nextSibling);
        $("#salesPeriodSel").onchange = (e) => {
            if(e.target.value === "CUSTOM") $("#customDateWrap").classList.replace("hidden", "flex");
            else { $("#customDateWrap").classList.replace("flex", "hidden"); if(e.target.value !== "") $("#openAnalyticsBtn").classList.remove("hidden"); else $("#openAnalyticsBtn").classList.add("hidden"); visibleCount=60; render(); }
        };
        $("#customDateApply").onclick = () => { visibleCount=60; render(); $("#openAnalyticsBtn").classList.remove("hidden"); };
        $("#openAnalyticsBtn").onclick = () => window.openAnalyticsReport();
    }

    // 기획전 필터
    let pWrap = $("#promoFilters");
    if (!pWrap && PROMOTIONS && PROMOTIONS.meta) {
        pWrap = document.createElement("div"); pWrap.id = "promoFilters"; pWrap.className = "flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1";
        $("#brandChips").parentNode.insertBefore(pWrap, $("#brandChips"));
    }
    if (PROMOTIONS && PROMOTIONS.meta && pWrap) {
        pWrap.innerHTML = `
            <button class="chip !bg-purple-600 !text-white font-black shrink-0" data-promo="1" data-active="0">🎁 ${escapeHtml(PROMOTIONS.meta.name)}</button>
            <select id="promoTypeSel" class="ipt text-[12px] font-bold bg-white text-purple-700 hidden">
                <option value="ALL">기획전 전체</option><option value="weekly">🔥 위클리특가</option><option value="general">🎟️ 쿠폰가능</option>
            </select>
            <select id="promoRateSel" class="ipt text-[12px] font-bold bg-white text-purple-700 hidden">
                <option value="0">할인율 전체</option><option value="10">🔥 10% 할인</option><option value="20">🔥 20% 할인</option><option value="30">🔥 30% 할인</option>
            </select>
        `;
        pWrap.querySelector('button').onclick = function() {
            const act = this.dataset.active === "1"; this.dataset.active = act ? "0" : "1";
            if(!act) { this.classList.add('ring-2', 'ring-purple-400'); $("#promoTypeSel").classList.remove("hidden"); $("#promoRateSel").classList.remove("hidden"); }
            else { this.classList.remove('ring-2', 'ring-purple-400'); $("#promoTypeSel").classList.add("hidden"); $("#promoRateSel").classList.add("hidden"); }
            visibleCount=60; render();
        };
        $("#promoTypeSel").onchange = () => { visibleCount=60; render(); };
        $("#promoRateSel").onchange = () => { visibleCount=60; render(); };
    }
}

function renderStats() {
    const brands = Array.from(new Set(PRODUCTS.map(p=>p.브랜드).filter(Boolean))).sort();
    const bWrap = $("#brandChips"); bWrap.innerHTML = '<button class="chip" data-brand="ALL" data-active="1">전체 브랜드</button>';
    brands.forEach(b => {
        const btn = document.createElement("button"); btn.className="chip"; btn.dataset.brand=b; btn.textContent=b;
        btn.onclick = ()=>{ $$('#brandChips .chip').forEach(c=>c.dataset.active=(c===btn?"1":"0")); visibleCount=60; render(); };
        bWrap.appendChild(btn);
    });
    $("#statItems").textContent = fmt(PRODUCTS.length);
    $("#statBusan").textContent = fmt(PRODUCTS.reduce((a,p)=>a+p.busanTotal,0));
}

// --- 리포트 및 차트 시스템 (V4.1 SaaS) ---
function initCharts(containerId, data) {
    if (chartInstances[containerId + '_cat']) chartInstances[containerId + '_cat'].destroy();
    if (chartInstances[containerId + '_brd']) chartInstances[containerId + '_brd'].destroy();

    const catCtx = document.getElementById(containerId + '_cat').getContext('2d');
    chartInstances[containerId + '_cat'] = new Chart(catCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data.cat),
            datasets: [{ data: Object.values(data.cat), backgroundColor: ['#3b82f6', '#f97316', '#a855f7'], borderWidth: 0, hoverOffset: 12 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '72%',
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { weight: 'bold', size: 10 } } } },
            onClick: (e, el) => { if(el.length > 0) applyChartFilter('cat', chartInstances[containerId + '_cat'].data.labels[el[0].index]); }
        }
    });

    const brdCtx = document.getElementById(containerId + '_brd').getContext('2d');
    const sorted = Object.entries(data.brand).sort((a,b)=>b[1]-a[1]).slice(0, 6);
    chartInstances[containerId + '_brd'] = new Chart(brdCtx, {
        type: 'bar',
        data: {
            labels: sorted.map(b => b[0]),
            datasets: [{ data: sorted.map(b => b[1]), backgroundColor: '#10b981', borderRadius: 6, barThickness: 14 }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } } },
            onClick: (e, el) => { if(el.length > 0) applyChartFilter('brand', chartInstances[containerId + '_brd'].data.labels[el[0].index]); }
        }
    });
}

function applyChartFilter(type, value) {
    if (type === 'cat') $$('button.chip[data-cat]').forEach(b => b.dataset.active = (b.dataset.cat === value) ? "1" : "0");
    else if (type === 'brand') $$('#brandChips .chip').forEach(b => b.dataset.active = (b.dataset.brand === value) ? "1" : "0");
    visibleCount = 60; render();
}

window.openAnalyticsReport = () => {
    const isLg = window.innerWidth >= 1024;
    let total = 0, catD = { "신발":0, "의류":0, "용품":0 }, brD = {}, genD = { "M":0, "W":0, "U":0 };
    
    // 현재 필터링된 기간 데이터 집계
    PRODUCTS.forEach(p => {
        if(p.periodSales > 0) {
            total += p.periodSales; catD[p.카테고리||"용품"] += p.periodSales;
            genD[p.gender||"U"] += p.periodSales; brD[p.브랜드||"기타"] = (brD[p.브랜드||"기타"]||0) + p.periodSales;
        }
    });

    const top5 = PRODUCTS.filter(p=>p.periodSales>0).sort((a,b)=>b.periodSales - a.periodSales).slice(0, 5);

    const reportHtml = `
        <div class="flex flex-col gap-5 p-1">
            <div class="bg-gray-900 p-6 rounded-[28px] text-white shadow-xl stat-card">
                <div class="text-gray-400 text-[10px] font-black tracking-widest mb-1 uppercase">Total Performance</div>
                <div class="text-4xl font-black">${fmt(total)}<span class="text-lg font-medium opacity-50 ml-1">pcs</span></div>
                <div class="mt-4 flex gap-4 text-[11px] font-bold">
                    <span class="text-blue-400">남성 ${total?Math.round((genD.M/total)*100):0}%</span>
                    <span class="text-pink-400">여성 ${total?Math.round((genD.W/total)*100):0}%</span>
                </div>
            </div>
            <div class="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm">
                <h3 class="text-xs font-black text-gray-400 mb-4 flex items-center gap-1.5"><i data-lucide="pie-chart" class="w-3.5 h-3.5 text-blue-500"></i> CATEGORY MIX</h3>
                <div class="chart-container"><canvas id="dash_cat"></canvas></div>
            </div>
            <div class="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm">
                <h3 class="text-xs font-black text-gray-400 mb-4 flex items-center gap-1.5"><i data-lucide="bar-chart" class="w-3.5 h-3.5 text-emerald-500"></i> TOP BRANDS</h3>
                <div class="chart-container" style="height: 180px;"><canvas id="dash_brd"></canvas></div>
            </div>
            <div class="space-y-2">
                <h3 class="text-[11px] font-black text-gray-400 ml-1 uppercase tracking-wider">Top 5 Best Sellers</h3>
                ${top5.map((p, i) => `
                    <div class="flex items-center justify-between bg-white p-3 rounded-2xl border shadow-sm cursor-pointer hover:border-orange-300 transition-all" onclick="openDetail(PRODUCTS.find(x=>x.품번==='${p.품번}'))">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="font-black text-orange-500 text-sm italic">#${i+1}</span>
                            <div class="min-w-0"><div class="text-[10px] font-bold text-gray-400 truncate">${escapeHtml(p.브랜드)}</div><div class="text-[13px] font-black text-gray-800 truncate">${escapeHtml(p.품명)}</div></div>
                        </div>
                        <div class="font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl text-xs">${p.periodSales}개</div>
                    </div>`).join('')}
            </div>
        </div>`;

    if (isLg) {
        let panel = $("#analyticsPanel");
        if(!panel) { panel = document.createElement("aside"); panel.id = "analyticsPanel"; panel.className = "hidden lg:block overflow-y-auto no-scrollbar pr-2"; $("#main-container").prepend(panel); }
        document.body.classList.add('dashboard-active');
        panel.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-xl font-black text-gray-900">실시간 분석</h2><button onclick="document.body.classList.remove('dashboard-active')" class="text-gray-400"><i data-lucide="chevron-left-square"></i></button></div>${reportHtml}`;
        setTimeout(() => { initCharts('dash', { cat: catD, brand: brD }); if(window.lucide) lucide.createIcons(); }, 100);
    } else {
        let modal = $("#analyticsModal");
        if(!modal) { modal = document.createElement("div"); modal.id = "analyticsModal"; modal.className = "modal-backdrop hidden fixed inset-0"; document.body.appendChild(modal); }
        modal.innerHTML = `
            <div class="modal-outer absolute inset-0 bg-black/60 backdrop-blur-md"></div>
            <div class="modal-content relative bg-[#f4f7fa] w-full h-full sm:w-[90%] sm:max-w-md sm:h-[90%] sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden">
                <div class="p-4 flex justify-between items-center bg-white border-b"><h2 class="font-black text-lg">판매분석 리포트</h2><button onclick="this.closest('#analyticsModal').classList.add('hidden')" class="p-2 bg-gray-100 rounded-full"><i data-lucide="x" class="w-5 h-5"></i></button></div>
                <div class="flex-1 overflow-y-auto p-5 no-scrollbar">${reportHtml}</div>
            </div>`;
        modal.classList.remove("hidden");
        setTimeout(() => { initCharts('dash', { cat: catD, brand: brD }); if(window.lucide) lucide.createIcons(); }, 100);
    }
};

// --- 카드 및 렌더링 시스템 ---
function card(p){
  const el = document.createElement("article"); el.className = "card card-hover p-4 flex flex-col relative bg-white"; 
  el.onclick = (e)=>{ 
    if(e.target.closest('.btn-sales')) { e.stopPropagation(); openSalesGuide(p.품번); return; }
    if(!e.target.closest('button')) openDetail(p); 
  };
  const imgSrc = IMAGES[p.shopNo] || null;
  let dHtml = p.delta > 0 ? `<span class="text-emerald-600 font-black">▲+${p.delta}</span>` : (p.delta < 0 ? `<span class="text-red-600 font-black">▼${p.delta}</span>` : "");
  let bOnly = (p.busanTotal > 0 && p.sinsaTotal === 0 && p.centerTotal === 0) ? `<span class="bg-blue-800 text-white px-1.5 py-0.5 rounded font-black text-[10px] shadow-sm">부산 ONLY</span>` : "";
  let sBadge = ""; if ($("#salesPeriodSel")?.value && p.periodSales > 0) {
      sBadge += `<span class="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-black text-[10px]">📈 ${p.periodSales}개</span>`;
      if (p.periodSales >= 3 && p.busanTotal <= 1 && (p.sinsaTotal || p.centerTotal)) sBadge += `<span class="bg-red-600 text-white px-1.5 py-0.5 rounded font-black text-[10px] animate-pulse">🚨 보충</span>`;
  }
  const guide = SALES_GUIDES[p.품번];
  let sHtml = (guide && guide.keywords) ? `<div class="flex flex-wrap gap-1 mt-1.5 mb-1.5">` + guide.keywords.map(kw => `<span class="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-black px-1.5 py-0.5 rounded btn-sales">#${escapeHtml(kw.trim())}</span>`).join('') + `</div>` : "";
  const isFav = FAVS.includes(p.품번);
  let pBadge = ""; let prcDisp = `<div class="price-clean">${krw(p.소비자가)}</div>`;
  if (p.currentPromoPrice && p.currentPromoPrice < p.소비자가) {
      const rtL = `▼${Math.round((p.promoRate || 0) * 100)}%`;
      if (p.promoType === 'weekly') { pBadge = `<span class="bg-red-600 text-white px-1.5 py-0.5 rounded font-black text-[10px] shadow-sm">🔥위클리 ${rtL}</span>`; prcDisp = `<div class="flex flex-col items-end leading-tight"><span class="text-[10.5px] text-gray-400 line-through">${krw(p.소비자가)}</span><span class="text-[16px] font-black text-red-600">🔥${krw(p.currentPromoPrice)}</span></div>`; }
      else { pBadge = `<span class="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-black text-[10px] shadow-sm">🎟️쿠폰 ${rtL}</span>`; prcDisp = `<div class="flex flex-col items-end leading-tight"><span class="text-[10.5px] text-gray-400 line-through">${krw(p.소비자가)}</span><span class="text-[15px] font-black text-purple-700">🎟️${krw(p.currentPromoPrice)}</span></div>`; }
  }
  el.innerHTML = `
    <div class="flex justify-between items-start mb-2 z-10 relative">
        <div class="flex flex-wrap gap-1 text-[11px] font-bold text-gray-500 mt-0.5">${bOnly}${pBadge}${sBadge}<span class="bg-gray-100 px-1.5 py-0.5 rounded">${escapeHtml(p.카테고리||"-")}</span><span class="bg-gray-100 px-1.5 py-0.5 rounded">${escapeHtml(p.브랜드||"-")}</span><span class="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">${escapeHtml(p.성별||p.gender||"-")}</span>${dHtml}</div>
        <button class="fav-btn p-1.5 -mt-1.5 -mr-1.5 text-gray-300 hover:text-yellow-500 shrink-0" data-active="${isFav?'1':'0'}"><i data-lucide="bookmark" class="w-6 h-6 ${isFav ? 'fill-yellow-400 text-yellow-400' : ''}"></i></button>
    </div>
    <div class="flex justify-between items-start w-full min-h-[120px] relative mb-2">
       <div class="flex-1 min-w-0 pr-[130px]"><div class="font-extrabold text-[17px] hover:text-blue-600 truncate" data-copy="${escapeHtml(p.품명)}">${escapeHtml(p.품명)}</div><div class="text-[14px] font-bold text-[#555] mb-2 hover:text-blue-600 flex items-center gap-1" data-copy="${escapeHtml(p.품번)}">${escapeHtml(p.품번)} <i data-lucide="copy" class="w-3.5 h-3.5 opacity-60"></i></div>${sHtml}</div>
       ${imgSrc ? `<img src="${imgSrc}" class="absolute top-0 right-0 w-[120px] h-[120px] object-contain rounded-md">` : '<div class="absolute top-0 right-0 w-[120px] h-[120px] bg-gray-50 rounded-lg flex items-center justify-center text-[10px] text-gray-400">NO IMG</div>'}
    </div>
    <div class="grid gap-1.5 mb-4 mt-auto" style="grid-template-columns:repeat(auto-fill, minmax(44px, 1fr))">${p.sizes.map(s=>{ const q = s.busan||0; let cls = "size-cell tnum "; if(q===0) cls+="zero"; else if(q===1) cls+="danger"; return `<div class="${cls}"><span class="sz">${s.size}</span><span class="qty real-qty">${q}</span></div>`; }).join("")}</div>
    <div class="loc-simple mt-auto"><div class="flex gap-1 items-center text-[11px]"><b>부산 ${p.busanTotal}</b> | 신사 ${p.sinsaTotal} | 물류 ${p.centerTotal}</div>${prcDisp}</div>`;
  el.querySelector('.fav-btn').onclick=(e)=>{ e.stopPropagation(); if(FAVS.includes(p.품번)) FAVS=FAVS.filter(id=>id!==p.품번); else FAVS.push(p.품번); localStorage.setItem('FAVS', JSON.stringify(FAVS)); render(); };
  return el;
}

function openSalesGuide(code) {
    const guide = SALES_GUIDES[code]; if(!guide) return;
    let modal = $("#salesGuideModal");
    if(!modal) { modal = document.createElement("div"); modal.id = "salesGuideModal"; modal.className = "modal-backdrop hidden fixed inset-0"; document.body.appendChild(modal); }
    modal.innerHTML = `
        <div class="modal-outer absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="this.parentNode.classList.add('hidden')"></div>
        <div class="modal-content relative bg-white w-[90%] max-w-md flex flex-col rounded-2xl shadow-2xl z-10 p-6">
            <div class="flex justify-between items-start mb-4">
                <div><span class="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Sales Advisor</span><h2 class="font-black text-xl text-indigo-950">AI 셀링 가이드</h2></div>
                <button onclick="this.closest('#salesGuideModal').classList.add('hidden')" class="p-2 bg-gray-100 rounded-full"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            <div class="space-y-6">
                <div><div class="flex flex-wrap gap-1.5">${guide.keywords.map(k=>`<span class="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-[11px] font-black border border-indigo-100">#${escapeHtml(k)}</span>`).join('')}</div></div>
                <div><h3 class="text-xs font-black text-indigo-400 mb-2 uppercase">Key Features</h3><p class="text-sm font-medium text-gray-800 leading-relaxed">${guide.features}</p></div>
                <div><h3 class="text-xs font-black text-indigo-400 mb-2 uppercase">Target Customer</h3><p class="text-sm font-medium text-gray-800 leading-relaxed">${guide.target}</p></div>
                <div class="bg-indigo-50 p-4 rounded-2xl border border-indigo-100"><h3 class="text-xs font-black text-indigo-600 mb-2">🗨️ Pro Selling Script</h3><p class="text-[15px] font-black text-indigo-950 italic leading-snug">"${guide.pitch}"</p></div>
            </div>
        </div>`;
    modal.classList.remove("hidden"); if(window.lucide) lucide.createIcons();
}

function getFilters(){
  const pB = $('button[data-promo]');
  return {
    cat: ($$('button.chip[data-cat]').find(b=>b.dataset.active==="1")||{}).dataset?.cat || "ALL",
    gender: ($$('button.chip[data-gender]').find(b=>b.dataset.active==="1")||{}).dataset?.gender || "ALL",
    brand: ($$('#brandChips .chip').find(b=>b.dataset.active==="1")||{}).dataset?.brand || "ALL",
    q: $("#q").value.trim().toLowerCase(),
    stock: !!$$('button.chip[data-stock]').find(b=>b.dataset.active==="1"),
    favOnly: !!$$('button.chip[data-fav]').find(b=>b.dataset.active==="1"),
    memoOnly: !!$$('button.chip[data-memo]').find(b=>b.dataset.active==="1"),
    busanOnly: !!$$('button.chip[data-busanonly]').find(b=>b.dataset.active==="1"), 
    size: $("#sizeSel") ? $("#sizeSel").value : "ALL",
    salesPeriod: $("#salesPeriodSel") ? $("#salesPeriodSel").value : "",
    customStart: $("#customStartDate") ? $("#customStartDate").value : "",
    customEnd: $("#customEndDate") ? $("#customEndDate").value : "",
    promoOnly: pB ? pB.dataset.active === "1" : false,
    promoType: $("#promoTypeSel") ? $("#promoTypeSel").value : "ALL", 
    promoRate: $("#promoRateSel") ? Number($("#promoRateSel").value) : 0
  };
}

function render(){
  const grid = $("#grid"); if(!grid) return; grid.innerHTML = "";
  if(!RAW.length) { $("#emptyState")?.classList.remove("hidden"); $("#results")?.classList.add("hidden"); return; }
  $("#emptyState")?.classList.add("hidden"); $("#results")?.classList.remove("hidden");
  
  const f = getFilters();
  let cS = "0000-00-00", cE = "9999-99-99";
  if (f.salesPeriod === "CUSTOM") { cS = f.customStart || cS; cE = f.customEnd || cE; } 
  else if (f.salesPeriod && f.salesPeriod !== "ALL") { cS = new Date(Date.now() - Number(f.salesPeriod) * 86400000).toISOString().split('T')[0]; }

  PRODUCTS.forEach(p => {
      p.periodSales = 0;
      if (f.salesPeriod && SALES_HISTORY.items && SALES_HISTORY.items[p.품번]) {
          for (let d in SALES_HISTORY.items[p.품번]) { if (f.salesPeriod === "ALL" || (d >= cS && d <= cE)) p.periodSales += SALES_HISTORY.items[p.품번][d]; }
      }
  });

  let fL = PRODUCTS.filter(p=>{
    if(f.cat!=="ALL" && p.카테고리!==f.cat) return false;
    if(f.gender!=="ALL" && p.gender!==f.gender) return false;
    if(f.brand!=="ALL" && p.브랜드!==f.brand) return false;
    if(f.favOnly && !FAVS.includes(p.품번)) return false; 
    if(f.memoOnly && !p.hasMemo) return false;
    if(f.busanOnly && !(p.busanTotal > 0 && p.sinsaTotal === 0 && p.centerTotal === 0)) return false;
    if(f.promoOnly) { if(!p.currentPromoPrice) return false; if(f.promoType !== "ALL" && p.promoType !== f.promoType) return false; if(f.promoRate > 0 && Math.round((p.promoRate || 0) * 100) !== f.promoRate) return false; }
    if(f.size !== "ALL") { const sO = p.sizes.find(s => String(s.size).trim() === f.size); if(!sO) return false; if(f.stock && sO.busan <= 0) return false; } 
    if(f.q) { const tk = f.q.split(/\s+/).filter(Boolean); let mA = true; for(const t of tk){ const cT = t.replace(/[\s\-_]/g, "").toLowerCase(); if(isAllChosung(cT)){ if(!p._chosung.includes(cT)) mA = false; } else { if(!p._hay.includes(t) && !p._hayClean.includes(cT)) mA = false; } } if(!mA) return false; }
    return true;
  });

  const sM = $("#sortSel").value;
  fL.sort((a,b) => {
    if(sM === "salesDesc") return (b.periodSales||0) - (a.periodSales||0);
    if(sM === "default") { const ca = CAT_ORDER[a.카테고리] ?? 9, cb = CAT_ORDER[b.카테고리] ?? 9; if(ca!==cb) return ca-cb; return (b.busanTotal - a.busanTotal); }
    if(sM === "stock") return b.busanTotal - a.busanTotal;
    const pA = a.currentPromoPrice || a.소비자가 || 0, pB = b.currentPromoPrice || b.소비자가 || 0;
    return sM === "priceAsc" ? pA - pB : (sM === "priceDesc" ? pB - pA : 0);
  });

  fL.slice(0, visibleCount).forEach(p=>grid.appendChild(card(p)));
  if(fL.length > visibleCount) { $("#moreWrap").classList.remove("hidden"); $("#moreBtn").textContent = `더 보기 (+${Math.min(60, fL.length - visibleCount)})`; }
  else { $("#moreWrap").classList.add("hidden"); }
  if(window.lucide) lucide.createIcons();
}

// --- 이벤트 바인딩 및 초기화 ---
window.addEventListener('DOMContentLoaded', () => {
    const gridParent = $("#grid").parentElement;
    gridParent.id = "main-container"; // 분석 패널을 위한 ID
    
    loadGhConfig(); loadData();
    
    // 분석 리포트 버튼 생성 (상단 툴바)
    if($("#allMemosBtn") && !$("#allTransfersBtn")) {
        const trBtn = document.createElement("button"); trBtn.id = "allTransfersBtn"; trBtn.className = $("#allMemosBtn").className.replace(/yellow/g, 'blue');
        trBtn.innerHTML = `🚚 이동요청`; trBtn.onclick = window.renderTransfers; $("#allMemosBtn").parentNode.insertBefore(trBtn, $("#allMemosBtn").nextSibling);
    }

    // 관리자 패널 동적 생성
    const up = $("#uploadPanel");
    if (up && !$("#salesHistoryAdminBox")) {
        const sH = document.createElement("div"); sH.id = "salesHistoryAdminBox"; sH.className = "mt-4 p-4 border-2 border-orange-200 bg-orange-50 rounded-2xl"; up.appendChild(sH);
        const pA = document.createElement("div"); pA.id = "promoAdminBox"; pA.className = "mt-4 p-4 border-2 border-purple-200 bg-purple-50 rounded-2xl"; up.appendChild(pA);
        const sG = document.createElement("div"); sG.id = "salesAdminBox"; sG.className = "mt-4 p-4 border-2 border-indigo-200 bg-indigo-50 rounded-2xl"; up.appendChild(sG);
        window.renderSalesHistoryAdmin(); renderPromoAdmin(); renderSalesAdmin();
    }
});

// ESC 키 스마트 클로징
document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") {
        const ms = Array.from($$('.modal-backdrop:not(.hidden)')).sort((a,b) => (parseInt(window.getComputedStyle(b).zIndex)||0) - (parseInt(window.getComputedStyle(a).zIndex)||0));
        if(ms.length > 0) ms[0].classList.add("hidden");
    }
});

$("#ghSave").onclick=()=>{ saveGhConfig(); setPat($("#ghPat").value.trim()); alert("✅ 설정 저장 완료!"); loadGhConfig(); };
$("#resetAll").onclick=()=>{ location.reload(); };
$("#sortSel").onchange=()=> { visibleCount=60; render(); };
let qT; $("#q").oninput=()=>{ clearTimeout(qT); qT=setTimeout(()=>{ visibleCount=60; render(); },120); };
$("#clearQ").onclick=()=>{ $("#q").value=""; render(); };
$("#refreshBtn").onclick=()=>loadData(true);
$("#adminBtn").onclick=()=>$("#adminModal").classList.remove("hidden");

// --- (나머지 삭제/업로드/렌더링 서브 함수들 생략 - 이전 V3.4와 동일 로직 유지) ---
