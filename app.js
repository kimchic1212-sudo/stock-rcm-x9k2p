// 🔥 1. 관리자 팝업창 스크롤, Z-index 및 모바일 최적화 CSS 🔥
// UI 스케일업을 위해 전체적인 폰트 기본값 및 여백이 상향 조정되었습니다.
const style = document.createElement('style');
style.innerHTML = `
    #uploadPanel, #settingsPanel, .modal-content { max-height: 85vh !important; overflow-y: auto !important; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    #detailModal, #dashDetailModal, #salesGuideModal, #allMemosModal, #transfersModal { z-index: 9999 !important; }
    #analyticsDashboard { z-index: 105 !important; }
    .dash-scroll::-webkit-scrollbar { width: 8px; }
    .dash-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; border: 2px solid transparent; background-clip: padding-box; }
    .dash-scroll::-webkit-scrollbar-track { background: transparent; }
    #searchSuggestions { z-index: 999; max-height: 320px; overflow-y: auto; }
    .card img { opacity: 0; transition: opacity 0.3s ease-in-out; }
    .card img.loaded { opacity: 1 !important; }

    .chip {
        background-color: #ffffff; border: 1px solid #e2e8f0; color: #1e293b;
        transition: all 0.2s ease-in-out; cursor: pointer;
    }
    .chip:hover { background-color: #f8fafc; }
    .chip[data-active="1"] { background-color: #0f172a !important; color: #ffffff !important; border-color: #0f172a !important; font-weight: 900 !important; }
    .brand-hidden { display: none !important; }

    .card-img-wrap { position: relative; width: 110px; height: 110px; flex-shrink: 0; border-radius: 12px; border: 1px solid #f1f5f9; background: #f8fafc; overflow: hidden; }
    .bookmark-overlay { position: absolute; top: 6px; right: 6px; z-index: 20; background: rgba(255,255,255,0.85); border-radius: 50%; padding: 6px; backdrop-filter: blur(2px); transition: all 0.2s; }
    .size-scroll-wrap { display: flex; overflow-x: auto; gap: 8px; padding-bottom: 8px; margin-top: auto; margin-bottom: 12px; scroll-snap-type: x mandatory; }
    .size-scroll-wrap::-webkit-scrollbar { height: 5px; }
    .size-scroll-wrap::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .size-scroll-wrap > div { scroll-snap-align: start; }
    
    .size-cell.zero { opacity: 0.35; filter: grayscale(100%); text-decoration: line-through; border-color: #e2e8f0; background: #f8fafc; }

    #toast-container { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); z-index: 100000; display: flex; flex-direction: column; gap: 12px; width: 90%; max-width: 420px; pointer-events: none; }
    .toast { background: #1e293b; color: white; padding: 14px 20px; border-radius: 14px; font-size: 14px; font-weight: bold; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); animation: toast-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; pointer-events: auto; }
    @keyframes toast-in { from { transform: translateY(150%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .toast-undo { color: #facc15; cursor: pointer; padding-left: 14px; border-left: 1px solid #475569; margin-left: auto; flex-shrink: 0; font-weight: 900; }
    .toast-undo:hover { color: #fef08a; }
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
let RECENT_SEARCHES = JSON.parse(localStorage.getItem('RECENT_SEARCHES_V4') || '[]');

let windowDashItems = [];
let windowCurrentDashIndex = 0;

let filterHistory = [];
let isUndoing = false;

const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const fmt = n => (n??0).toLocaleString("ko-KR");
const krw = n => "₩" + fmt(n);

// 120, 130 사이즈를 용품으로 예외 처리하는 헬퍼 함수 추가
const isFwSize = s => /^\d{3}$/.test(s) && s !== "120" && s !== "130";

function loadGhConfig(){ try{ const c=localStorage.getItem(GH_CONFIG_KEY); if(c) GH=Object.assign(GH, JSON.parse(c)); }catch(e){} }
function saveGhConfig(){ localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(GH)); }
function getPat(){ return localStorage.getItem(GH_PAT_KEY) || ""; }
function setPat(v){ if(v) localStorage.setItem(GH_PAT_KEY, v); else localStorage.removeItem(GH_PAT_KEY); }

function checkPat() {
    if(!getPat()) { alert("⚠️ 설정 탭에서 GitHub 토큰(PAT)을 먼저 등록해주세요."); return false; }
    return true;
}

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
    await navigator.clipboard.writeText(text);
    if(btn){
      const orig = btn.innerHTML; btn.classList.add("copied"); btn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> 복사됨';
      if(window.lucide) lucide.createIcons();
      setTimeout(()=>{ btn.innerHTML = orig; btn.classList.remove("copied"); if(window.lucide) lucide.createIcons(); }, 1200);
    }
  }catch(e){ alert("복사 실패"); }
}

function showToast(message, onUndo) {
    let container = document.getElementById('toast-container');
    if(!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="flex items-center gap-2"><i data-lucide="check-circle" class="w-5 h-5 text-green-400"></i> ${escapeHtml(message)}</span>`;
    
    let timer;
    if(onUndo) {
        const undoBtn = document.createElement('span');
        undoBtn.className = 'toast-undo';
        undoBtn.innerHTML = '실행 취소 ↺';
        undoBtn.onclick = () => {
            clearTimeout(timer);
            onUndo();
            toast.style.animation = 'none';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            toast.style.transition = 'all 0.2s';
            setTimeout(() => toast.remove(), 200);
        };
        toast.appendChild(undoBtn);
    }
    container.appendChild(toast);
    if(window.lucide) lucide.createIcons();
    
    timer = setTimeout(() => {
        toast.style.animation = 'none';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function getCurrentFilterState() {
    return {
        cat: ($$('button.chip[data-cat]').find(b=>b.dataset.active==="1")||{}).dataset?.cat || "ALL",
        gender: ($$('button.chip[data-gender]').find(b=>b.dataset.active==="1")||{}).dataset?.gender || "ALL",
        brand: ($$('#brandChips .chip').find(b=>b.dataset.active==="1")||{}).dataset?.brand || "ALL",
        q: $("#q").value,
        stock: ($('button.chip[data-stock]')?.dataset.active === "1"),
        favOnly: ($$('button.chip[data-fav]').find(b=>b.dataset.active==="1")? true : false),
        memoOnly: ($$('button.chip[data-memo]').find(b=>b.dataset.active==="1")? true : false),
        busanOnly: ($('button.chip[data-busanonly]')?.dataset.active === "1"),
        sizeFw: $("#sizeSelFw")?.value || "ALL",
        sizeAp: $("#sizeSelAp")?.value || "ALL",
        sizeGear: $("#sizeSelGear")?.value || "ALL",
        sort: $("#sortSel")?.value || "default",
        promoOnly: window.tempPromoFilter === true
    };
}

function saveHistoryState() {
    if(isUndoing) return;
    const currentState = getCurrentFilterState();
    
    if(filterHistory.length > 0) {
        const last = filterHistory[filterHistory.length - 1];
        if(JSON.stringify(last) === JSON.stringify(currentState)) return;
    }
    
    filterHistory.push(currentState);
    if(filterHistory.length > 20) filterHistory.shift(); 
    
    updateUndoBtnUI();
}

function restoreHistoryState() {
    if(filterHistory.length === 0) return;
    isUndoing = true;
    const state = filterHistory.pop();
    
    $$('button.chip[data-cat]').forEach(b => b.dataset.active = (b.dataset.cat === state.cat ? "1" : "0"));
    $$('button.chip[data-gender]').forEach(b => b.dataset.active = (b.dataset.gender === state.gender ? "1" : "0"));
    $$('#brandChips .chip').forEach(b => b.dataset.active = (b.dataset.brand === state.brand ? "1" : "0"));
    
    if($('button.chip[data-stock]')) $('button.chip[data-stock]').dataset.active = state.stock ? "1" : "0";
    if($('button.chip[data-fav]')) $('button.chip[data-fav]').dataset.active = state.favOnly ? "1" : "0";
    if($('button.chip[data-memo]')) $('button.chip[data-memo]').dataset.active = state.memoOnly ? "1" : "0";
    if($('button.chip[data-busanonly]')) {
        $('button.chip[data-busanonly]').dataset.active = state.busanOnly ? "1" : "0";
        if(state.busanOnly) $('button.chip[data-busanonly]').classList.add('ring-2', 'ring-blue-400');
        else $('button.chip[data-busanonly]').classList.remove('ring-2', 'ring-blue-400');
    }

    $("#q").value = state.q;
    if($("#sizeSelFw")) $("#sizeSelFw").value = state.sizeFw;
    if($("#sizeSelAp")) $("#sizeSelAp").value = state.sizeAp;
    if($("#sizeSelGear")) $("#sizeSelGear").value = state.sizeGear;
    if($("#sortSel")) $("#sortSel").value = state.sort;
    
    window.tempPromoFilter = state.promoOnly;
    const promoBtn = $('button[onclick^="window.togglePromoView"]');
    if(promoBtn) {
        promoBtn.dataset.active = state.promoOnly ? "0" : "1"; 
        window.togglePromoView(promoBtn, true); 
    }

    updateUndoBtnUI();
    visibleCount = 60;
    render();
    isUndoing = false;
    showToast("이전 상태로 되돌렸습니다.");
}

function updateUndoBtnUI() {
    let btn = $("#mobileUndoBtn");
    if(!btn) {
        btn = document.createElement("button");
        btn.id = "mobileUndoBtn";
        btn.innerHTML = `<i data-lucide="undo-2" class="w-6 h-6"></i>`;
        btn.style.cssText = "position:fixed; bottom:24px; right:24px; z-index:9990; background:#1e293b; color:white; width:56px; height:56px; border-radius:50%; display:none; align-items:center; justify-content:center; box-shadow:0 10px 15px -3px rgba(0,0,0,0.3); cursor:pointer;";
        btn.onclick = restoreHistoryState;
        document.body.appendChild(btn);
        if(window.lucide) lucide.createIcons();
    }
    if(filterHistory.length > 0) {
        btn.style.display = "flex";
    } else {
        btn.style.display = "none";
    }
}

document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") {
        const modals = $$('#detailModal, #dashDetailModal, #salesGuideModal, #transfersModal, #allMemosModal, .modal-backdrop');
        let closedAny = false;
        modals.forEach(m => {
            if(m && !m.classList.contains("hidden")) {
                m.classList.add("hidden");
                closedAny = true;
            }
        });
        if(!closedAny) {
            const dash = document.querySelector("#analyticsDashboard");
            if(dash && !dash.classList.contains("hidden")) {
                dash.classList.add("opacity-0");
                setTimeout(() => dash.classList.add("hidden"), 300);
            }
        }
    }
    
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if(document.activeElement && document.activeElement.tagName === 'INPUT') return;
        e.preventDefault();
        restoreHistoryState();
    }

    const dashModal = document.querySelector("#dashDetailModal");
    if(dashModal && !dashModal.classList.contains("hidden")) {
        if(e.key === "ArrowLeft") $("#prevDashBtn")?.click();
        if(e.key === "ArrowRight") $("#nextDashBtn")?.click();
    }
});

function applyMeta(meta){
    if(meta) {
        let headerArea = $("#globalHeaderData");
        if(!headerArea) {
            const mainWrap = $("#q")?.closest('.max-w-md, .max-w-lg, .max-w-xl, .max-w-2xl, .container') || document.body;
            headerArea = document.createElement("div");
            headerArea.id = "globalHeaderData";
            headerArea.className = "flex flex-col mb-4 w-full px-1";
            mainWrap.insertBefore(headerArea, mainWrap.firstChild);
        }

        let addInfo = SALES_HISTORY.meta?.name ? `<span class="text-xs text-orange-600 font-bold ml-2">📊 판매DB: ${escapeHtml(SALES_HISTORY.meta.name)}</span>` : "";
        let promoInfo = (PROMOTIONS && PROMOTIONS.meta && PROMOTIONS.meta.name) ? `<span class="text-xs text-purple-600 font-bold ml-2">🎁 기획전: ${escapeHtml(PROMOTIONS.meta.name)}</span>` : "";

        headerArea.innerHTML = `
            <div class="flex justify-between items-end w-full border-b border-gray-200 pb-3">
                <h1 class="text-2xl font-black text-gray-900 tracking-tight">📦 통합 재고조회</h1>
                <div class="text-right flex flex-col items-end">
                    <span class="text-xs font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-1 rounded shadow-sm">✓ 최근 동기화: ${meta.uploadedAt || ''}</span>
                    <div class="mt-1.5 flex items-center">${addInfo}${promoInfo}</div>
                </div>
            </div>
        `;

        const statSrcEl = $("#statSrc");
        if(statSrcEl) statSrcEl.innerHTML = "";
    }
}

async function loadData(force = false){
  const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
  if (!force && cached && (Date.now() - (cached._timestamp||0) < 60000)) {
      RAW = cached.rows || []; CURRENT_META = cached.meta; IMAGES = cached.images || {}; MEMOS = cached.memos || []; TRANSFERS = cached.transfers || []; PROMOTIONS = cached.promotions || {}; SALES_GUIDES = cached.salesGuides || {}; SALES_HISTORY = cached.salesHistory || { meta: {}, items: {} };
      applyMeta(CURRENT_META); rebuildIndex(); render(); setupSearchAutocomplete(); setupQuickActionBar(); return;
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
      const invData = await invRes.json(); RAW = invData.rows || []; CURRENT_META = invData.meta;
      if(imgRes && imgRes.ok) IMAGES = await imgRes.json(); else IMAGES = {};
      if(memoRes && memoRes.ok) MEMOS = await memoRes.json(); else MEMOS = [];
      if(trRes && trRes.ok) TRANSFERS = await trRes.json(); else TRANSFERS = [];
      if(promoRes && promoRes.ok) PROMOTIONS = await promoRes.json(); else PROMOTIONS = {};
      if(sgRes && sgRes.ok) SALES_GUIDES = await sgRes.json(); else SALES_GUIDES = {};
      if(shRes && shRes.ok) SALES_HISTORY = await shRes.json(); else SALES_HISTORY = { meta: {}, items: {} };
      
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rows: RAW, meta: CURRENT_META, images: IMAGES, memos: MEMOS, transfers: TRANSFERS, promotions: PROMOTIONS, salesGuides: SALES_GUIDES, salesHistory: SALES_HISTORY, _timestamp: Date.now() }));
      applyMeta(CURRENT_META); rebuildIndex(); render(); setupSearchAutocomplete(); setupQuickActionBar();
  } catch(e) { console.error("Data Load Error", e); }
}

function utf8ToB64(str){ return btoa(unescape(encodeURIComponent(str))); }

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

function generateSizeOptionsHtml(sizesSet) {
    const arr = Array.from(sizesSet).map(s => String(s).trim()).filter(Boolean);
    const apOrder = {"XS":1, "S":2, "M":3, "L":4, "XL":5, "2XL":6, "XXL":6, "3XL":7, "FREE":8, "OS":9, "F":10};
    arr.sort((a,b) => {
        if (isFwSize(a) && isFwSize(b)) return parseInt(a) - parseInt(b);
        return (apOrder[a.toUpperCase()]||99) - (apOrder[b.toUpperCase()]||99);
    });
    return arr.map(s => `<option value="${s}">${s}</option>`).join('');
}

function rebuildIndex(){
  const map = new Map();
  const prevRaw = JSON.parse(localStorage.getItem('PREV_RAW') || '[]');
  const allSizesFw = new Set(); 
  const allSizesAp = new Set(); 
  const allSizesGear = new Set(); 
  const activeWeeklyCat = getActiveWeeklyCategory(); 
  
  if($("#statItems")) $("#statItems").className = ($("#statItems").className || "").replace(/text-(pink|red)-\d+/g, '') + " text-gray-900";
  if($("#statBusan")) $("#statBusan").className = ($("#statBusan").className || "").replace(/text-(pink|red)-\d+/g, '') + " text-gray-900";

  for(const r of RAW){
    const code = r["품번"]; if(!code) continue;
    const size = String(r["규격"]||"").trim();
    if(size) {
        if (isFwSize(size)) allSizesFw.add(size);
        else if (/^[SMLX]+$/i.test(size) || size.toUpperCase()==='FREE' || size.toUpperCase()==='OS' || size.toUpperCase()==='F') allSizesAp.add(size);
        else allSizesGear.add(size);
    }

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

    if (PROMOTIONS && PROMOTIONS.items && PROMOTIONS.items[p.품번]) {
        const promo = PROMOTIONS.items[p.품번];
        if (promo.targetCat === activeWeeklyCat && promo.weeklyPrice && promo.weeklyPrice < p.소비자가) {
            p.currentPromoPrice = promo.weeklyPrice; p.promoType = 'weekly';
            p.promoRate = promo.weeklyRate || ((p.소비자가 - promo.weeklyPrice) / p.소비자가);
            if(promo.targetCat === 'FOOTWEAR') p.promoEndDate = '5/15'; else if(promo.targetCat === 'APPAREL') p.promoEndDate = '5/22'; else p.promoEndDate = '5/29';
        } else if (promo.finalPrice && promo.finalPrice < p.소비자가) {
            p.currentPromoPrice = promo.finalPrice; p.promoType = 'general';
            p.promoRate = promo.finalRate || ((p.소비자가 - promo.finalPrice) / p.소비자가); p.promoEndDate = '5/29'; 
        }
    }
    p._hay = [p.품번||"", p.품명||"", p.브랜드||"", p.카테고리||""].join(" ").toLowerCase();
    p._hayClean = p._hay.replace(/[\s\-_]/g, ""); 
    p._chosung = getChosung(p._hayClean); 
    return p;
  });

  if(!$("#sizeSelFw") && $("#sortSel")) {
      const container = document.createElement("div");
      container.className = "flex gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto shrink-0 mt-3 sm:mt-0";
      
      const createSel = (id, label, optionsHtml) => {
          return `<select id="${id}" class="ipt text-sm font-bold bg-white border-gray-300 rounded px-3 py-2 outline-none flex-1 sm:flex-none">
                     <option value="ALL">📏 ${label}</option>${optionsHtml}
                  </select>`;
      };

      container.innerHTML = 
          createSel("sizeSelFw", "신발", generateSizeOptionsHtml(allSizesFw)) +
          createSel("sizeSelAp", "의류", generateSizeOptionsHtml(allSizesAp)) +
          createSel("sizeSelGear", "용품", generateSizeOptionsHtml(allSizesGear));

      $("#sortSel").parentNode.insertBefore(container, $("#sortSel"));

      const handleSizeChange = (e) => {
          saveHistoryState();
          if(e.target.id === "sizeSelFw") { $("#sizeSelAp").value = "ALL"; $("#sizeSelGear").value = "ALL"; }
          if(e.target.id === "sizeSelAp") { $("#sizeSelFw").value = "ALL"; $("#sizeSelGear").value = "ALL"; }
          if(e.target.id === "sizeSelGear") { $("#sizeSelFw").value = "ALL"; $("#sizeSelAp").value = "ALL"; }
          visibleCount=60; render();
      };
      
      $("#sizeSelFw").onchange = handleSizeChange;
      $("#sizeSelAp").onchange = handleSizeChange;
      $("#sizeSelGear").onchange = handleSizeChange;
  }
  
  if($("#sortSel") && !$("#sortSel").querySelector('option[value="salesDesc"]')) {
      const opt = document.createElement("option"); opt.value = "salesDesc"; opt.innerHTML = "🔥 전체 판매량순";
      $("#sortSel").appendChild(opt);
  }

  let promoWrap = $("#promoFilters");
  if (!promoWrap && PROMOTIONS && PROMOTIONS.meta) {
      promoWrap = document.createElement("div"); promoWrap.id = "promoFilters";
      promoWrap.className = "flex gap-2 mb-4 items-center w-full overflow-x-auto no-scrollbar pb-1";
      $("#brandChips").parentNode.insertBefore(promoWrap, $("#brandChips"));
  }
  if (PROMOTIONS && PROMOTIONS.meta && Object.keys(PROMOTIONS.items || {}).length > 0) {
      if(promoWrap) {
          promoWrap.innerHTML = `
              <select id="promoTypeSel" class="ipt text-sm font-bold bg-white border-purple-200 text-purple-700 rounded px-3 py-1.5 hidden shrink-0 outline-none"><option value="ALL">기획전 전체보기</option><option value="weekly">🔥 위클리특가만</option><option value="general">🎟️ 쿠폰사용가능만</option></select>
              <select id="promoRateSel" class="ipt text-sm font-bold bg-white border-purple-200 text-purple-700 rounded px-3 py-1.5 hidden shrink-0 outline-none"><option value="0">할인율 전체</option><option value="10">🔥 10% 할인</option><option value="20">🔥 20% 할인</option><option value="30">🔥 30% 할인</option></select>
          `;
          $("#promoTypeSel").onchange = () => { saveHistoryState(); visibleCount=60; render(); };
          $("#promoRateSel").onchange = () => { saveHistoryState(); visibleCount=60; render(); };
      }
  } else if (promoWrap) { promoWrap.innerHTML = ""; }

  const brandCounts = {};
  PRODUCTS.forEach(p => { if(p.브랜드) brandCounts[p.브랜드] = (brandCounts[p.브랜드]||0) + 1; });
  const sortedBrands = Object.entries(brandCounts).sort((a,b) => b[1] - a[1]).map(x => x[0]);
  const topBrands = sortedBrands.slice(0, 7);
  const restBrands = sortedBrands.slice(7);

  const wrap = $("#brandChips"); 
  wrap.innerHTML = '<button class="chip px-4 py-2 rounded-full text-sm font-bold shrink-0" data-brand="ALL" data-active="1">전체</button>';
  
  wrap.querySelector('[data-brand="ALL"]').onclick = function() {
      saveHistoryState();
      $$('#brandChips .chip').forEach(c=>c.dataset.active=(c===this?"1":"0")); visibleCount=60; render();
  };
  
  topBrands.forEach(b => {
      const btn = document.createElement("button"); btn.className="chip px-4 py-2 rounded-full text-sm font-bold shrink-0"; btn.dataset.brand=b; btn.textContent=b;
      btn.onclick = ()=>{ saveHistoryState(); $$('#brandChips .chip').forEach(c=>c.dataset.active=(c===btn?"1":"0")); visibleCount=60; render(); };
      wrap.appendChild(btn);
  });

  if (restBrands.length > 0) {
      const moreBtn = document.createElement("button");
      moreBtn.className="chip px-4 py-2 rounded-full text-sm font-black shrink-0 bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100";
      moreBtn.innerHTML = "브랜드 더보기 ▾";
      moreBtn.onclick = (e) => {
          const isHidden = !$$('.chip-extra')[0].classList.contains('brand-hidden');
          if(!isHidden) {
              $$('.chip-extra').forEach(c => c.classList.remove('brand-hidden'));
              moreBtn.innerHTML = "접기 ▴";
          } else {
              $$('.chip-extra').forEach(c => c.classList.add('brand-hidden'));
              moreBtn.innerHTML = "브랜드 더보기 ▾";
          }
      };
      wrap.appendChild(moreBtn);

      restBrands.forEach(b => {
          const btn = document.createElement("button"); btn.className="chip chip-extra brand-hidden px-4 py-2 rounded-full text-sm font-bold shrink-0"; btn.dataset.brand=b; btn.textContent=b;
          btn.onclick = ()=>{ saveHistoryState(); $$('#brandChips .chip').forEach(c=>c.dataset.active=(c===btn?"1":"0")); visibleCount=60; render(); };
          wrap.appendChild(btn);
      });
  }
  
  if($("#statItems")) $("#statItems").textContent = fmt(PRODUCTS.length);
  if($("#statBusan")) $("#statBusan").textContent = fmt(PRODUCTS.reduce((a,p)=>a+p.busanTotal,0));
}

function setupQuickActionBar() {
    if($("#quickActionBar")) return;
    const qContainer = $("#q")?.parentNode;
    if(!qContainer) return;

    const actionHtml = `
        <div id="quickActionBar" class="flex gap-3 justify-end mt-3 mb-2 w-full">
            <button onclick="window.openAnalyticsReport()" class="bg-gray-50 text-gray-700 py-2 px-4 border border-gray-200 rounded-lg font-bold shadow-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-sm">
                <i data-lucide="bar-chart-2" class="w-4 h-4"></i> 분석 리포트
            </button>
            ${(PROMOTIONS && PROMOTIONS.meta && Object.keys(PROMOTIONS.items || {}).length > 0) ? `
            <button onclick="window.togglePromoView(this)" class="bg-purple-50 text-purple-700 py-2 px-4 border border-purple-200 rounded-lg font-bold shadow-sm hover:bg-purple-100 transition-colors flex items-center justify-center gap-2 text-sm" data-active="0">
                <i data-lucide="gift" class="w-4 h-4"></i> 기획전 보기
            </button>` : ''}
        </div>
    `;
    qContainer.insertAdjacentHTML('afterend', actionHtml);
    if(window.lucide) lucide.createIcons();
}

window.togglePromoView = (btn, bypassRender = false) => {
    if(!bypassRender) saveHistoryState();
    const isActive = btn.dataset.active === "1";
    btn.dataset.active = isActive ? "0" : "1";
    if(!isActive) {
        btn.classList.replace("bg-purple-50", "bg-purple-600");
        btn.classList.replace("text-purple-700", "text-white");
        btn.innerHTML = `<i data-lucide="x-circle" class="w-4 h-4"></i> 기획전 필터 해제`;
        window.tempPromoFilter = true;
        $("#promoTypeSel")?.classList.remove("hidden");
        $("#promoRateSel")?.classList.remove("hidden");
    } else {
        btn.classList.replace("bg-purple-600", "bg-purple-50");
        btn.classList.replace("text-white", "text-purple-700");
        btn.innerHTML = `<i data-lucide="gift" class="w-4 h-4"></i> 기획전 보기`;
        window.tempPromoFilter = false;
        $("#promoTypeSel")?.classList.add("hidden");
        $("#promoRateSel")?.classList.add("hidden");
    }
    if(window.lucide) lucide.createIcons();
    if(!bypassRender) { visibleCount=60; render(); }
};

function setupSearchAutocomplete() {
    const qEl = document.getElementById("q");
    if(!qEl || qEl.dataset.acSetup === "1") return;
    qEl.dataset.acSetup = "1";
    
    let wrapper = qEl.parentNode;
    if(!wrapper.classList.contains("relative")) {
        wrapper.classList.add("relative");
        const sugg = document.createElement("div");
        sugg.id = "searchSuggestions";
        sugg.className = "absolute w-full bg-white border border-gray-200 rounded-xl shadow-2xl hidden top-full mt-2 left-0 flex flex-col z-[999] overflow-hidden";
        wrapper.appendChild(sugg);
    }

    const suggBox = document.getElementById("searchSuggestions");

    const showRecent = () => {
        if(RECENT_SEARCHES.length === 0) { suggBox.classList.add("hidden"); return; }
        suggBox.innerHTML = `
            <div class="p-3 bg-gray-50 text-xs font-bold text-gray-500 border-b flex justify-between items-center">
                <span>🕒 최근 검색어</span>
                <span class="cursor-pointer hover:text-red-500 bg-white px-2 py-1 rounded border shadow-sm" onclick="clearRecentSearches(event)">전체삭제</span>
            </div>
            ${RECENT_SEARCHES.map(t => `
                <div class="p-3.5 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex justify-between items-center group" onclick="applySearch('${escapeHtml(t).replace(/'/g, "\\'")}')">
                    <div class="font-bold text-gray-800 text-sm">${escapeHtml(t)}</div>
                    <i data-lucide="search" class="w-4 h-4 text-gray-300 group-hover:text-blue-500"></i>
                </div>
            `).join('')}
        `;
        suggBox.classList.remove("hidden");
        if(window.lucide) lucide.createIcons();
    };

    qEl.addEventListener("focus", () => { if(!qEl.value.trim()) showRecent(); });
    document.addEventListener("click", (e) => { if(!qEl.contains(e.target) && !suggBox.contains(e.target)) suggBox.classList.add("hidden"); });
    qEl.addEventListener("keydown", (e) => { 
        if(e.key === "Enter" && qEl.value.trim()) { 
            saveHistoryState();
            suggBox.classList.add("hidden"); 
            saveRecentSearch(qEl.value.trim()); 
            visibleCount=60; render();
        } 
    });

    let debounceTimer;
    qEl.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(saveHistoryState, 500); 
        
        const val = e.target.value.trim().toLowerCase();
        const cleanVal = val.replace(/[\s\-_]/g, "");
        if(!cleanVal) { showRecent(); return; }

        let matches = PRODUCTS.filter(p => p._hayClean.includes(cleanVal) || p._chosung.includes(cleanVal)).slice(0, 5);
        if(matches.length === 0) { suggBox.classList.add("hidden"); return; }

        suggBox.innerHTML = `
            <div class="p-3 bg-gray-50 text-xs font-bold text-gray-500 border-b">✨ 상품 자동완성</div>
            ${matches.map(p => `
            <div class="p-3 border-b border-gray-50 hover:bg-blue-50 cursor-pointer flex gap-3 items-center" onclick="applySearch('${p.품번}')">
                ${IMAGES[p.shopNo] ? `<img src="${IMAGES[p.shopNo]}" class="w-12 h-12 object-contain rounded bg-white border border-gray-100 mix-blend-multiply">` : `<div class="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400 font-bold border border-gray-200">NO IMG</div>`}
                <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold text-gray-400 truncate">${p.브랜드} | ${p.품번}</span>
                    <span class="text-[15px] font-black text-gray-900 truncate">${p.품명}</span>
                </div>
            </div>`).join('')}
        `;
        suggBox.classList.remove("hidden");
    });
}

window.applySearch = (term) => {
    saveHistoryState();
    const qEl = document.getElementById("q");
    qEl.value = term;
    document.getElementById("searchSuggestions").classList.add("hidden");
    saveRecentSearch(term);
    visibleCount=60; render();
};

window.saveRecentSearch = (term) => {
    if(!term) return;
    RECENT_SEARCHES = RECENT_SEARCHES.filter(t => t !== term);
    RECENT_SEARCHES.unshift(term);
    if(RECENT_SEARCHES.length > 10) RECENT_SEARCHES.pop();
    localStorage.setItem('RECENT_SEARCHES_V4', JSON.stringify(RECENT_SEARCHES));
};

window.clearRecentSearches = (e) => {
    e.stopPropagation();
    RECENT_SEARCHES = [];
    localStorage.removeItem('RECENT_SEARCHES_V4');
    document.getElementById("searchSuggestions").classList.add("hidden");
};

async function loadChartJS() {
    return new Promise((resolve) => {
        if (window.Chart && window.ChartDataLabels) return resolve();
        if (!window.Chart) {
            const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => {
                if (!window.ChartDataLabels) {
                    const plugin = document.createElement('script'); plugin.src = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0';
                    plugin.onload = () => { Chart.register(ChartDataLabels); resolve(); };
                    document.head.appendChild(plugin);
                } else resolve();
            };
            document.head.appendChild(script);
        } else if (!window.ChartDataLabels) {
            const plugin = document.createElement('script'); plugin.src = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0';
            plugin.onload = () => { Chart.register(ChartDataLabels); resolve(); };
            document.head.appendChild(plugin);
        }
    });
}

window.quickRT = async (code, size, fromStr, qty, btn) => {
    if(!checkPat()) return;
    const p = PRODUCTS.find(x => x.품번 === code);
    if(!p) return;
    qty = Number(qty);
    if(qty <= 0) return;

    const origHtml = btn.innerHTML;
    const origClass = btn.className;
    
    btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i>`;
    btn.className = origClass.replace(/(bg-\w+-\d+|hover:bg-\w+-\d+|text-\w+)/g, '') + ' bg-green-500 text-white cursor-default';
    btn.disabled = true;
    if(window.lucide) lucide.createIcons();

    const trId = "tr_" + Date.now();
    const d = new Date();
    const shortDate = `${d.getFullYear().toString().substr(2)}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const finalMemo = `[${fromStr} ➡️ 부산점] 스마트보충 RT요청`;

    TRANSFERS.push({ id: trId, code: code, product: p.품명, date: shortDate, size: size, qty: qty, memo: finalMemo });
    
    let apiPromise = fetch(`https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${TRANSFERS_PATH}?t=${Date.now()}`, {headers:{Authorization:"Bearer "+getPat()}})
        .then(r => r.json())
        .then(j => {
            const body = { message:"add smart transfer", content: utf8ToB64(JSON.stringify(TRANSFERS, null, 2)), branch: GH.branch, sha: j.sha };
            return fetch(`https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${TRANSFERS_PATH}`, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
        }).catch(err => console.error(err));

    showToast(`📦 ${fromStr}에서 ${size} 사이즈 ${qty}개 RT를 요청했습니다.`, async () => {
        btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>`;
        
        TRANSFERS = TRANSFERS.filter(t => t.id !== trId);
        await apiPromise; 
        
        try {
            const r = await fetch(`https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${TRANSFERS_PATH}?t=${Date.now()}`, {headers:{Authorization:"Bearer "+getPat()}});
            const j = await r.json();
            const body = { message:"undo smart transfer", content: utf8ToB64(JSON.stringify(TRANSFERS, null, 2)), branch: GH.branch, sha: j.sha };
            await fetch(`https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${TRANSFERS_PATH}`, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
        } catch(err) {}
        
        btn.innerHTML = origHtml;
        btn.className = origClass;
        btn.disabled = false;
        if(window.lucide) lucide.createIcons();
    });
};

window.exportTransfersToExcel = () => {
    if(TRANSFERS.length === 0) { alert("다운로드할 이동 요청 데이터가 없습니다."); return; }
    if(!window.XLSX || !window.XLSX.writeFile) {
        alert("엑셀 모듈 로딩중입니다. 잠시 후 다시 시도해주세요.");
        const s = document.createElement('script'); s.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js'; document.head.appendChild(s); return;
    }
    const wsData = TRANSFERS.map(t => ({ "요청일자": t.date, "품번": t.code, "품명": t.product, "사이즈": t.size, "수량": t.qty, "메모": t.memo }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "이동요청목록");
    const d = new Date();
    XLSX.writeFile(wb, `RT이동요청_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.xlsx`);
};

window.openAnalyticsReport = async () => {
    await loadChartJS();
    let dashFilter = { cat: null, brand: null, gender: null };
    let currentPeriod = "7"; 
    let currentCustomStart = "";
    let currentCustomEnd = "";
    
    let currentSizeFw = "ALL";
    let currentSizeAp = "ALL";
    let currentSizeGear = "ALL";
    
    let currentDashSort = "qty"; // 판매수량순 or 판매금액순
    let currentDashBrand = "ALL"; // 대시보드 내 브랜드 필터

    const generateDateOptions = () => {
        const now = new Date(); let html = '';
        html += '<optgroup label="월간 조회">';
        for(let i=0; i<4; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2,'0');
            const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
            const val = `EXACT_${y}-${m}-01_${y}-${m}-${lastDay}`;
            html += `<option value="${val}">${y}년 ${d.getMonth() + 1}월</option>`;
        }
        html += '</optgroup><optgroup label="주간 조회">';
        const curr = new Date(now);
        const day = curr.getDay(); const diff = curr.getDate() - day + (day === 0 ? -6 : 1); 
        let monday = new Date(curr.setDate(diff));

        for(let i=0; i<5; i++) {
            let sun = new Date(monday); sun.setDate(monday.getDate() + 6);
            const y1 = monday.getFullYear(); const m1 = String(monday.getMonth()+1).padStart(2,'0'); const d1 = String(monday.getDate()).padStart(2,'0');
            const y2 = sun.getFullYear(); const m2 = String(sun.getMonth()+1).padStart(2,'0'); const d2 = String(sun.getDate()).padStart(2,'0');
            const weekNum = Math.ceil(monday.getDate() / 7);
            const val = `EXACT_${y1}-${m1}-${d1}_${y2}-${m2}-${d2}`;
            html += `<option value="${val}">${y1}년 ${monday.getMonth()+1}월 ${weekNum}주차 (${m1}/${d1}~${m2}/${d2})</option>`;
            monday.setDate(monday.getDate() - 7); 
        }
        html += '</optgroup>';
        return html;
    };

    const allSizesFwSet = new Set();
    const allSizesApSet = new Set();
    const allSizesGearSet = new Set();
    PRODUCTS.forEach(p => {
        p.sizes.forEach(s => {
            const size = String(s.size).trim();
            if (isFwSize(size)) allSizesFwSet.add(size);
            else if (/^[SMLX]+$/i.test(size) || size.toUpperCase()==='FREE' || size.toUpperCase()==='OS' || size.toUpperCase()==='F') allSizesApSet.add(size);
            else allSizesGearSet.add(size);
        });
    });

    const getPeriodItems = (period, start, end) => {
        let items = [];
        let cutoffDate = "0000-00-00"; let endDate = "9999-99-99";
        if (period === "CUSTOM") { cutoffDate = start || "0000-00-00"; endDate = end || "9999-99-99"; } 
        else if (period && period !== "ALL") {
            const d = new Date(Date.now() - Number(period) * 86400000); cutoffDate = d.toISOString().split('T')[0];
        }

        const activeSizeFilter = [currentSizeFw, currentSizeAp, currentSizeGear].find(s => s !== "ALL") || "ALL";

        PRODUCTS.forEach(p => {
            let busanSales = 0; let sinsaSales = 0; let centerSales = 0;
            let sizeSalesMap = {};

            if (SALES_HISTORY.items && SALES_HISTORY.items[p.품번]) {
                for (let date in SALES_HISTORY.items[p.품번]) {
                    if (period === "ALL" || (date >= cutoffDate && date <= endDate)) {
                        const dayData = SALES_HISTORY.items[p.품번][date];
                        if (typeof dayData === 'number') {
                            busanSales += dayData; sizeSalesMap["알수없음"] = (sizeSalesMap["알수없음"] || 0) + dayData;
                        } else if (typeof dayData === 'object') {
                            for (let size in dayData) {
                                if (typeof dayData[size] === 'object') {
                                    for(let mgr in dayData[size]) {
                                        const qty = dayData[size][mgr];
                                        if(mgr.includes("김종훈") || mgr.includes("부산")) { busanSales += qty; sizeSalesMap[size] = (sizeSalesMap[size] || 0) + qty; }
                                        if(mgr.includes("승호") || mgr.includes("강") || mgr.includes("신사")) { sinsaSales += qty; }
                                        if(mgr.includes("물류") || mgr.includes("본사") || mgr.includes("온라인")) { centerSales += qty; }
                                    }
                                } else {
                                    busanSales += dayData[size]; sizeSalesMap[size] = (sizeSalesMap[size] || 0) + dayData[size];
                                }
                            }
                        }
                    }
                }
            }

            p.dashBusanSalesTotal = busanSales; p.dashSinsaSalesTotal = sinsaSales; p.dashCenterSalesTotal = centerSales;
            p.dashSizeSalesMap = sizeSalesMap;

            let finalSales = activeSizeFilter === "ALL" ? busanSales : (sizeSalesMap[activeSizeFilter] || 0);
            if(finalSales > 0) items.push({ ...p, dashSales: finalSales, dashRev: finalSales * (p.currentPromoPrice || p.소비자가 || 0) });
        });
        return items.sort((a, b) => b.dashSales - a.dashSales);
    };

    let rawSoldItems = [];
    let catChartInstance = null; let brandChartInstance = null; let genderChartInstance = null;

    const renderDashUI = () => {
        let modal = $("#analyticsDashboard");
        if (!modal) {
            modal = document.createElement("div"); modal.id = "analyticsDashboard";
            modal.className = "fixed inset-0 z-[105] bg-gray-50 flex flex-col transition-opacity duration-300 opacity-0";
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <header class="bg-white border-b border-gray-100 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 gap-4 shadow-sm">
                <div>
                    <h1 class="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">📈 부산점 판매 리포트 (담당: 김종훈)</h1>
                    <p id="dashTotalLabel" class="text-sm font-bold text-gray-500 mt-1.5"></p>
                </div>
                <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <select id="dashBrandSel" class="ipt text-xs font-black bg-white border-gray-300 rounded px-2.5 py-2.5 outline-none w-28 text-gray-700">
                        <option value="ALL">브랜드 필터</option>
                    </select>
                    <select id="dashSizeFw" class="ipt text-xs font-black bg-white border-gray-300 rounded px-2.5 py-2.5 outline-none w-24 text-gray-700"><option value="ALL">신발</option>${generateSizeOptionsHtml(allSizesFwSet)}</select>
                    <select id="dashSizeAp" class="ipt text-xs font-black bg-white border-gray-300 rounded px-2.5 py-2.5 outline-none w-24 text-gray-700"><option value="ALL">의류</option>${generateSizeOptionsHtml(allSizesApSet)}</select>
                    <select id="dashSizeGear" class="ipt text-xs font-black bg-white border-gray-300 rounded px-2.5 py-2.5 outline-none w-24 text-gray-700"><option value="ALL">용품</option>${generateSizeOptionsHtml(allSizesGearSet)}</select>
                    <div class="w-px h-6 bg-gray-200 mx-1"></div>
                    <select id="dashPeriodSel" class="ipt text-xs font-black bg-orange-50 border-orange-200 text-orange-800 rounded px-3 py-2.5 outline-none cursor-pointer">
                        <optgroup label="빠른 기간">
                            <option value="1">어제/오늘 (1일)</option><option value="7" selected>최근 7일</option><option value="30">최근 1개월</option>
                            <option value="90">최근 3개월 (분기)</option><option value="180">최근 6개월 (반기)</option><option value="ALL">전체 누적실적</option>
                            <option value="CUSTOM_INPUT">📅 직접 지정</option>
                        </optgroup>
                        ${generateDateOptions()}
                    </select>
                    <div id="dashCustomDateWrap" class="hidden items-center gap-1.5 bg-white p-1.5 border border-orange-200 rounded">
                        <input type="date" id="dashStart" class="ipt text-xs px-2 py-1.5 w-[110px] border-none outline-none text-gray-600 font-bold cursor-pointer"> ~
                        <input type="date" id="dashEnd" class="ipt text-xs px-2 py-1.5 w-[110px] border-none outline-none text-gray-600 font-bold cursor-pointer">
                        <button id="dashApply" class="px-4 py-1.5 bg-orange-500 text-white rounded text-xs font-black shrink-0 hover:bg-orange-600">적용</button>
                    </div>
                    <button id="closeDashboardBtn" class="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors ml-auto md:ml-2"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
            </header>
            <main class="flex-1 overflow-hidden p-4 lg:p-6">
                <div class="h-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <section class="lg:col-span-1 flex flex-col gap-4 overflow-y-auto dash-scroll pr-2 pb-10">
                        <article class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[260px]">
                            <h2 class="text-base font-black text-gray-800 mb-2 flex items-center gap-2 shrink-0"><i data-lucide="pie-chart" class="w-5 h-5 text-blue-500"></i> 카테고리 비중</h2>
                            <div class="relative flex-1 w-full"><canvas id="catChart"></canvas></div>
                        </article>
                        <article class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[260px]">
                            <h2 class="text-base font-black text-gray-800 mb-2 flex items-center gap-2 shrink-0"><i data-lucide="users" class="w-5 h-5 text-pink-500"></i> 성별 비중</h2>
                            <div class="relative flex-1 w-full"><canvas id="genderChart"></canvas></div>
                        </article>
                        <article class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[260px]">
                            <h2 class="text-base font-black text-gray-800 mb-2 flex items-center gap-2 shrink-0"><i data-lucide="award" class="w-5 h-5 text-emerald-500"></i> 브랜드 비중</h2>
                            <div class="relative flex-1 w-full"><canvas id="brandChart"></canvas></div>
                        </article>
                    </section>
                    <section class="lg:col-span-3 flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div class="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <h2 class="text-base font-black text-gray-800 flex items-center gap-2"><i data-lucide="list" class="w-5 h-5 text-orange-500"></i> 판매 랭킹 (클릭 시 사이즈 상세분석 및 RT요청)</h2>
                            <div class="flex items-center gap-3">
                                <select id="dashSortSel" class="ipt text-sm font-bold bg-white border border-gray-200 text-gray-700 rounded px-3 py-1.5 outline-none cursor-pointer">
                                    <option value="qty">수량순 정렬</option>
                                    <option value="rev">금액순 정렬</option>
                                </select>
                                <div id="activeFilterLabel" class="text-sm font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg hidden cursor-pointer hover:bg-blue-100 transition-colors shadow-sm"></div>
                            </div>
                        </div>
                        <div id="dashListBody" class="flex-1 overflow-y-auto dash-scroll p-5 space-y-3"></div>
                    </section>
                </div>
            </main>
        `;

        $("#dashPeriodSel").value = "7";
        $("#dashPeriodSel").onchange = (e) => {
            const val = e.target.value;
            if(val === "CUSTOM_INPUT") {
                $("#dashCustomDateWrap").classList.replace("hidden", "flex");
            } else {
                $("#dashCustomDateWrap").classList.replace("flex", "hidden");
                if (val.startsWith("EXACT_")) { const parts = val.split('_'); currentPeriod = "CUSTOM"; currentCustomStart = parts[1]; currentCustomEnd = parts[2]; } 
                else { currentPeriod = val; }
                dashFilter = { cat: null, brand: null, gender: null }; updateDashData();
            }
        };

        const handleDashSizeChange = (e) => {
            if(e.target.id === "dashSizeFw") { $("#dashSizeAp").value = "ALL"; $("#dashSizeGear").value = "ALL"; }
            if(e.target.id === "dashSizeAp") { $("#dashSizeFw").value = "ALL"; $("#dashSizeGear").value = "ALL"; }
            if(e.target.id === "dashSizeGear") { $("#dashSizeFw").value = "ALL"; $("#dashSizeAp").value = "ALL"; }
            
            currentSizeFw = $("#dashSizeFw").value;
            currentSizeAp = $("#dashSizeAp").value;
            currentSizeGear = $("#dashSizeGear").value;
            updateDashData();
        };

        $("#dashSizeFw").onchange = handleDashSizeChange;
        $("#dashSizeAp").onchange = handleDashSizeChange;
        $("#dashSizeGear").onchange = handleDashSizeChange;

        $("#dashBrandSel").onchange = (e) => {
            currentDashBrand = e.target.value;
            renderDashState();
        };

        $("#dashSortSel").onchange = (e) => {
            currentDashSort = e.target.value;
            renderDashState();
        };

        $("#dashApply").onclick = () => {
            if(!$("#dashStart").value || !$("#dashEnd").value) { alert("날짜를 모두 선택해주세요."); return; }
            currentPeriod = "CUSTOM"; currentCustomStart = $("#dashStart").value; currentCustomEnd = $("#dashEnd").value;
            dashFilter = { cat: null, brand: null, gender: null }; updateDashData();
        };

        $("#closeDashboardBtn").onclick = () => { modal.classList.add("opacity-0"); setTimeout(() => modal.classList.add("hidden"), 300); };
        if(window.lucide) lucide.createIcons();
    };

    const updateDashData = () => {
        rawSoldItems = getPeriodItems(currentPeriod, currentCustomStart, currentCustomEnd);
        
        // 브랜드 셀렉트 박스 업데이트
        const brandSet = new Set();
        rawSoldItems.forEach(p => { if(p.브랜드) brandSet.add(p.브랜드); });
        const brandOptions = Array.from(brandSet).sort().map(b => `<option value="${b}" ${b===currentDashBrand?'selected':''}>${b}</option>`).join('');
        $("#dashBrandSel").innerHTML = `<option value="ALL">브랜드 필터</option>${brandOptions}`;
        
        renderDashState();
    };

    const renderDashState = () => {
        let filteredItems = rawSoldItems.filter(p => {
            if (dashFilter.cat && p.카테고리 !== dashFilter.cat) return false;
            if (dashFilter.brand && p.브랜드 !== dashFilter.brand) return false;
            if (currentDashBrand !== "ALL" && p.브랜드 !== currentDashBrand) return false;

            let g = p.성별 || p.gender || "U";
            if(g === "M" || g === "남성" || g === "남") g = "남성"; else if(g === "W" || g === "여성" || g === "여") g = "여성"; else g = "공용/기타";
            if (dashFilter.gender && g !== dashFilter.gender) return false;
            return true;
        });

        // 정렬 적용
        filteredItems.sort((a, b) => {
            if(currentDashSort === 'rev') return b.dashRev - a.dashRev;
            return b.dashSales - a.dashSales;
        });

        windowDashItems = filteredItems;

        let totalSales = 0; let totalRev = 0;
        let catData = {}; let brandData = {}; let genderData = {};

        filteredItems.forEach(p => {
            totalSales += p.dashSales; totalRev += p.dashRev;
            catData[p.카테고리||"기타"] = (catData[p.카테고리||"기타"] || 0) + p.dashSales;
            brandData[p.브랜드||"기타"] = (brandData[p.브랜드||"기타"] || 0) + p.dashSales;
            let g = p.성별 || p.gender || "U";
            if(g === "M" || g === "남성" || g === "남") g = "남성"; else if(g === "W" || g === "여성" || g === "여") g = "여성"; else g = "공용/기타";
            genderData[g] = (genderData[g] || 0) + p.dashSales;
        });

        const activeSizeFilter = [currentSizeFw, currentSizeAp, currentSizeGear].find(s => s !== "ALL") || "ALL";
        let sizeText = activeSizeFilter === "ALL" ? "" : ` <span class="bg-gray-800 text-white px-2 py-0.5 rounded ml-1">[${activeSizeFilter} 사이즈 필터됨]</span>`;
        $("#dashTotalLabel").innerHTML = `조회기간 내 총 <span class="text-blue-600 font-black text-base">${fmt(totalSales)}개</span> / <span class="text-orange-600 font-black text-base">${krw(totalRev)}</span> 판매${sizeText}`;

        const filterLabel = $("#activeFilterLabel"); let labelText = [];
        if (dashFilter.cat) labelText.push(`[${dashFilter.cat}]`);
        if (dashFilter.brand) labelText.push(`[${dashFilter.brand}]`);
        if (dashFilter.gender) labelText.push(`[${dashFilter.gender}]`);

        if (labelText.length > 0) {
            filterLabel.innerHTML = `${labelText.join(' + ')} ✖ 초기화`; filterLabel.classList.remove("hidden");
            filterLabel.onclick = () => { dashFilter = { cat: null, brand: null, gender: null }; renderDashState(); };
        } else filterLabel.classList.add("hidden");

        $("#dashListBody").innerHTML = filteredItems.map((p, idx) => {
            const imgSrc = IMAGES[p.shopNo] || null;
            const imgHtml = imgSrc ? `<img src="${imgSrc}" class="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl border border-gray-200 bg-white shrink-0 mix-blend-multiply">` : `<div class="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center text-[10px] text-gray-400 font-bold shrink-0">NO IMG</div>`;
            let pParam = currentPeriod; if(currentPeriod === "CUSTOM") pParam = `CUSTOM_${currentCustomStart}_${currentCustomEnd}`;

            let insightHtml = ""; let isBusanLowStock = false;
            if (activeSizeFilter !== "ALL") {
                const sObj = p.sizes.find(s => String(s.size).trim() === activeSizeFilter);
                if (sObj && sObj.busan <= 2) isBusanLowStock = true;
            } else { if (p.busanTotal <= 3) isBusanLowStock = true; } 
            
            let isCenterOrSinsaHasStock = (p.centerTotal + p.sinsaTotal) > 0;
            let isBusanSellingWell = p.dashBusanSalesTotal >= 2; 
            let isBusanDominating = p.dashBusanSalesTotal > p.dashSinsaSalesTotal;

            if (isBusanLowStock && isCenterOrSinsaHasStock && isBusanSellingWell && isBusanDominating) {
                insightHtml = `
                    <div class="mt-3 bg-red-50 border border-red-100 p-3 rounded-xl flex items-start gap-2 shadow-sm w-full">
                        <i data-lucide="zap" class="w-5 h-5 text-red-600 shrink-0 mt-0.5"></i>
                        <div class="text-[13px] sm:text-sm text-red-800 leading-snug">
                            <b>🔥 매출 보증! 긴급 확보 추천!</b><br>부산점 판매량(${p.dashBusanSalesTotal}개)이 압도적이나 재고가 부족합니다. 타 지점 재고(${p.centerTotal + p.sinsaTotal}개)를 뺏어오면 무조건 팔립니다!
                        </div>
                    </div>
                `;
            }

            let gLabel = p.성별 || p.gender || "U";
            if(gLabel === "M" || gLabel === "남성" || gLabel === "남") gLabel = "남성"; else if(gLabel === "W" || gLabel === "여성" || gLabel === "여") gLabel = "여성"; else gLabel = "공용";

            let gColorClass = "bg-purple-50 text-purple-600 border-purple-100";
            if(gLabel === "남성") gColorClass = "bg-blue-50 text-blue-600 border-blue-100";
            if(gLabel === "여성") gColorClass = "bg-rose-50 text-rose-600 border-rose-100";

            return `
            <div class="flex flex-col bg-white p-4 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group" onclick="window.openDashDetail('${p.품번}', '${pParam}')">
                <div class="flex items-center justify-between w-full gap-2">
                    <div class="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div class="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center font-black text-gray-500 text-[14px] shrink-0 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">${idx + 1}</div>
                        ${imgHtml}
                        <div class="min-w-0 pr-2">
                            <div class="flex items-center gap-2 mb-1.5">
                                <span class="${gColorClass} px-2 py-0.5 rounded text-[11px] sm:text-xs font-black border">${escapeHtml(gLabel)}</span>
                                <div class="text-[12px] sm:text-[13px] font-bold text-gray-400 truncate">${escapeHtml(p.브랜드)} | ${escapeHtml(p.품번)}</div>
                            </div>
                            <div class="text-[16px] sm:text-[18px] font-black text-gray-900 truncate leading-snug">${escapeHtml(p.품명)}</div>
                        </div>
                    </div>
                    <div class="flex flex-col items-end justify-center shrink-0 ml-2">
                        <span class="font-black text-gray-900 text-[18px] sm:text-[20px]">${fmt(p.dashSales)}개</span>
                        <span class="text-[12px] sm:text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg mt-1 border border-blue-100">${krw(p.dashRev)}</span>
                    </div>
                </div>
                ${insightHtml}
            </div>
        `}).join('');

        if (filteredItems.length === 0) $("#dashListBody").innerHTML = '<div class="h-full flex items-center justify-center text-base font-bold text-gray-400">조건에 맞는 데이터가 없습니다.</div>';

        const renderPieChart = (ctxId, dataObj, filterKey, colors) => {
            const ctx = document.getElementById(ctxId);
            const total = Object.values(dataObj).reduce((a,b)=>a+b,0);
            return new Chart(ctx, {
                type: 'doughnut',
                data: { labels: Object.keys(dataObj), datasets: [{ data: Object.values(dataObj), backgroundColor: colors, borderWidth: 2, borderColor: '#ffffff', hoverOffset: 6 }] },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '60%',
                    layout: { padding: { bottom: 15 } },
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15, boxWidth: 10, font: { weight: 'bold', size: 12 } } },
                        datalabels: { color: '#ffffff', font: { weight: '900', size: 13 }, formatter: (value) => { if(total === 0) return ''; const pct = Math.round((value / total) * 100); return pct > 4 ? pct + '%' : ''; } }
                    },
                    onClick: (e, elements, chart) => {
                        if (elements[0]) {
                            const clickedLabel = chart.data.labels[elements[0].index];
                            if(clickedLabel === '기타브랜드') return; 
                            if(filterKey) {
                                dashFilter[filterKey] = (dashFilter[filterKey] === clickedLabel) ? null : clickedLabel;
                                renderDashState(); 
                            }
                        }
                    }
                }
            });
        };

        if(catChartInstance) catChartInstance.destroy(); if(brandChartInstance) brandChartInstance.destroy(); if(genderChartInstance) genderChartInstance.destroy();

        const defaultColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6b7280', '#f97316'];
        catChartInstance = renderPieChart('catChart', catData, 'cat', defaultColors);
        
        let sortedBrands = Object.entries(brandData).sort((a, b) => b[1] - a[1]);
        let topBrandData = {}; let otherSales = 0;
        sortedBrands.forEach((b, i) => { if(i < 8) topBrandData[b[0]] = b[1]; else otherSales += b[1]; });
        if(otherSales > 0) topBrandData['기타브랜드'] = otherSales;
        brandChartInstance = renderPieChart('brandChart', topBrandData, 'brand', defaultColors);

        // 성별 색상 매핑 직관적으로 변경
        const genderColors = Object.keys(genderData).map(k => { if(k==='남성') return '#3b82f6'; if(k==='여성') return '#f43f5e'; return '#a855f7'; });
        genderChartInstance = renderPieChart('genderChart', genderData, 'gender', genderColors);
    };

    if(!$("#analyticsDashboard")) renderDashUI(); else $("#analyticsDashboard").classList.remove("hidden");
    setTimeout(() => $("#analyticsDashboard").classList.remove("opacity-0"), 10);
    updateDashData();
};

window.openDashDetail = (code, periodParam) => {
    windowCurrentDashIndex = windowDashItems.findIndex(x => x.품번 === code);
    const p = windowDashItems[windowCurrentDashIndex];
    if(!p) return;

    let cutoffDate = "0000-00-00"; let endDate = "9999-99-99";
    if (periodParam.startsWith("CUSTOM_")) {
        const parts = periodParam.split("_"); cutoffDate = parts[1]; endDate = parts[2];
    } else if (periodParam !== "ALL") {
        const d = new Date(Date.now() - Number(periodParam) * 86400000); cutoffDate = d.toISOString().split('T')[0];
    }

    let sizeSalesMapBusan = {}; let sizeSalesMapSinsa = {}; let sizeSalesMapCenter = {};
    if (SALES_HISTORY.items && SALES_HISTORY.items[code]) {
        const history = SALES_HISTORY.items[code];
        for (let date in history) {
            if (periodParam === "ALL" || (date >= cutoffDate && date <= endDate)) {
                const dayData = history[date];
                if (typeof dayData === 'number') { sizeSalesMapBusan["알수없음"] = (sizeSalesMapBusan["알수없음"] || 0) + dayData; } 
                else if (typeof dayData === 'object') {
                    for (let size in dayData) {
                        if (typeof dayData[size] === 'object') {
                            for (let mgr in dayData[size]) {
                                const qty = dayData[size][mgr];
                                if (mgr.includes("김종훈")||mgr.includes("부산")) sizeSalesMapBusan[size] = (sizeSalesMapBusan[size]||0) + qty;
                                else if (mgr.includes("승호")||mgr.includes("강")||mgr.includes("신사")) sizeSalesMapSinsa[size] = (sizeSalesMapSinsa[size]||0) + qty;
                                else sizeSalesMapCenter[size] = (sizeSalesMapCenter[size]||0) + qty;
                            }
                        } else { sizeSalesMapBusan[size] = (sizeSalesMapBusan[size] || 0) + dayData[size]; }
                    }
                }
            }
        }
    }

    const imgSrc = IMAGES[p.shopNo] || null;
    let modal = $("#dashDetailModal");
    if(!modal) {
        modal = document.createElement("div"); modal.id = "dashDetailModal";
        modal.className = "modal-backdrop hidden fixed inset-0 flex items-center justify-center z-[9999] p-4";
        modal.innerHTML = `<div class="modal-outer absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer" onclick="this.closest('.modal-backdrop').classList.add('hidden')"></div>
                           <div id="ddContentWrap" class="modal-content relative bg-white w-full max-w-6xl mx-auto my-auto flex flex-col rounded-3xl overflow-hidden shadow-2xl z-10 transition-transform duration-200"></div>`;
        document.body.appendChild(modal);
        
        let touchstartX = 0; let touchendX = 0;
        const contentWrap = modal.querySelector('#ddContentWrap');
        contentWrap.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, {passive:true});
        contentWrap.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            if (touchendX < touchstartX - 60) $("#nextDashBtn")?.click(); 
            if (touchendX > touchstartX + 60) $("#prevDashBtn")?.click();
        }, {passive:true});
    }

    const allUniqueSizes = Array.from(new Set([...Object.keys(sizeSalesMapBusan), ...p.sizes.map(s=>String(s.size).trim())]))
        .sort((a,b) => {
            if(isFwSize(a) && isFwSize(b)) return parseInt(a) - parseInt(b);
            const order = {"XS":1, "S":2, "M":3, "L":4, "XL":5, "2XL":6, "XXL":6, "3XL":7, "FREE":8, "OS":9, "F":10};
            if(order[a.toUpperCase()] && order[b.toUpperCase()]) return order[a.toUpperCase()] - order[b.toUpperCase()];
            return a.localeCompare(b);
        });

    const chartLabels = allUniqueSizes.filter(s => s !== "알수없음");
    const chartDataBusan = chartLabels.map(s => sizeSalesMapBusan[s] || 0);
    const chartDataSinsa = chartLabels.map(s => sizeSalesMapSinsa[s] || 0);
    const chartDataCenter = chartLabels.map(s => sizeSalesMapCenter[s] || 0);
    
    let largeSizeSales = 0;
    chartLabels.forEach(s => {
        const qty = sizeSalesMapBusan[s] || 0;
        if(qty > 0) {
            if((p.성별==='M'||p.gender==='M') && parseInt(s) >= 290) largeSizeSales += qty;
            if((p.성별==='W'||p.gender==='W') && parseInt(s) >= 250) largeSizeSales += qty;
            if(['XL', 'XXL', '2XL', '3XL'].includes(s.toUpperCase())) largeSizeSales += qty;
        }
    });

    let insightHtml = "";
    if (largeSizeSales > 0) {
        insightHtml = `<div class="mt-4 bg-purple-50 text-purple-700 p-4 rounded-xl text-sm font-black border border-purple-100 flex items-center gap-3 shadow-sm"><i data-lucide="trending-up" class="w-6 h-6 shrink-0"></i> 비주류/빅사이즈 (290+, 250+, XL 등) 에서 ${largeSizeSales}개의 틈새 판매량 포착!</div>`;
    }

    const tableHtml = allUniqueSizes.map(size => {
        const soldBusan = sizeSalesMapBusan[size] || 0;
        const soldSinsa = sizeSalesMapSinsa[size] || 0;
        const soldCenter = sizeSalesMapCenter[size] || 0;
        const sObj = p.sizes.find(s => String(s.size).trim() === String(size)) || { busan: 0, sinsa: 0, center: 0 };
        
        let suggestHtml = `<span class="text-gray-300">-</span>`;
        
        // RT 보충 제안 수정: 필요 수량에 상관 없이 재고가 있는 지점은 모두 표시 (수정 가능하게)
        let needed = Math.max(0, soldBusan - sObj.busan);
        let takeCenter = Math.min(sObj.center, needed);
        let takeSinsa = Math.min(sObj.sinsa, Math.max(0, needed - takeCenter));

        let badges = [];
        if(sObj.center > 0) {
            let defaultVal = takeCenter > 0 ? takeCenter : 1;
            badges.push(`
                <div class="flex items-center gap-1.5 bg-gray-50 border border-gray-200 p-1.5 rounded-lg w-full max-w-[160px]">
                    <span class="text-xs font-bold text-gray-500 w-8 text-center shrink-0">물류</span>
                    <input type="number" id="rt_c_${size}" value="${defaultVal}" min="1" max="${sObj.center}" class="w-10 text-center text-sm font-black bg-white border border-gray-300 rounded outline-none h-7">
                    <button onclick="quickRT('${p.품번}','${size}','본사/물류', document.getElementById('rt_c_${size}').value, this)" class="bg-gray-800 hover:bg-black text-white px-2 py-1 rounded shadow-sm transition-colors flex items-center justify-center flex-1">
                        <i data-lucide="arrow-left-right" class="w-4 h-4"></i>
                    </button>
                </div>
            `);
        }
        if(sObj.sinsa > 0) {
            let defaultVal = takeSinsa > 0 ? takeSinsa : 1;
            badges.push(`
                <div class="flex items-center gap-1.5 bg-orange-50 border border-orange-100 p-1.5 rounded-lg w-full max-w-[160px]">
                    <span class="text-xs font-bold text-orange-600 w-8 text-center shrink-0">신사</span>
                    <input type="number" id="rt_s_${size}" value="${defaultVal}" min="1" max="${sObj.sinsa}" class="w-10 text-center text-sm font-black bg-white border border-orange-200 rounded outline-none h-7 text-orange-700">
                    <button onclick="quickRT('${p.품번}','${size}','신사점', document.getElementById('rt_s_${size}').value, this)" class="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded shadow-sm transition-colors flex items-center justify-center flex-1">
                        <i data-lucide="arrow-left-right" class="w-4 h-4"></i>
                    </button>
                </div>
            `);
        }
        
        if(badges.length > 0 && needed > 0) suggestHtml = `<div class="flex flex-col gap-2 items-center justify-center w-full">${badges.join("")}</div>`;
        else if (badges.length > 0 && needed <= 0) suggestHtml = `<div class="flex flex-col gap-2 items-center justify-center w-full opacity-40 hover:opacity-100 transition-opacity">${badges.join("")}</div>`;
        else if (needed > 0) suggestHtml = `<span class="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-md text-xs font-black w-full block text-center max-w-[90px] mx-auto">🚨 전사품절</span>`;

        let rowClass = "border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors";
        if (size === "알수없음") rowClass += " hidden"; 

        return `<tr class="${rowClass}">
            <td class="py-3 px-2 text-gray-700 font-bold border-r border-gray-100 text-[15px]">${size}</td>
            <td class="py-3 text-blue-600 font-black text-lg bg-blue-50/20">${soldBusan > 0 ? soldBusan : '-'}</td>
            <td class="py-3 bg-blue-50/20 border-r border-gray-100 text-base ${sObj.busan<=2?'text-red-500 font-black':'text-gray-700 font-bold'}">${sObj.busan}</td>
            <td class="py-3 text-orange-600 font-bold text-base bg-orange-50/20">${soldSinsa > 0 ? soldSinsa : '-'}</td>
            <td class="py-3 text-gray-600 font-bold text-base bg-orange-50/20 border-r border-gray-100">${sObj.sinsa}</td>
            <td class="py-3 text-gray-600 font-bold text-base bg-gray-50/40">${soldCenter > 0 ? soldCenter : '-'}</td>
            <td class="py-3 text-gray-600 font-bold text-base bg-gray-50/40 border-r border-gray-100">${sObj.center}</td>
            <td class="py-3 align-middle px-3">${suggestHtml}</td>
        </tr>`;
    }).join('');

    let gLabel = p.성별 || p.gender || "U";
    if(gLabel === "M" || gLabel === "남성" || gLabel === "남") gLabel = "남성"; else if(gLabel === "W" || gLabel === "여성" || gLabel === "여") gLabel = "여성"; else gLabel = "공용";
    let gColorClass = "bg-purple-50 text-purple-600 border-purple-100";
    if(gLabel === "남성") gColorClass = "bg-blue-50 text-blue-600 border-blue-100";
    if(gLabel === "여성") gColorClass = "bg-rose-50 text-rose-600 border-rose-100";

    const prevDisabled = windowCurrentDashIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-200";
    const nextDisabled = windowCurrentDashIndex === windowDashItems.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-200";

    modal.querySelector("#ddContentWrap").innerHTML = `
        <div class="p-5 border-b flex justify-between items-center bg-white z-10 shadow-sm shrink-0">
            <div class="flex items-center gap-3">
                <button id="prevDashBtn" class="p-2.5 bg-gray-100 rounded-full transition-colors ${prevDisabled}" ${windowCurrentDashIndex === 0 ? 'disabled' : `onclick="window.openDashDetail('${windowDashItems[windowCurrentDashIndex-1].품번}', '${periodParam}')"`}><i data-lucide="chevron-left" class="w-6 h-6"></i></button>
                <div class="flex gap-4 items-center ml-2">
                    ${imgSrc ? `<img src="${imgSrc}" class="w-16 h-16 object-contain rounded-lg border border-gray-200 bg-white shrink-0">` : `<div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400 font-bold border border-gray-200 shrink-0">NO IMG</div>`}
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="${gColorClass} px-2 py-0.5 rounded text-[11px] font-black border">${escapeHtml(gLabel)}</span>
                            <div class="text-[13px] font-black text-gray-500">${p.브랜드}</div>
                        </div>
                        <h2 class="font-black text-[20px] leading-tight text-gray-900 truncate max-w-[300px] sm:max-w-lg">${p.품명}</h2>
                        <div class="text-sm font-bold text-gray-400 mt-0.5">${p.품번}</div>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <button id="nextDashBtn" class="p-2.5 bg-gray-100 rounded-full transition-colors ${nextDisabled}" ${windowCurrentDashIndex === windowDashItems.length - 1 ? 'disabled' : `onclick="window.openDashDetail('${windowDashItems[windowCurrentDashIndex+1].품번}', '${periodParam}')"`}><i data-lucide="chevron-right" class="w-6 h-6"></i></button>
                <button class="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-colors shrink-0 ml-4" onclick="this.closest('.modal-backdrop').classList.add('hidden')"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
        </div>
        
        <div class="flex flex-col lg:flex-row h-full lg:h-[75vh] overflow-y-auto lg:overflow-hidden">
            <div class="w-full lg:w-[40%] border-b lg:border-b-0 lg:border-r border-gray-100 p-6 bg-gray-50/50 flex flex-col shrink-0">
                <h3 class="font-black text-base text-gray-800 mb-5 flex items-center gap-2"><i data-lucide="line-chart" class="w-6 h-6 text-blue-500"></i> 지점별 사이즈 판매 추이</h3>
                <div class="relative flex-1 w-full min-h-[300px]"><canvas id="ddSizeChart"></canvas></div>
                ${insightHtml}
            </div>
            
            <div class="w-full lg:w-[60%] p-0 overflow-y-auto dash-scroll bg-white relative">
                <div class="p-5 sm:p-6 pb-8 overflow-x-auto">
                    <table class="w-full min-w-[550px] text-sm border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <thead class="text-gray-600 font-black">
                            <tr class="text-center bg-gray-50">
                                <th class="py-3 w-[12%] border-r border-gray-200 align-middle" rowspan="2">사이즈</th>
                                <th class="py-2 border-b border-r border-gray-200 bg-blue-100 text-blue-800" colspan="2">부산 (김종훈)</th>
                                <th class="py-2 border-b border-r border-gray-200 bg-orange-100 text-orange-800" colspan="2">신사 (승호/강)</th>
                                <th class="py-2 border-b border-r border-gray-200 bg-gray-200 text-gray-800" colspan="2">온라인 (본사물류)</th>
                                <th class="py-3 w-[26%] align-middle" rowspan="2">스마트 보충제안</th>
                            </tr>
                            <tr class="text-center text-xs bg-white border-b-2 border-gray-200">
                                <th class="py-2 bg-blue-50/50 text-blue-700 border-r border-gray-100">판매</th>
                                <th class="py-2 bg-blue-50/50 text-gray-600 border-r border-gray-200">재고</th>
                                <th class="py-2 bg-orange-50/50 text-orange-700 border-r border-gray-100">판매</th>
                                <th class="py-2 bg-orange-50/50 text-gray-600 border-r border-gray-200">재고</th>
                                <th class="py-2 bg-gray-50 text-gray-700 border-r border-gray-100">판매</th>
                                <th class="py-2 bg-gray-50 text-gray-600 border-r border-gray-200">재고</th>
                            </tr>
                        </thead>
                        <tbody id="ddTableBody" class="text-center">${tableHtml}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove("hidden");
    if(window.lucide) lucide.createIcons();

    setTimeout(() => {
        const ctx = document.getElementById('ddSizeChart');
        if(ctx) {
            new Chart(ctx, {
                type: 'line', // 가독성 개선을 위해 선형(Line) 차트로 변경
                data: { 
                    labels: chartLabels, 
                    datasets: [
                        { label: '부산점', data: chartDataBusan, borderColor: '#3b82f6', backgroundColor: '#3b82f6', tension: 0.3, borderWidth: 3, pointBackgroundColor: '#fff', pointBorderWidth: 2, pointRadius: 5 },
                        { label: '신사점', data: chartDataSinsa, borderColor: '#f97316', backgroundColor: '#f97316', tension: 0.3, borderWidth: 3, pointBackgroundColor: '#fff', pointBorderWidth: 2, pointRadius: 5 },
                        { label: '물류(본사)', data: chartDataCenter, borderColor: '#9ca3af', backgroundColor: '#9ca3af', tension: 0.3, borderWidth: 3, pointBackgroundColor: '#fff', pointBorderWidth: 2, pointRadius: 5 }
                    ] 
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { weight: 'bold', size: 12 } } }, datalabels: { display: false } },
                    scales: { x: { grid: { display: true, color: '#f3f4f6' }, ticks: { font: { size: 11, weight: 'bold' }, color: '#6b7280' } }, y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11, weight: 'bold' } } } }
                }
            });
        }
    }, 150);
};

window.openSalesGuide = (code) => {
    const guide = SALES_GUIDES[code];
    const p = PRODUCTS.find(x => x.품번 === code);
    if(!guide) return;

    let modal = $("#salesGuideModal");
    if(!modal) {
        modal = document.createElement("div");
        modal.id = "salesGuideModal";
        modal.className = "modal-backdrop hidden fixed inset-0 flex items-center justify-center z-[100] p-4";
        modal.innerHTML = `
            <div class="modal-outer absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onclick="this.closest('.modal-backdrop').classList.add('hidden')"></div>
            <div class="modal-content relative bg-white w-full max-w-lg mx-auto my-auto flex flex-col rounded-3xl overflow-hidden shadow-2xl z-10 border border-indigo-100">
                <div class="p-5 bg-indigo-50 border-b border-indigo-100 flex justify-between items-start">
                    <div>
                        <div class="flex items-center gap-2 mb-1.5">
                            <span class="bg-indigo-600 text-white text-[11px] px-2 py-0.5 rounded font-black tracking-wider">AI SALES GUIDE</span>
                        </div>
                        <h2 id="sgTitle" class="font-black text-xl text-indigo-950 leading-tight"></h2>
                    </div>
                    <button id="closeSalesGuide" class="p-1.5 -mr-2 text-indigo-400 hover:text-indigo-800 transition-colors bg-white/50 rounded-full"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[70vh] space-y-6 dash-scroll">
                    <div><div id="sgKeywords" class="flex flex-wrap gap-2 mb-2"></div></div>
                    <div>
                        <h3 class="font-black text-sm text-indigo-400 flex items-center gap-1.5 mb-2"><i data-lucide="zap" class="w-5 h-5"></i> 핵심 특징</h3>
                        <div id="sgFeatures" class="text-[15px] text-gray-800 font-medium leading-relaxed bg-gray-50 p-4 rounded-xl"></div>
                    </div>
                    <div>
                        <h3 class="font-black text-sm text-indigo-400 flex items-center gap-1.5 mb-2"><i data-lucide="target" class="w-5 h-5"></i> 추천 고객</h3>
                        <div id="sgTarget" class="text-[15px] text-gray-800 font-medium leading-relaxed bg-gray-50 p-4 rounded-xl"></div>
                    </div>
                    <div>
                        <h3 class="font-black text-sm text-indigo-400 flex items-center gap-1.5 mb-2"><i data-lucide="message-circle" class="w-5 h-5"></i> 실전 응대 멘트</h3>
                        <div id="sgPitch" class="text-[16px] text-indigo-900 font-bold leading-relaxed bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        $("#closeSalesGuide").onclick = () => modal.classList.add("hidden");
    }

    modal.querySelector("#sgTitle").textContent = p ? p.품명 : code;
    modal.querySelector("#sgKeywords").innerHTML = (guide.keywords || []).map(kw => `<span class="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full text-xs font-black border border-indigo-200 shadow-sm">#${escapeHtml(kw)}</span>`).join('');
    modal.querySelector("#sgFeatures").textContent = guide.features || "내용 없음";
    modal.querySelector("#sgTarget").textContent = guide.target || "내용 없음";
    modal.querySelector("#sgPitch").textContent = guide.pitch || "내용 없음";

    modal.classList.remove("hidden");
    if(window.lucide) lucide.createIcons();
};

function card(p){
  const el = document.createElement("article");
  el.className = "card card-hover p-5 flex flex-col bg-white border border-gray-100 rounded-2xl shadow-sm h-full"; 
  el.onclick = (e)=>{ 
    const copyBtn = e.target.closest('[data-copy]');
    if(copyBtn) { copyText(copyBtn.dataset.copy, copyBtn); return; }
    if(e.target.closest('.btn-sales')) {
        e.stopPropagation(); window.openSalesGuide(p.품번); return;
    }
    if(!e.target.closest('button')) openDetail(p); 
  };
  
  const imgSrc = IMAGES[p.shopNo] || null;
  
  let deltaHtml = "";
  if (p.delta > 0) deltaHtml = `<span class="text-emerald-600 font-black">▲+${p.delta}</span>`;
  else if (p.delta < 0) deltaHtml = `<span class="text-red-600 font-black">▼${p.delta}</span>`;

  let busanOnlyBadge = "";
  if (p.busanTotal > 0 && p.sinsaTotal === 0 && p.centerTotal === 0) {
      busanOnlyBadge = `<span class="bg-blue-800 text-white px-2 py-0.5 rounded font-black tracking-wide shadow-sm">부산점 ONLY</span>`;
  }

  const productMemos = MEMOS.filter(m => m.code === p.품번);
  let memoHtml = "";
  if(productMemos.length > 0) {
      memoHtml = `<div class="showroom-hide mt-1.5 mb-2.5 space-y-1.5">`;
      productMemos.forEach(m => {
          memoHtml += `
          <div class="p-2.5 bg-yellow-50 rounded border border-yellow-200 text-xs leading-snug">
             <div class="flex items-center justify-between mb-1">
                 <span class="font-black text-yellow-800">[${escapeHtml(m.tag)}] ${escapeHtml(m.staff)}</span>
                 <span class="text-[11px] text-yellow-600">${escapeHtml(m.date)}</span>
             </div>
             <div class="text-yellow-900">${escapeHtml(m.text)}</div>
          </div>`;
      });
      memoHtml += `</div>`;
  }

  let salesHtml = "";
  const guide = SALES_GUIDES[p.품번];
  if (guide && guide.keywords && guide.keywords.length > 0) {
      salesHtml = `<div class="flex flex-wrap gap-1 mt-2 mb-1.5">` + 
          guide.keywords.map(kw => `<span class="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[11px] sm:text-xs font-black px-2 py-1 rounded cursor-pointer hover:bg-indigo-600 hover:text-white transition-colors btn-sales shadow-sm">#${escapeHtml(kw.trim())}</span>`).join('') +
      `</div>`;
  }

  const isFav = FAVS.includes(p.품번);

  let promoBadge = "";
  let priceDisplay = `<div class="text-base sm:text-[17px] font-black">${krw(p.소비자가)}</div>`;

  if (p.currentPromoPrice && p.currentPromoPrice < p.소비자가) {
      const rateInt = Math.round((p.promoRate || 0) * 100);
      const rateLabel = rateInt > 0 ? `▼${rateInt}%` : '';

      if (p.promoType === 'weekly') {
          promoBadge = `<span class="bg-red-600 text-white px-2 py-0.5 rounded font-black flex items-center gap-1 shadow-sm"><i data-lucide="flame" class="w-3.5 h-3.5"></i>위클리특가 ${rateLabel} (~${p.promoEndDate})</span>`;
          priceDisplay = `
            <div class="flex flex-col items-end leading-tight">
                <span class="text-xs text-gray-400 line-through mb-0.5">${krw(p.소비자가)}</span>
                <span class="text-lg sm:text-[20px] font-black text-red-600">🔥${krw(p.currentPromoPrice)}</span>
            </div>`;
      } else {
          promoBadge = `<span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-black flex items-center gap-1 shadow-sm"><i data-lucide="ticket" class="w-3.5 h-3.5"></i>쿠폰적용가 ${rateLabel} (~${p.promoEndDate})</span>`;
          priceDisplay = `
            <div class="flex flex-col items-end leading-tight">
                <span class="text-xs text-gray-400 line-through mb-0.5">${krw(p.소비자가)}</span>
                <span class="text-[17px] sm:text-lg font-black text-purple-700">🎟️${krw(p.currentPromoPrice)}</span>
            </div>`;
      }
  }

  // 성별 색상 분리 적용
  let gLabel = p.성별 || p.gender || "U";
  if(gLabel === "M" || gLabel === "남성" || gLabel === "남") gLabel = "남성"; else if(gLabel === "W" || gLabel === "여성" || gLabel === "여") gLabel = "여성"; else gLabel = "공용";
  let gColorClass = "bg-purple-50 text-purple-600 border-purple-100";
  if(gLabel === "남성") gColorClass = "bg-blue-50 text-blue-600 border-blue-100";
  if(gLabel === "여성") gColorClass = "bg-rose-50 text-rose-600 border-rose-100";

  el.innerHTML = `
    <div class="flex flex-col flex-1">
        <div class="flex flex-wrap gap-1.5 text-xs font-bold text-gray-500 mb-2.5">
            ${busanOnlyBadge}
            ${promoBadge}
            <span class="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">${escapeHtml(p.카테고리||"-")}</span>
            <span class="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">${escapeHtml(p.브랜드||"-")}</span>
            <span class="${gColorClass} px-2 py-0.5 rounded border">${escapeHtml(gLabel)}</span>
            ${deltaHtml}
        </div>

        <div class="flex justify-between items-start w-full relative mb-2 gap-4">
           <div class="flex-1 min-w-0 mt-1">
              <div class="copyable font-extrabold text-[17px] sm:text-[18px] leading-snug mb-1.5 text-left w-full hover:text-blue-600 text-gray-900" data-copy="${escapeHtml(p.품명)}">${escapeHtml(p.품명)}</div>
              
              <div class="copyable text-[13px] font-bold text-gray-400 mb-2.5 text-left w-full hover:text-blue-600 flex items-center gap-1.5" data-copy="${escapeHtml(p.품번)}">
                  ${escapeHtml(p.품번)} <i data-lucide="copy" class="w-4 h-4 opacity-60"></i>
              </div>
              ${salesHtml}
           </div>
           
           <div class="card-img-wrap">
               ${imgSrc ? `<img src="${imgSrc}" loading="lazy" onload="this.classList.add('loaded')" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal">` : '<div class="w-full h-full bg-gray-50 flex items-center justify-center text-xs text-gray-400 font-bold">NO IMG</div>'}
               <button class="fav-btn bookmark-overlay text-gray-400 hover:text-yellow-500 outline-none" data-active="${isFav?'1':'0'}">
                    <i data-lucide="bookmark" class="w-5 h-5 ${isFav ? 'fill-yellow-400 text-yellow-400' : ''}"></i>
               </button>
           </div>
        </div>
        
        ${memoHtml}

        <div class="size-scroll-wrap no-scrollbar">
          ${p.sizes.map(s=>{
              const q = s.busan||0; 
              let cls = "size-cell tnum shrink-0 w-[46px] ";
              if(q===0) cls+="zero"; else if(q===1) cls+="danger"; else if(q===2) cls+="warn";
              return `<div class="${cls}"><span class="sz">${s.size}</span><span class="qty real-qty">${q}</span><span class="qty showroom-qty hidden">${q>0?'O':'X'}</span></div>`;
          }).join("")}
        </div>
    </div>

    <div class="flex flex-col gap-2 border-t border-gray-100 pt-4 mt-auto shrink-0">
        <div class="flex items-center justify-between text-xs font-bold text-gray-500">
            <span>총 재고 요약</span>
            <span>부산 <b class="text-blue-600">${p.busanTotal}</b> | 신사 ${p.sinsaTotal} | 물류 ${p.centerTotal}</span>
        </div>
        <div class="flex items-center justify-between mt-1">
            <span class="text-sm font-black text-gray-800">소비자가</span>
            ${priceDisplay}
        </div>
    </div>
  `;
  
  el.querySelector('.fav-btn').onclick=(e)=>{ 
      saveHistoryState();
      e.stopPropagation(); 
      if(FAVS.includes(p.품번)) FAVS=FAVS.filter(id=>id!==p.품번); 
      else FAVS.push(p.품번); 
      localStorage.setItem('FAVS', JSON.stringify(FAVS)); 
      render(); 
  };
  return el;
}

function getFilters(){
  const promoBtn = $('button[data-promo]');
  const promoOnly = window.tempPromoFilter === true || (promoBtn ? promoBtn.dataset.active === "1" : false);

  return {
    cat: ($$('button.chip[data-cat]').find(b=>b.dataset.active==="1")||{}).dataset?.cat || "ALL",
    gender: ($$('button.chip[data-gender]').find(b=>b.dataset.active==="1")||{}).dataset?.gender || "ALL",
    brand: ($$('#brandChips .chip').find(b=>b.dataset.active==="1")||{}).dataset?.brand || "ALL",
    q: $("#q").value.trim().toLowerCase(),
    stock: !!$$('button.chip[data-stock]').find(b=>b.dataset.active==="1"),
    favOnly: !!$$('button.chip[data-fav]').find(b=>b.dataset.active==="1"),
    memoOnly: !!$$('button.chip[data-memo]').find(b=>b.dataset.active==="1"),
    busanOnly: !!$$('button.chip[data-busanonly]').find(b=>b.dataset.active==="1"), 
    sizeFw: $("#sizeSelFw") ? $("#sizeSelFw").value : "ALL",
    sizeAp: $("#sizeSelAp") ? $("#sizeSelAp").value : "ALL",
    sizeGear: $("#sizeSelGear") ? $("#sizeSelGear").value : "ALL",
    promoOnly: promoOnly,
    promoType: promoOnly && $("#promoTypeSel") && $("#promoTypeSel").value !== "" ? $("#promoTypeSel").value : "ALL", 
    promoRate: promoOnly && $("#promoRateSel") && $("#promoRateSel").value !== "" ? Number($("#promoRateSel").value) : 0
  };
}

function render(){
  const grid = $("#grid"); 
  
  if(!RAW.length) { 
      grid.innerHTML = "";
      $("#emptyState").classList.remove("hidden"); 
      $("#results").classList.add("hidden"); 
      return; 
  }
  
  $("#emptyState").classList.add("hidden");
  $("#results").classList.remove("hidden");

  const f = getFilters();
  const activeSizeFilter = [f.sizeFw, f.sizeAp, f.sizeGear].find(s => s !== "ALL") || "ALL";

  PRODUCTS.forEach(p => {
      p.periodSales = 0;
      if (SALES_HISTORY.items && SALES_HISTORY.items[p.품번]) {
          for (let date in SALES_HISTORY.items[p.품번]) {
              const dayData = SALES_HISTORY.items[p.품번][date];
              if (typeof dayData === 'object') {
                  for (let size in dayData) {
                      if (typeof dayData[size] === 'object') {
                          for(let mgr in dayData[size]) {
                              if(mgr.includes("김종훈") || mgr.includes("부산")) p.periodSales += dayData[size][mgr]; 
                          }
                      }
                  }
              }
          }
      }
  });

  let filteredList = PRODUCTS.filter(p=>{
    if(f.cat!=="ALL" && p.카테고리!==f.cat) return false;
    let g = p.성별 || p.gender || "U";
    if(g === "M" || g === "남성" || g === "남") g = "남성"; else if(g === "W" || g === "여성" || g === "여") g = "여성"; else g = "공용";
    if(f.gender!=="ALL" && g!==f.gender && p.gender!==f.gender) return false;
    if(f.brand!=="ALL" && p.브랜드!==f.brand) return false;
    if(f.favOnly && !FAVS.includes(p.품번)) return false; 
    if(f.memoOnly && !p.hasMemo) return false;
    if(f.busanOnly && !(p.busanTotal > 0 && p.sinsaTotal === 0 && p.centerTotal === 0)) return false;
    
    if(f.promoOnly) {
        if(!p.currentPromoPrice) return false; 
        if(f.promoType !== "ALL" && p.promoType !== f.promoType) return false;
        if(f.promoRate > 0 && Math.round((p.promoRate || 0) * 100) !== f.promoRate) return false; 
    }

    if(activeSizeFilter !== "ALL") {
        const sizeObj = p.sizes.find(s => String(s.size).trim() === activeSizeFilter);
        if(!sizeObj) return false; 
        if(f.stock && sizeObj.busan <= 0) return false; 
    } else {
        if(f.stock && p.busanTotal <= 0) return false; 
    }

    if(f.q) { 
        const tokens = f.q.split(/\s+/).filter(Boolean);
        let matchAll = true;
        for(const t of tokens){
            const cleanT = t.replace(/[\s\-_]/g, "").toLowerCase();
            if(isAllChosung(cleanT)){ 
                if(!p._chosung.includes(cleanT)) matchAll = false; 
            } else { 
                if(!p._hayClean.includes(cleanT)) { matchAll = false; }
            }
        }
        if(!matchAll) return false;
    }
    return true;
  });

  const sortMode = $("#sortSel").value;
  filteredList.sort((a,b) => {
    if(sortMode === "salesDesc") return (b.periodSales||0) - (a.periodSales||0) || String(a.품명).localeCompare(String(b.품명),"ko");
    
    if(sortMode === "default") {
        const ca = CAT_ORDER[a.카테고리] ?? 9; 
        const cb = CAT_ORDER[b.카테고리] ?? 9;
        if(ca!==cb) return ca-cb;
        const sa=a.busanTotal>0?0:1; const sb=b.busanTotal>0?0:1;
        if(sa!==sb) return sa-sb;
        return String(a.품명).localeCompare(String(b.품명),"ko");
    }
    if(sortMode==="stock") return b.busanTotal - a.busanTotal || String(a.품명).localeCompare(String(b.품명),"ko");
    if(sortMode==="name") return String(a.품명).localeCompare(String(b.품명),"ko");
    
    const priceA = a.currentPromoPrice || a.소비자가 || 0;
    const priceB = b.currentPromoPrice || b.소비자가 || 0;
    if(sortMode==="priceAsc") return priceA - priceB;
    if(sortMode==="priceDesc") return priceB - priceA;
    
    const br = String(a.브랜드).localeCompare(String(b.브랜드),"ko"); if(br!==0) return br;
    return String(a.품명).localeCompare(String(b.품명),"ko");
  });

  grid.innerHTML = "";
  if(filteredList.length === 0){
      $("#noMatch").classList.remove("hidden");
      $("#grid").parentElement.classList.remove("hidden");
      $("#moreWrap").classList.add("hidden");
  } else {
      $("#noMatch").classList.add("hidden");
      $("#grid").parentElement.classList.remove("hidden");
      
      const fragment = document.createDocumentFragment();
      const slice = filteredList.slice(0, visibleCount);
      slice.forEach(p=>fragment.appendChild(card(p)));
      grid.appendChild(fragment);
      
      if(filteredList.length > visibleCount) {
          $("#moreWrap").classList.remove("hidden");
          $("#moreBtn").textContent = `더 보기 (+${Math.min(60, filteredList.length - visibleCount)})`;
      } else {
          $("#moreWrap").classList.add("hidden");
      }
  }

  if(window.lucide) lucide.createIcons();
}

$("#moreBtn").onclick = () => { visibleCount+=60; render(); };

let currentMemoDate = ""; 

function renderAllMemos() {
    const listEl = $("#allMemosList");
    const availableDates = [...new Set(MEMOS.map(m => m.date.split(' ')[0]))].sort((a,b) => {
        const [am, ad] = a.split('/').map(Number);
        const [bm, bd] = b.split('/').map(Number);
        return (bm - am) || (bd - ad);
    });
    
    if(!currentMemoDate && availableDates.length > 0) currentMemoDate = availableDates[0]; 

    let html = `
        <div class="flex gap-2 mb-4 bg-gray-100 p-3 rounded-lg items-center">
            <select id="memoDateSelect" class="ipt flex-1 text-sm font-bold bg-white border-gray-300 py-2">
                <option value="ALL">🗓️ 전체 날짜 보기</option>
                ${availableDates.map(d => `<option value="${d}" ${d===currentMemoDate?'selected':''}>${d} 메모</option>`).join('')}
            </select>
            <button id="bulkDeleteMemosBtn" class="px-4 py-2 bg-red-50 text-red-600 border border-red-200 font-bold rounded-lg text-sm hover:bg-red-500 hover:text-white transition-colors">일괄 삭제</button>
        </div><div class="space-y-3">
    `;
    
    let filtered = currentMemoDate === "ALL" ? MEMOS.slice().reverse() : MEMOS.filter(m => m.date.startsWith(currentMemoDate + " ")).slice().reverse();
    if(filtered.length === 0) html += "<div class='text-center py-10 text-gray-500 font-bold text-sm'>해당 조건에 맞는 메모가 없습니다.</div>";
    else {
        filtered.forEach(m => {
            html += `
            <div class="p-4 bg-white rounded-xl border text-sm shadow-sm relative">
                <button onclick="deleteMemo('${m.id}')" class="absolute top-4 right-4 text-gray-300 hover:text-red-500"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
                <div class="flex justify-between items-center mb-1 pr-8">
                    <span class="font-black text-yellow-700">[${escapeHtml(m.tag)}] ${escapeHtml(m.staff)}</span>
                    <span class="text-xs text-gray-400">${escapeHtml(m.date)}</span>
                </div>
                <div class="font-bold text-gray-800 mb-2">${escapeHtml(m.product)}</div>
                <div class="text-gray-600">${escapeHtml(m.text)}</div>
            </div>`;
        });
    }
    html += "</div>";
    listEl.innerHTML = html;
    if(window.lucide) lucide.createIcons();
    $("#memoDateSelect").onchange = (e) => { currentMemoDate = e.target.value; renderAllMemos(); };
    $("#bulkDeleteMemosBtn").onclick = async () => {
        if(!checkPat()) return;
        const targetText = currentMemoDate === 'ALL' ? '전체' : `${currentMemoDate} 일자`;
        if(!confirm(`⚠️ 정말 [${targetText}] 메모를 일괄 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
        try {
            const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${REQUESTS_PATH}`;
            const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); 
            if(!r.ok) throw new Error("로드 실패");
            const j = await r.json(); 
            let oldData = JSON.parse(decodeURIComponent(escape(atob(j.content))));
            if(currentMemoDate === "ALL") oldData = [];
            else oldData = oldData.filter(m => !m.date.startsWith(currentMemoDate + " "));
            const body = { message:"bulk delete memos", content: utf8ToB64(JSON.stringify(oldData, null, 2)), branch: GH.branch, sha: j.sha };
            await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
            MEMOS = oldData; alert("🗑️ 일괄 삭제가 완료되었습니다.");
            if(CURRENT_PRODUCT) { CURRENT_PRODUCT.hasMemo = MEMOS.some(m => m.code === CURRENT_PRODUCT.품번); openDetail(CURRENT_PRODUCT); }
            render(); currentMemoDate = "ALL"; renderAllMemos();
        } catch(e) { alert("메모 일괄 삭제 실패"); }
    };
}

$("#allMemosBtn").onclick = () => { currentMemoDate = ""; renderAllMemos(); $("#allMemosModal").classList.remove("hidden"); };
window.deleteMemo = async (memoId) => {
    if(!checkPat()) return;
    if(!confirm("이 메모를 삭제하시겠습니까?")) return;
    try {
        const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${REQUESTS_PATH}`;
        const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); 
        if(!r.ok) throw new Error("로드 실패");
        const j = await r.json(); 
        let oldData = JSON.parse(decodeURIComponent(escape(atob(j.content))));
        oldData = oldData.filter(m => m.id !== memoId);
        const body = { message:"delete memo", content: utf8ToB64(JSON.stringify(oldData, null, 2)), branch: GH.branch, sha: j.sha };
        await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
        MEMOS = oldData; alert("삭제되었습니다.");
        if(CURRENT_PRODUCT) { CURRENT_PRODUCT.hasMemo = MEMOS.some(m => m.code === CURRENT_PRODUCT.품번); openDetail(CURRENT_PRODUCT); }
        render(); if(!$("#allMemosModal").classList.contains("hidden")) renderAllMemos();
    } catch(e) { alert("메모 삭제 실패"); }
};

window.deleteTransfer = async (trId) => {
    if(!checkPat()) return;
    if(!confirm("이 이동 요청을 삭제/취소하시겠습니까?")) return;
    try {
        const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${TRANSFERS_PATH}`;
        const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); 
        if(!r.ok) throw new Error("로드 실패");
        const j = await r.json(); 
        let oldData = JSON.parse(decodeURIComponent(escape(atob(j.content))));
        oldData = oldData.filter(m => m.id !== trId);
        const body = { message:"delete transfer", content: utf8ToB64(JSON.stringify(oldData, null, 2)), branch: GH.branch, sha: j.sha };
        await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
        TRANSFERS = oldData; alert("이 이동 요청이 삭제되었습니다.");
        if($("#transfersModal") && !$("#transfersModal").classList.contains("hidden")) window.renderTransfers();
    } catch(e) { alert("삭제 실패"); }
};

window.renderTransfers = () => {
    let listEl = $("#transfersList");
    if(!listEl) {
        const modal = document.createElement("div");
        modal.id = "transfersModal";
        modal.className = "modal-backdrop hidden fixed inset-0 flex items-center justify-center z-[99] p-4"; 
        modal.innerHTML = `
            <div class="modal-outer absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="this.closest('.modal-backdrop').classList.add('hidden')"></div>
            <div class="modal-content relative bg-white w-full max-w-lg mx-auto my-auto flex flex-col rounded-2xl overflow-hidden shadow-2xl z-10">
                <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h2 class="font-black text-xl text-blue-800">🚚 상품 RT(이동) 요청 목록</h2>
                    <div class="flex gap-3">
                        <button onclick="exportTransfersToExcel()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-black shadow-sm transition-colors flex items-center gap-2"><i data-lucide="download" class="w-4 h-4"></i> 엑셀저장</button>
                        <button id="closeTransfers" class="p-2 hover:bg-gray-100 rounded-full transition-colors"><i data-lucide="x" class="w-6 h-6 text-gray-500"></i></button>
                    </div>
                </div><div id="transfersList" class="p-5 overflow-y-auto flex-1 bg-gray-50 space-y-3"></div>
            </div>`;
        document.body.appendChild(modal);
        $("#closeTransfers").onclick = () => modal.classList.add("hidden");
        listEl = $("#transfersList");
    }
    $("#transfersModal").classList.remove("hidden");
    if(TRANSFERS.length === 0) { listEl.innerHTML = "<div class='text-center py-10 text-gray-500 font-bold text-sm'>대기 중인 이동 요청이 없습니다.</div>"; return; }
    let html = "";
    TRANSFERS.slice().reverse().forEach(t => {
        html += `
        <div class="p-4 bg-white rounded-xl border border-blue-100 text-sm shadow-sm relative">
            <button onclick="deleteTransfer('${t.id}')" class="absolute top-4 right-4 text-gray-300 hover:text-red-500"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
            <div class="flex justify-between items-center mb-1.5 pr-8">
                <span class="font-black text-blue-700 text-base">${escapeHtml(t.code)}</span><span class="text-xs text-gray-400">${escapeHtml(t.date)}</span>
            </div>
            <div class="font-bold text-gray-800 mb-3 text-[15px]">${escapeHtml(t.product)}</div>
            <div class="flex gap-2 text-xs font-bold text-gray-600 mb-3">
                <span class="bg-gray-100 px-2.5 py-1 rounded">사이즈: ${escapeHtml(t.size)}</span><span class="bg-gray-100 px-2.5 py-1 rounded">수량: <span class="text-blue-600">${t.qty}개</span></span>
            </div>
            <div class="text-blue-900 bg-blue-50 p-3 rounded-lg font-medium text-[13px]">${escapeHtml(t.memo)}</div>
        </div>`;
    });
    listEl.innerHTML = html;
    if(window.lucide) lucide.createIcons();
};

function openDetail(p){
  CURRENT_PRODUCT = p;
  const imgSrc = IMAGES[p.shopNo] || null;
  
  $("#detailHead").innerHTML = `
    <div class="flex gap-3 sm:gap-4 items-center">
        ${imgSrc ? `<img src="${imgSrc}" class="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-xl border border-gray-200 bg-white shadow-sm shrink-0">` : `<div class="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center text-xs text-gray-400 font-bold shrink-0">NO IMG</div>`}
        <div class="min-w-0 flex-1">
            <div class="text-xs sm:text-[13px] text-gray-500 font-black mb-1">${escapeHtml(p.브랜드||"-")}</div>
            <div class="text-[17px] sm:text-[20px] font-black text-gray-900 leading-tight truncate break-keep">${escapeHtml(p.품명)}</div>
            <div class="text-blue-600 font-bold text-sm sm:text-base mt-1">${escapeHtml(p.품번)}</div>
        </div>
    </div>
  `;
  
  const productMemos = MEMOS.filter(m => m.code === p.품번);
  let detailMemoHtml = "";
  if(productMemos.length > 0) {
      productMemos.forEach(m => {
          detailMemoHtml += `
          <div class="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-sm mb-3 relative">
             <button onclick="deleteMemo('${m.id}')" class="absolute top-2.5 right-2.5 text-red-400 hover:text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
             <div class="flex items-center gap-2 mb-1.5"><span class="font-black text-yellow-800">[${escapeHtml(m.tag)}] ${escapeHtml(m.staff)}</span><span class="text-xs text-yellow-600">${escapeHtml(m.date)}</span></div>
             <div class="text-yellow-900 pr-6">${escapeHtml(m.text)}</div>
          </div>`;
      });
  }
  $("#detailMemosWrap").innerHTML = detailMemoHtml;

  $("#detailBody").innerHTML = `
    <div class="overflow-x-auto w-full no-scrollbar pb-3">
        <table class="w-full min-w-[500px] text-sm sm:text-base bg-white rounded-xl border-hidden shadow-sm">
        <thead class="bg-gray-50 text-gray-600 font-black border-b border-gray-200">
            <tr>
            <th class="py-3 px-2 text-center w-[16%] border-r border-white">사이즈</th>
            <th class="py-3 px-2 text-center w-[14%] text-blue-700 bg-blue-50/50 border-r border-white">부산</th>
            <th class="py-3 px-2 text-center w-[15%]">본사재고</th>
            <th class="py-3 px-2 text-center w-[20%] border-r border-gray-100">본사 RT</th>
            <th class="py-3 px-2 text-center w-[15%]">신사재고</th>
            <th class="py-3 px-2 text-center w-[20%]">신사 RT</th>
            </tr>
        </thead>
        <tbody>
        ${p.sizes.map(s => {
            let centerRtBtn = s.center > 0 
                ? `<button onclick="quickRT('${p.품번}','${s.size}','본사/물류',1,this)" class="bg-gray-800 hover:bg-black text-white py-2 rounded-lg flex items-center justify-center w-full transition-colors shadow-sm"><i data-lucide="arrow-left-right" class="w-4 h-4"></i></button>` 
                : `<button disabled class="bg-gray-50 text-gray-300 py-2 rounded-lg w-full flex items-center justify-center cursor-not-allowed border border-gray-100"><i data-lucide="minus" class="w-4 h-4"></i></button>`;
            
            let sinsaRtBtn = s.sinsa > 0 
                ? `<button onclick="quickRT('${p.품번}','${s.size}','신사점',1,this)" class="bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg flex items-center justify-center w-full transition-colors shadow-sm"><i data-lucide="arrow-left-right" class="w-4 h-4"></i></button>` 
                : `<button disabled class="bg-gray-50 text-gray-300 py-2 rounded-lg w-full flex items-center justify-center cursor-not-allowed border border-gray-100"><i data-lucide="minus" class="w-4 h-4"></i></button>`;

            return `<tr class="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                <td class="py-3 px-2 font-black text-center border-r border-gray-50 text-[15px]">${s.size}</td>
                <td class="py-3 px-2 font-black text-center bg-blue-50/30 border-r border-gray-50 text-[15px] ${s.busan>0?'text-blue-600':'text-red-500'}">${s.busan}</td>
                <td class="py-3 px-2 font-bold text-center text-gray-600 text-[15px]">${s.center}</td>
                <td class="py-2.5 px-2 text-center border-r border-gray-100">${centerRtBtn}</td>
                <td class="py-3 px-2 font-bold text-center text-gray-600 text-[15px]">${s.sinsa}</td>
                <td class="py-2.5 px-2 text-center">${sinsaRtBtn}</td>
            </tr>`;
        }).join("")}
        </tbody>
        </table>
    </div>
  `;
  
  let stickyFooterHtml = `
      <div class="flex flex-col gap-3">
          <div class="flex gap-2">
              <select id="memoStaff" class="ipt text-sm flex-1 font-bold bg-white px-3 py-2 rounded-lg border border-gray-200">
                  <option value="" disabled selected>작성자 선택</option>
                  <option value="김종훈">김종훈</option>
                  <option value="김기태">김기태</option>
                  <option value="김민정">김민정</option>
                  <option value="임경준">임경준</option>
                  <option value="박서영">박서영</option>
              </select>
              <select id="memoTag" class="ipt text-sm flex-1 font-bold bg-white px-3 py-2 rounded-lg border border-gray-200">
                  <option value="고객요청">고객요청</option>
                  <option value="예약">예약</option>
                  <option value="기타">기타</option>
              </select>
          </div>
          <div class="flex gap-2">
              <input type="text" id="memoText" class="ipt flex-1 text-sm px-4 py-2.5 rounded-lg border border-gray-200" placeholder="메모 내용 입력 (길게 작성 가능)">
              <button id="addMemoBtn" class="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-5 py-2.5 rounded-lg text-sm font-black shrink-0 transition-colors shadow-sm">등록</button>
          </div>
      </div>
      <div id="memoMsg" class="mt-1.5 text-xs font-bold h-4"></div>
  `;

  if (sessionStorage.getItem(SESSION_FLAG) === "1" && p.shopNo) {
      const targetUrl = `https://racement.co.kr/product-detail?productNo=${p.shopNo}`;
      stickyFooterHtml += `
          <div class="mt-4 pt-4 border-t border-gray-200">
              <div class="text-xs font-bold text-gray-800 mb-2 flex justify-between items-center">
                  <span>🖼️ 이미지 등록 (관리자용)</span>
                  <a href="${targetUrl}" target="_blank" class="text-blue-600 hover:underline">자사몰 열기</a>
              </div>
              <div class="flex gap-2">
                  <input type="text" id="quickImgUrl" class="ipt flex-1 text-sm px-4 py-2.5 rounded-lg border border-gray-200 mono" placeholder="이미지 주소 붙여넣기">
                  <button id="quickImgSave" class="px-5 py-2.5 text-sm font-black bg-gray-800 hover:bg-black text-white rounded-lg shadow-sm">저장</button>
              </div>
              <div id="quickImgMsg" class="mt-1.5 text-xs font-bold h-4"></div>
          </div>
      `;
  }

  let modalContentWrap = $("#detailModal .modal-content");
  if(!modalContentWrap) {
      modalContentWrap = document.createElement("div");
      modalContentWrap.className = "modal-content relative bg-white w-[95%] max-w-[650px] mx-auto my-auto flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh]";
      $("#detailModal").className = "modal-backdrop hidden fixed inset-0 flex items-center justify-center z-[9999] p-4 bg-black/60";
      $("#detailModal").innerHTML = `<div class="modal-outer absolute inset-0 cursor-pointer" onclick="this.closest('.modal-backdrop').classList.add('hidden')"></div>`;
      $("#detailModal").appendChild(modalContentWrap);
  }

  modalContentWrap.innerHTML = `
      <div class="p-5 border-b border-gray-100 flex justify-between items-start bg-white shrink-0 shadow-sm z-10">
          <div id="detailHead" class="flex-1 min-w-0"></div>
          <button id="closeDetail" class="p-2 -mr-2 -mt-2 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-full shrink-0 transition-colors" onclick="this.closest('.modal-backdrop').classList.add('hidden')"><i data-lucide="x" class="w-6 h-6"></i></button>
      </div>
      <div class="flex-1 overflow-y-auto p-5 dash-scroll bg-gray-50/30">
          <div id="detailBody"></div>
          <div class="mt-5">
              <div class="text-sm font-black text-gray-700 mb-3 flex items-center gap-1.5"><i data-lucide="message-square" class="w-4 h-4"></i> 직원 메모 기록</div>
              <div id="detailMemosWrap"></div>
          </div>
      </div>
      <div class="p-5 border-t border-gray-200 bg-gray-50 shrink-0 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          ${stickyFooterHtml}
      </div>
  `;
  
  // HTML 교체 후 내용 다시 채우기
  $("#detailHead").innerHTML = `
    <div class="flex gap-4 items-center">
        ${imgSrc ? `<img src="${imgSrc}" class="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-xl border border-gray-200 bg-white shadow-sm shrink-0">` : `<div class="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center text-xs text-gray-400 font-bold shrink-0">NO IMG</div>`}
        <div class="min-w-0 flex-1">
            <div class="text-xs sm:text-[13px] text-gray-500 font-black mb-1">${escapeHtml(p.브랜드||"-")}</div>
            <div class="text-[18px] sm:text-[22px] font-black text-gray-900 leading-tight truncate break-keep">${escapeHtml(p.품명)}</div>
            <div class="text-blue-600 font-bold text-sm sm:text-base mt-1">${escapeHtml(p.품번)}</div>
        </div>
    </div>
  `;
  
  $("#detailBody").innerHTML = `
    <div class="overflow-x-auto w-full no-scrollbar pb-3">
        <table class="w-full min-w-[500px] text-sm sm:text-base bg-white rounded-xl border-hidden shadow-sm">
        <thead class="bg-gray-50 text-gray-600 font-black border-b border-gray-200">
            <tr>
            <th class="py-3 px-2 text-center w-[16%] border-r border-white">사이즈</th>
            <th class="py-3 px-2 text-center w-[14%] text-blue-700 bg-blue-50/50 border-r border-white">부산</th>
            <th class="py-3 px-2 text-center w-[15%]">본사재고</th>
            <th class="py-3 px-2 text-center w-[20%] border-r border-gray-100">본사 RT</th>
            <th class="py-3 px-2 text-center w-[15%]">신사재고</th>
            <th class="py-3 px-2 text-center w-[20%]">신사 RT</th>
            </tr>
        </thead>
        <tbody>
        ${p.sizes.map(s => {
            let centerRtBtn = s.center > 0 
                ? `<button onclick="quickRT('${p.품번}','${s.size}','본사/물류',1,this)" class="bg-gray-800 hover:bg-black text-white py-2 rounded-lg flex items-center justify-center w-full transition-colors shadow-sm"><i data-lucide="arrow-left-right" class="w-4 h-4"></i></button>` 
                : `<button disabled class="bg-gray-50 text-gray-300 py-2 rounded-lg w-full flex items-center justify-center cursor-not-allowed border border-gray-100"><i data-lucide="minus" class="w-4 h-4"></i></button>`;
            
            let sinsaRtBtn = s.sinsa > 0 
                ? `<button onclick="quickRT('${p.품번}','${s.size}','신사점',1,this)" class="bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg flex items-center justify-center w-full transition-colors shadow-sm"><i data-lucide="arrow-left-right" class="w-4 h-4"></i></button>` 
                : `<button disabled class="bg-gray-50 text-gray-300 py-2 rounded-lg w-full flex items-center justify-center cursor-not-allowed border border-gray-100"><i data-lucide="minus" class="w-4 h-4"></i></button>`;

            return `<tr class="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                <td class="py-3 px-2 font-black text-center border-r border-gray-50 text-[15px]">${s.size}</td>
                <td class="py-3 px-2 font-black text-center bg-blue-50/30 border-r border-gray-50 text-[15px] ${s.busan>0?'text-blue-600':'text-red-500'}">${s.busan}</td>
                <td class="py-3 px-2 font-bold text-center text-gray-600 text-[15px]">${s.center}</td>
                <td class="py-2.5 px-2 text-center border-r border-gray-100">${centerRtBtn}</td>
                <td class="py-3 px-2 font-bold text-center text-gray-600 text-[15px]">${s.sinsa}</td>
                <td class="py-2.5 px-2 text-center">${sinsaRtBtn}</td>
            </tr>`;
        }).join("")}
        </tbody>
        </table>
    </div>
  `;

  $("#detailMemosWrap").innerHTML = detailMemoHtml;

  $("#addMemoBtn").onclick = async () => {
      if(!checkPat()) return;
      const staff = $("#memoStaff").value; 
      const tag = $("#memoTag").value;
      const text = $("#memoText").value.trim();
      const msg = $("#memoMsg");
      if(!staff) { msg.style.color="red"; msg.textContent="작성자를 선택하세요."; return; }
      if(!text) { msg.style.color="red"; msg.textContent="내용을 입력하세요."; return; }
      msg.style.color="black"; msg.textContent="저장 중...";

      try {
          const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${REQUESTS_PATH}`;
          let sha = null; let oldData = [];
          try { 
              const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); 
              if(r.ok){ const j=await r.json(); sha=j.sha; oldData = JSON.parse(decodeURIComponent(escape(atob(j.content)))); } 
          }catch(e){}
          const d = new Date();
          const shortDate = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          const uniqueId = "memo_" + Date.now(); 
          oldData.push({ id: uniqueId, code: p.품번, date: shortDate, product: p.품명, shopNo: p.shopNo, staff, tag, text });
          const body = { message:"add memo", content: utf8ToB64(JSON.stringify(oldData, null, 2)), branch: GH.branch };
          if(sha) body.sha = sha;
          await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
          MEMOS = oldData; CURRENT_PRODUCT.hasMemo = true;
          msg.style.color="green"; msg.textContent="✓ 저장 완료!"; $("#memoText").value = ""; render(); openDetail(p); 
      } catch(e) { msg.style.color="red"; msg.textContent="메모 저장 실패!"; }
  };

  if ($("#quickImgSave")) {
      $("#quickImgSave").onclick = async () => {
          if(!checkPat()) return;
          const url = $("#quickImgUrl").value.trim(); if (!url) return;
          const msg = $("#quickImgMsg"); msg.textContent = "저장 중...";
          try {
              IMAGES[p.shopNo] = url; 
              const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/images.json`;
              let sha = null;
              try { const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); if(r.ok){ const j=await r.json(); sha=j.sha; } }catch(e){}
              const body = { message:"update image manual", content: utf8ToB64(JSON.stringify(IMAGES)), branch: GH.branch };
              if(sha) body.sha = sha;
              await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
              msg.style.color = "green"; msg.textContent = "✓ 완벽하게 저장되었습니다!"; render(); setTimeout(()=>{openDetail(p);}, 500);
          } catch (err) { msg.style.color = "red"; msg.textContent = "실패: " + err.message; }
      };
  }

  $("#detailModal").classList.remove("hidden");
  if(window.lucide) lucide.createIcons();
}

document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-outer")) e.target.closest('.modal-backdrop').classList.add("hidden");
});

$$('button[id^="close"]').forEach(btn => {
    btn.addEventListener("click", (e) => { e.target.closest('.modal-backdrop').classList.add("hidden"); });
});

$$('button.chip[data-cat], button.chip[data-gender], button.chip[data-fav], button.chip[data-stock], button.chip[data-memo], button.chip[data-busanonly]').forEach(b=>b.addEventListener("click",()=>{ 
    saveHistoryState();
    if(b.dataset.cat) { $$('button.chip[data-cat]').forEach(x=>x.dataset.active=(x===b?"1":"0")); }
    else if(b.dataset.gender) { $$('button.chip[data-gender]').forEach(x=>x.dataset.active=(x===b?"1":"0")); }
    else { b.dataset.active = b.dataset.active==="1" ? "0" : "1"; }
    if(b.dataset.busanonly) {
        if(b.dataset.active === "1") b.classList.add('ring-2', 'ring-blue-400');
        else b.classList.remove('ring-2', 'ring-blue-400');
    }
    visibleCount=60; render(); 
}));

$("#resetAll").onclick=()=>{ 
    saveHistoryState();
    $$('button.chip[data-cat]').forEach(b=>b.dataset.active=(b.dataset.cat==="ALL"?"1":"0")); 
    $$('button.chip[data-gender]').forEach(b=>b.dataset.active=(b.dataset.gender==="ALL"?"1":"0")); 
    $$('button.chip[data-fav], button.chip[data-stock], button.chip[data-memo]').forEach(b=>b.dataset.active="0"); 
    $$('#brandChips .chip').forEach(b=>b.dataset.active=(b.dataset.brand==="ALL"?"1":"0")); 
    
    const busanOnlyBtn = $('button.chip[data-busanonly]');
    if(busanOnlyBtn) { busanOnlyBtn.dataset.active = "0"; busanOnlyBtn.classList.remove('ring-2', 'ring-blue-400'); }

    $("#sortSel").value="default";
    if($("#sizeSelFw")) $("#sizeSelFw").value="ALL";
    if($("#sizeSelAp")) $("#sizeSelAp").value="ALL";
    if($("#sizeSelGear")) $("#sizeSelGear").value="ALL";
    $("#q").value=""; visibleCount=60; render(); 
};

$("#sortSel").onchange=()=> { saveHistoryState(); visibleCount=60; render(); };
let qTimer;
$("#q").oninput=()=>{ clearTimeout(qTimer); qTimer=setTimeout(()=>{ visibleCount=60; render(); },120); };
$("#clearQ").onclick=()=>{ saveHistoryState(); $("#q").value=""; visibleCount=60; render(); $("#q").focus(); };
$("#refreshBtn").onclick=()=>loadData(true);
$("#darkModeBtn").onclick=()=>{ document.documentElement.classList.toggle("dark-mode"); localStorage.setItem("theme", document.documentElement.classList.contains("dark-mode") ? "dark" : "light"); };
$("#showroomBtn").onclick=()=>{ document.body.classList.toggle("showroom-mode"); $("#showroomBtn").classList.toggle("bg-orange-500"); };

$("#file").onchange = async (e) => { 
    if(!checkPat()) { e.target.value = ""; return; }
    const f = e.target.files[0]; if(!f) return;
    const d = new Date();
    const dateStr = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    localStorage.setItem('PREV_RAW', JSON.stringify(RAW)); 
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const wb = XLSX.read(new Uint8Array(ev.target.result), {type:"array"});
        let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:"", raw:true});
        const meta = { fileName:f.name, uploadedAt: dateStr };
        try { 
            await commitInventoryToGitHub(rows, meta); 
            RAW = rows; CURRENT_META = meta; 
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({rows, meta, images:IMAGES, memos:MEMOS, transfers:TRANSFERS, promotions:PROMOTIONS, salesGuides:SALES_GUIDES, salesHistory:SALES_HISTORY, _timestamp: Date.now()})); 
            applyMeta(CURRENT_META); rebuildIndex(); render(); setupSearchAutocomplete(); setupQuickActionBar(); $("#adminModal").classList.add("hidden");
            alert("업로드 성공! 데이터가 즉시 반영되었습니다.");
        } catch(err) { alert("업로드 실패! 깃허브 권한을 확인하세요."); }
        $("#file").value = ""; 
    };
    reader.readAsArrayBuffer(f);
};

$("#backToUpload").onclick=()=>{ $("#settingsPanel").classList.add("hidden"); $("#uploadPanel").classList.remove("hidden"); };
$("#adminBtn").onclick=()=>$("#adminModal").classList.remove("hidden");
$("#drop").onclick=()=>$("#file").click(); 
$("#openSettings").onclick=()=>{ $("#uploadPanel").classList.add("hidden"); $("#settingsPanel").classList.remove("hidden"); }; 
$("#pwdGo").onclick=()=>{ if($("#pwd").value===ADMIN_PWD){ sessionStorage.setItem(SESSION_FLAG,"1"); $("#authPanel").classList.add("hidden"); $("#uploadPanel").classList.remove("hidden"); } else alert("비밀번호 오류"); };
$("#ghSave").onclick=()=>{ GH = { owner:$("#ghOwner").value.trim(), repo:$("#ghRepo").value.trim(), branch:$("#ghBranch").value.trim()||"main" }; saveGhConfig(); setPat($("#ghPat").value.trim()); alert("저장됨"); };

window.renderSalesHistoryAdmin = () => {
    const box = $("#salesHistoryAdminBox");
    if(!box) return;
    const count = Object.keys(SALES_HISTORY.items || {}).length;
    box.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <div class="font-black text-orange-800 text-sm">📊 POS 판매 실적 DB</div>
            <div class="flex gap-2 items-center">
                <span class="text-xs font-bold text-orange-500 bg-white px-2 py-1 rounded">품목 ${count}개 누적됨</span>
                <button id="shClearBtn" class="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-500 hover:text-white border border-red-200 px-3 py-1 rounded transition-colors shadow-sm">DB 초기화</button>
            </div>
        </div>
        <div class="text-center cursor-pointer group mt-3 bg-white border border-orange-100 rounded-xl p-4 hover:bg-orange-500 transition-colors" id="shUploadTrigger">
            <div class="font-black text-orange-600 text-sm mb-1.5 group-hover:text-white">판매 엑셀 누적 업데이트</div>
            <div class="text-xs text-orange-400 font-bold group-hover:text-orange-100">POS에서 받은 기간별 판매데이터 그대로 업로드</div>
        </div>
        <input type="file" id="shFile" accept=".xlsx, .xls, .csv" class="hidden">
    `;
    
    $("#shClearBtn").onclick = async () => {
        if(!checkPat()) return;
        if(!confirm("⚠️ 경고: 저장된 모든 판매 기록(DB)을 완전히 삭제하시겠습니까?\n꼬여버린 데이터를 날리고 엑셀을 다시 올릴 때만 사용하세요.")) return;
        try {
            const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${SALES_HISTORY_PATH}`;
            let sha = null;
            try { const req = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); if(req.ok){ const j=await req.json(); sha=j.sha; } }catch(e){}
            const emptyData = { meta: { name: "초기화됨", lastUpdated: new Date().toISOString() }, items: {} };
            const body = { message:"clear sales history DB", content: utf8ToB64(JSON.stringify(emptyData, null, 2)), branch: GH.branch };
            if(sha) body.sha = sha;
            await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
            SALES_HISTORY = emptyData; sessionStorage.removeItem(CACHE_KEY); 
            rebuildIndex(); render(); window.renderSalesHistoryAdmin();
            alert("🗑️ 판매 DB가 완벽하게 초기화되었습니다.\n이제 올바른 엑셀 파일을 다시 업로드해주세요.");
        } catch(err) { alert("초기화 실패: " + err.message); }
    };

    $("#shUploadTrigger").onclick = () => $("#shFile").click();
    $("#shFile").onchange = async (e) => {
        if(!checkPat()) { e.target.value = ""; return; }
        const f = e.target.files[0]; if(!f) return;
        const periodName = prompt("이 판매 데이터의 기간/이름을 적어주세요.\n예) 4/17~5/9 전체점 실적", f.name);
        if(!periodName) { $("#shFile").value = ""; return; }
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const wb = XLSX.read(new Uint8Array(ev.target.result), {type:"array"});
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ""}); 
            let headerRowIdx = rows.findIndex(r => r.includes('품번') && r.includes('수량') && (r.includes('거래명세서일') || r.includes('일자') || r.includes('판매일')));
            if(headerRowIdx === -1) { alert("엑셀에서 '품번', '수량', 날짜('거래명세서일' 등) 열을 찾을 수 없습니다."); return; }
            
            const headers = rows[headerRowIdx].map(h => String(h||"").trim());
            
            let codeIdx = headers.findIndex(h => h === '품번' || h.includes('상품코드') || h.includes('바코드'));
            let qtyIdx = headers.findIndex(h => h === '수량' || h.includes('판매수량'));
            let dateIdx = headers.findIndex(h => h.includes('거래명세서일') || h.includes('일자') || h.includes('판매일'));
            let sizeIdx = headers.findIndex(h => h.includes('규격') || h.includes('사이즈') || h.includes('옵션'));
            let managerIdx = headers.findIndex(h => h.includes('담당자') || h.includes('판매원') || h.includes('사원') || h.includes('작업자'));
            let typeIdx = headers.findIndex(h => h.includes('수주구분') || h.includes('판매구분'));

            let sessionData = {};
            for(let i=headerRowIdx+1; i<rows.length; i++) {
                const r = rows[i];
                const code = String(r[codeIdx]||"").trim();
                const date = String(r[dateIdx]||"").trim();
                const qty = Number(String(r[qtyIdx]||"").replace(/,/g,'')) || 0;
                
                if(!code || !date) continue;

                const size = sizeIdx > -1 ? String(r[sizeIdx]||"").trim() : "알수없음";
                const typeStr = typeIdx > -1 ? String(r[typeIdx]||"").trim() : "";
                const rawManager = managerIdx > -1 ? String(r[managerIdx]||"").replace(/\s/g, '') : "김종훈"; 

                let locationGroup = "본사물류"; 
                
                if(typeStr === "매장" || typeStr.includes("오프라인")) {
                    if(rawManager.includes("김종훈") || rawManager.includes("부산")) locationGroup = "부산(김종훈)";
                    else if(rawManager.includes("승호") || rawManager.includes("강") || rawManager.includes("신사")) locationGroup = "신사(승호강)";
                } else if(rawManager.includes("김종훈")) {
                    locationGroup = "부산(김종훈)";
                }

                if(!sessionData[code]) sessionData[code] = {};
                if(!sessionData[code][date]) sessionData[code][date] = {};
                if(!sessionData[code][date][size]) sessionData[code][date][size] = {};
                sessionData[code][date][size][locationGroup] = (sessionData[code][date][size][locationGroup] || 0) + qty;
            }
            
            let newItems = JSON.parse(JSON.stringify(SALES_HISTORY.items || {}));
            
            for(let code in sessionData) {
                if(!newItems[code]) newItems[code] = {};
                for(let date in sessionData[code]) { 
                    if(typeof newItems[code][date] === 'number') {
                        let oldQty = newItems[code][date];
                        newItems[code][date] = { "알수없음": { "부산(김종훈)": oldQty } };
                    }
                    if(!newItems[code][date]) newItems[code][date] = {};
                    
                    for(let size in sessionData[code][date]) {
                        if(!newItems[code][date][size]) newItems[code][date][size] = {};
                        for(let mgr in sessionData[code][date][size]) {
                            newItems[code][date][size][mgr] = (newItems[code][date][size][mgr] || 0) + sessionData[code][date][size][mgr];
                        }
                    }
                }
            }
            const newHistory = { meta: { name: periodName, lastUpdated: new Date().toISOString() }, items: newItems };

            try {
                const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${SALES_HISTORY_PATH}`;
                let sha = null;
                try { const req = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); if(req.ok){ const j=await req.json(); sha=j.sha; } }catch(e){}
                const body = { message:"update sales history", content: utf8ToB64(JSON.stringify(newHistory, null, 2)), branch: GH.branch };
                if(sha) body.sha = sha;
                await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
                SALES_HISTORY = newHistory; sessionStorage.removeItem(CACHE_KEY); 
                rebuildIndex(); render(); window.renderSalesHistoryAdmin();
                
                alert(`✅ 데이터 업로드 및 지점 자동 분류 성공!`);
            } catch(err) { alert("업로드 실패: " + err.message); }
            $("#shFile").value = "";
        };
        reader.readAsArrayBuffer(f);
    };
};

window.renderPromoAdmin = () => {
    const box = $("#promoAdminBox");
    if(!box) return;
    if(PROMOTIONS && PROMOTIONS.meta && Object.keys(PROMOTIONS.items || {}).length > 0) {
        box.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <div class="font-black text-purple-800 text-sm">🎁 진행 중: ${escapeHtml(PROMOTIONS.meta.name)}</div>
                <button id="endPromoBtn" class="px-3 py-1.5 bg-red-100 text-red-600 text-xs font-black rounded-lg hover:bg-red-500 hover:text-white transition-colors">기획전 종료</button>
            </div>
            <div class="text-xs font-bold text-purple-500 bg-white p-2.5 rounded-lg">${escapeHtml(PROMOTIONS.meta.period)}</div>
        `;
        $("#endPromoBtn").onclick = async () => {
            if(!checkPat()) return;
            if(!confirm("진행 중인 기획전을 완전히 종료하고 모든 상품을 정가로 복구하시겠습니까?")) return;
            try {
                const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${PROMOTIONS_PATH}`;
                let sha = null;
                try { const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); if(r.ok){ const j=await r.json(); sha=j.sha; } }catch(e){}
                const body = { message:"end promotion", content: utf8ToB64(JSON.stringify({}, null, 2)), branch: GH.branch };
                if(sha) body.sha = sha;
                await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
                PROMOTIONS = {}; sessionStorage.removeItem(CACHE_KEY);
                rebuildIndex(); render(); setupQuickActionBar(); window.renderPromoAdmin(); alert("기획전이 성공적으로 종료되었습니다.");
            } catch(e) { alert("종료 실패!"); }
        }
    } else {
        box.innerHTML = `
            <div class="text-center cursor-pointer group" id="promoUploadTrigger">
                <div class="font-black text-purple-800 text-sm mb-1.5 group-hover:text-purple-600">🎁 프로모션 엑셀 등록</div>
                <div class="text-xs text-purple-500 font-bold">MD가 공유한 특가 시트를 업로드하세요</div>
            </div>
            <input type="file" id="promoFile" accept=".xlsx, .xls, .csv" class="hidden">
        `;
        $("#promoUploadTrigger").onclick = () => $("#promoFile").click();
        $("#promoFile").onchange = async (e) => {
            if(!checkPat()) { e.target.value = ""; return; }
            const f = e.target.files[0]; if(!f) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const wb = XLSX.read(new Uint8Array(ev.target.result), {type:"array"});
                const sheet = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ""});
                
                let promoName = "기획전";
                let promoPeriod = "";
                for(let i=0; i<5; i++) {
                    if(!rows[i]) continue;
                    const col0 = String(rows[i][0]||"");
                    if(col0.includes("기획전명")) promoName = col0.replace("기획전명 :", "").replace("기획전명:", "").trim();
                    if(col0.includes("기간")) promoPeriod = col0.replace("기간 :", "").replace("기간:", "").trim();
                }

                let items = {};
                let headerRowIdx = rows.findIndex(r => r.includes('품번')); 
                
                if(headerRowIdx > -1) {
                    const headers = rows[headerRowIdx].map(h => String(h||"").trim());
                    const codeIdx = headers.indexOf('품번');
                    const catIdx = headers.indexOf('특가 카테고리');
                    const wpIdx = headers.indexOf('위클리특가');
                    const wrIdx = headers.indexOf('특가할인율');
                    const fpIdx = headers.indexOf('최종할인가');
                    let frIdx = headers.indexOf('최종 할인율'); 
                    if(frIdx === -1) frIdx = headers.indexOf('쿠폰 할인율');

                    for(let i=headerRowIdx+1; i<rows.length; i++) {
                        const r = rows[i];
                        const code = String(r[codeIdx]||"").trim();
                        if(!code) continue;
                        let wRate = parseFloat(r[wrIdx]) || 0; if(wRate > 1) wRate /= 100; 
                        let fRate = parseFloat(r[frIdx]) || 0; if(fRate > 1) fRate /= 100;
                        items[code] = {
                            targetCat: String(r[catIdx]||"").trim().toUpperCase(),
                            weeklyPrice: Number(String(r[wpIdx]||"").replace(/,/g,'')) || null,
                            weeklyRate: wRate,
                            finalPrice: Number(String(r[fpIdx]||"").replace(/,/g,'')) || null,
                            finalRate: fRate
                        };
                    }
                }
                const newPromo = { meta: { name: promoName, period: promoPeriod }, items };
                try {
                    const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${PROMOTIONS_PATH}`;
                    let sha = null;
                    try { const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); if(r.ok){ const j=await r.json(); sha=j.sha; } }catch(e){}
                    const body = { message:"update promotion", content: utf8ToB64(JSON.stringify(newPromo, null, 2)), branch: GH.branch };
                    if(sha) body.sha = sha;
                    await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
                    PROMOTIONS = newPromo; sessionStorage.removeItem(CACHE_KEY); 
                    rebuildIndex(); render(); setupQuickActionBar(); window.renderPromoAdmin(); alert("기획전 데이터가 성공적으로 반영되었습니다!");
                } catch(err) { alert("업로드 실패: " + err.message); }
                $("#promoFile").value = "";
            };
            reader.readAsArrayBuffer(f);
        };
    }
};

window.renderSalesAdmin = () => {
    const box = $("#salesAdminBox");
    if(!box) return;
    box.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <div class="font-black text-indigo-800 text-sm">🧠 AI 세일즈 가이드 DB</div>
            <span class="text-xs font-bold text-indigo-500 bg-white px-2.5 py-1 rounded-lg">현재 ${Object.keys(SALES_GUIDES).length}개 등록됨</span>
        </div>
        <div class="text-center cursor-pointer group mt-3 bg-white border border-indigo-100 rounded-xl p-4 hover:bg-indigo-600 transition-colors" id="salesUploadTrigger">
            <div class="font-black text-indigo-600 text-sm mb-1.5 group-hover:text-white">엑셀 등록 / 업데이트</div>
            <div class="text-xs text-indigo-400 font-bold group-hover:text-indigo-200">(품번, 키워드, 특징, 추천고객, 응대멘트 포함)</div>
        </div>
        <input type="file" id="salesFile" accept=".xlsx, .xls, .csv" class="hidden">
    `;
    $("#salesUploadTrigger").onclick = () => $("#salesFile").click();
    $("#salesFile").onchange = async (e) => {
        if(!checkPat()) { e.target.value = ""; return; }
        const f = e.target.files[0]; if(!f) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const wb = XLSX.read(new Uint8Array(ev.target.result), {type:"array"});
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, {defval: ""}); 
            let newGuides = {};
            rows.forEach(r => {
                const code = String(r["품번"] || r["상품코드"] || "").trim();
                if(!code) return;
                const rawKw = String(r["키워드"] || r["핵심키워드"] || "");
                const keywords = rawKw ? rawKw.split(',').map(k=>k.trim()).filter(Boolean) : [];
                newGuides[code] = {
                    keywords: keywords, features: String(r["특징"] || r["제품특징"] || ""),
                    target: String(r["추천고객"] || r["타겟고객"] || ""), pitch: String(r["응대멘트"] || r["실전응대멘트"] || "")
                };
            });
            try {
                const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${SALES_GUIDE_PATH}`;
                let sha = null;
                try { const req = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); if(req.ok){ const j=await req.json(); sha=j.sha; } }catch(e){}
                const body = { message:"update sales guide", content: utf8ToB64(JSON.stringify(newGuides, null, 2)), branch: GH.branch };
                if(sha) body.sha = sha;
                await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
                SALES_GUIDES = newGuides; sessionStorage.removeItem(CACHE_KEY); 
                rebuildIndex(); render(); window.renderSalesAdmin();
                alert(`✅ 총 ${Object.keys(SALES_GUIDES).length}개의 세일즈 가이드가 성공적으로 등록되었습니다!`);
            } catch(err) { alert("업로드 실패: " + err.message); }
            $("#salesFile").value = "";
        };
        reader.readAsArrayBuffer(f);
    };
};

window.addEventListener('DOMContentLoaded', () => {
    if ($("#allMemosBtn") && !$("#allTransfersBtn")) {
        const trBtn = document.createElement("button");
        trBtn.id = "allTransfersBtn";
        trBtn.className = $("#allMemosBtn").className.replace(/yellow/g, 'blue');
        trBtn.innerHTML = `🚚 이동요청 목록`;
        trBtn.onclick = window.renderTransfers;
        $("#allMemosBtn").parentNode.insertBefore(trBtn, $("#allMemosBtn").nextSibling);
    }
    
    const stockBtn = $('button.chip[data-stock]');
    if(stockBtn && !$('button.chip[data-busanonly]')) {
        const busanOnlyBtn = document.createElement("button");
        busanOnlyBtn.className = "chip !bg-blue-50 !text-blue-700 !border-blue-200 font-black";
        busanOnlyBtn.dataset.busanonly = "1";
        busanOnlyBtn.dataset.active = "0";
        busanOnlyBtn.innerHTML = "🌊 부산점 ONLY";
        stockBtn.parentNode.insertBefore(busanOnlyBtn, stockBtn.nextSibling);
        busanOnlyBtn.addEventListener("click", () => {
            saveHistoryState();
            busanOnlyBtn.dataset.active = busanOnlyBtn.dataset.active === "1" ? "0" : "1";
            if(busanOnlyBtn.dataset.active === "1") busanOnlyBtn.classList.add('ring-2', 'ring-blue-400');
            else busanOnlyBtn.classList.remove('ring-2', 'ring-blue-400');
            visibleCount=60; render();
        });
    }
    
    if ($("#uploadPanel") && !$("#salesHistoryAdminBox")) {
        const shBox = document.createElement("div"); shBox.id = "salesHistoryAdminBox";
        shBox.className = "mt-5 p-5 border-2 border-orange-200 bg-orange-50 rounded-2xl";
        $("#uploadPanel").appendChild(shBox);
    }

    if ($("#uploadPanel") && !$("#promoAdminBox")) {
        const promoBox = document.createElement("div"); promoBox.id = "promoAdminBox";
        promoBox.className = "mt-5 p-5 border-2 border-purple-200 bg-purple-50 rounded-2xl";
        $("#uploadPanel").appendChild(promoBox);
    }
    
    if ($("#uploadPanel") && !$("#salesAdminBox")) {
        const sgBox = document.createElement("div"); sgBox.id = "salesAdminBox";
        sgBox.className = "mt-5 p-5 border-2 border-indigo-200 bg-indigo-50 rounded-2xl";
        $("#uploadPanel").appendChild(sgBox);
    }

    if(window.renderSalesHistoryAdmin) window.renderSalesHistoryAdmin();
    window.renderPromoAdmin();
    if(window.renderSalesAdmin) window.renderSalesAdmin();
});

loadGhConfig(); loadData();
