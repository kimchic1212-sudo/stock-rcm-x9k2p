// 🔥 1. 관리자 팝업창 스크롤, Z-index 및 모바일 최적화 CSS 🔥
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
    .chip { background-color: #ffffff; border: 1px solid #e2e8f0; color: #1e293b; transition: all 0.2s ease-in-out; cursor: pointer; }
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

    /* 🔥 Glassmorphism 모달 컨테이너 🔥 */
    .glass-modal {
        width: 100%; max-width: 800px; padding: 24px;
        background: rgba(255, 255, 255, 0.25);
        backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 16px;
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
        position: relative; box-sizing: border-box;
    }
    .close-btn {
        position: absolute; top: 24px; right: 24px; background: none; border: none; font-size: 24px; cursor: pointer; color: #333; transition: transform 0.2s ease;
    }
    .close-btn:hover { transform: scale(1.1); }
    .modal-header { margin-bottom: 24px; text-align: center; }
    .modal-header h2 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px; color: #1a1a1a; }
    
    /* 가로형 2단 그리드 */
    .modal-body { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    @media (max-width: 768px) { .modal-body { grid-template-columns: 1fr; } }
    
    .upload-section {
        background: rgba(255, 255, 255, 0.4); border: 2px dashed rgba(0, 0, 0, 0.15); border-radius: 16px;
        display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center; transition: background 0.3s ease, border-color 0.3s ease; cursor: pointer;
    }
    .upload-section:hover { background: rgba(255, 255, 255, 0.6); border-color: rgba(0, 0, 0, 0.3); }
    .upload-icon { font-size: 48px; margin-bottom: 16px; }
    
    .settings-section { display: flex; flex-direction: column; gap: 12px; }
    .setting-card {
        background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 12px;
        padding: 16px; display: flex; align-items: center; justify-content: space-between; transition: all 0.3s ease; cursor: pointer;
    }
    .setting-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); background: rgba(255, 255, 255, 0.7); }
    .card-orange { border-left: 4px solid #ff9a9e; }
    .card-pink { border-left: 4px solid #fecfef; }
    .card-blue { border-left: 4px solid #a1c4fd; }

    /* 대시보드 리스트 스타일 */
    .list-item { display: flex; align-items: center; padding: 9px 0; border-bottom: 1px solid #f0f0f0; transition: background-color 0.15s ease; cursor: pointer; }
    .list-item:last-child { border-bottom: none; }
    .list-item:hover { background-color: #fafafa; border-radius: 8px; padding-left: 8px; padding-right: 8px; margin-left: -8px; margin-right: -8px; }
    .rank { width: 22px; font-weight: 800; color: #bbb; font-size: 11px; text-align: center; shrink: 0; }
    .rank.top3 { color: #f97316; }
    .thumbnail { width: 48px; height: 48px; background-color: #f8f9fa; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 10px; overflow: hidden; border: 1px solid #eee; flex-shrink: 0; }
    .thumbnail img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; }
    .info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .meta { display: flex; align-items: center; gap: 6px; }

    .ui-badge { padding: 2px 6px; border-radius: 5px; font-size: 10px; font-weight: 700; letter-spacing: -0.5px; }
    .ui-badge.women { background: #ffe4e6; color: #e11d48; }
    .ui-badge.unisex { background: #f3e8ff; color: #9333ea; }
    .ui-badge.men { background: #e0f2fe; color: #0284c7; }

    .brand-code { font-size: 11px; color: #bbb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .product-name { font-size: 13px; font-weight: 700; color: #222; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* 브랜드칩 영역 스크롤 */
    #brandChips { max-height: 88px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #ddd transparent; }
    #brandChips::-webkit-scrollbar { width: 4px; }
    #brandChips::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
    /* 브랜드 정렬 토글 활성 */
    .brand-sort-btn[data-active="1"] { background: var(--ink) !important; color: #fff !important; }
    .brand-sort-btn[data-active="0"] { background: var(--surface) !important; color: var(--muted) !important; }

    .stats { text-align: right; display: flex; flex-direction: column; gap: 1px; margin-left: 10px; flex-shrink: 0; min-width: 68px; }
    .stats .stat-primary { font-size: 15px; font-weight: 900; color: #111; }
    .stats .stat-secondary { font-size: 11px; font-weight: 500; color: #999; }
    .stats .stat-primary-rev { font-size: 14px; font-weight: 900; color: #dc2626; }
    .stats .stat-secondary-rev { font-size: 11px; font-weight: 600; color: #555; }
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
const SALES_GUIDE_PATH = "sales_guide_v2.json";
const SALES_HISTORY_PATH = "sales_history.json";
const SALES_DEDUCT_PATH = "sales.json";
const CAT_ORDER = { "신발":0, "의류":1, "용품":2 };

let GH = { owner:"", repo:"", branch:"main" };
let RAW=[], PRODUCTS=[], filtered=[];
let IMAGES = {}; 
let MEMOS = []; 
let TRANSFERS = []; 
let PROMOTIONS = {}; 
let SALES_GUIDES = {}; 
let SALES_HISTORY = { meta: {}, items: {} };
let SALES_DEDUCTIONS = null;
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

const isFwSize = s => /^\d{3}$/.test(s) && s !== "120" && s !== "130";

function loadGhConfig(){ try{ const c=localStorage.getItem(GH_CONFIG_KEY); if(c) GH=Object.assign(GH, JSON.parse(c)); }catch(e){} }
function saveGhConfig(){ localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(GH)); }
function getPat(){ return localStorage.getItem(GH_PAT_KEY) || ""; }
function setPat(v){ if(v) localStorage.setItem(GH_PAT_KEY, v); else localStorage.removeItem(GH_PAT_KEY); }
const ANTH_KEY = "racement_anth_key_v1";
function getAnthKey(){ return localStorage.getItem(ANTH_KEY) || ""; }
function setAnthKey(v){ if(v) localStorage.setItem(ANTH_KEY, v); else localStorage.removeItem(ANTH_KEY); }

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
        brand: (window._activeBrands && window._activeBrands.size > 0) ? [...window._activeBrands] : "ALL",
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
    const _restoredBrands = Array.isArray(state.brand) ? state.brand : (state.brand && state.brand !== "ALL" ? [state.brand] : []);
    window._activeBrands = new Set(_restoredBrands);
    _renderBrandChips();
    
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
    // 💡 수정됨: #adminModal 을 선택자에 추가하여 ESC로 닫히게 복구
    if(e.key === "Escape") {
        const modals = $$('#adminModal, #detailModal, #dashDetailModal, #salesGuideModal, #transfersModal, #allMemosModal, .modal-backdrop');
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
        // 하단에 렌더링되던 불필요한 구역 삭제
        const oldSourceBar = document.getElementById("dataSourceBar");
        if(oldSourceBar) oldSourceBar.remove();
        const globalHeader = document.getElementById("globalHeaderData");
        if(globalHeader) globalHeader.remove();

        const statSrcEl = document.getElementById("statSrc");
        if(!statSrcEl) return;

        // 판매 DB 라벨
        let addInfo = SALES_HISTORY.meta?.name
            ? `<div class="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg text-[11px] font-black border border-orange-100 flex items-center gap-1 shrink-0">
                  📊 ${escapeHtml(SALES_HISTORY.meta.name)}
               </div>`
            : "";

        // 기획전 라벨
        let promoInfo = (PROMOTIONS && PROMOTIONS.meta && PROMOTIONS.meta.name)
            ? `<div class="bg-purple-50 text-purple-700 px-2 py-1 rounded-lg text-[11px] font-black border border-purple-100 flex items-center gap-1 shrink-0">
                  🎁 ${escapeHtml(PROMOTIONS.meta.name)}
               </div>`
            : "";

        // POS 판매 동기화 뱃지
        let posSyncInfo = "";
        const lastSynced = SALES_HISTORY.meta?.lastSynced;
        if (lastSynced) {
            const d = new Date(lastSynced);
            const now = new Date();
            const isToday = d.getFullYear() === now.getFullYear()
                         && d.getMonth()    === now.getMonth()
                         && d.getDate()     === now.getDate();
            const hh = String(d.getHours()).padStart(2,'0');
            const min = String(d.getMinutes()).padStart(2,'0');
            if (isToday) {
                // 오늘 데이터 → 초록 + 시간만
                posSyncInfo = `<div class="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[11px] font-black border border-emerald-200 flex items-center gap-1 shrink-0">
                    <i data-lucide="zap" class="w-3.5 h-3.5 shrink-0"></i> POS판매: ${hh}:${min}
                </div>`;
            } else {
                // 어제 이전 데이터 → 노란색 경고
                const mm = String(d.getMonth()+1);
                const dd = String(d.getDate());
                posSyncInfo = `<div class="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg text-[11px] font-black border border-yellow-300 flex items-center gap-1 shrink-0">
                    <i data-lucide="zap-off" class="w-3.5 h-3.5 shrink-0"></i> POS판매: ${mm}/${dd} (미갱신)
                </div>`;
            }
        } else {
            posSyncInfo = `<div class="bg-gray-50 text-gray-400 px-2 py-1 rounded-lg text-[11px] font-black border border-gray-200 flex items-center gap-1 shrink-0">
                <i data-lucide="zap-off" class="w-3.5 h-3.5 shrink-0"></i> POS판매: 미연동
            </div>`;
        }

        // flex-row 와 flex-wrap을 적용해 가로로 나란히, 넘치면 다음 줄로
        statSrcEl.innerHTML = `
            <div class="flex flex-row flex-wrap gap-2 w-full items-center">
                <div class="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-[11px] font-black border border-blue-100 flex items-center gap-1 shrink-0">
                    <i data-lucide="clock" class="w-3.5 h-3.5 shrink-0"></i> 재고: ${meta.uploadedAt || ''}
                </div>
                ${posSyncInfo}
                ${addInfo}
                ${promoInfo}
            </div>
        `;
        if(window.lucide) lucide.createIcons();
    }
}

async function loadData(force = false){
  const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
  if (!force && cached && (Date.now() - (cached._timestamp||0) < 60000)) {
      RAW = cached.rows || []; CURRENT_META = cached.meta; IMAGES = cached.images || {}; MEMOS = cached.memos || []; TRANSFERS = cached.transfers || []; PROMOTIONS = cached.promotions || {}; SALES_GUIDES = cached.salesGuides || {}; SALES_HISTORY = cached.salesHistory || { meta: {}, items: {} };
      applyMeta(CURRENT_META); rebuildIndex(); applyErpDeductions(); applyPosSalesDeductions(); render(); setupSearchAutocomplete(); setupQuickActionBar(); return;
  }
  try {
      const [invRes, imgRes, memoRes, trRes, promoRes, sgRes, shRes, sdRes] = await Promise.all([
          fetch("./" + DATA_PATH + "?t=" + Date.now()),
          fetch("./images.json?t=" + Date.now()).catch(()=>null),
          fetch("./" + REQUESTS_PATH + "?t=" + Date.now()).catch(()=>null),
          fetch("./" + TRANSFERS_PATH + "?t=" + Date.now()).catch(()=>null),
          fetch("./" + PROMOTIONS_PATH + "?t=" + Date.now()).catch(()=>null),
          fetch("./" + SALES_GUIDE_PATH + "?t=" + Date.now()).catch(()=>null),
          fetch("./" + SALES_HISTORY_PATH + "?t=" + Date.now()).catch(()=>null),
          fetch("./" + SALES_DEDUCT_PATH + "?t=" + Date.now()).catch(()=>null)
      ]);
      const invData = await invRes.json(); RAW = invData.rows || []; CURRENT_META = invData.meta;
      if(imgRes && imgRes.ok) { const _img = await imgRes.json(); IMAGES = _img.images || _img; } else IMAGES = {};
      if(memoRes && memoRes.ok) MEMOS = await memoRes.json(); else MEMOS = [];
      if(trRes && trRes.ok) TRANSFERS = await trRes.json(); else TRANSFERS = [];
      if(promoRes && promoRes.ok) PROMOTIONS = await promoRes.json(); else PROMOTIONS = {};
      if(sgRes && sgRes.ok) SALES_GUIDES = await sgRes.json(); else SALES_GUIDES = {};
      if(shRes && shRes.ok) SALES_HISTORY = await shRes.json(); else SALES_HISTORY = { meta: {}, items: {} };
      if(sdRes && sdRes.ok) SALES_DEDUCTIONS = await sdRes.json(); else SALES_DEDUCTIONS = null;

      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rows: RAW, meta: CURRENT_META, images: IMAGES, memos: MEMOS, transfers: TRANSFERS, promotions: PROMOTIONS, salesGuides: SALES_GUIDES, salesHistory: SALES_HISTORY, _timestamp: Date.now() }));
      applyMeta(CURRENT_META); rebuildIndex(); applyErpDeductions(); applyPosSalesDeductions(); render(); setupSearchAutocomplete(); setupQuickActionBar();
  } catch(e) { console.error("Data Load Error", e); }
}

function utf8ToB64(str){ return btoa(unescape(encodeURIComponent(str))); }

// ── 판매 데이터 자동 갱신 (5분마다) ──────────────────────────────────
let _lastSalesSync = 0;
async function loadSalesOnly() {
  try {
    const res = await fetch("./" + SALES_HISTORY_PATH + "?t=" + Date.now());
    if (!res.ok) return;
    const newHistory = await res.json();
    // 변경된 경우에만 갱신
    const newStr = JSON.stringify(newHistory.meta);
    if (newStr === JSON.stringify(SALES_HISTORY.meta) &&
        newHistory.meta?.lastSynced === SALES_HISTORY.meta?.lastSynced) return;
    SALES_HISTORY = newHistory;
    clearSalesCache();
    // ERP 원본 재고 복원 후 차감 순서대로 재계산
    rebuildIndex();
    applyErpDeductions();
    applyPosSalesDeductions();
    render();
    _lastSalesSync = Date.now();
    // DATA SOURCE POS판매 뱃지 갱신
    applyMeta(CURRENT_META);
    console.log('[판매동기화] 새 데이터 반영 완료:', newHistory.meta?.lastSynced);
  } catch(e) {}
}
// 5분마다 자동 갱신
setInterval(loadSalesOnly, 5 * 60 * 1000);

// ── AI 세일즈 가이드 자동생성 ──────────────────────────────────────
const SALES_GUIDE_SYSTEM_PROMPT = `당신은 RACEMENT 프리미엄 러닝샵의 수석 러닝 슈즈 애널리스트입니다.
요청받은 러닝화에 대해 RunRepeat·Believe in the Run·브랜드 공식 스펙·러닝 커뮤니티 데이터 등 보유한 모든 지식을 활용하여 아래 형식의 가이드를 생성하세요.
수치를 정확히 모를 경우 "약 OOg" 형식으로 추정값을 제공하세요 (추정이라도 비워두지 말 것).
출력은 반드시 한국어로 작성하세요.

# 출력 블록 (파싱용 — 키 이름·순서 절대 변경 금지)
%%APP_DATA_START%%
keywords: 태그1,태그2,태그3,태그4,태그5
features: (핵심 기술 특징 2문장. 폼/플레이트/소재 명시)
target: (추천 대상. 페이스 구간·발형·거리 포함)
pitch: (판매 멘트 1~2문장. 구어체)
weight: (남성 기준 무게. 예: 238g)
heel_stack: (힐 스택. 예: 40mm)
fore_stack: (포어풋 스택. 예: 32mm)
drop: (드롭. 예: 8mm)
spec_analysis: (스펙 수치의 실전 의미 1~2문장. "OOg이라 OO할 때 OO" 형식)
vs_prev: (전작 대비 핵심 개선점 1~2문장. 전작 없으면 "초대 모델" 표기)
vs_others: (동급 경쟁 모델 1~2개 언급 후 본 모델 우위 1~2문장)
why: (이 신발의 한 줄 정의. "카본 없이 카본 속도를 내는 슈퍼트레이너" 같은 임팩트 있는 문장)
best_for: (구체적 페이스 구간 + 러너 타입. 예: "4:30~5:30/km 하프~풀 준비 중립 발")
closing: (클로징 멘트. 수치와 비교를 섞은 확신 어린 1~2문장)
%%APP_DATA_END%%`;

async function callClaudeForGuide(brand, modelName, reviewText) {
    const key = getAnthKey();
    if (!key) throw new Error("Anthropic API Key가 설정되지 않았습니다.\nAdmin > API 설정에서 등록해주세요.");
    const userContent = reviewText.trim()
        ? `브랜드: ${brand}\n모델명: ${modelName}\n\n아래 스펙 데이터를 참고해서 AI 세일즈 가이드를 작성해주세요:\n\n${reviewText}`
        : `브랜드: ${brand}\n모델명: ${modelName}\n\n당신이 알고 있는 이 러닝화의 모든 스펙(무게, 스택, 드롭, 전작 비교, 경쟁사 비교)을 활용해 AI 세일즈 가이드를 작성해주세요.`;
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userContent }] }],
                systemInstruction: { parts: [{ text: SALES_GUIDE_SYSTEM_PROMPT }] },
                generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
            })
        }
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Gemini API 오류 (${res.status}): ${err.error?.message || res.statusText}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function parseGuideResponse(text) {
    const result = { keywords: [], features: "", target: "", pitch: "",
                     weight: "", heel_stack: "", fore_stack: "", drop: "",
                     spec_analysis: "", vs_prev: "", vs_others: "",
                     why: "", best_for: "", closing: "" };
    const blockMatch = text.match(/%%APP_DATA_START%%([\s\S]*?)%%APP_DATA_END%%/);
    if (!blockMatch) return result;
    const block = blockMatch[1];
    const field = (key) => { const m = block.match(new RegExp(key + ":\\s*(.+)")); return m ? m[1].trim() : ""; };
    result.keywords     = field("keywords").split(",").map(k => k.trim()).filter(Boolean);
    result.features     = field("features");
    result.target       = field("target");
    result.pitch        = field("pitch");
    result.weight       = field("weight");
    result.heel_stack   = field("heel_stack");
    result.fore_stack   = field("fore_stack");
    result.drop         = field("drop");
    result.spec_analysis= field("spec_analysis");
    result.vs_prev      = field("vs_prev");
    result.vs_others    = field("vs_others");
    result.why          = field("why");
    result.best_for     = field("best_for");
    result.closing      = field("closing");
    return result;
}

function applyErpDeductions() {
    if(!SALES_DEDUCTIONS) return;
    const d = new Date();
    const today = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    if(SALES_DEDUCTIONS.date !== today) { SALES_DEDUCTIONS = null; return; }
    const bu = SALES_DEDUCTIONS.busan || {}, si = SALES_DEDUCTIONS.sinsa || {};
    for(const p of PRODUCTS) {
        for(const s of p.sizes) {
            const key = p.품번 + '|' + String(s.size).trim();
            if(bu[key]) s.busan = Math.max(0, s.busan - bu[key]);
            if(si[key]) s.sinsa = Math.max(0, s.sinsa - si[key]);
        }
        p.busanTotal = p.sizes.reduce((a,b)=>a+b.busan, 0);
        p.sinsaTotal = p.sizes.reduce((a,b)=>a+b.sinsa, 0);
    }
    window._erpDeductApplied = true;
    window._erpDeductTime = SALES_DEDUCTIONS.updatedAt || '';
}

// ── POS 오늘 판매 차감 (5분마다 갱신) ─────────────────────────────────
// 아침 ERP 재고 - 오늘 POS 판매 = 실시간 부산 잔여 재고
function applyPosSalesDeductions() {
    if (!SALES_HISTORY || !SALES_HISTORY.items) return;
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    for (const p of PRODUCTS) {
        const todaySales = SALES_HISTORY.items[p.품번]?.[todayStr];
        if (!todaySales) continue;

        let changed = false;
        for (const s of p.sizes) {
            const sizeKey = String(s.size).trim();
            const saleEntry = todaySales[sizeKey];
            if (!saleEntry) continue;
            // { '부산': qty } 형태
            const sold = saleEntry['부산'] || 0;
            if (sold > 0) {
                s.busan = Math.max(0, s.busan - sold);
                changed = true;
            }
        }
        if (changed) {
            p.busanTotal = p.sizes.reduce((a, b) => a + b.busan, 0);
        }
    }
}

window.showErpSyncModal = function() {
    // DOM scraping bookmarklet: reads table visible after user clicks 조회 (supports td/th headers)
    const BM = `javascript:(async function(){const K='_rcm';let cfg;try{cfg=JSON.parse(localStorage.getItem(K)||'null');}catch(e){}if(!cfg||!cfg.pat){const pat=prompt('GitHub PAT (최초 1회):');if(!pat)return;cfg={pat,ow:'kimchic1212-sudo',re:'stock-rcm-x9k2p',br:'main'};localStorage.setItem(K,JSON.stringify(cfg));alert('저장완료! ERP에서 조회 후 다시 클릭하세요.');return;}function toast(msg,color){const t=document.createElement('div');t.style.cssText='position:fixed;top:20px;right:20px;z-index:99999;background:'+(color||'#1e293b')+';color:#fff;padding:14px 22px;border-radius:12px;font-size:14px;font-family:sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.4)';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),7000);return t;}const d=new Date(),today=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0'),todayFmt=today.slice(0,4)+'-'+today.slice(4,6)+'-'+today.slice(6);let bu={},si={},found=0;let hs=null,dataRows=[];function findTable(){const docs=[document];try{for(const f of document.querySelectorAll('iframe,frame')){try{if(f.contentDocument)docs.push(f.contentDocument);}catch(e){}}}catch(e){}console.log('[RCM] 탐색 document 수:',docs.length);for(const doc of docs){for(const tr of doc.querySelectorAll('tr')){const cells=Array.from(tr.querySelectorAll('td,th'));const txts=cells.map(c=>c.textContent.trim());if(txts.includes('상품번호')&&txts.includes('규격')){hs=txts;const parent=tr.parentElement;const allTrs=Array.from(parent.querySelectorAll('tr'));const idx=allTrs.indexOf(tr);dataRows=allTrs.slice(idx+1);if(!dataRows.length){const tbl=tr.closest('table');if(tbl){const nextTbl=tbl.nextElementSibling;if(nextTbl&&nextTbl.tagName==='TABLE')dataRows=Array.from(nextTbl.querySelectorAll('tr'));}}console.log('[RCM] 헤더 발견! 컬럼:',txts);return true;}}}return false;}if(!findTable()){toast('테이블 헤더 없음. POS 조회 클릭 후 다시 시도하세요.','#dc2626');console.log('[RCM] 헤더 tr 못 찾음. 최상위 tr 수:',document.querySelectorAll('tr').length,'iframe 수:',document.querySelectorAll('iframe,frame').length);return;}const iON=hs.indexOf('주문번호'),iPn=hs.indexOf('상품번호'),iSp=hs.indexOf('규격'),iSt=hs.indexOf('주문상태'),iDt=hs.indexOf('주문일'),iGb=hs.indexOf('구분');console.log('[RCM] 컬럼 인덱스: 주문번호='+iON+' 상품번호='+iPn+' 규격='+iSp+' 주문상태='+iSt+' 주문일='+iDt+' 구분='+iGb);console.log('[RCM] 데이터 행 수:',dataRows.length);for(const tr of dataRows){const cells=tr.querySelectorAll('td,th');if(!cells.length)continue;const cell=i=>i>=0&&i<cells.length?cells[i].textContent.trim():'';if(iGb>=0){const gb=cell(iGb);if(gb&&gb!=='POS')continue;}if(iDt>=0){const dt=cell(iDt);if(dt&&!dt.includes(todayFmt))continue;}const st=cell(iSt);if(iSt>=0&&st&&!st.includes('(POS)'))continue;const pn=cell(iPn),sp=cell(iSp);if(!pn||!sp)continue;const key=pn+'|'+sp;const isRet=st.includes('반품');const qty=isRet?-1:1;const on=cell(iON);const isBu=!on||on.charAt(7)==='2';if(isBu)bu[key]=(bu[key]||0)+qty;else si[key]=(si[key]||0)+qty;found++;}console.log('[RCM] found:',found,'busan:',Object.keys(bu).length,'sinsa:',Object.keys(si).length);if(!found){toast('오늘 POS 판매 없음. 구분:POS, 오늘 날짜로 조회 후 다시 클릭하세요.','#f59e0b');return;}const prog=toast('GitHub에 저장 중...');try{const sd={date:today,updatedAt:new Date().toLocaleString('ko-KR',{hour12:false}),busan:bu,sinsa:si};const{pat,ow,re,br}=cfg;const api='https://api.github.com/repos/'+ow+'/'+re+'/contents/sales.json';let sha=null;try{const sr=await fetch(api+'?ref='+br+'&t='+Date.now(),{headers:{Authorization:'Bearer '+pat}});if(sr.ok)sha=(await sr.json()).sha;}catch(e){}const pb={message:'sync: ERP DOM '+today,content:btoa(unescape(encodeURIComponent(JSON.stringify(sd)))),branch:br};if(sha)pb.sha=sha;const pr=await fetch(api,{method:'PUT',headers:{Authorization:'Bearer '+pat,'Content-Type':'application/json'},body:JSON.stringify(pb)});if(!pr.ok)throw new Error('GitHub '+pr.status);const total=new Set([...Object.keys(bu),...Object.keys(si)]).size;prog.remove();toast('✓ 완료 — '+total+'개 품목 반영! 재고앱 새로고침하세요','#15803d');}catch(e){prog.remove();toast('오류: '+e.message,'#dc2626');console.error(e);}})();`;

    const existing = document.getElementById('erpSyncModal');
    if(existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'erpSyncModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:28px;max-width:460px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,0.25);font-family:sans-serif;">
        <h3 style="margin:0 0 4px;font-size:18px;font-weight:800;color:#0f172a;">ERP 판매 연동</h3>
        <p style="margin:0 0 20px;font-size:12px;color:#94a3b8;">오늘 POS 판매분을 재고에서 자동 차감합니다</p>

        <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:14px;padding:18px;margin-bottom:14px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#15803d;">① 북마크릿 설치 (최초 1회만)</p>
          <p style="margin:0 0 12px;font-size:12px;color:#166534;">아래 버튼을 북마크 바로 <b>드래그</b>해서 추가하세요</p>
          <a href="${BM}" style="display:inline-flex;align-items:center;gap:6px;background:#16a34a;color:white;padding:10px 18px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:700;cursor:grab;user-select:none;" onclick="return false;">
            📎 ERP 동기화
          </a>
          <p style="margin:10px 0 0;font-size:11px;color:#6b7280;">드래그가 안 되면: 주소창에 북마크 저장 후 북마크 바로 이동</p>
        </div>

        <div style="background:#eff6ff;border:1.5px solid #93c5fd;border-radius:14px;padding:18px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1d4ed8;">② 매일 사용 방법 (2단계)</p>
          <ol style="margin:0;padding-left:20px;font-size:12px;color:#1e40af;line-height:2.4;">
            <li>ERP 주문내역조회 → <b>구분: POS</b>, 오늘 날짜로 <b>조회</b> 클릭</li>
            <li>데이터 뜨면 <b>[ERP 동기화]</b> 북마크릿 클릭 → 완료!</li>
            <li>재고앱 새로고침 → 판매차감 자동 반영</li>
          </ol>
        </div>

        <button onclick="document.getElementById('erpSyncModal').remove()" style="width:100%;padding:12px;background:#0f172a;color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">닫기</button>
      </div>`;
    modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
};

async function commitInventoryToGitHub(rows, meta) {
    if(!GH.owner || !GH.repo) throw new Error("저장소 설정 없음 (ADMIN > API 설정 확인)");
    const pat = getPat();
    if(!pat) throw new Error("PAT 토큰이 없습니다 (ADMIN > API 설정 확인)");
    const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${DATA_PATH}`;
    const headers = { Authorization: "Bearer " + pat, "Content-Type": "application/json" };
    let sha = null;
    try {
        const r = await fetch(apiBase + "?ref=" + encodeURIComponent(GH.branch) + "&t=" + Date.now(), { headers });
        if(r.ok) { const j = await r.json(); sha = j.sha; }
        else if(r.status === 401) throw new Error("PAT 인증 실패 (만료됐거나 권한 부족)");
        else if(r.status !== 404) throw new Error("파일 조회 실패: " + r.status);
    } catch(e) { if(e.message.includes("PAT") || e.message.includes("조회")) throw e; }
    const payload = { message: "update inventory: " + (meta.fileName || "upload") + " by " + (meta.uploadedAt || ""), content: utf8ToB64(JSON.stringify({ meta, rows })), branch: GH.branch };
    if(sha) payload.sha = sha;
    const r2 = await fetch(apiBase, { method: "PUT", headers, body: JSON.stringify(payload) });
    if(!r2.ok) {
        const j = await r2.json().catch(() => ({}));
        throw new Error((j.message || "commit 실패") + " (status " + r2.status + ")");
    }
    return await r2.json();
}

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
      map.set(code, { 품번:code, 품명:r["품명"], 브랜드:r["브랜드"], 카테고리:r["카테고리2"]||r["카테고리"], 성별:r["성별"], gender:detectGender(code, r["성별"]), 소비자가:Number(r["소비자가"]||0), shopNo:String(r["상품번호(샵바이)"]||""), barcode:(()=>{ const keys=["POS바코드번호","POS연동바코드","바코드번호","바코드","EAN","ean","barcode","Barcode"]; for(const k of keys){ const v=String(r[k]||"").replace(/[\s\-]/g,""); if(v.length>=8) return v; } for(const k of Object.keys(r)){ const v=String(r[k]||"").replace(/[\s\-]/g,""); if(/^\d{8,14}$/.test(v)) return v; } return ""; })(), sizes:[], hasMemo: false, periodSales: 0 });
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
    p._hay = [p.품번||"", p.품명||"", p.브랜드||"", p.카테고리||"", p.barcode||""].join(" ").toLowerCase();
    p._hayClean = p._hay.replace(/[\s\-_]/g, ""); 
    p._chosung = getChosung(p._hayClean); 
    return p;
  });

  if(!$("#sizeSelFw") && $("#sortSel")) {
      const container = document.createElement("div");
      container.className = "flex gap-1.5 items-center flex-wrap";

      const createSel = (id, label, optionsHtml) => {
          return `<select id="${id}" class="ipt text-xs font-bold bg-white border-gray-200 rounded px-2 py-1 outline-none">
                     <option value="ALL">📏 ${label}</option>${optionsHtml}
                  </select>`;
      };

      container.innerHTML =
          `<span class="text-[10px] font-bold text-[color:var(--muted)] w-10 shrink-0">사이즈</span>` +
          createSel("sizeSelFw", "신발", generateSizeOptionsHtml(allSizesFw)) +
          createSel("sizeSelAp", "의류", generateSizeOptionsHtml(allSizesAp)) +
          createSel("sizeSelGear", "용품", generateSizeOptionsHtml(allSizesGear));

      // 필터 row 다음, 브랜드 검색 row 앞에 삽입
      const filterDetails = $("#filterDetails");
      const brandSearchRow = $("#brandSearch")?.parentNode?.parentNode;
      if(filterDetails && brandSearchRow) filterDetails.insertBefore(container, brandSearchRow);
      else if(filterDetails) filterDetails.appendChild(container);

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
      promoWrap.className = "flex gap-1.5 items-center overflow-x-auto no-scrollbar pl-[2.875rem]";
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

  // 브랜드 카운트 계산
  const brandCounts = {};
  PRODUCTS.forEach(p => { if(p.브랜드) brandCounts[p.브랜드] = (brandCounts[p.브랜드]||0) + 1; });

  // 최근 브랜드 localStorage
  const _RECENT_KEY = "rcm_recent_brands";
  const _getRecentBrands = () => { try { return JSON.parse(localStorage.getItem(_RECENT_KEY)||"[]"); } catch { return []; } };
  const _addRecentBrand = (b) => {
      let arr = _getRecentBrands().filter(x => x !== b); arr.unshift(b); arr = arr.slice(0, 5);
      localStorage.setItem(_RECENT_KEY, JSON.stringify(arr));
  };

  // 현재 정렬 상태 읽기 (인기순 or 가나다순)
  const _isAlpha = () => $("#brandSortAlpha")?.dataset.active === "1";
  const _getSortedBrands = () => {
      const entries = Object.entries(brandCounts);
      if(_isAlpha()) return entries.sort((a,b) => a[0].localeCompare(b[0], 'ko')).map(x=>x[0]);
      return entries.sort((a,b) => b[1]-a[1]).map(x=>x[0]);
  };

  // 멀티셀렉트 브랜드 Set 초기화
  if(!window._activeBrands) window._activeBrands = new Set();

  // 브랜드 칩 렌더링 (멀티셀렉트)
  const _renderBrandChips = (filterQ = "") => {
      const wrap = $("#brandChips");
      if(!wrap) return;
      const brands = _getSortedBrands();
      const q = filterQ.toLowerCase().trim();

      wrap.innerHTML = "";
      // 전체 칩 (선택된 브랜드 없을 때 활성)
      const allBtn = document.createElement("button");
      allBtn.className = "chip shrink-0"; allBtn.dataset.brand = "ALL";
      allBtn.dataset.active = window._activeBrands.size === 0 ? "1" : "0";
      allBtn.textContent = "전체";
      allBtn.onclick = () => {
          saveHistoryState();
          window._activeBrands.clear();
          _renderBrandChips(filterQ);
          visibleCount = 60; render();
      };
      wrap.appendChild(allBtn);

      brands.filter(b => !q || b.toLowerCase().includes(q)).forEach(b => {
          const btn = document.createElement("button");
          btn.className = "chip shrink-0"; btn.dataset.brand = b;
          btn.dataset.active = window._activeBrands.has(b) ? "1" : "0";
          btn.textContent = b;
          btn.onclick = () => {
              saveHistoryState();
              if(window._activeBrands.has(b)) {
                  window._activeBrands.delete(b);
              } else {
                  window._activeBrands.add(b);
              }
              _renderBrandChips(filterQ);
              visibleCount = 60; render();
          };
          wrap.appendChild(btn);
      });
  };

  // 최근 브랜드 렌더링
  const _renderRecentBrands = () => {
      const rb = $("#recentBrands"); if(!rb) return;
      const recents = _getRecentBrands().filter(b => brandCounts[b]);
      if(recents.length === 0) { rb.classList.add("hidden"); return; }
      rb.classList.remove("hidden");
      rb.style.display = "flex";
      rb.innerHTML = '<span class="text-[10px] text-[color:var(--muted)] shrink-0 font-bold">최근:</span>';
      recents.forEach(b => {
          const btn = document.createElement("button");
          btn.className = "chip shrink-0 text-[10px]"; btn.dataset.brand = b; btn.textContent = b;
          btn.onclick = () => {
              _addRecentBrand(b);
              saveHistoryState();
              $$('#brandChips .chip').forEach(c=>c.dataset.active=(c.dataset.brand===b?"1":"0"));
              visibleCount=60; render();
          };
          rb.appendChild(btn);
      });
  };

  _renderBrandChips();

  // 브랜드 검색 이벤트
  const brandSearchEl = $("#brandSearch");
  if(brandSearchEl && !brandSearchEl.dataset.setup) {
      brandSearchEl.dataset.setup = "1";
      brandSearchEl.addEventListener("input", (e) => _renderBrandChips(e.target.value));
      brandSearchEl.addEventListener("search", () => _renderBrandChips(""));
  }

  // 정렬 토글 이벤트
  const _setupSortToggle = () => {
      const popBtn = $("#brandSortPop"); const alphaBtn = $("#brandSortAlpha");
      if(!popBtn || popBtn.dataset.setup) return;
      popBtn.dataset.setup = "1";
      popBtn.onclick = () => { popBtn.dataset.active="1"; alphaBtn.dataset.active="0"; _renderBrandChips(brandSearchEl?.value||""); };
      alphaBtn.onclick = () => { alphaBtn.dataset.active="1"; popBtn.dataset.active="0"; _renderBrandChips(brandSearchEl?.value||""); };
  };
  _setupSortToggle();

  if($("#statItems")) $("#statItems").textContent = fmt(PRODUCTS.length);
  if($("#statBusan")) $("#statBusan").textContent = fmt(PRODUCTS.reduce((a,p)=>a+p.busanTotal,0));
}

function setupQuickActionBar() {
    const wrap = $("#actionBtnsWrap");
    if(!wrap || wrap.dataset.setup === "1") return;
    wrap.dataset.setup = "1";

    const hasPromo = PROMOTIONS && PROMOTIONS.meta && Object.keys(PROMOTIONS.items || {}).length > 0;
    const erpApplied = !!window._erpDeductApplied;
    wrap.innerHTML = `
<button id="dashBtn" onclick="window.openAnalyticsReport()" class="flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 transition-colors whitespace-nowrap">
            <i data-lucide="bar-chart-2" class="w-3.5 h-3.5"></i><span>분석 리포트</span>
        </button>
        <button id="erpSyncBtn" onclick="window.showErpSyncModal()" class="flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold ${erpApplied ? 'bg-green-500 text-white border-green-600' : 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700'} border rounded-lg transition-colors whitespace-nowrap" title="${erpApplied ? '마지막 동기화: ' + (window._erpDeductTime||'') : 'ERP 판매 연동'}">
            <i data-lucide="${erpApplied ? 'check-circle' : 'refresh-cw'}" class="w-3.5 h-3.5"></i><span>${erpApplied ? '판매차감중' : 'ERP 연동'}</span>
        </button>
        ${hasPromo ? `
        <button id="promoViewBtn" onclick="window.togglePromoView(this)" class="flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-purple-700 transition-colors whitespace-nowrap" data-active="0">
            <i data-lucide="gift" class="w-3.5 h-3.5"></i><span>기획전</span>
        </button>` : ''}
    `;
    if(window.lucide) lucide.createIcons();
}

window.syncErpSales = async function() {
    const ERP_URL = localStorage.getItem('rcm_erp_url') || 'http://121.156.75.226';
    const d = new Date();
    const today = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;

    const btn = document.getElementById('erpSyncBtn');
    if(btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i><span>동기화중...</span>'; if(window.lucide) lucide.createIcons(); }

    const payload = {
        Debug: false, Seq: null, PageToken: null,
        Action: 228002, ActionType: 0,
        PgmMethodName: "Query", ServiceSeq: 111220021, MethodSeq: 1,
        Param: "", SPName: null, SPAlias: null, DBType: null, WFType: null,
        IsCombo: 0, IsSetCombo: 0, IsRunPgmMethod: 0,
        IsExcelQuery: false, IsCommonLuaService: false, IsAuthService: false, IsRunService: false,
        ServiceType: 0,
        JSonData: {
            Tables: [{
                TableName: "DataBlock1",
                Columns: ["orderNo","orderYmdt","productName","productManagementCd","productNo","Spec","Price","Qty","CurAmt","CurVAT","CurAmtTotal","lastProductCouponDiscountAmt","firstProductCouponDiscountAmt","diffProductCouponDiscountAmtSum","lastCartCouponDiscountAmt","firstCartCouponDiscountAmt","diffCartCouponDiscountAmtSum","lastSubPayAmt","firstSubPayAmt","diffSubPayAmtSum","lastMainPayAmt","UMMemberKindName","ordererName","ordererContact1","receiverContact1","orderStatusType","payType","UMReceiptKind","receiverName","ordererEmail","memberId","MemberNo","GubunName","GubunSeq","WHSeq","WHName","IsReturnOrder","IsOrderProc","ItemNick","lastTotalDiscountAmt","TotAmt2","TotAmt4","TotAmt3","deliveryAmt","additionalDiscountAmt","UMOrderKind","CustSeq","EmpSeq","DeptSeq","UMMemberKindSeq","ItemClassMSeq","ItemClassMName","Category","UMSilSeq","UMSilName","UMStoreName","SumTotAmt1","SumTotAmt2","SumTotAmt3","SumTotAmt4","SumTotAmt5","SumTotAmt6","SumlastTotalDiscountAmt"],
                ColumnsType: [0,0,0,1,0,0,5,1,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0,0,0,0,0,1,0,0,0,0,0,1,1,0,0,0,0,5,5,5,5,1,1,1,1,1,1,1,1,0,0,1,0,0,1,5,5,5,5,1,5],
                Rows: []
            }],
            IsSendXml: true, DataBlock1: "DataBlock1"
        },
        callback: null, ToolBarInfo: null, JumpData: null,
        Option: { PgmSeq: null, PgmId: null, WorkingTag: null, XmlFlags: null, Timeout: 3600, LoginPgmSeq: 0, ExecuteSeq: "0", ServiceLayer: null, PgmMethodSeq: 0, ToDsn: null, IsDebug: null, PgmEventSeq: 0, DebugMode: null, JumpPgmSeq: 0, MenuSeq: 0, IsAsyncService: false, IsUseSendMessage: false, SendDateKey: null },
        ExeMsg: { ErrorSeq: 0, Message: "", ErrStatus: "", Method: "", IsSystemError: false, InnerMessage: "" },
        LoginOptionMsg: null,
        LoginDateOptionMsg: { LoginDate: "", LoginDateYear: "", LoginDateMonth: "", LoginDateDay: "" },
        AuthOption: { Type: 0, Data: "" }
    };

    try {
        const res = await fetch(ERP_URL + '/WebApi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json, text/javascript, */*; q=0.01' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        if(!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        const table = data?.JSonData?.Tables?.[0];
        if(!table?.Rows?.length) { showToast('오늘 ERP 판매 데이터 없음'); return; }

        const cols = table.Columns;
        const rows = table.Rows;
        const iNo = cols.indexOf('productNo');
        const iSpec = cols.indexOf('Spec');
        const iQty = cols.indexOf('Qty');
        const iStatus = cols.indexOf('orderStatusType');
        const iDate = cols.indexOf('orderYmdt');
        const iWH = cols.indexOf('WHName');

        const busanDed = {}, sinsaDed = {};
        for(const row of rows) {
            if(String(row[iDate]) !== today) continue;
            if(!String(row[iStatus]).includes('(POS)')) continue;
            const pno = String(row[iNo] || '').trim();
            const spec = String(row[iSpec] || '').trim();
            const qty = parseInt(row[iQty]) || 0;
            const wh = String(row[iWH] || '');
            if(!pno || !spec) continue;
            const key = pno + '|' + spec;
            if(wh.includes('부산')) busanDed[key] = (busanDed[key] || 0) + qty;
            if(wh.includes('신사')) sinsaDed[key] = (sinsaDed[key] || 0) + qty;
        }

        const allKeys = new Set([...Object.keys(busanDed), ...Object.keys(sinsaDed)]);
        if(allKeys.size === 0) { showToast('오늘 POS 판매 내역 없음'); return; }

        for(const p of PRODUCTS) {
            for(const s of p.sizes) {
                const key = p.품번 + '|' + String(s.size).trim();
                if(busanDed[key]) s.busan = Math.max(0, s.busan - busanDed[key]);
                if(sinsaDed[key]) s.sinsa = Math.max(0, s.sinsa - sinsaDed[key]);
            }
            p.busanTotal = p.sizes.reduce((a,b)=>a+b.busan, 0);
            p.sinsaTotal = p.sizes.reduce((a,b)=>a+b.sinsa, 0);
        }

        window._erpDeductApplied = true;
        window._erpDeductTime = new Date().toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'});
        wrap.dataset.setup = "0";
        setupQuickActionBar();
        updateStats();
        render();
        showToast(`ERP 동기화 완료 — 오늘 판매 ${allKeys.size}건 재고 차감 (${window._erpDeductTime})`);

    } catch(e) {
        if(e.name === 'TypeError' || String(e.message).toLowerCase().includes('fetch') || String(e.message).includes('cors')) {
            showToast('CORS 차단 — ERP 직접 연동 불가. 북마크릿 방식으로 전환 필요합니다.');
        } else {
            showToast('ERP 오류: ' + e.message);
        }
        console.error('ERP sync:', e);
        if(btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i><span>ERP 연동</span>'; if(window.lucide) lucide.createIcons(); }
    }
};

window.togglePromoView = (btn, bypassRender = false) => {
    if(!bypassRender) saveHistoryState();
    const isActive = btn.dataset.active === "1";
    btn.dataset.active = isActive ? "0" : "1";
    if(!isActive) {
        btn.classList.replace("bg-purple-50", "bg-purple-600");
        btn.classList.replace("text-purple-700", "text-white");
        btn.innerHTML = `<i data-lucide="x-circle" class="w-3.5 h-3.5"></i><span>해제</span>`;
        window.tempPromoFilter = true;
        $("#promoTypeSel")?.classList.remove("hidden");
        $("#promoRateSel")?.classList.remove("hidden");
    } else {
        btn.classList.replace("bg-purple-600", "bg-purple-50");
        btn.classList.replace("text-white", "text-purple-700");
        btn.innerHTML = `<i data-lucide="gift" class="w-3.5 h-3.5"></i><span>기획전</span>`;
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
            ${matches.map(p => {
                const imgSrc = IMAGES[p.shopNo || p.품번] || null;
                return `
            <div class="p-3 border-b border-gray-50 hover:bg-blue-50 cursor-pointer flex gap-3 items-center" onclick="applySearch('${p.품번}')">
                ${imgSrc ? `<img src="${imgSrc}" class="w-12 h-12 object-contain rounded bg-white border border-gray-100 mix-blend-multiply">` : `<div class="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400 font-bold border border-gray-200">NO IMG</div>`}
                <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold text-gray-400 truncate">${p.브랜드} | ${p.품번}</span>
                    <span class="text-[15px] font-black text-gray-900 truncate">${p.품명}</span>
                </div>
            </div>`}).join('')}
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
    qty = Number(qty) || 1;
    if(qty <= 0) return;

    // iPad/iOS Safari 대응: this가 제대로 바인딩 안 될 때 더미 버튼으로 대체
    if(!btn || !btn.tagName) {
        try { btn = (window.event && (window.event.currentTarget || window.event.target)) || document.createElement('button'); }
        catch(e) { btn = document.createElement('button'); }
    }

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
            <header class="bg-white border-b border-gray-100 px-4 py-3 flex flex-col shrink-0 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="shrink-0">
                        <h1 class="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">📈 부산점 판매 리포트 <span class="text-xs font-bold text-gray-400 hidden sm:inline">(담당: 김종훈)</span></h1>
                        <p id="dashTotalLabel" class="text-xs font-bold text-gray-500 mt-0.5"></p>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <select id="dashBrandSel" class="ipt text-xs font-black bg-white border border-gray-200 rounded px-2 py-1.5 outline-none text-gray-700">
                            <option value="ALL">브랜드 전체</option>
                        </select>
                        <select id="dashSizeFw" class="ipt text-xs font-black bg-white border border-gray-200 rounded px-2 py-1.5 outline-none text-gray-700"><option value="ALL">신발</option>${generateSizeOptionsHtml(allSizesFwSet)}</select>
                        <select id="dashSizeAp" class="ipt text-xs font-black bg-white border border-gray-200 rounded px-2 py-1.5 outline-none text-gray-700"><option value="ALL">의류</option>${generateSizeOptionsHtml(allSizesApSet)}</select>
                        <select id="dashSizeGear" class="ipt text-xs font-black bg-white border border-gray-200 rounded px-2 py-1.5 outline-none text-gray-700"><option value="ALL">용품</option>${generateSizeOptionsHtml(allSizesGearSet)}</select>
                        <div class="w-px h-5 bg-gray-200 mx-0.5 shrink-0"></div>
                        <select id="dashPeriodSel" class="ipt text-xs font-black bg-orange-50 border border-orange-200 text-orange-800 rounded px-2.5 py-1.5 outline-none cursor-pointer">
                            <optgroup label="빠른 기간">
                                <option value="1">어제/오늘</option><option value="7" selected>최근 7일</option><option value="30">최근 1개월</option>
                                <option value="90">최근 3개월</option><option value="180">최근 6개월</option><option value="ALL">전체 누적</option>
                                <option value="CUSTOM_INPUT">📅 직접 지정</option>
                            </optgroup>
                            ${generateDateOptions()}
                        </select>
                        <button id="closeDashboardBtn" class="p-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors ml-1 shrink-0"><i data-lucide="x" class="w-5 h-5"></i></button>
                    </div>
                </div>
                <div id="dashCustomDateWrap" style="display:none" class="mt-2 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 flex-wrap">
                    <span class="text-xs font-black text-orange-700 shrink-0">📅 기간 직접 지정</span>
                    <input type="text" id="dashStart" placeholder="2026-05-01" maxlength="10" class="ipt text-xs px-2 py-1.5 w-[96px] border border-orange-200 rounded bg-white outline-none text-gray-700 font-bold tabular-nums">
                    <span class="text-orange-400 font-bold">~</span>
                    <input type="text" id="dashEnd" placeholder="2026-05-31" maxlength="10" class="ipt text-xs px-2 py-1.5 w-[96px] border border-orange-200 rounded bg-white outline-none text-gray-700 font-bold tabular-nums">
                    <button id="dashApply" class="px-3 py-1.5 bg-orange-500 text-white rounded text-xs font-black shrink-0 hover:bg-orange-600">적용</button>
                    <span class="text-[10px] text-orange-400 font-bold">YYYY-MM-DD 또는 YYYYMMDD</span>
                </div>
            </header>
            <main class="flex-1 overflow-y-auto dash-scroll p-3 flex flex-col gap-3">
                <div class="max-w-[1400px] mx-auto w-full flex flex-col gap-3">
                    <div class="grid grid-cols-3 gap-3">
                        <article class="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                            <h2 class="text-[11px] font-black text-gray-400 mb-2 flex items-center gap-1 uppercase tracking-wide"><i data-lucide="pie-chart" class="w-3 h-3 text-blue-400"></i> 카테고리</h2>
                            <div class="relative w-full" style="height:175px"><canvas id="catChart"></canvas></div>
                        </article>
                        <article class="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                            <h2 class="text-[11px] font-black text-gray-400 mb-2 flex items-center gap-1 uppercase tracking-wide"><i data-lucide="users" class="w-3 h-3 text-pink-400"></i> 성별</h2>
                            <div class="relative w-full" style="height:175px"><canvas id="genderChart"></canvas></div>
                        </article>
                        <article class="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                            <h2 class="text-[11px] font-black text-gray-400 mb-2 flex items-center gap-1 uppercase tracking-wide"><i data-lucide="award" class="w-3 h-3 text-emerald-400"></i> 브랜드 Top5</h2>
                            <div class="relative w-full" style="height:175px"><canvas id="brandChart"></canvas></div>
                        </article>
                    </div>
                    <section class="flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div class="px-4 py-2.5 border-b border-gray-100 flex justify-between items-center bg-gray-50/60 shrink-0">
                            <div class="flex items-center gap-2">
                                <h2 class="text-sm font-black text-gray-800 flex items-center gap-1.5"><i data-lucide="list" class="w-4 h-4 text-orange-500"></i> 판매 랭킹</h2>
                                <div id="activeFilterLabel" class="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg hidden cursor-pointer hover:bg-blue-100 transition-colors">차트 필터 ✖</div>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <select id="dashSortSel" class="ipt text-xs font-bold bg-white border border-gray-200 text-gray-700 rounded px-2 py-1.5 outline-none cursor-pointer">
                                    <option value="qty">수량순</option>
                                    <option value="rev">금액순</option>
                                </select>
                                <button id="dashResetBtn" class="text-[11px] font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">↩ 필터 초기화</button>
                            </div>
                        </div>
                        <div id="dashListBody" class="px-3 py-1"></div>
                    </section>
                </div>
            </main>
        `;

        $("#dashPeriodSel").value = "7";
        $("#dashPeriodSel").onchange = (e) => {
            const val = e.target.value;
            if(val === "CUSTOM_INPUT") {
                $("#dashCustomDateWrap").style.display = "flex";
            } else {
                $("#dashCustomDateWrap").style.display = "none";
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

        const _parseDate = (s) => {
            s = (s || "").trim().replace(/[\/\.]/g, '-');
            if (/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
            return null;
        };
        $("#dashApply").onclick = () => {
            const start = _parseDate($("#dashStart").value);
            const end = _parseDate($("#dashEnd").value);
            if(!start || !end) { alert("날짜 형식을 확인하세요.\n예: 2026-05-01 또는 20260501"); return; }
            currentPeriod = "CUSTOM"; currentCustomStart = start; currentCustomEnd = end;
            dashFilter = { cat: null, brand: null, gender: null }; updateDashData();
        };

        $("#closeDashboardBtn").onclick = () => { modal.classList.add("opacity-0"); setTimeout(() => modal.classList.add("hidden"), 300); };
        $("#dashResetBtn").onclick = () => {
            dashFilter = { cat: null, brand: null, gender: null };
            currentDashBrand = "ALL";
            if($("#dashBrandSel")) $("#dashBrandSel").value = "ALL";
            if($("#dashSizeFw")) { $("#dashSizeFw").value = "ALL"; $("#dashSizeAp").value = "ALL"; $("#dashSizeGear").value = "ALL"; }
            currentSizeFw = "ALL"; currentSizeAp = "ALL"; currentSizeGear = "ALL";
            updateDashData();
        };
        if(window.lucide) lucide.createIcons();
    };

    const updateDashData = () => {
        rawSoldItems = getPeriodItems(currentPeriod, currentCustomStart, currentCustomEnd);
        
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
        $("#dashTotalLabel").innerHTML = `조회기간 내 총 <span class="text-gray-900 font-black text-base">${fmt(totalSales)}개</span> / <span class="text-gray-800 font-black text-base">${krw(totalRev)}</span> 판매${sizeText}`;

        const filterLabel = $("#activeFilterLabel"); let labelText = [];
        if (dashFilter.cat) labelText.push(`[${dashFilter.cat}]`);
        if (dashFilter.brand) labelText.push(`[${dashFilter.brand}]`);
        if (dashFilter.gender) labelText.push(`[${dashFilter.gender}]`);

        if (labelText.length > 0) {
            filterLabel.innerHTML = `${labelText.join(' + ')} ✖ 초기화`; filterLabel.classList.remove("hidden");
            filterLabel.onclick = () => { dashFilter = { cat: null, brand: null, gender: null }; renderDashState(); };
        } else filterLabel.classList.add("hidden");

        $("#dashListBody").innerHTML = filteredItems.map((p, idx) => {
            const imgSrc = IMAGES[p.shopNo || p.품번] || null;
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
                    <div class="mt-1.5 bg-red-50 border border-red-100 px-3 py-2 rounded-lg flex items-center gap-2 w-full ml-[68px]">
                        <i data-lucide="zap" class="w-4 h-4 text-red-500 shrink-0"></i>
                        <div class="text-xs text-red-700 leading-snug font-bold">🔥 긴급확보 추천! 판매 ${p.dashBusanSalesTotal}개 · 타지점 재고 ${p.centerTotal + p.sinsaTotal}개 있음</div>
                    </div>
                `;
            }

            let gLabel = p.성별 || p.gender || "U";
            if(gLabel === "M" || gLabel === "남성" || gLabel === "남") gLabel = "남성"; else if(gLabel === "W" || gLabel === "여성" || gLabel === "여") gLabel = "여성"; else gLabel = "공용";

            let gColorClass = "ui-badge unisex";
            if(gLabel === "남성") gColorClass = "ui-badge men";
            if(gLabel === "여성") gColorClass = "ui-badge women";

            const rankClass = idx < 3 ? "rank top3" : "rank";
            const statsHtml = currentDashSort === 'rev'
                ? `<div class="stats"><div class="stat-primary-rev">${krw(p.dashRev)}</div><div class="stat-secondary-rev">${fmt(p.dashSales)}개</div></div>`
                : `<div class="stats"><div class="stat-primary">${fmt(p.dashSales)}개</div><div class="stat-secondary">${krw(p.dashRev)}</div></div>`;
            return `
            <div class="list-item flex-col items-start w-full" onclick="window.openDashDetail('${p.품번}', '${pParam}')">
                <div class="flex items-center w-full">
                    <div class="${rankClass}">${idx + 1}</div>
                    <div class="thumbnail shrink-0">
                        ${imgSrc ? `<img src="${imgSrc}" loading="lazy">` : `<span style="font-size:9px;color:#ccc;font-weight:700;">NO IMG</span>`}
                    </div>
                    <div class="info">
                        <div class="meta">
                            <span class="${gColorClass}">${escapeHtml(gLabel)}</span>
                            <span class="brand-code">${escapeHtml(p.브랜드)} · ${escapeHtml(p.품번)}</span>
                        </div>
                        <div class="product-name">${escapeHtml(p.품명)}</div>
                    </div>
                    ${statsHtml}
                </div>
                ${insightHtml}
            </div>
            `}).join('');

        if (filteredItems.length === 0) $("#dashListBody").innerHTML = '<div class="h-full flex items-center justify-center text-base font-bold text-gray-400">조건에 맞는 데이터가 없습니다.</div>';

        const renderPieChart = (ctxId, dataObj, filterKey, colors) => {
            const ctx = document.getElementById(ctxId);
            if(!ctx) return null;
            const total = Object.values(dataObj).reduce((a,b)=>a+b,0);
            return new Chart(ctx, {
                type: 'doughnut',
                data: { labels: Object.keys(dataObj), datasets: [{ data: Object.values(dataObj), backgroundColor: colors, borderWidth: 2, borderColor: '#fff', hoverOffset: 4 }] },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '58%',
                    layout: { padding: 2 },
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, pointStyleWidth: 7, padding: 6, boxWidth: 7, font: { weight: '700', size: 9, family: 'Pretendard' } } },
                        datalabels: { color: '#fff', font: { weight: '900', size: 10 }, formatter: (value) => { if(total === 0) return ''; const pct = Math.round((value / total) * 100); return pct > 6 ? pct + '%' : ''; } }
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

        const defaultColors = ['#5c6bc0', '#42a5f5', '#66bb6a', '#ffa726', '#ef5350', '#ab47bc', '#ec407a', '#29b6f6', '#f97316'];
        catChartInstance = renderPieChart('catChart', catData, 'cat', defaultColors);
        
        let sortedBrands = Object.entries(brandData).sort((a, b) => b[1] - a[1]);
        let topBrandData = {}; let otherSales = 0;
        sortedBrands.forEach((b, i) => { if(i < 5) topBrandData[b[0]] = b[1]; else otherSales += b[1]; });
        if(otherSales > 0) topBrandData['기타브랜드'] = otherSales;
        brandChartInstance = renderPieChart('brandChart', topBrandData, 'brand', defaultColors);

        const genderColors = Object.keys(genderData).map(k => { if(k==='남성') return '#0284c7'; if(k==='여성') return '#e11d48'; return '#9333ea'; });
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

    const imgSrc = IMAGES[p.shopNo || p.품번] || null;
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
        let needed = Math.max(0, soldBusan - sObj.busan);
        let takeCenter = Math.min(sObj.center, needed);
        let takeSinsa = Math.min(sObj.sinsa, Math.max(0, needed - takeCenter));

        let badges = [];
        if(sObj.center > 0) {
            let defaultVal = takeCenter > 0 ? takeCenter : 1;
            badges.push(`
                <div class="flex items-center gap-1 bg-gray-50 border border-gray-200 px-1.5 py-1 rounded w-full">
                    <span class="text-[10px] font-bold text-gray-500 w-6 text-center shrink-0">물류</span>
                    <input type="number" id="rt_c_${size}" value="${defaultVal}" min="1" max="${sObj.center}" class="w-8 text-center text-xs font-black bg-white border border-gray-300 rounded outline-none h-6">
                    <button onclick="quickRT('${p.품번}','${size}','물류', document.getElementById('rt_c_${size}').value, this)" class="bg-gray-700 hover:bg-black text-white px-1.5 py-0.5 rounded text-[10px] font-bold flex-1 transition-colors">↔RT</button>
                </div>
            `);
        }
        if(sObj.sinsa > 0) {
            let defaultVal = takeSinsa > 0 ? takeSinsa : 1;
            badges.push(`
                <div class="flex items-center gap-1 bg-orange-50 border border-orange-200 px-1.5 py-1 rounded w-full">
                    <span class="text-[10px] font-bold text-orange-600 w-6 text-center shrink-0">신사</span>
                    <input type="number" id="rt_s_${size}" value="${defaultVal}" min="1" max="${sObj.sinsa}" class="w-8 text-center text-xs font-black bg-white border border-orange-200 rounded outline-none h-6 text-orange-700">
                    <button onclick="quickRT('${p.품번}','${size}','신사', document.getElementById('rt_s_${size}').value, this)" class="bg-orange-500 hover:bg-orange-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold flex-1 transition-colors">↔RT</button>
                </div>
            `);
        }

        if(badges.length > 0 && needed > 0) suggestHtml = `<div class="flex flex-col gap-1 items-stretch w-full">${badges.join("")}</div>`;
        else if (badges.length > 0 && needed <= 0) suggestHtml = `<div class="flex flex-col gap-1 items-stretch w-full opacity-30 hover:opacity-100 transition-opacity">${badges.join("")}</div>`;
        else if (needed > 0) suggestHtml = `<span class="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded text-[10px] font-black block text-center">🚨 전사품절</span>`;

        let rowClass = "border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors";
        if (size === "알수없음") rowClass += " hidden";

        return `<tr class="${rowClass}">
            <td class="py-1.5 px-2 text-gray-700 font-bold border-r border-gray-100 text-xs">${size}</td>
            <td class="py-1.5 text-blue-600 font-black text-sm bg-blue-50/20">${soldBusan > 0 ? soldBusan : '-'}</td>
            <td class="py-1.5 bg-blue-50/20 border-r border-gray-100 text-xs ${sObj.busan<=2?'text-red-500 font-black':'text-gray-600 font-bold'}">${sObj.busan}</td>
            <td class="py-1.5 text-orange-600 font-bold text-xs bg-orange-50/20">${soldSinsa > 0 ? soldSinsa : '-'}</td>
            <td class="py-1.5 text-gray-600 font-bold text-xs bg-orange-50/20 border-r border-gray-100">${sObj.sinsa}</td>
            <td class="py-1.5 text-gray-600 font-bold text-xs bg-gray-50/40">${soldCenter > 0 ? soldCenter : '-'}</td>
            <td class="py-1.5 text-gray-600 font-bold text-xs bg-gray-50/40 border-r border-gray-100">${sObj.center}</td>
            <td class="py-1.5 align-middle px-2">${suggestHtml}</td>
        </tr>`;
    }).join('');

    let gLabel = p.성별 || p.gender || "U";
    if(gLabel === "M" || gLabel === "남성" || gLabel === "남") gLabel = "남성"; else if(gLabel === "W" || gLabel === "여성" || gLabel === "여") gLabel = "여성"; else gLabel = "공용";
    let gColorClass = "ui-badge unisex";
    if(gLabel === "남성") gColorClass = "ui-badge men";
    if(gLabel === "여성") gColorClass = "ui-badge women";

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
                            <span class="${gColorClass}">${escapeHtml(gLabel)}</span>
                            <div class="text-[13px] font-black text-gray-500">${p.브랜드}</div>
                        </div>
                        <h2 class="font-black text-[20px] leading-tight text-gray-900 line-clamp-2 max-w-[300px] sm:max-w-lg">${p.품명}</h2>
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
                    <table class="w-full min-w-[480px] text-xs border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <thead class="text-gray-600 font-black">
                            <tr class="text-center bg-gray-50">
                                <th class="py-2 w-[10%] border-r border-gray-200 align-middle" rowspan="2">사이즈</th>
                                <th class="py-1.5 border-b border-r border-gray-200 bg-blue-100 text-blue-800" colspan="2">부산</th>
                                <th class="py-1.5 border-b border-r border-gray-200 bg-orange-100 text-orange-800" colspan="2">신사</th>
                                <th class="py-1.5 border-b border-r border-gray-200 bg-gray-200 text-gray-700" colspan="2">물류</th>
                                <th class="py-2 w-[22%] align-middle" rowspan="2">보충제안</th>
                            </tr>
                            <tr class="text-center text-[10px] bg-white border-b-2 border-gray-200">
                                <th class="py-1 bg-blue-50/50 text-blue-700 border-r border-gray-100">판매</th>
                                <th class="py-1 bg-blue-50/50 text-gray-500 border-r border-gray-200">재고</th>
                                <th class="py-1 bg-orange-50/50 text-orange-700 border-r border-gray-100">판매</th>
                                <th class="py-1 bg-orange-50/50 text-gray-500 border-r border-gray-200">재고</th>
                                <th class="py-1 bg-gray-50 text-gray-600 border-r border-gray-100">판매</th>
                                <th class="py-1 bg-gray-50 text-gray-500 border-r border-gray-200">재고</th>
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
                type: 'line', 
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
        modal.className = "modal-backdrop hidden fixed inset-0 flex items-center justify-center z-[100] p-3";
        modal.innerHTML = `
            <div class="modal-outer absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer" onclick="this.closest('.modal-backdrop').classList.add('hidden')"></div>
            <div class="modal-content relative bg-gradient-to-br from-slate-50 to-slate-100 w-full max-w-5xl mx-auto my-auto flex flex-col rounded-2xl overflow-hidden shadow-2xl z-10 border border-slate-200" style="max-height:95vh;height:95vh;">
                <!-- 헤더 -->
                <div class="px-5 pt-3 pb-2.5 bg-gradient-to-r from-indigo-900 to-indigo-700 flex justify-between items-center shrink-0">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                            <span class="bg-white/20 text-white text-[9px] px-2 py-0.5 rounded-full font-black tracking-widest uppercase">AI SALES GUIDE</span>
                            <span id="sgBrand" class="text-indigo-200 text-[11px] font-bold"></span>
                        </div>
                        <div class="flex items-center gap-3">
                            <h2 id="sgTitle" class="font-black text-xl text-white leading-tight truncate"></h2>
                            <div id="sgKeywords" class="flex flex-wrap gap-1 shrink-0"></div>
                        </div>
                    </div>
                    <button id="closeSalesGuide" class="ml-3 p-1.5 text-white/60 hover:text-white transition-colors bg-white/10 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4"></i></button>
                </div>
                <!-- 대시보드 3컬럼 -->
                <div id="sgDashboard" class="flex-1 overflow-hidden p-3">
                    <div class="grid grid-cols-3 gap-2.5 h-full">
                        <!-- Col 1: 핵심 스펙 -->
                        <div class="bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex flex-col gap-2 overflow-hidden">
                            <h3 class="font-black text-[10px] text-indigo-500 uppercase tracking-widest flex items-center gap-1 shrink-0"><i data-lucide="bar-chart-2" class="w-3 h-3"></i> 핵심 스펙</h3>
                            <div id="sgMetrics" class="shrink-0">
                                <div class="flex justify-between items-center py-1 border-b border-dashed border-slate-100">
                                    <span id="sgWeightLabel" class="text-[10px] font-bold text-slate-400">무게</span>
                                    <span id="sgWeight" class="text-[12px] font-black text-slate-800"></span>
                                </div>
                                <div class="flex justify-between items-center py-1 border-b border-dashed border-slate-100">
                                    <span class="text-[10px] font-bold text-slate-400">힐 스택</span>
                                    <span id="sgHeel" class="text-[12px] font-black text-slate-800"></span>
                                </div>
                                <div class="flex justify-between items-center py-1 border-b border-dashed border-slate-100">
                                    <span class="text-[10px] font-bold text-slate-400">포어풋 스택</span>
                                    <span id="sgFore" class="text-[12px] font-black text-slate-800"></span>
                                </div>
                                <div class="flex justify-between items-center py-1">
                                    <span class="text-[10px] font-bold text-slate-400">드롭</span>
                                    <span id="sgDrop" class="text-[12px] font-black text-slate-800"></span>
                                </div>
                            </div>
                            <div id="sgSpecBox" class="bg-amber-50 border border-amber-100 rounded-lg p-2 text-[11px] text-amber-800 font-medium leading-snug shrink-0"></div>
                            <div class="flex-1 overflow-hidden">
                                <h4 class="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">핵심 특징</h4>
                                <div id="sgFeatures" class="text-[11px] text-slate-700 font-medium leading-snug"></div>
                            </div>
                        </div>
                        <!-- Col 2: 비교 분석 -->
                        <div class="bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex flex-col gap-2 overflow-hidden">
                            <h3 class="font-black text-[10px] text-indigo-500 uppercase tracking-widest flex items-center gap-1 shrink-0"><i data-lucide="git-compare" class="w-3 h-3"></i> 비교 분석</h3>
                            <div class="bg-slate-50 rounded-lg p-2 shrink-0">
                                <span class="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">VS 전작 (수치)</span>
                                <div id="sgVsPrev" class="text-[11px] text-slate-700 font-medium leading-snug"></div>
                            </div>
                            <div class="bg-red-50 border border-red-100 rounded-lg p-2 shrink-0">
                                <span class="text-[9px] font-black text-red-400 uppercase tracking-widest block mb-1">⚠ 알려진 이슈 / 단점</span>
                                <div id="sgIssues" class="text-[11px] text-red-700 font-medium leading-snug"></div>
                            </div>
                            <div class="bg-slate-50 rounded-lg p-2 shrink-0">
                                <span class="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1">VS 경쟁 모델</span>
                                <div id="sgVsOthers" class="text-[11px] text-slate-700 font-medium leading-snug"></div>
                            </div>
                            <div class="flex-1 overflow-hidden">
                                <h4 class="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">한 줄 정의</h4>
                                <div id="sgWhy" class="text-[12px] font-black text-indigo-700 italic leading-snug"></div>
                            </div>
                        </div>
                        <!-- Col 3: 세일즈 전략 -->
                        <div class="bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex flex-col gap-2 overflow-hidden">
                            <h3 class="font-black text-[10px] text-indigo-500 uppercase tracking-widest flex items-center gap-1 shrink-0"><i data-lucide="target" class="w-3 h-3"></i> 세일즈 전략</h3>
                            <div class="bg-amber-50 border border-amber-100 rounded-lg p-2 shrink-0">
                                <h4 class="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">🎯 브랜드 강조 포인트</h4>
                                <div id="sgBrandFocus" class="text-[11px] text-amber-800 font-medium leading-snug"></div>
                            </div>
                            <div class="shrink-0">
                                <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">추천 타겟</h4>
                                <div id="sgTarget" class="text-[11px] text-slate-700 font-medium leading-snug bg-slate-50 rounded-lg p-2"></div>
                            </div>
                            <div class="shrink-0">
                                <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Best For</h4>
                                <div id="sgBestFor" class="text-[11px] font-bold text-indigo-600 bg-indigo-50 rounded-lg p-2 leading-snug"></div>
                            </div>
                            <div class="flex-1 overflow-hidden">
                                <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">클로징 멘트</h4>
                                <div id="sgPitch" class="text-[12px] font-bold text-indigo-900 leading-snug bg-indigo-50 border-l-4 border-indigo-500 p-2 rounded-r-lg italic"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        $("#closeSalesGuide").onclick = () => modal.classList.add("hidden");
    }

    modal.querySelector("#sgTitle").textContent  = p ? p.품명 : code;
    modal.querySelector("#sgBrand").textContent  = p ? p.브랜드 : "";
    modal.querySelector("#sgKeywords").innerHTML = (guide.keywords || []).map(kw =>
        `<span class="bg-white/20 text-white/90 px-2 py-0.5 rounded-full text-[10px] font-bold border border-white/20">#${escapeHtml(kw)}</span>`).join('');
    // 무게 - 성별 기준 사이즈 표기 (p.gender: "M"/"W"/"U", detectGender()로 설정됨)
    const _isWomens = p && (p.gender === "W" || p.성별 === "여성" || p.성별 === "여");
    const _sizeRef = _isWomens ? "(여 240mm)" : "(남 270mm)";
    const _weightVal = guide.weight || "";
    modal.querySelector("#sgWeight").textContent = _weightVal ? `${_weightVal} ${_sizeRef}` : "—";
    modal.querySelector("#sgWeightLabel").textContent = `무게 (한쪽, ${_isWomens ? "여 US7" : "남 US9"} 기준)`;
    // 스펙 (V2 필드명 매핑)
    modal.querySelector("#sgHeel").textContent     = guide.heelStack   || guide.heel_stack  || "—";
    modal.querySelector("#sgFore").textContent     = guide.foreStack   || guide.fore_stack  || "—";
    modal.querySelector("#sgDrop").textContent     = guide.drop        || "—";
    modal.querySelector("#sgSpecBox").textContent  = guide.specAdv     || guide.spec_analysis || guide.features || "—";
    modal.querySelector("#sgFeatures").textContent = guide.features    || "—";
    // 비교 (V2 필드명 매핑)
    // ①②③ 항목을 줄바꿈으로 분리하는 헬퍼
    function fmtBullet(text, fallback) {
      if (!text) return fallback || "—";
      const escaped = escapeHtml(text);
      // ② ③ ④ ⑤ 앞에 줄바꿈 삽입 (① 앞은 그대로)
      return escaped.replace(/\s*([②③④⑤⑥⑦⑧⑨])/g, '<br>$1');
    }
    // vp: 콤마+공백 기준으로 줄바꿈 (힐/무게/기타 수치 가독성)
    function fmtVp(text) {
      if (!text) return "—";
      const escaped = escapeHtml(text);
      // "V14→V15:" 형태 뒤 줄바꿈, 이후 콤마+스페이스 기준 줄바꿈
      return escaped
        .replace(/^([^:]+:\s*)/, '<strong>$1</strong><br>')
        .replace(/,\s+(?=[^\s])/g, ',<br>');
    }
    modal.querySelector("#sgVsPrev").innerHTML    = fmtVp(guide.verDiff || guide.vs_prev || guide.features);
    modal.querySelector("#sgIssues").innerHTML   = fmtBullet(guide.issues, "특별한 이슈 없음");
    modal.querySelector("#sgVsOthers").textContent = guide.vsComp      || guide.vs_others || "—";
    modal.querySelector("#sgWhy").textContent      = guide.whyThis     || guide.why      || guide.pitch    || "—";
    // 전략 (V2 필드명 매핑)
    modal.querySelector("#sgBrandFocus").innerHTML = fmtBullet(guide.brandFocus, "—");
    modal.querySelector("#sgTarget").textContent   = guide.target      || "—";
    modal.querySelector("#sgBestFor").textContent  = guide.bestFor     || guide.best_for || guide.target   || "—";
    modal.querySelector("#sgPitch").textContent    = guide.closing     || guide.pitch    || "—";

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
  
  const imgSrc = IMAGES[p.shopNo || p.품번] || null;
  
  let deltaHtml = "";
  if (p.delta > 0) deltaHtml = `<span class="text-emerald-600 font-black">▲+${p.delta}</span>`;
  else if (p.delta < 0) deltaHtml = `<span class="text-red-600 font-black">▼${p.delta}</span>`;

  let busanOnlyBadge = "";
  if (p.busanTotal > 0 && p.sinsaTotal === 0 && p.centerTotal === 0) {
      busanOnlyBadge = `<span class="bg-blue-800 text-white px-2 py-0.5 rounded font-black tracking-wide shadow-sm">부산점 ONLY</span>`;
  }

  // 판매 속도 뱃지
  const _cardSales = getSalesSummary(p.품번);
  let salesSpeedBadge = "";
  if(_cardSales.d7 >= 5)      salesSpeedBadge = `<span class="bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded font-black text-[10px]">🔥 7일 ${_cardSales.d7}개</span>`;
  else if(_cardSales.d7 >= 2) salesSpeedBadge = `<span class="bg-blue-50 text-blue-500 border border-blue-100 px-2 py-0.5 rounded font-black text-[10px]">📈 7일 ${_cardSales.d7}개</span>`;

  // RT 추천 뱃지: 30일내 부산 판매 있고 타지점에 재고 있을 때
  let rtChanceBadge = "";
  if(_cardSales.d30 > 0 && (p.centerTotal > 0 || p.sinsaTotal > 0)) {
    rtChanceBadge = `<span class="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded font-black text-[10px]">🔄 RT추천</span>`;
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
             <div class="text-yellow-900 line-clamp-2">${escapeHtml(m.text)}</div>
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

  let gLabel = p.성별 || p.gender || "U";
  if(gLabel === "M" || gLabel === "남성" || gLabel === "남") gLabel = "남성"; else if(gLabel === "W" || gLabel === "여성" || gLabel === "여") gLabel = "여성"; else gLabel = "공용";
  
  let gBadgeClass = "ui-badge unisex";
  if(gLabel === "남성") gBadgeClass = "ui-badge men";
  if(gLabel === "여성") gBadgeClass = "ui-badge women";

  el.innerHTML = `
    <div class="flex flex-col flex-1">
        <div class="flex flex-wrap gap-1.5 text-xs font-bold text-gray-500 mb-2.5 items-center">
            ${busanOnlyBadge}
            ${salesSpeedBadge}
            ${rtChanceBadge}
            ${promoBadge}
            <span class="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">${escapeHtml(p.카테고리||"-")}</span>
            <span class="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">${escapeHtml(p.브랜드||"-")}</span>
            <span class="${gBadgeClass}">${escapeHtml(gLabel)}</span>
            ${deltaHtml}
        </div>

        <div class="flex justify-between items-start w-full relative mb-2 gap-4">
           <div class="flex-1 min-w-0 mt-1">
              <div class="copyable font-extrabold text-[15px] sm:text-[16px] leading-snug mb-1.5 text-left w-full hover:text-blue-600 text-gray-900 line-clamp-2" data-copy="${escapeHtml(p.품명)}">${escapeHtml(p.품명)}</div>
              
              <div class="copyable text-[12px] font-bold text-gray-400 mb-2.5 text-left w-full hover:text-blue-600 flex items-center gap-1.5 line-clamp-1" data-copy="${escapeHtml(p.품번)}">
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
    brand: (window._activeBrands && window._activeBrands.size > 0) ? [...window._activeBrands] : "ALL",
    salesSpeed: ($$('button.chip[data-salesspeed]').find(b=>b.dataset.active==="1")||{}).dataset?.salesspeed || "ALL",
    rtChance: !!$$('button.chip[data-rtchance]').find(b=>b.dataset.active==="1"),
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
    if(f.brand!=="ALL" && !f.brand.includes(p.브랜드)) return false;
    if(f.salesSpeed!=="ALL" && getSalesSummary(p.품번).speed !== f.salesSpeed) return false;
    if(f.rtChance && !(getSalesSummary(p.품번).d30 > 0 && (p.centerTotal > 0 || p.sinsaTotal > 0))) return false;
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

  // RT추천 필터 활성 시 30일 판매량 내림차순 자동 정렬
  const sortMode = f.rtChance ? "salesDesc" : $("#sortSel").value;
  filteredList.sort((a,b) => {
    if(sortMode === "salesDesc") return (getSalesSummary(b.품번).d30||0) - (getSalesSummary(a.품번).d30||0) || String(a.품명).localeCompare(String(b.품명),"ko");
    
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
                <div class="font-bold text-gray-800 mb-2 line-clamp-2">${escapeHtml(m.product)}</div>
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

$("#allMemosBtn").onclick = () => { const _td = new Date(); currentMemoDate = `${_td.getMonth()+1}/${_td.getDate()}`; renderAllMemos(); $("#allMemosModal").classList.remove("hidden"); };
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
            <div class="font-bold text-gray-800 mb-3 text-[15px] line-clamp-2">${escapeHtml(t.product)}</div>
            <div class="flex gap-2 text-xs font-bold text-gray-600 mb-3">
                <span class="bg-gray-100 px-2.5 py-1 rounded">사이즈: ${escapeHtml(t.size)}</span><span class="bg-gray-100 px-2.5 py-1 rounded">수량: <span class="text-blue-600">${t.qty}개</span></span>
            </div>
            <div class="text-blue-900 bg-blue-50 p-3 rounded-lg font-medium text-[13px]">${escapeHtml(t.memo)}</div>
        </div>`;
    });
    listEl.innerHTML = html;
    if(window.lucide) lucide.createIcons();
};

const _salesCache = new Map();
// SALES_HISTORY 로드 후 캐시 초기화용
function clearSalesCache() { _salesCache.clear(); }
function getSalesSummary(code) {
  if(_salesCache.has(code)) return _salesCache.get(code);
  if(!SALES_HISTORY || !SALES_HISTORY.items || !SALES_HISTORY.items[code]) {
    const empty = { d7:0, d30:0, all:0, avgDay:0, speed:'none' };
    _salesCache.set(code, empty); return empty;
  }
  const history = SALES_HISTORY.items[code];
  const today = new Date(); today.setHours(0,0,0,0);
  let d7=0, d30=0, all=0;
  for(let date in history) {
    const diffDays = Math.floor((today - new Date(date)) / 86400000);
    const dayData = history[date];
    let qty = 0;
    if(typeof dayData === 'number') { qty = dayData; }
    else if(typeof dayData === 'object') {
      for(let size in dayData) {
        if(typeof dayData[size] === 'object') {
          for(let mgr in dayData[size]) {
            // 부산점만 카운팅 (김종훈 or 부산 포함)
            if(mgr.includes("김종훈") || mgr.includes("부산")) qty += (dayData[size][mgr]||0);
          }
        } else { qty += (dayData[size]||0); } // 담당자 구분 없는 구형 데이터는 그대로 포함
      }
    }
    all += qty;
    if(diffDays <= 30) d30 += qty;
    if(diffDays <= 7) d7 += qty;
  }
  const avgDay = Math.round((d30/30)*10)/10;
  const speed = d7 >= 5 ? 'hot' : d7 >= 2 ? 'normal' : d7 > 0 ? 'slow' : 'none';
  const result = { d7, d30, all, avgDay, speed };
  _salesCache.set(code, result);
  return result;
}

function openDetail(p){
  CURRENT_PRODUCT = p;
  const imgSrc = IMAGES[p.shopNo || p.품번] || null;
  
  $("#detailHead").innerHTML = `
    <div class="flex gap-3 sm:gap-4 items-center">
        ${imgSrc ? `<img src="${imgSrc}" class="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-xl border border-gray-200 bg-white shadow-sm shrink-0">` : `<div class="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center text-xs text-gray-400 font-bold shrink-0">NO IMG</div>`}
        <div class="min-w-0 flex-1">
            <div class="text-xs sm:text-[13px] text-gray-500 font-black mb-1">${escapeHtml(p.브랜드||"-")}</div>
            <div class="text-[17px] sm:text-[20px] font-black text-gray-900 leading-tight line-clamp-2 break-keep">${escapeHtml(p.품명)}</div>
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
            <th class="py-3 px-2 text-center w-[15%]">물류</th>
            <th class="py-3 px-2 text-center w-[20%] border-r border-gray-100">물류 RT</th>
            <th class="py-3 px-2 text-center w-[15%]">신사</th>
            <th class="py-3 px-2 text-center w-[20%]">신사 RT</th>
            </tr>
        </thead>
        <tbody>
        ${p.sizes.map(s => {
            let centerRtBtn = s.center > 0 
                ? `<button onclick="quickRT('${p.품번}','${s.size}','물류',1,this)" class="bg-gray-800 hover:bg-black text-white py-2 rounded-lg flex items-center justify-center w-full transition-colors shadow-sm"><i data-lucide="arrow-left-right" class="w-4 h-4"></i></button>` 
                : `<button disabled class="bg-gray-50 text-gray-300 py-2 rounded-lg w-full flex items-center justify-center cursor-not-allowed border border-gray-100"><i data-lucide="minus" class="w-4 h-4"></i></button>`;
            
            let sinsaRtBtn = s.sinsa > 0 
                ? `<button onclick="quickRT('${p.품번}','${s.size}','신사',1,this)" class="bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg flex items-center justify-center w-full transition-colors shadow-sm"><i data-lucide="arrow-left-right" class="w-4 h-4"></i></button>` 
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
      <div class="flex gap-1.5 items-center">
          <select id="memoStaff" class="ipt text-xs font-bold bg-white px-2 py-1.5 rounded-lg border border-gray-200 shrink-0" style="width:5.5rem">
              <option value="" disabled selected>작성자</option>
              <option value="김종훈">김종훈</option>
              <option value="김기태">김기태</option>
              <option value="김민정">김민정</option>
              <option value="임경준">임경준</option>
              <option value="박서영">박서영</option>
          </select>
          <select id="memoTag" class="ipt text-xs font-bold bg-white px-2 py-1.5 rounded-lg border border-gray-200 shrink-0" style="width:5.5rem">
              <option value="고객요청">고객요청</option>
              <option value="예약">예약</option>
              <option value="기타">기타</option>
          </select>
          <input type="text" id="memoText" class="ipt flex-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 min-w-0" placeholder="메모 내용">
          <button id="addMemoBtn" class="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-3 py-1.5 rounded-lg text-xs font-black shrink-0 transition-colors">등록</button>
      </div>
      <div id="memoMsg" class="text-[11px] font-bold h-3 mt-0.5 text-red-500"></div>
  `;

  if (sessionStorage.getItem(SESSION_FLAG) === "1") {
      const targetUrl = p.shopNo ? `https://racement.co.kr/product-detail?productNo=${p.shopNo}` : "";
      const linkHtml = p.shopNo ? `<a href="${targetUrl}" target="_blank" class="text-[11px] text-blue-600 hover:underline font-bold shrink-0">자사몰</a>` : '';
      stickyFooterHtml += `
          <div class="flex items-center gap-1.5 pt-1.5 border-t border-gray-100 mt-1">
              <span class="text-[11px] font-bold text-gray-400 shrink-0">🖼️</span>
              <input type="text" id="quickImgUrl" class="ipt flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 mono min-w-0" placeholder="이미지 URL">
              <button id="quickImgSave" class="px-3 py-1.5 text-xs font-black bg-gray-700 hover:bg-black text-white rounded-lg shrink-0">저장</button>
              ${linkHtml}
          </div>
          <div id="quickImgMsg" class="text-[11px] font-bold h-3 mt-0.5"></div>
      `;
  }

  let modalContentWrap = $("#detailModal .modal-content");
  if(!modalContentWrap) {
      modalContentWrap = document.createElement("div");
      modalContentWrap.className = "modal-content relative bg-white w-[96%] max-w-2xl mx-auto my-auto flex flex-col rounded-2xl overflow-hidden shadow-2xl z-10 max-h-[88vh]";
      $("#detailModal").className = "modal-backdrop hidden fixed inset-0 flex items-center justify-center z-[9999] p-4 bg-black/60";
      $("#detailModal").innerHTML = `<div class="modal-outer absolute inset-0 cursor-pointer" onclick="this.closest('.modal-backdrop').classList.add('hidden')"></div>`;
      $("#detailModal").appendChild(modalContentWrap);
  }

  modalContentWrap.innerHTML = `
      <div class="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 shadow-sm z-10">
          <div id="detailHead" class="flex-1 min-w-0 pr-2"></div>
          <button id="closeDetail" class="p-1.5 text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full shrink-0 transition-colors" onclick="this.closest('.modal-backdrop').classList.add('hidden')"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>
      <div class="flex-1 overflow-y-auto dash-scroll">
          <div id="detailBody" class="p-3 pb-1"></div>
          <div id="detailMemosWrap" class="px-3 pb-2 space-y-2"></div>
      </div>
      <div class="px-3 py-2 border-t border-gray-200 bg-white shrink-0 sticky bottom-0 z-20 shadow-[0_-2px_8px_-1px_rgba(0,0,0,0.06)]">
          ${stickyFooterHtml}
      </div>
  `;
  
  const _priceHtml = p.currentPromoPrice
    ? `<span class="text-red-600 font-black text-sm">${krw(p.currentPromoPrice)}</span><span class="text-gray-400 line-through text-xs ml-1">${krw(p.소비자가)}</span>`
    : `<span class="font-black text-sm text-gray-800">${krw(p.소비자가)}</span>`;
  $("#detailHead").innerHTML = `
    <div class="flex gap-3 items-center">
        ${imgSrc ? `<img src="${imgSrc}" class="w-14 h-14 object-contain rounded-xl border border-gray-200 bg-white shadow-sm shrink-0">` : `<div class="w-14 h-14 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center text-[10px] text-gray-400 font-bold shrink-0">NO IMG</div>`}
        <div class="min-w-0 flex-1">
            <div class="text-[11px] text-gray-400 font-bold">${escapeHtml(p.브랜드||"-")}</div>
            <div class="text-[16px] sm:text-[18px] font-black text-gray-900 leading-tight break-keep">${escapeHtml(p.품명)}</div>
            <div class="flex items-center gap-3 mt-0.5 flex-wrap">
                <span class="text-blue-600 font-bold text-xs">${escapeHtml(p.품번)}</span>
                <span>${_priceHtml}</span>
            </div>
        </div>
    </div>
  `;

  // ── 사이즈별 30일 부산 판매량 계산 ──────────────────────────
  const _sizeSales30 = {};
  if (SALES_HISTORY && SALES_HISTORY.items && SALES_HISTORY.items[p.품번]) {
    const _sh = SALES_HISTORY.items[p.품번];
    const _today = new Date(); _today.setHours(0,0,0,0);
    for (let date in _sh) {
      const diffDays = Math.floor((_today - new Date(date)) / 86400000);
      if (diffDays > 30) continue;
      const dayData = _sh[date];
      if (typeof dayData === 'object') {
        for (let size in dayData) {
          if (typeof dayData[size] === 'object') {
            for (let mgr in dayData[size]) {
              if (mgr.includes("김종훈") || mgr.includes("부산")) {
                _sizeSales30[size] = (_sizeSales30[size] || 0) + (dayData[size][mgr] || 0);
              }
            }
          }
        }
      }
    }
  }

  $("#detailBody").innerHTML = `
    <div class="mb-2 flex gap-4 text-xs font-bold text-gray-500 px-1">
        <span>부산 <b class="text-blue-600 text-sm">${p.busanTotal}</b></span>
        <span>물류 <b class="text-gray-700 text-sm">${p.centerTotal}</b></span>
        <span>신사 <b class="text-gray-700 text-sm">${p.sinsaTotal}</b></span>
    </div>
    <div class="overflow-x-auto w-full no-scrollbar">
        <table class="w-full text-sm bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <thead class="bg-gray-50 text-xs text-gray-500 font-black border-b border-gray-200">
            <tr>
            <th class="py-2 px-2 text-center w-[18%] border-r border-gray-100">사이즈</th>
            <th class="py-2 px-1 text-center w-[14%] text-indigo-600 bg-indigo-50/60 border-r border-gray-100">📦 30일</th>
            <th class="py-2 px-1 text-center w-[14%] text-blue-700 bg-blue-50/60 border-r border-gray-100">부산</th>
            <th class="py-2 px-2 text-center border-r border-gray-100">물류 RT <span class="text-gray-400 font-normal">(${p.centerTotal})</span></th>
            <th class="py-2 px-2 text-center">신사 RT <span class="text-gray-400 font-normal">(${p.sinsaTotal})</span></th>
            </tr>
        </thead>
        <tbody>
        ${p.sizes.map(s => {
            const _s30 = _sizeSales30[s.size] || 0;
            let centerRtBtn = s.center > 0
                ? `<button onclick="quickRT('${p.품번}','${s.size}','물류',1,this)" class="bg-gray-700 hover:bg-black text-white py-1 px-2 rounded-md flex items-center justify-center w-full transition-colors gap-1 text-xs font-black"><i data-lucide="arrow-left-right" class="w-3 h-3 shrink-0"></i>${s.center}</button>`
                : `<span class="text-gray-300 text-sm">-</span>`;
            let sinsaRtBtn = s.sinsa > 0
                ? `<button onclick="quickRT('${p.품번}','${s.size}','신사',1,this)" class="bg-orange-500 hover:bg-orange-600 text-white py-1 px-2 rounded-md flex items-center justify-center w-full transition-colors gap-1 text-xs font-black"><i data-lucide="arrow-left-right" class="w-3 h-3 shrink-0"></i>${s.sinsa}</button>`
                : `<span class="text-gray-300 text-sm">-</span>`;
            return `<tr class="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                <td class="py-1.5 px-2 font-black text-center border-r border-gray-100 text-sm">${s.size}</td>
                <td class="py-1.5 px-1 font-bold text-center bg-indigo-50/30 border-r border-gray-100 text-sm ${_s30>0?'text-indigo-600':'text-gray-300'}">${_s30>0?_s30:'-'}</td>
                <td class="py-1.5 px-1 font-black text-center bg-blue-50/30 border-r border-gray-100 text-base ${s.busan>0?'text-blue-600':'text-red-500'}">${s.busan}</td>
                <td class="py-1.5 px-2 text-center border-r border-gray-100">${centerRtBtn}</td>
                <td class="py-1.5 px-2 text-center">${sinsaRtBtn}</td>
            </tr>`;
        }).join("")}
        </tbody>
        </table>
    </div>
  `;

  // ── 판매 현황 패널 (detailBody 아래에 append) ──────────────
  const _sales = getSalesSummary(p.품번);
  const _totalStock = p.sizes.reduce((s, sz) => s + (sz.busan||0) + (sz.center||0) + (sz.sinsa||0), 0);
  const _daysLeft = _sales.avgDay > 0 ? Math.round(_totalStock / _sales.avgDay) : null;
  const _hasData = _sales.all > 0;
  const _heatLabel = !_hasData ? '데이터 없음' : _sales.d7 >= 5 ? '🔥 핫셀러' : _sales.d7 >= 2 ? '📈 보통' : '📦 저조';
  const _heatColor = !_hasData ? 'text-gray-400' : _sales.d7 >= 5 ? 'text-red-500' : _sales.d7 >= 2 ? 'text-blue-500' : 'text-gray-400';
  // 같은 기준(누적 전체)으로 막대 비율 계산
  const _maxSales = Math.max(_sales.all, 1);
  const _bar7  = Math.min(100, Math.round((_sales.d7  / _maxSales) * 100));
  const _bar30 = Math.min(100, Math.round((_sales.d30 / _maxSales) * 100));
  const _daysColor = _daysLeft === null ? '' : _daysLeft <= 14 ? 'text-red-600' : _daysLeft <= 30 ? 'text-orange-500' : 'text-gray-500';

  const _salesDiv = document.createElement("div");
  _salesDiv.className = "px-3 pb-3";
  _salesDiv.innerHTML = `
    <div class="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-slate-50 p-3">
      <div class="flex justify-between items-center mb-2">
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] font-black text-indigo-600 tracking-wide">📊 판매 현황</span>
          <span class="text-[9px] text-gray-400 font-bold bg-gray-100 px-1.5 py-0.5 rounded">부산점 기준</span>
        </div>
        <span class="text-[11px] font-black ${_heatColor}">${_heatLabel}</span>
      </div>
      ${!_hasData
        ? `<div class="text-[11px] text-gray-400 font-bold text-center py-1.5">판매 이력 없음</div>`
        : `<div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black text-gray-400 w-7 shrink-0">7일</span>
              <div class="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div class="h-2 rounded-full bg-indigo-500" style="width:${_bar7}%"></div>
              </div>
              <span class="text-[12px] font-black text-indigo-700 w-9 text-right shrink-0">${_sales.d7}개</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black text-gray-400 w-7 shrink-0">30일</span>
              <div class="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div class="h-2 rounded-full bg-blue-400" style="width:${_bar30}%"></div>
              </div>
              <span class="text-[12px] font-black text-blue-700 w-9 text-right shrink-0">${_sales.d30}개</span>
            </div>
            <div class="flex justify-between items-center pt-1.5 border-t border-indigo-100 mt-0.5 flex-wrap gap-y-1">
              <span class="text-[10px] text-gray-500 font-bold">일평균 <strong class="text-gray-800">${_sales.avgDay}개</strong></span>
              <span class="text-[10px] text-gray-500 font-bold">누적 <strong class="text-gray-800">${_sales.all}개</strong></span>
              ${_daysLeft !== null ? `<span class="text-[10px] font-black ${_daysColor}">소진까지 약 <strong>${_daysLeft}일</strong></span>` : ''}
            </div>
          </div>`
      }
    </div>`;
  $("#detailBody").appendChild(_salesDiv);

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
              IMAGES[p.shopNo || p.품번] = url; 
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

$$('button.chip[data-cat], button.chip[data-gender], button.chip[data-fav], button.chip[data-stock], button.chip[data-memo], button.chip[data-busanonly], button.chip[data-salesspeed], button.chip[data-rtchance]').forEach(b=>b.addEventListener("click",()=>{
    saveHistoryState();
    if(b.dataset.cat) { $$('button.chip[data-cat]').forEach(x=>x.dataset.active=(x===b?"1":"0")); }
    else if(b.dataset.gender) { $$('button.chip[data-gender]').forEach(x=>x.dataset.active=(x===b?"1":"0")); }
    else if(b.dataset.salesspeed) {
        // 판매속도: 같은 버튼 다시 누르면 해제, 다른 버튼 누르면 단일 선택
        const isActive = b.dataset.active === "1";
        $$('button.chip[data-salesspeed]').forEach(x=>x.dataset.active="0");
        if(!isActive) b.dataset.active = "1";
    }
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
    $$('button.chip[data-fav], button.chip[data-stock], button.chip[data-memo], button.chip[data-salesspeed], button.chip[data-rtchance]').forEach(b=>b.dataset.active="0");
    window._activeBrands = new Set();
    _renderBrandChips();
    if($("#brandSearch")) { $("#brandSearch").value = ""; }
    if($("#sortSel")) { $("#sortSel").value = "default"; }

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
        } catch(err) { alert("업로드 실패!\n\n원인: " + (err?.message || err) + "\n\n→ ADMIN > API 설정에서 PAT 토큰을 확인하세요."); console.error("Upload error:", err); }
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
    const count = Object.keys(SALES_HISTORY.items || {}).length;
    const countEl = document.getElementById("shCount");
    if(countEl) countEl.innerText = `누적 ${count}개`;

    const clearBtn = document.getElementById("shClearBtn");
    if(clearBtn) {
        clearBtn.onclick = async (e) => {
            e.stopPropagation(); 
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
    }

    const trigger = document.getElementById("shUploadTrigger");
    const fileInput = document.getElementById("shFile");
    if(trigger && fileInput) {
        trigger.onclick = () => fileInput.click();
        fileInput.onchange = async (e) => {
            if(!checkPat()) { e.target.value = ""; return; }
            const f = e.target.files[0]; if(!f) return;
            const periodName = prompt("이 판매 데이터의 기간/이름을 적어주세요.\n예) 4/17~5/9 전체점 실적", f.name);
            if(!periodName) { fileInput.value = ""; return; }
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
                    } else if(rawManager.includes("김종훈")) { locationGroup = "부산(김종훈)"; }

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
                fileInput.value = "";
            };
            reader.readAsArrayBuffer(f);
        };
    }
};

window.renderPromoAdmin = () => {
    const card = $("#promoUploadTrigger");
    if(!card) return;

    if(PROMOTIONS && PROMOTIONS.meta && Object.keys(PROMOTIONS.items || {}).length > 0) {
        card.innerHTML = `
            <div class="flex-1 cursor-default">
                <h4 class="m-0 mb-1 text-gray-900 font-bold text-[14px]">🎁 진행 중: ${escapeHtml(PROMOTIONS.meta.name)}</h4>
                <span class="text-[11px] text-purple-600 font-bold">${escapeHtml(PROMOTIONS.meta.period)}</span>
            </div>
            <span id="endPromoBtn" class="text-[11px] font-bold text-[#b83280] bg-[#fecfef]/50 px-2.5 py-1 rounded cursor-pointer hover:bg-[#fecfef] transition-colors z-10 whitespace-nowrap ml-2">기획전 종료</span>
        `;
        card.onclick = null;
        document.getElementById("endPromoBtn").onclick = async (e) => {
            e.stopPropagation();
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
        card.innerHTML = `
            <div class="flex-1">
                <h4 class="m-0 mb-1 text-gray-900 font-bold text-[14px]">프로모션 엑셀 등록</h4>
                <span class="text-[11px] text-gray-600 font-bold">MD가 공유한 특가 시트 업로드</span>
            </div>
            <input type="file" id="promoFile" accept=".xlsx, .xls, .csv" class="hidden">
        `;
        card.onclick = () => document.getElementById("promoFile").click();
        document.getElementById("promoFile").onchange = async (e) => {
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
                document.getElementById("promoFile").value = "";
            };
            reader.readAsArrayBuffer(f);
        };
    }
};

window.renderSalesAdmin = () => {
    const countEl = document.getElementById("sgCount");
    if(countEl) countEl.innerText = `현재 ${Object.keys(SALES_GUIDES).length}개`;

    const trigger = document.getElementById("salesUploadTrigger");
    const fileInput = document.getElementById("salesFile");
    if(trigger && fileInput) {
        trigger.onclick = () => fileInput.click();
        fileInput.onchange = async (e) => {
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
                fileInput.value = "";
            };
            reader.readAsArrayBuffer(f);
        };
    }
};

window.addEventListener('DOMContentLoaded', () => {
    // 다크모드 / 쇼룸모드 상태 복원
    if(localStorage.getItem("theme") === "dark") document.documentElement.classList.add("dark-mode");

    // 🚚 상단 이동요청 버튼 복구
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
    
    // 🔥 Admin Modal : 기능(비밀번호, 설정, 업로드) + 디자인(Glassmorphism) 완벽 결합 🔥
    const adminModal = document.getElementById("adminModal");
    if(adminModal) {
        adminModal.className = "hidden fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm transition-opacity";
        
        // 설정 패널 렌더링을 위해 현재 GH 값 로드
        const ghOwner = GH.owner || "";
        const ghRepo = GH.repo || "";
        const ghBranch = GH.branch || "main";
        const ghPat = getPat();

        adminModal.innerHTML = `
            <div class="absolute inset-0 cursor-pointer modal-outer" onclick="document.getElementById('adminModal').classList.add('hidden')"></div>
            
            <div class="glass-modal relative flex flex-col w-full max-w-[800px] bg-white/50 border border-white/60 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] overflow-hidden" style="backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);">
                
                <button class="absolute top-5 right-6 bg-transparent border-none text-3xl cursor-pointer text-gray-800 hover:scale-110 transition-transform z-50" onclick="document.getElementById('adminModal').classList.add('hidden')">&times;</button>
                
                <div id="authPanel" class="flex flex-col items-center justify-center p-10 sm:p-20 w-full min-h-[400px] transition-all duration-300">
                    <div class="w-20 h-20 bg-white/60 rounded-full flex items-center justify-center mb-5 shadow-sm border border-white/80">
                        <i data-lucide="lock" class="w-9 h-9 text-gray-800"></i>
                    </div>
                    <div class="text-center mb-8">
                        <h2 class="text-[28px] font-black tracking-tight text-gray-900 leading-tight mb-2">RACEMENT<br>ADMIN</h2>
                        <p class="text-[13px] font-bold text-gray-500">안전한 관리를 위해 비밀번호를 입력해주세요</p>
                    </div>
                    <div class="flex gap-2 w-full max-w-[340px]">
                        <input type="password" id="pwd" placeholder="비밀번호 입력" class="ipt flex-1 px-5 py-3.5 rounded-2xl bg-white/60 border border-white/80 text-[15px] font-black text-center text-gray-800 outline-none focus:bg-white focus:border-gray-400 shadow-sm transition-all placeholder:text-gray-400">
                        <button id="pwdGo" class="px-7 py-3.5 bg-gray-900 hover:bg-black text-white rounded-2xl text-[15px] font-black transition-transform hover:-translate-y-0.5 shadow-md shrink-0">입장</button>
                    </div>
                </div>

                <div id="uploadPanel" class="hidden flex-col md:flex-row w-full p-6 sm:p-8 gap-6 transition-all duration-300">
                    <div class="flex-1 flex flex-col">
                        <div class="text-center mb-6 w-full">
                            <h2 class="m-0 text-[22px] font-extrabold tracking-wide text-gray-900 leading-tight">RACEMENT<br>ADMIN PANEL</h2>
                        </div>
                        <div id="mainUploadTrigger" class="upload-section flex-1 bg-white/40 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all hover:bg-white/60 hover:border-gray-400 shadow-sm min-h-[200px]">
                            <div class="text-5xl mb-4">☁️</div>
                            <h3 class="m-0 mb-2 text-gray-900 font-bold text-[16px]">메인 재고 파일 클릭/드래그</h3>
                            <p class="m-0 text-gray-500 text-[13px] font-bold">업로드 시 창고/매장 재고 자동 갱신</p>
                        </div>
                    </div>

                    <div class="flex-1 flex flex-col gap-3">
                        <div id="shAdminWrapper" class="setting-card card-orange">
                            <div id="shUploadTrigger" class="flex-1">
                                <h4 style="margin: 0 0 4px 0; color: #222; font-size: 14px; font-weight: 800;">POS 판매 실적 DB</h4>
                                <span style="font-size: 11px; color: #666; font-weight: bold;">판매 엑셀 누적 업데이트</span>
                            </div>
                            <div class="flex flex-col items-end gap-1.5 ml-2">
                                <span id="shClearBtn" style="font-size: 11px; font-weight: bold; color: #ff5252; background: rgba(255,82,82,0.1); padding: 4px 8px; border-radius: 6px; cursor: pointer; z-index: 10;">DB 초기화</span>
                                <span id="shCount" style="font-size: 11px; font-weight: bold; color: #888;"></span>
                            </div>
                            <input type="file" id="shFile" accept=".xlsx, .xls, .csv" class="hidden">
                        </div>

                        <div id="promoUploadTrigger" class="setting-card card-pink">
                            </div>

                        <div class="setting-card card-blue">
                            <div id="salesUploadTrigger" class="flex-1">
                                <h4 style="margin: 0 0 4px 0; color: #222; font-size: 14px; font-weight: 800;">AI 세일즈 가이드 DB</h4>
                                <span style="font-size: 11px; color: #666; font-weight: bold;">특징 및 추천고객 업데이트</span>
                            </div>
                            <div class="flex flex-col items-end gap-1.5 ml-2 shrink-0">
                                <span id="sgCount" style="font-size: 11px; font-weight: bold; color: #4facfe; background: rgba(79,172,254,0.1); padding: 4px 8px; border-radius: 6px; white-space: nowrap;"></span>
                                <span id="missDetectBtn" style="font-size: 11px; font-weight: bold; color: #ff9f43; background: rgba(255,159,67,0.1); padding: 4px 8px; border-radius: 6px; white-space: nowrap; cursor: pointer;">🔍 미등록 탐지</span>
                            </div>
                            <input type="file" id="salesFile" accept=".xlsx, .xls, .csv" class="hidden">
                        </div>
                        
                        <div class="flex justify-between items-center mt-auto pt-4 border-t border-gray-200/40">
                            <button id="openSettings" class="px-3 py-2 rounded-lg bg-gray-100/50 text-gray-600 text-xs font-bold hover:bg-white transition-colors flex items-center gap-1.5 border border-white/60"><i data-lucide="settings" class="w-3.5 h-3.5"></i> API 설정</button>
                            <button class="px-6 py-2.5 rounded-xl bg-gray-900 text-white border-none text-[13px] font-bold cursor-pointer hover:bg-gray-800 transition-all shadow-sm" onclick="document.getElementById('adminModal').classList.add('hidden')">닫기</button>
                        </div>
                    </div>
                </div>

                <div id="settingsPanel" class="hidden flex-col w-full p-6 sm:p-8 transition-all duration-300">
                    <h2 class="text-xl font-black text-gray-900 mb-5 flex items-center gap-2"><i data-lucide="github" class="w-5 h-5"></i> GitHub API 연동 설정</h2>
                    <div class="space-y-4 mb-6">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">GitHub 저장소 소유자 (Owner)</label>
                            <input type="text" id="ghOwner" value="${ghOwner}" class="ipt w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-bold outline-none focus:border-blue-500 shadow-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">저장소 이름 (Repo)</label>
                            <input type="text" id="ghRepo" value="${ghRepo}" class="ipt w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-bold outline-none focus:border-blue-500 shadow-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">브랜치 (Branch)</label>
                            <input type="text" id="ghBranch" value="${ghBranch}" class="ipt w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-bold outline-none focus:border-blue-500 shadow-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">Personal Access Token (PAT)</label>
                            <input type="password" id="ghPat" value="${ghPat}" class="ipt w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-bold outline-none focus:border-blue-500 shadow-sm">
                        </div>
                        <div class="pt-3 border-t border-gray-200/40">
                            <label class="block text-xs font-bold text-purple-500 mb-1">🤖 Gemini API Key (AI 세일즈 가이드 자동생성)</label>
                            <input type="password" id="anthKeyInput" value="${getAnthKey()}" class="ipt w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm font-bold outline-none focus:border-purple-500 shadow-sm bg-purple-50/30" placeholder="AIzaSy...">
                            <p class="text-[10px] text-gray-400 font-bold mt-1">발급: <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-purple-400 underline">aistudio.google.com</a> → 무료 / 미등록 탐지 → AI 자동생성에 사용</p>
                        </div>
                    </div>
                    <div class="flex justify-end gap-3 mt-auto pt-4 border-t border-gray-200/40">
                        <button id="backToUpload" class="px-5 py-2.5 rounded-xl bg-white/60 border border-white text-gray-700 text-[13px] font-bold hover:bg-white transition-colors shadow-sm">돌아가기</button>
                        <button id="ghSave" class="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-bold hover:bg-black transition-colors shadow-sm">설정 저장</button>
                    </div>
                </div>

                <div id="missPanel" class="hidden flex-col w-full transition-all duration-300" style="max-height:580px; overflow:hidden;">
                    <div class="flex items-center gap-3 px-6 pt-6 pb-3">
                        <h2 class="text-lg font-black text-gray-900 m-0 flex items-center gap-2">🔍 가이드 미등록 상품</h2>
                        <span id="missCount" class="px-2.5 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-black"></span>
                        <button id="bulkAiBtn" class="ml-auto px-3 py-1.5 rounded-lg bg-purple-600 text-white text-[11px] font-black hover:bg-purple-700 transition-colors shadow-sm whitespace-nowrap">🤖 전체 AI 일괄생성</button>
                    </div>
                    <div id="missList" class="flex-1 overflow-y-auto px-6 pb-2 space-y-2" style="max-height:400px;"></div>
                    <div class="flex justify-between items-center px-6 pb-6 pt-3 border-t border-gray-200/40 mt-2 shrink-0">
                        <button id="backToUploadFromMiss" class="px-5 py-2.5 rounded-xl bg-white/60 border border-gray-200 text-gray-700 text-[13px] font-bold hover:bg-white transition-colors shadow-sm">← 돌아가기</button>
                        <button id="saveMissGuides" class="px-6 py-2.5 rounded-xl bg-green-700 text-white text-[13px] font-black hover:bg-green-800 transition-colors shadow-sm">✅ 선택 항목 저장</button>
                    </div>
                </div>

                <input type="file" id="file" accept=".xlsx, .xls, .csv" class="hidden">
            </div>
        `;
        
        // 아이콘 리렌더링
        if(window.lucide) lucide.createIcons();

        // ==========================================
        // 🛠️ 삭제되었던 핵심 이벤트 리스너들 재연결 🛠️
        // ==========================================

        // 1. 비밀번호 인증
        const pwdInput = document.getElementById("pwd");
        const pwdGo = document.getElementById("pwdGo");
        
        const checkPwd = () => {
            if(pwdInput.value === ADMIN_PWD) { 
                sessionStorage.setItem(SESSION_FLAG,"1"); 
                document.getElementById("authPanel").classList.add("hidden"); 
                document.getElementById("uploadPanel").classList.remove("hidden");
                document.getElementById("uploadPanel").classList.add("flex");
            } else {
                alert("비밀번호 오류");
            }
        };
        pwdGo.onclick = checkPwd;
        pwdInput.onkeydown = (e) => { if(e.key === "Enter") checkPwd(); };

        // 세션 유지 시 자동 패스
        if (sessionStorage.getItem(SESSION_FLAG) === "1") {
            document.getElementById("authPanel").classList.add("hidden");
            document.getElementById("uploadPanel").classList.remove("hidden");
            document.getElementById("uploadPanel").classList.add("flex");
        }

        // 2. 패널 이동 버튼 (설정 창 <-> 업로드 창)
        document.getElementById("openSettings").onclick = () => { 
            document.getElementById("uploadPanel").classList.add("hidden");
            document.getElementById("uploadPanel").classList.remove("flex");
            document.getElementById("settingsPanel").classList.remove("hidden");
            document.getElementById("settingsPanel").classList.add("flex");
        };
        document.getElementById("backToUpload").onclick = () => { 
            document.getElementById("settingsPanel").classList.add("hidden");
            document.getElementById("settingsPanel").classList.remove("flex");
            document.getElementById("uploadPanel").classList.remove("hidden"); 
            document.getElementById("uploadPanel").classList.add("flex");
        };

        // 3. API 환경설정 저장
        document.getElementById("ghSave").onclick = () => {
            GH = {
                owner: document.getElementById("ghOwner").value.trim(),
                repo: document.getElementById("ghRepo").value.trim(),
                branch: document.getElementById("ghBranch").value.trim() || "main"
            };
            saveGhConfig();
            setPat(document.getElementById("ghPat").value.trim());
            setAnthKey(document.getElementById("anthKeyInput").value.trim());
            alert("API 설정이 저장되었습니다.");
            document.getElementById("backToUpload").click();
        };

        // 4. 미등록 탐지 패널
        const missDetectBtn = document.getElementById("missDetectBtn");
        const backFromMiss  = document.getElementById("backToUploadFromMiss");
        const saveMissBtn   = document.getElementById("saveMissGuides");

        const showPanel = (id) => {
            ["uploadPanel","settingsPanel","missPanel"].forEach(pid => {
                const el = document.getElementById(pid);
                if(!el) return;
                if(pid === id){ el.classList.remove("hidden"); el.classList.add("flex"); }
                else { el.classList.add("hidden"); el.classList.remove("flex"); }
            });
        };

        if(missDetectBtn) {
            missDetectBtn.onclick = () => {
                showPanel("missPanel");

                // 신발만, 유니크 품번 기준으로 가이드 없는 상품 추출
                const seen = new Set();
                const missing = PRODUCTS.filter(p => {
                    if(!p.품번 || seen.has(p.품번)) return false;
                    seen.add(p.품번);
                    if(p.카테고리 !== "신발") return false;
                    return !SALES_GUIDES[p.품번];
                });

                const countEl = document.getElementById("missCount");
                if(countEl) countEl.textContent = missing.length + "개 미등록";

                const listEl = document.getElementById("missList");
                if(!listEl) return;

                if(missing.length === 0){
                    listEl.innerHTML = `<div class="text-center py-12 text-gray-400 font-bold text-sm">🎉 모든 상품에 가이드가 등록되어 있습니다!</div>`;
                    return;
                }

                listEl.innerHTML = missing.map(p => `
                    <div class="bg-white/70 border border-gray-200 rounded-xl p-3 space-y-2">
                        <div class="flex items-center justify-between gap-2">
                            <label class="flex items-center gap-2 cursor-pointer min-w-0">
                                <input type="checkbox" class="miss-chk w-4 h-4 accent-orange-400 shrink-0" data-code="${p.품번}">
                                <span class="text-[11px] font-black text-gray-500 shrink-0">${escapeHtml(p.브랜드||'')} · ${escapeHtml(p.품번)}</span>
                                <span class="text-[12px] font-black text-gray-800 truncate">${escapeHtml(p.품명||'')}</span>
                            </label>
                            <button class="ai-gen-toggle shrink-0 px-2 py-1 rounded-lg bg-purple-50 text-purple-600 text-[10px] font-black border border-purple-200 hover:bg-purple-100 transition-colors" data-code="${p.품번}">🤖 AI 생성</button>
                        </div>
                        <div class="ai-gen-box hidden space-y-1.5" data-code="${p.품번}">
                            <button class="ai-gen-btn w-full py-2 rounded-lg bg-purple-600 text-white text-[12px] font-black hover:bg-purple-700 transition-colors shadow-sm" data-code="${p.품번}" data-brand="${escapeHtml(p.브랜드||'')}" data-name="${escapeHtml(p.품명||'')}">✨ ${escapeHtml(p.품명||'')} 가이드 자동 생성</button>
                            <details class="text-[10px]">
                                <summary class="text-purple-400 font-bold cursor-pointer hover:text-purple-600 select-none">📋 RunRepeat 스펙 추가 (선택 — 정확도 향상)</summary>
                                <p class="text-gray-400 font-bold mt-1 mb-1">RunRepeat에서 Specs 섹션 전체 복사 후 붙여넣기 (영문 그대로 OK)</p>
                                <textarea class="ai-review-text w-full px-2 py-1.5 rounded-lg border border-purple-200 text-xs font-bold outline-none focus:border-purple-400 bg-purple-50/40 resize-none" rows="4" placeholder="Terrain: Road&#10;Drop: 8mm&#10;Weight: 198g&#10;Features: Carbon plate | Cushioned&#10;..." data-code="${p.품번}"></textarea>
                            </details>
                        </div>
                        <div class="grid grid-cols-2 gap-1.5 pl-1">
                            <input type="text" placeholder="키워드 (쉼표 구분)" class="miss-kw ipt col-span-2 px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-bold outline-none focus:border-orange-400 bg-white/90" data-code="${p.품번}">
                            <input type="text" placeholder="제품 특징" class="miss-ft ipt col-span-2 px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-bold outline-none focus:border-orange-400 bg-white/90" data-code="${p.품번}">
                            <input type="text" placeholder="추천 고객" class="miss-tg ipt px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-bold outline-none focus:border-orange-400 bg-white/90" data-code="${p.품번}">
                            <input type="text" placeholder="판매 멘트" class="miss-pt ipt px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-bold outline-none focus:border-orange-400 bg-white/90" data-code="${p.품번}">
                        </div>
                    </div>
                `).join('');

                // AI 버튼 이벤트 위임
                listEl.addEventListener('click', async (e) => {
                    // 🤖 AI 생성 토글
                    if (e.target.classList.contains('ai-gen-toggle')) {
                        const code = e.target.dataset.code;
                        const box = listEl.querySelector(`.ai-gen-box[data-code="${code}"]`);
                        if (box) box.classList.toggle('hidden');
                        return;
                    }
                    // ✨ 가이드 자동 생성
                    if (e.target.classList.contains('ai-gen-btn')) {
                        if (!getAnthKey()) {
                            alert("⚠️ Admin > API 설정에서 Anthropic API Key를 먼저 등록해주세요.\n\nsk-ant-api03-... 형식의 키입니다.");
                            return;
                        }
                        const code  = e.target.dataset.code;
                        const brand = e.target.dataset.brand;
                        const name  = e.target.dataset.name;
                        const reviewText = listEl.querySelector(`.ai-review-text[data-code="${code}"]`)?.value || "";

                        const orig = e.target.textContent;
                        e.target.textContent = "⏳ AI 분석 중...";
                        e.target.disabled = true;

                        try {
                            const rawText = await callClaudeForGuide(brand, name, reviewText);
                            const parsed  = parseGuideResponse(rawText);

                            // 전체 결과 저장
                            window._missGuideData = window._missGuideData || {};
                            window._missGuideData[code] = parsed;

                            // 필드 자동 채우기
                            const kwEl = listEl.querySelector(`.miss-kw[data-code="${code}"]`);
                            const ftEl = listEl.querySelector(`.miss-ft[data-code="${code}"]`);
                            const tgEl = listEl.querySelector(`.miss-tg[data-code="${code}"]`);
                            const ptEl = listEl.querySelector(`.miss-pt[data-code="${code}"]`);
                            if (kwEl) kwEl.value = parsed.keywords.join(", ");
                            if (ftEl) ftEl.value = parsed.features;
                            if (tgEl) tgEl.value = parsed.target;
                            if (ptEl) ptEl.value = parsed.closing || parsed.pitch;

                            // 자동 체크 + AI 박스 닫기
                            const chk = listEl.querySelector(`.miss-chk[data-code="${code}"]`);
                            if (chk) chk.checked = true;
                            listEl.querySelector(`.ai-gen-box[data-code="${code}"]`)?.classList.add('hidden');

                            e.target.textContent = "✅ 생성 완료";
                        } catch(err) {
                            alert("AI 생성 실패: " + err.message);
                            e.target.textContent = orig;
                        } finally {
                            e.target.disabled = false;
                        }
                    }
                }, { once: false });
            };
        }

        // 일괄 AI 생성
        const bulkAiBtn = document.getElementById("bulkAiBtn");
        if(bulkAiBtn) {
            bulkAiBtn.onclick = async () => {
                if(!getAnthKey()) {
                    alert("⚠️ Admin > API 설정에서 Gemini API Key를 먼저 등록해주세요.");
                    return;
                }
                const items = document.querySelectorAll(".ai-gen-btn");
                if(items.length === 0) { alert("미등록 신발이 없습니다."); return; }
                if(!confirm(`신발 ${items.length}개에 AI 가이드를 자동 생성합니다.\n시간이 걸릴 수 있어요. 진행할까요?`)) return;

                bulkAiBtn.disabled = true;
                let done = 0, failed = 0;

                for(const btn of items) {
                    const code  = btn.dataset.code;
                    const brand = btn.dataset.brand;
                    const name  = btn.dataset.name;
                    bulkAiBtn.textContent = `⏳ ${done+1}/${items.length} 생성중...`;
                    try {
                        const rawText = await callClaudeForGuide(brand, name, "");
                        const parsed  = parseGuideResponse(rawText);
                        window._missGuideData = window._missGuideData || {};
                        window._missGuideData[code] = parsed;
                        const listEl  = document.getElementById("missList");
                        if(listEl) {
                            const kwEl = listEl.querySelector(`.miss-kw[data-code="${code}"]`);
                            const ftEl = listEl.querySelector(`.miss-ft[data-code="${code}"]`);
                            const tgEl = listEl.querySelector(`.miss-tg[data-code="${code}"]`);
                            const ptEl = listEl.querySelector(`.miss-pt[data-code="${code}"]`);
                            if(kwEl) kwEl.value = parsed.keywords.join(", ");
                            if(ftEl) ftEl.value = parsed.features;
                            if(tgEl) tgEl.value = parsed.target;
                            if(ptEl) ptEl.value = parsed.closing || parsed.pitch;
                            const chk = listEl.querySelector(`.miss-chk[data-code="${code}"]`);
                            if(chk) chk.checked = true;
                        }
                        done++;
                    } catch(err) {
                        failed++;
                        console.warn(`[AI 일괄생성] ${name} 실패:`, err.message);
                    }
                    // API 레이트리밋 방지 딜레이
                    await new Promise(r => setTimeout(r, 2000));
                }

                bulkAiBtn.textContent = `✅ ${done}개 완료${failed > 0 ? ` (${failed}개 실패)` : ""}`;
                bulkAiBtn.disabled = false;
                if(done > 0) {
                    alert(`✅ AI 가이드 ${done}개 생성 완료!\n이제 "선택 항목 저장" 버튼을 눌러 GitHub에 저장하세요.`);
                }
            };
        }

        if(backFromMiss) backFromMiss.onclick = () => showPanel("uploadPanel");

        if(saveMissBtn) {
            saveMissBtn.onclick = async () => {
                if(!checkPat()) return;
                const checked = document.querySelectorAll(".miss-chk:checked");
                if(checked.length === 0){ alert("저장할 항목을 체크해주세요."); return; }

                const newEntries = {};
                checked.forEach(chk => {
                    const code = chk.dataset.code;
                    const kw = document.querySelector(`.miss-kw[data-code="${code}"]`)?.value || "";
                    const ft = document.querySelector(`.miss-ft[data-code="${code}"]`)?.value || "";
                    const tg = document.querySelector(`.miss-tg[data-code="${code}"]`)?.value || "";
                    const pt = document.querySelector(`.miss-pt[data-code="${code}"]`)?.value || "";
                    const ai = window._missGuideData?.[code] || {};
                    newEntries[code] = {
                        keywords: kw ? kw.split(",").map(k=>k.trim()).filter(Boolean) : (ai.keywords||[]),
                        features: ft||ai.features||"", target: tg||ai.target||"", pitch: pt||ai.closing||ai.pitch||"",
                        weight: ai.weight||"", heel_stack: ai.heel_stack||"", fore_stack: ai.fore_stack||"",
                        drop: ai.drop||"", spec_analysis: ai.spec_analysis||"",
                        vs_prev: ai.vs_prev||"", vs_others: ai.vs_others||"",
                        why: ai.why||"", best_for: ai.best_for||"", closing: ai.closing||pt||""
                    };
                });

                const merged = Object.assign({}, SALES_GUIDES, newEntries);
                const origText = saveMissBtn.textContent;
                saveMissBtn.textContent = "⏳ 저장 중...";
                saveMissBtn.disabled = true;

                try {
                    const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${SALES_GUIDE_PATH}`;
                    let sha = null;
                    try { const r = await fetch(apiBase+"?t="+Date.now(),{headers:{Authorization:"Bearer "+getPat()}}); if(r.ok){ const j=await r.json(); sha=j.sha; } } catch(e){}
                    const body = { message:`update: sales guide +${Object.keys(newEntries).length}개 추가`, content: utf8ToB64(JSON.stringify(merged, null, 2)), branch: GH.branch };
                    if(sha) body.sha = sha;
                    const res = await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
                    if(!res.ok) throw new Error("GitHub 저장 실패 ("+res.status+")");

                    SALES_GUIDES = merged;
                    sessionStorage.removeItem(CACHE_KEY);
                    rebuildIndex(); render(); window.renderSalesAdmin();
                    alert(`✅ ${Object.keys(newEntries).length}개 가이드가 성공적으로 등록되었습니다!`);
                    showPanel("uploadPanel");
                } catch(err) {
                    alert("저장 실패: " + err.message);
                } finally {
                    saveMissBtn.textContent = origText;
                    saveMissBtn.disabled = false;
                }
            };
        }

        // 5. 메인 재고 엑셀 업로드 연결
        document.getElementById('mainUploadTrigger').onclick = () => {
            const mainFileInput = document.getElementById('file');
            if(mainFileInput) mainFileInput.click();
        };
        
        // 💡 작동 안 하던 기존 파일 변경 감지 이벤트 복구
        document.getElementById("file").onchange = async (e) => { 
            if(!checkPat()) { e.target.value = ""; return; }
            const f = e.target.files[0]; if(!f) return;
            const d = new Date();
            const dateStr = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            localStorage.setItem('PREV_RAW', JSON.stringify(RAW)); 
            const reader = new FileReader();
            reader.onload = async (ev) => {
                // XLSX 라이브러리가 로드되어 있어야 함 (기존 글로벌 window.XLSX 사용)
                if(!window.XLSX) { alert("엑셀 파서 로딩 중입니다. 잠시 후 시도해주세요."); return; }
                const wb = window.XLSX.read(new Uint8Array(ev.target.result), {type:"array"});
                let rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:"", raw:true});
                const meta = { fileName:f.name, uploadedAt: dateStr };
                try { 
                    // 기존에 정의하신 commitInventoryToGitHub 함수 실행
                    await window.commitInventoryToGitHub(rows, meta); 
                    RAW = rows; CURRENT_META = meta; 
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify({rows, meta, images:IMAGES, memos:MEMOS, transfers:TRANSFERS, promotions:PROMOTIONS, salesGuides:SALES_GUIDES, salesHistory:SALES_HISTORY, _timestamp: Date.now()})); 
                    applyMeta(CURRENT_META); rebuildIndex(); render(); setupSearchAutocomplete(); setupQuickActionBar(); 
                    document.getElementById("adminModal").classList.add("hidden");
                    alert("업로드 성공! 데이터가 즉시 반영되었습니다.");
                } catch(err) { alert("업로드 실패!\n\n원인: " + (err?.message || err) + "\n\n→ ADMIN > API 설정에서 PAT 토큰과 저장소 정보를 확인하세요."); console.error("Upload error:", err); }
                document.getElementById("file").value = ""; 
            };
            reader.readAsArrayBuffer(f);
        };
    }

    // 각각의 상세 어드민 렌더링 호출
    if(window.renderSalesHistoryAdmin) window.renderSalesHistoryAdmin();
    if(window.renderPromoAdmin) window.renderPromoAdmin();
    if(window.renderSalesAdmin) window.renderSalesAdmin();
});

loadGhConfig(); loadData();
