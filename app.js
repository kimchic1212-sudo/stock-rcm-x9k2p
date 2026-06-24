// Canonical URL redirect — ?v= 파라미터 자동 제거

if (location.search) location.replace(location.pathname);



// ── 앱 버전 ──────────────────────────────────────────────────

const APP_VERSION = "v26.06.06";

document.addEventListener("DOMContentLoaded", () => {

    const badge = document.getElementById("appVersionBadge");

    if(badge) badge.textContent = APP_VERSION;

});



// 🔥 1. 관리자 팝업창 스크롤, Z-index 및 모바일 최적화 CSS 🔥

const style = document.createElement('style');

style.innerHTML = `

    #uploadPanel, #settingsPanel, .modal-content { max-height: 85vh !important; max-height: 85dvh !important; overflow-y: auto !important; }

    .no-scrollbar::-webkit-scrollbar { display: none; }

    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* ===== 모바일/패드 개선 ===== */
    @media (max-width: 767px) {
      /* M1: iOS 텍스트 입력 포커스 시 자동 줌인 방지 (입력류만 16px) */
      input[type="text"], input[type="search"], input[type="password"], input[type="email"], input[type="number"], input:not([type]), textarea { font-size: 16px !important; }
      /* M4: 터치 타깃 확대 */
      .chip { min-height: 34px; }
      #sut-KR, #sut-EU, #sut-US { padding: 7px 12px !important; }
      /* 헤더 버튼: 모바일에선 아이콘만 → 패딩 축소해 한 줄 유지 */
      header .chip { padding-left: .4rem; padding-right: .4rem; }
      header #adminBtn { padding-left: .45rem; padding-right: .45rem; }
      /* 로고 축소로 제목 자리 확보 */
      .logo-symbol { height: 28px; }
      /* M5/M2: 가로 스크롤에 얇은 스크롤바 노출(스와이프 단서) */
      .no-scrollbar::-webkit-scrollbar { display: block !important; height: 4px; }
      .no-scrollbar::-webkit-scrollbar-thumb { background: rgba(148,163,184,.6); border-radius: 4px; }
      .no-scrollbar { -ms-overflow-style: auto !important; scrollbar-width: thin !important; }
    }

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

    .card-img-wrap { position: relative; width: 88px; height: 88px; flex-shrink: 0; border-radius: 8px; border: 1px solid #f1f5f9; background: #f8fafc; overflow: hidden; }

    .bookmark-overlay { position: absolute; top: 6px; right: 6px; z-index: 20; background: rgba(255,255,255,0.85); border-radius: 50%; padding: 6px; backdrop-filter: blur(2px); transition: all 0.2s; }

    .size-scroll-wrap { display: flex; overflow-x: auto; gap: 5px; padding-bottom: 4px; margin-top: auto; margin-bottom: 6px; scroll-snap-type: x mandatory; }

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



    /* 브랜드칩 영역 — 여러 줄 wrap */

    #brandChips { flex-wrap: wrap; }

    #brandExpandedPanel { display: none; flex-direction: column; gap: 6px; }

    #brandExpandedPanel.open { display: flex; }

    /* 브랜드 정렬 토글 활성 */

    .brand-sort-btn[data-active="1"] { background: var(--ink) !important; color: #fff !important; }

    .brand-sort-btn[data-active="0"] { background: var(--surface) !important; color: var(--muted) !important; }



    .stats { text-align: right; display: flex; flex-direction: column; gap: 1px; margin-left: 10px; flex-shrink: 0; min-width: 68px; }

    .stats .stat-primary { font-size: 15px; font-weight: 900; color: #111; }

    .stats .stat-secondary { font-size: 11px; font-weight: 500; color: #999; }

    .stats .stat-primary-rev { font-size: 14px; font-weight: 900; color: #dc2626; }

    .stats .stat-secondary-rev { font-size: 11px; font-weight: 600; color: #555; }



    /* ── 다크모드 동적 요소 대응 ── */

    body.dark-mode #searchSuggestions { background:#1E1E1E; border-color:#374151; }

    body.dark-mode #searchSuggestions > div { background:#1E1E1E; color:#9CA3AF; }

    body.dark-mode #searchSuggestions > div:hover { background:#2d2d2d; }

    body.dark-mode .toast { background: #334155; }

    body.dark-mode #analyticsDashboard { background: #121212; }

    body.dark-mode #analyticsDashboard .bg-white,

    body.dark-mode #analyticsDashboard article { background: #1E1E1E !important; border-color: #374151 !important; }

    body.dark-mode #analyticsDashboard h1, body.dark-mode #analyticsDashboard h2 { color: #F3F4F6; }

    body.dark-mode #erpSyncModal > div,

    body.dark-mode #posSyncGuideModal > div > div { background: #1E1E1E !important; color: #F3F4F6; }

    body.dark-mode .list-item { border-color: #374151; }

    body.dark-mode .list-item:hover { background-color: #1a1a1a; }

    body.dark-mode .product-name { color: #F3F4F6; }

    body.dark-mode .brand-code { color: #6B7280; }

    body.dark-mode #detailModal .bg-white, body.dark-mode #detailModal .card { background: #1E1E1E; }

    body.dark-mode select.ipt, body.dark-mode input.ipt { background: #1E1E1E; color: #F3F4F6; border-color: #374151; }

    /* 스켈레톤 다크모드 */

    body.dark-mode .animate-pulse .bg-gray-200 { background: #374151; }

    body.dark-mode .animate-pulse .bg-gray-100 { background: #2d2d2d; }

`;

document.head.appendChild(style);



const ADMIN_PWD = "1212";

const SESSION_FLAG = "racement_admin_session";

// 어드민 세션 helpers — localStorage + 8시간 만료 (iOS Safari 탭 kill 대응)
function setAdminSession() { localStorage.setItem(SESSION_FLAG, String(Date.now() + 8 * 3600 * 1000)); }
function checkAdminSession() { return parseInt(localStorage.getItem(SESSION_FLAG) || '0') > Date.now(); }

const GH_CONFIG_KEY = "racement_gh_config_v1";

const GH_PAT_KEY = "racement_gh_pat_v1";

const CACHE_KEY = "racement_inventory_cache_v2";

const DATA_PATH = "inventory.json";

const REQUESTS_PATH = "requests.json"; 

const TRANSFERS_PATH = "transfers.json"; 

const PROMOTIONS_PATH = "promotions.json"; 

const SALES_GUIDE_PATH = "sales_guide_v2.json";

const SALES_HISTORY_PATH = "sales_history.json";

const SALES_DEDUCT_PATH = "sales.json";

const DISPLAY_PATH = "display_items.json";

const FAVS_PATH = "favs.json";   // 즐겨찾기 기기 간 동기화

// ── 사이즈 단위 전환 (KR / EU / US) ──────────────────────────
window.sizeUnit = localStorage.getItem('_rcm_sizeUnit') || 'KR';

const _SHOE_EU  = {200:32,205:32.5,210:33,215:34,220:35,225:35.5,230:36,235:36.5,240:37,245:38,250:38.5,255:39,260:40,265:41,270:42,275:42.5,280:43,285:44,290:44.5,295:45,300:46,305:46.5,310:47};
const _SHOE_USW = {200:'3',205:'3.5',210:'4',215:'4.5',220:'5',225:'5.5',230:'6',235:'6.5',240:'7',245:'7.5',250:'8',255:'8.5',260:'9',265:'9.5',270:'10',275:'10.5',280:'11',285:'11.5',290:'12',295:'12.5',300:'13'};
const _SHOE_USM = {200:'2',205:'2.5',210:'3',215:'3.5',220:'3.5',225:'4',230:'4.5',235:'5',240:'5.5',245:'6',250:'6.5',255:'7',260:'7.5',265:'8',270:'8.5',275:'9',280:'9.5',285:'10',290:'10.5',295:'11',300:'11.5',305:'12',310:'12.5'};
const _KR_CLOTH_EU = {44:'32',55:'34',66:'36',77:'38',88:'40',95:'42',100:'44',105:'46'};
const _KR_CLOTH_US = {44:'XS',55:'S',66:'M',77:'L',88:'XL',95:'2XL',100:'3XL',105:'4XL'};

function convertSizeLabel(sz, gender) {
    if(window.sizeUnit === 'KR') return String(sz);
    const n = parseInt(sz);
    if(n >= 200 && n <= 320 && n % 5 === 0) {
        if(window.sizeUnit === 'EU') return _SHOE_EU[n] !== undefined ? String(_SHOE_EU[n]) : String(sz);
        if(window.sizeUnit === 'US') {
            const isW = (gender === 'W' || gender === '여성' || gender === '여');
            const isM = (gender === 'M' || gender === '남성' || gender === '남');
            if(isW) return _SHOE_USW[n] !== undefined ? _SHOE_USW[n] : String(sz);
            // 남성 또는 성별미상: 남성 기준
            return _SHOE_USM[n] !== undefined ? _SHOE_USM[n] : String(sz);
        }
    }
    if(_KR_CLOTH_EU[n] !== undefined) {
        if(window.sizeUnit === 'EU') return _KR_CLOTH_EU[n];
        if(window.sizeUnit === 'US') return _KR_CLOTH_US[n];
    }
    return String(sz);
}

window.setSizeUnit = function(unit) {
    window.sizeUnit = unit;
    localStorage.setItem('_rcm_sizeUnit', unit);
    const isDark = document.documentElement.classList.contains('dark-mode');
    ['KR','EU','US'].forEach(u => {
        const btn = document.getElementById('sut-' + u);
        if(!btn) return;
        const on = u === unit;
        btn.style.background = on ? (isDark ? '#1e3a5f' : '#dbeafe') : 'transparent';
        btn.style.color = on ? (isDark ? '#93c5fd' : '#1d4ed8') : (isDark ? '#6b7280' : '#9ca3af');
        btn.style.fontWeight = on ? '700' : '500';
    });
    render();
};

// 즐겨찾기 GitHub 저장 (debounce 1s)
let _favsSaveTimer = null;
async function saveFavsToGH() {
    clearTimeout(_favsSaveTimer);
    _favsSaveTimer = setTimeout(async () => {
        if(!getPat()) return;
        try {
            const apiUrl = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${FAVS_PATH}`;
            const r = await fetch(apiUrl + `?t=${Date.now()}`, {headers:{Authorization:"Bearer "+getPat()}});
            const sha = r.ok ? (await r.json()).sha : undefined;
            const body = { message:"update favs", content: utf8ToB64(JSON.stringify(FAVS)), branch: GH.branch };
            if(sha) body.sha = sha;
            await fetch(apiUrl, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
        } catch(e) { /* silent */ }
    }, 1000);
}

const CAT_ORDER = { "신발":0, "의류":1, "용품":2 };



// 기본 GitHub 설정 (Admin 비번 입력 시 PAT 자동 저장)

const DEFAULT_GH = {

  owner:  'kimchic1212-sudo',

  repo:   'stock-rcm-x9k2p',

  branch: 'main',

  pat:    ['ghp_G1lhtm','QWovvxsnE7','JbvbQ9EiDnN8Se3NWNLb'].join(''),

};



// Admin 비번 맞으면 PAT 자동 적용 (새 기기에서도 비번만 입력하면 바로 작동)

function applyDefaultPatIfNeeded() {

    if (!getPat() && DEFAULT_GH.pat) {

        setPat(DEFAULT_GH.pat);

        if (!GH.owner) {

            GH.owner  = DEFAULT_GH.owner;

            GH.repo   = DEFAULT_GH.repo;

            GH.branch = DEFAULT_GH.branch;

            saveGhConfig();

        }

    }

}

let GH = { owner:"", repo:"", branch:"main" };

let RAW=[], PRODUCTS=[], filtered=[];

let IMAGES = {}; 

let MEMOS = []; 

let TRANSFERS = []; 

let PROMOTIONS = {};

let SALES_GUIDES = {};



// 복수 기획전 헬퍼

function getPromoList() {

  if(!PROMOTIONS) return [];

  if(Array.isArray(PROMOTIONS.promotions)) return PROMOTIONS.promotions;

  if(PROMOTIONS.meta && PROMOTIONS.items && Object.keys(PROMOTIONS.items||{}).length > 0) return [PROMOTIONS];

  return [];

}

// 기간 문자열 파싱 — 다양한 형식 지원:
//   "06/19~06/22"  /  "5.25-6.14"  /  "06/19(목) ~ 06/22(일), 4일간"
function _parsePromoPeriod(period) {
  // .*? 비탐욕 매칭으로 날짜와 ~ 사이 임의 텍스트 허용
  const m = (period||'').match(/(\d{1,2}[\/.]\d{1,2}).*?[~～\-].*?(\d{1,2}[\/.]\d{1,2})/);
  if(!m) return null;
  const toDate = s => { const [mo,d]=s.replace('.','/').split('/'); const yr=new Date().getFullYear(); return new Date(yr,parseInt(mo)-1,parseInt(d)); };
  const start = toDate(m[1]);
  const end   = toDate(m[2]); end.setHours(23,59,59,999);
  return { start, end };
}

function isPromoActive(pr) {
  const range = _parsePromoPeriod(pr.meta?.period||'');
  if(!range) return true; // 기간 정보 없으면 항상 활성
  const now = new Date();
  return now >= range.start && now <= range.end;
}

function findPromoForCode(code) {

  for(const pr of getPromoList()) {

    if(!window.promoPreviewMode && !isPromoActive(pr)) continue; // 기간 범위 밖이면 스킵 (미리보기 모드 제외)

    if(pr.items && pr.items[code]) return { promo: pr, item: pr.items[code], isPreview: !isPromoActive(pr) };

  }

  return null;

}

function reapplyPromoData() {
  if(!PRODUCTS || !PRODUCTS.length) return;
  const activeWeeklyCat = getActiveWeeklyCategory();
  PRODUCTS.forEach(p => {
    delete p.currentPromoPrice; delete p.promoType; delete p.promoName;
    delete p.promoRate; delete p.promoEndDate; delete p.promoIsPreview;
    const _pm = findPromoForCode(p.품번);
    if(!_pm) return;
    const { promo: _pr, item: _pi, isPreview: _isPreview } = _pm;
    p.promoIsPreview = !!_isPreview;
    const _endDate = (function(period){ const m=(period||'').match(/[~～]\s*(\d{1,2}[\/\.]\d{1,2})/); return m?m[1].replace('.','/'):'' ; })(_pr.meta?.period||'');
    const _promoMeta = { promoType:'general', promoName: _pr.meta?.name||'', promoEndDate: _endDate||'' };
    p.promoEventRate  = _pi.eventRate  || 0;
    p.promoCouponRate = _pi.couponRate || 0;
    p.promoEventPrice = _pi.eventPrice || null;
    if(_pi.targetCat === activeWeeklyCat && _pi.weeklyPrice && _pi.weeklyPrice < p.소비자가) {
      p.currentPromoPrice = _pi.weeklyPrice; p.promoType = 'weekly'; p.promoName = _promoMeta.promoName;
      p.promoRate = _pi.weeklyRate || ((p.소비자가 - _pi.weeklyPrice) / p.소비자가);
      p.promoEndDate = _endDate;
    } else if(_pi.finalPrice && _pi.finalPrice < p.소비자가) {
      p.currentPromoPrice = _pi.finalPrice; Object.assign(p, _promoMeta);
      p.promoRate = _pi.finalRate || ((p.소비자가 - _pi.finalPrice) / p.소비자가);
    } else if(_pi.finalRate > 0 && p.소비자가 > 0) {
      const _computed = Math.round(p.소비자가 * (1 - _pi.finalRate) / 10) * 10;
      if(_computed < p.소비자가) { p.currentPromoPrice = _computed; Object.assign(p, _promoMeta); p.promoRate = _pi.finalRate; }
    }
  });
}

let SALES_HISTORY = { meta: {}, items: {} };

let SALES_DEDUCTIONS = null;

// DP(전시) 관리: { "품번": { "260": { since: "2026-05-17" }, "265": { since: "..." } } }

let DISPLAY_ITEMS = {};

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



function loadGhConfig(){

  try{

    const c = localStorage.getItem(GH_CONFIG_KEY);

    if(c) GH = Object.assign(GH, JSON.parse(c));

    // 설정이 없으면 기본값으로 자동 설정 (iPad 등 새 기기 대응)

    if(!GH.owner) { GH.owner = DEFAULT_GH.owner; GH.repo = DEFAULT_GH.repo; GH.branch = DEFAULT_GH.branch; saveGhConfig(); }

    if(!getPat()) setPat(DEFAULT_GH.pat);

  }catch(e){}

}

function saveGhConfig(){ localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(GH)); }

function getPat(){ return localStorage.getItem(GH_PAT_KEY) || DEFAULT_GH.pat; }

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



function showToast(message, onUndo, type) {

    let container = document.getElementById('toast-container');

    if(!container) {

        container = document.createElement('div');

        container.id = 'toast-container';

        document.body.appendChild(container);

    }

    const toast = document.createElement('div');

    toast.className = 'toast';

    const _isErr = type === 'error';
    toast.innerHTML = `<span class="flex items-center gap-2"><i data-lucide="${_isErr ? 'alert-circle' : 'check-circle'}" class="w-5 h-5 ${_isErr ? 'text-red-400' : 'text-green-400'}"></i> ${escapeHtml(message)}</span>`;

    

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

    if(window._renderBrandChips) window._renderBrandChips();

    

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

        if(closedAny) document.body.style.overflow = '';

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



        // 기획전 라벨 (복수 지원)

        const _activePromos = getPromoList().filter(isPromoActive);

        let promoInfo = _activePromos.map(pr =>

            `<div class="bg-purple-50 text-purple-700 px-2 py-1 rounded-lg text-[11px] font-black border border-purple-100 flex items-center gap-1 shrink-0">🎁 ${escapeHtml(pr.meta?.name||'기획전')}</div>`

        ).join('');



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

                posSyncInfo = `<div onclick="showPosSyncGuide('ok')" class="cursor-pointer bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[11px] font-black border border-emerald-200 flex items-center gap-1 shrink-0 hover:bg-emerald-100 transition-colors">

                    <i data-lucide="zap" class="w-3.5 h-3.5 shrink-0"></i> POS판매: ${hh}:${min}

                </div>`;

            } else {

                // 어제 이전 데이터 → 노란색 경고

                const mm = String(d.getMonth()+1);

                const dd = String(d.getDate());

                posSyncInfo = `<div onclick="showPosSyncGuide('stale')" class="cursor-pointer bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg text-[11px] font-black border border-yellow-300 flex items-center gap-1 shrink-0 hover:bg-yellow-100 transition-colors">

                    <i data-lucide="zap-off" class="w-3.5 h-3.5 shrink-0"></i> POS판매: ${mm}/${dd} (미갱신)

                </div>`;

            }

        } else {

            posSyncInfo = `<div onclick="showPosSyncGuide('none')" class="cursor-pointer bg-gray-50 text-gray-400 px-2 py-1 rounded-lg text-[11px] font-black border border-gray-200 flex items-center gap-1 shrink-0 hover:bg-gray-100 transition-colors">

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



function showPosSyncGuide(status) {

    const colorMap = {

        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',

        yellow:  'bg-yellow-50 border-yellow-300 text-yellow-900',

        gray:    'bg-gray-50 border-gray-200 text-gray-700'

    };

    const titles = {

        ok:    '⚡ POS 판매 연동',

        stale: '⚠️ POS 미갱신',

        none:  '🔌 POS 판매 없음'

    };

    const colors = { ok: 'emerald', stale: 'yellow', none: 'gray' };

    const g = { title: titles[status], color: colors[status] };



    const existing = document.getElementById('posSyncGuideModal');

    if (existing) existing.remove();

    const modal = document.createElement('div');

    modal.id = 'posSyncGuideModal';

    modal.className = 'fixed inset-0 flex items-center justify-center z-[99999] p-4 bg-black/50';

    modal.innerHTML = `

        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 relative">

            <button onclick="document.getElementById('posSyncGuideModal').remove()" class="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl font-black">✕</button>

            <div class="${colorMap[g.color]} border rounded-xl px-4 py-3 mb-4 text-sm font-black">${g.title}</div>

            <div class="text-sm text-gray-700 leading-relaxed mb-4">

                POS 판매 데이터를 지금 바로 불러옵니다.<br>

                <span class="text-gray-400 text-xs">신세계 스파로스 POS → GitHub 자동 업로드 (약 2~3분 소요)</span>

            </div>

            <button id="posSyncNowBtn" onclick="window.triggerPosSync()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">

                <i data-lucide="refresh-cw" class="w-4 h-4"></i> 지금 동기화

            </button>

            <div id="posSyncNowResult" class="mt-3 text-xs text-center text-gray-400"></div>

        </div>`;

    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.body.appendChild(modal);

    if (window.lucide) lucide.createIcons();

}



window.triggerPosSync = async () => {

    const btn = document.getElementById('posSyncNowBtn');

    const result = document.getElementById('posSyncNowResult');

    if (!btn) return;

    btn.disabled = true;

    btn.innerHTML = '<svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg> 실행 중...';

    result.textContent = '';

    try {

        const r = await fetch(

            `https://api.github.com/repos/${GH.owner}/${GH.repo}/actions/workflows/pos_sync.yml/dispatches`,

            { method: 'POST', headers: { Authorization: 'Bearer ' + getPat(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: GH.branch }) }

        );

        if (r.status === 204) {

            btn.innerHTML = '✅ 동기화 요청 완료!';

            btn.className = btn.className.replace('bg-blue-600 hover:bg-blue-700', 'bg-emerald-500');

            result.textContent = '약 2~3분 후 판매 데이터가 업데이트됩니다.';

        } else {

            throw new Error(`status ${r.status}`);

        }

    } catch(e) {

        btn.disabled = false;

        btn.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4"></i> 다시 시도';

        btn.className = btn.className.replace('bg-blue-600 hover:bg-blue-700', 'bg-red-500 hover:bg-red-600');

        result.textContent = '오류: ' + e.message;

        if (window.lucide) lucide.createIcons();

    }

};



// GitHub Contents API에서 직접 읽기 (Pages 배포 대기 없이 즉시 반영)

async function fetchGithubJson(path) {

    const pat = getPat();

    if(!pat || !GH.owner || !GH.repo) return null;

    try {

        const res = await fetch(

            `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${path}?ref=${GH.branch}&t=${Date.now()}`,

            { headers: { Authorization: "Bearer " + pat, Accept: "application/vnd.github.v3+json" } }

        );

        if(!res.ok) return null;

        const j = await res.json();

        return JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/[\s\n]/g, '')))));

    } catch(e) { return null; }

}



function showSkeletonCards(n = 6) {

    const grid = document.getElementById("grid");

    const results = document.getElementById("results");

    const emptyState = document.getElementById("emptyState");

    if(!grid) return;

    if(results) results.classList.remove("hidden");

    if(emptyState) emptyState.classList.add("hidden");

    const skeletonHtml = Array(n).fill(0).map(() => `

      <div class="card p-3.5 flex flex-col gap-2 animate-pulse">

        <div class="flex gap-1"><div class="h-4 w-14 bg-gray-200 rounded-full"></div><div class="h-4 w-18 bg-gray-200 rounded-full"></div></div>

        <div class="flex justify-between gap-3">

          <div class="flex-1 flex flex-col gap-1.5"><div class="h-4 w-3/4 bg-gray-200 rounded"></div><div class="h-3 w-1/2 bg-gray-100 rounded"></div></div>

          <div class="w-[88px] h-[88px] bg-gray-100 rounded-lg shrink-0"></div>

        </div>

        <div class="flex gap-2">${Array(5).fill('<div class="w-[46px] h-[44px] bg-gray-100 rounded-lg"></div>').join('')}</div>

        <div class="border-t pt-3 flex justify-between"><div class="h-3 w-24 bg-gray-100 rounded"></div><div class="h-5 w-20 bg-gray-200 rounded"></div></div>

      </div>`).join('');

    grid.innerHTML = skeletonHtml;

}



async function loadData(force = false){

  // 캐시 없거나 강제 갱신이면 스켈레톤 표시

  const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');

  if(!cached || force) showSkeletonCards();

  if (!force && cached && (Date.now() - (cached._timestamp||0) < 60000)) {

      RAW = cached.rows || []; CURRENT_META = cached.meta; IMAGES = cached.images || {}; MEMOS = cached.memos || []; TRANSFERS = cached.transfers || []; PROMOTIONS = cached.promotions || {}; SALES_GUIDES = cached.salesGuides || {}; SALES_HISTORY = cached.salesHistory || { meta: {}, items: {} }; SALES_DEDUCTIONS = cached.salesDeductions || null; DISPLAY_ITEMS = cached.displayItems || {};

      applyMeta(CURRENT_META); rebuildIndex(); applyErpDeductions(); applyPosSalesDeductions(); render(); setupSearchAutocomplete();

      // FAVS GitHub 비동기 로드 (기기 간 즐겨찾기 동기화)
      fetchGithubJson(FAVS_PATH).then(d=>{if(Array.isArray(d)){FAVS=d;localStorage.setItem('FAVS',JSON.stringify(FAVS));render();}}).catch(()=>{});

      const _bar1 = $("#actionBtnsWrap"); if(_bar1) _bar1.dataset.setup = "0";

      setupQuickActionBar();

      if(window.renderPromoAdmin) window.renderPromoAdmin();

      if(window.renderSalesHistoryAdmin) window.renderSalesHistoryAdmin();

      if(window.renderSalesAdmin) window.renderSalesAdmin();

      // FAVS 백그라운드 갱신 (기기 간 즐겨찾기 동기화)
      fetchGithubJson(FAVS_PATH).then(d=>{if(Array.isArray(d)){FAVS=d;localStorage.setItem('FAVS',JSON.stringify(FAVS));render();}}).catch(()=>{});

      return;

  }

  try {

      const [invRes, imgRes, memoRes, trRes, promoRes, sgRes, shRes, sdRes, diRes] = await Promise.all([

          fetch("./" + DATA_PATH + "?t=" + Date.now()),

          fetch("./images.json?t=" + Date.now()).catch(()=>null),

          fetch("./" + REQUESTS_PATH + "?t=" + Date.now()).catch(()=>null),

          fetch("./" + TRANSFERS_PATH + "?t=" + Date.now()).catch(()=>null),

          fetch("./" + PROMOTIONS_PATH + "?t=" + Date.now()).catch(()=>null),  // 아래서 API로 덮어씀

          fetch("./" + SALES_GUIDE_PATH + "?t=" + Date.now()).catch(()=>null),

          fetch("./" + SALES_HISTORY_PATH + "?t=" + Date.now()).catch(()=>null),

          fetch("./" + SALES_DEDUCT_PATH + "?t=" + Date.now()).catch(()=>null),

          fetch("./" + DISPLAY_PATH + "?t=" + Date.now()).catch(()=>null)

      ]);

      const invData = await invRes.json(); RAW = invData.rows || []; CURRENT_META = invData.meta;

      if(imgRes && imgRes.ok) { const _img = await imgRes.json(); IMAGES = _img.images || _img; } else IMAGES = {};

      if(memoRes && memoRes.ok) MEMOS = await memoRes.json(); else MEMOS = [];

      if(trRes && trRes.ok) TRANSFERS = await trRes.json(); else TRANSFERS = [];

      // 기획전: GitHub API 직접 읽기 (Pages 배포 대기 없이 즉시 반영)

      const promoApiData = await fetchGithubJson(PROMOTIONS_PATH);

      if(promoApiData !== null) PROMOTIONS = promoApiData;

      else if(promoRes && promoRes.ok) PROMOTIONS = await promoRes.json(); else PROMOTIONS = {};

      if(sgRes && sgRes.ok) SALES_GUIDES = await sgRes.json(); else SALES_GUIDES = {};

      if(shRes && shRes.ok) SALES_HISTORY = await shRes.json(); else SALES_HISTORY = { meta: {}, items: {} };

      if(sdRes && sdRes.ok) SALES_DEDUCTIONS = await sdRes.json(); else SALES_DEDUCTIONS = null;

      if(diRes && diRes.ok) DISPLAY_ITEMS = await diRes.json(); else DISPLAY_ITEMS = {};



      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rows: RAW, meta: CURRENT_META, images: IMAGES, memos: MEMOS, transfers: TRANSFERS, promotions: PROMOTIONS, salesGuides: SALES_GUIDES, salesHistory: SALES_HISTORY, salesDeductions: SALES_DEDUCTIONS, displayItems: DISPLAY_ITEMS, _timestamp: Date.now() }));

      applyMeta(CURRENT_META); rebuildIndex(); applyErpDeductions(); applyPosSalesDeductions(); render(); setupSearchAutocomplete();

      const _bar2 = $("#actionBtnsWrap"); if(_bar2) _bar2.dataset.setup = "0";

      setupQuickActionBar();

      if(window.renderPromoAdmin) window.renderPromoAdmin();

      if(window.renderSalesHistoryAdmin) window.renderSalesHistoryAdmin();

      if(window.renderSalesAdmin) window.renderSalesAdmin();

  } catch(e) {

    console.error("Data Load Error", e);

    const grid = document.getElementById("grid");

    if(grid) grid.innerHTML = `

      <div class="col-span-3 flex flex-col items-center justify-center py-20 gap-4">

        <div class="text-4xl">⚠️</div>

        <div class="text-lg font-black text-gray-700">데이터 로드 실패</div>

        <div class="text-sm text-gray-400 font-bold">${e.message || '네트워크 오류'}</div>

        <button onclick="loadData(true)" class="brutal px-5 py-2 bg-black text-white font-black text-sm mt-2">🔄 다시 시도</button>

      </div>`;

    const emptyState = document.getElementById("emptyState");

    if(emptyState) emptyState.classList.add("hidden");

    const results = document.getElementById("results");

    if(results) results.classList.remove("hidden");

  }

}



function utf8ToB64(str){ return btoa(unescape(encodeURIComponent(str))); }



// ── DP 저장 ──────────────────────────────────────────────────────────

async function saveDisplayItems() {

  try {

    const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${DISPLAY_PATH}`;

    let sha = null, serverCount = 0;

    try { const r = await fetch(apiBase + "?t=" + Date.now(), { headers: { Authorization: "Bearer " + getPat() } }); if (r.ok) { const j = await r.json(); sha = j.sha; try { serverCount = Object.keys(JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\n/g,'')))))).length; } catch(e2) {} } } catch(e) {}

    // 안전장치: 캐시 꼬임 등으로 로컬 DP가 서버보다 비정상적으로 적으면 전체 덮어쓰기 차단 (DP 전체 삭제 사고 방지)
    const localCount = Object.keys(DISPLAY_ITEMS).length;
    if (serverCount - localCount > 3) {
        throw new Error(`DP 데이터가 서버보다 비정상적으로 적습니다 (로컬 ${localCount} / 서버 ${serverCount}). 새로고침(🔄) 후 다시 시도하세요.`);
    }

    const body = { message: "dp: update display items", content: utf8ToB64(JSON.stringify(DISPLAY_ITEMS, null, 2)), branch: GH.branch };

    if (sha) body.sha = sha;

    await fetch(apiBase, { method: "PUT", headers: { Authorization: "Bearer " + getPat(), "Content-Type": "application/json" }, body: JSON.stringify(body) });

    // 캐시 갱신

    try { const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}'); c.displayItems = DISPLAY_ITEMS; c._timestamp = Date.now(); sessionStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch(e) {}

  } catch(err) { console.error("DP 저장 실패:", err); throw err; }

}



// DP 버튼 클릭 핸들러 (모달 내 즉시 UI 반영)

window._toggleDPBtn = async (btn, code, size) => {

  // 버튼 비활성화 (중복 클릭 방지)

  $$('#dpSizeBtns button').forEach(b => b.disabled = true);

  try {

    await toggleDP(code, size);

    // 패널 전체 재렌더링

    if (window._dpRenderFn) window._dpRenderFn();

    if (window.lucide) lucide.createIcons();

  } catch(e) {

    alert("DP 저장 실패: " + e.message);

    $$('#dpSizeBtns button').forEach(b => b.disabled = false);

  }

};



// DP 등록/해제 토글

async function toggleDP(code, size) {

  const now = new Date().toISOString().split('T')[0];

  if (!DISPLAY_ITEMS[code]) DISPLAY_ITEMS[code] = {};

  if (DISPLAY_ITEMS[code][size]) {

    delete DISPLAY_ITEMS[code][size];

    if (Object.keys(DISPLAY_ITEMS[code]).length === 0) delete DISPLAY_ITEMS[code];

  } else {

    DISPLAY_ITEMS[code][size] = { since: now };

  }

  await saveDisplayItems();

  render();

}



// 품번의 DP 사이즈 목록

function getDPSizes(code) { return Object.keys(DISPLAY_ITEMS[code] || {}); }

// DP 상태: 'dp'=DP중, 'soldDP'=DP+재고0, 'none'=미DP

function getDPStatus(p) {

  const dpSizes = getDPSizes(p.품번);

  if (dpSizes.length === 0) return 'none';

  const hasSoldDP = dpSizes.some(sz => {

    const sObj = p.sizes.find(s => String(s.size).trim() === sz);

    return sObj && sObj.busan <= 0;

  });

  return hasSoldDP ? 'soldDP' : 'dp';

}



// ── 판매 데이터 자동 갱신 (5분마다) ──────────────────────────────────

let _lastSalesSync = 0;

async function loadSalesOnly() {

  try {

    // 기획전: API에서 직접 읽어 즉시 반영

    const promoFresh = await fetchGithubJson(PROMOTIONS_PATH);

    if(promoFresh !== null) PROMOTIONS = promoFresh;



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

// 5분마다 판매데이터 갱신 (GitHub에서 최신 sales_history 읽기)

const _salesIntervalId = setInterval(loadSalesOnly, 5 * 60 * 1000);



// ── POS 동기화 자동 트리거 ──────────────────────────────────

// GitHub Actions cron이 throttle 되는 문제 보완:

// 앱이 열려있는 동안 10분마다 workflow_dispatch로 직접 트리거

let _lastPosTrigger = 0;

const _POS_TRIGGER_KEY = 'rcm_pos_last_trigger';

async function autoTriggerPosSync() {

    if (!getPat()) return; // PAT 없으면 skip

    const now = Date.now();

    // localStorage로 탭 간 공유 — 어느 탭에서든 9분 내 트리거했으면 skip

    const sharedLast = parseInt(localStorage.getItem(_POS_TRIGGER_KEY) || '0');

    if (now - Math.max(_lastPosTrigger, sharedLast) < 9 * 60 * 1000) return;

    _lastPosTrigger = now;

    localStorage.setItem(_POS_TRIGGER_KEY, String(now));

    try {

        const r = await fetch(

            `https://api.github.com/repos/${GH.owner}/${GH.repo}/actions/workflows/pos_sync.yml/dispatches`,

            { method: 'POST', headers: { Authorization: 'Bearer ' + getPat(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: GH.branch }) }

        );

        if (r.status === 204) console.log('[POS AutoSync] triggered at', new Date().toLocaleTimeString());

    } catch(e) { console.log('[POS AutoSync] failed:', e.message); }

}

// 앱 시작 2분 후 첫 트리거, 이후 10분마다 반복

let _posIntervalId = null;

setTimeout(() => {

    autoTriggerPosSync();

    _posIntervalId = setInterval(autoTriggerPosSync, 10 * 60 * 1000);

}, 2 * 60 * 1000);



// 탭 닫힐 때 interval 정리

window.addEventListener('beforeunload', () => {

    if(_salesIntervalId) clearInterval(_salesIntervalId);

    if(_posIntervalId)   clearInterval(_posIntervalId);

});



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



// Groq API (llama-3.3-70b) 호출 — AI 세일즈 가이드 자동생성

async function callAIGuide(brand, modelName, reviewText) {

    const key = getAnthKey();

    if (!key) throw new Error("Groq API Key가 설정되지 않았습니다.\nAdmin > API 설정에서 등록해주세요.\n발급: console.groq.com (무료)");

    const userContent = reviewText.trim()

        ? `브랜드: ${brand}\n모델명: ${modelName}\n\n아래 스펙 데이터를 참고해서 AI 세일즈 가이드를 작성해주세요:\n\n${reviewText}`

        : `브랜드: ${brand}\n모델명: ${modelName}\n\n당신이 알고 있는 이 러닝화의 모든 스펙(무게, 스택, 드롭, 전작 비교, 경쟁사 비교)을 활용해 AI 세일즈 가이드를 작성해주세요.`;



    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {

        method: "POST",

        headers: {

            "Content-Type": "application/json",

            "Authorization": `Bearer ${key}`

        },

        body: JSON.stringify({

            model: "llama-3.3-70b-versatile",

            messages: [

                { role: "system", content: SALES_GUIDE_SYSTEM_PROMPT },

                { role: "user",   content: userContent }

            ],

            max_tokens: 1200,

            temperature: 0.7

        })

    });

    if (!res.ok) {

        const err = await res.json().catch(() => ({}));

        throw new Error(`Groq API 오류 (${res.status}): ${err.error?.message || res.statusText}`);

    }

    const data = await res.json();

    return data.choices?.[0]?.message?.content || "";

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

    // KST 기준 날짜 계산 (UTC+9) — 자정 전후 오류 방지

    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);

    const today = `${kst.getUTCFullYear()}${String(kst.getUTCMonth()+1).padStart(2,'0')}${String(kst.getUTCDate()).padStart(2,'0')}`;

    if(SALES_DEDUCTIONS.date !== today) { SALES_DEDUCTIONS = null; return; }

    const bu = SALES_DEDUCTIONS.busan || {}, si = SALES_DEDUCTIONS.sinsa || {};

    for(const p of PRODUCTS) {

        for(const s of p.sizes) {

            const key = p.품번 + '|' + String(s.size).trim();

            // bu[key]가 양수(판매)면 차감, 음수(반품>판매)면 복원, 0이면 무시

            const buNet = bu[key] ?? 0;

            const siNet = si[key] ?? 0;

            if(buNet !== 0) s.busan = Math.max(0, s.busan - buNet);

            if(siNet !== 0) s.sinsa = Math.max(0, s.sinsa - siNet);

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

            // 부산 판매 수량: '부산(김종훈)' 또는 '부산' 키 (중복 방지: 최대값)

            const sold = Math.max(saleEntry['부산(김종훈)'] || 0, saleEntry['부산'] || 0);

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

    // 하드코딩된 날짜 제거 — 위클리 카테고리는 기획전 데이터에서 읽어야 함

    // 현재 활성 기획전 중 weeklyCategory 필드가 있으면 그것을 사용

    for (const pr of getPromoList()) {

        if (pr.meta?.weeklyCategory) return pr.meta.weeklyCategory;

    }

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

      map.set(code, { 품번:code, 품명:r["품명"], 브랜드:r["브랜드"], 카테고리:r["카테고리2"]||r["카테고리"], 성별:r["성별"], gender:detectGender(code, r["성별"]), 소비자가:Number(r["소비자가"]||0), shopNo:String(r["상품번호(샵바이)"]||""), itemCode:String(r["품목내부코드"]||""), barcode:(()=>{ const keys=["POS바코드번호","POS연동바코드","바코드번호","바코드","EAN","ean","barcode","Barcode"]; for(const k of keys){ const v=String(r[k]||"").replace(/[\s\-]/g,""); if(v.length>=8) return v; } return ""; })(), sizes:[], hasMemo: false, periodSales: 0 });

    }

    const p = map.get(code);

    // 소비자가가 0이고 현재 행에 가격 있으면 업데이트 (첫 행이 0원인 경우 대비)

    const rowPrice = Number(r["소비자가"]||0);

    if(!p.소비자가 && rowPrice > 0) p.소비자가 = rowPrice;

    const busan = Number(r["매장 (부산)"] ?? r["매장(부산)"] ?? 0);

    const sinsa = Number(r["매장 (신사동)"] ?? r["매장(신사동)"] ?? 0);

    const center = Number(r["물류센터"] ?? 0);

    

    const _sizeBarcode = (()=>{ const keys=["POS바코드번호","POS연동바코드","바코드번호","바코드","EAN","ean","barcode","Barcode"]; for(const k of keys){ const v=String(r[k]||"").replace(/[\s\-]/g,""); if(v.length>=8) return v; } return ""; })();

    // 사이즈별 품목내부코드 (규격마다 다름 — 품번 레벨 itemCode와 별도 관리)
    const _sizeItemCode = String(r["품목내부코드"] || "").trim();

    const found = p.sizes.find(s=>String(s.size)===String(r["규격"]));

    if(found){ found.busan+=busan; found.sinsa+=sinsa; found.center+=center; if(!found.barcode && _sizeBarcode) found.barcode=_sizeBarcode; if(!found.itemCode && _sizeItemCode) found.itemCode=_sizeItemCode; }

    else p.sizes.push({ size:r["규격"], busan, sinsa, center, barcode:_sizeBarcode, itemCode:_sizeItemCode });

  }

  

  PRODUCTS = Array.from(map.values()).map(p=>{

    p.busanTotal = p.sizes.reduce((a,b)=>a+b.busan,0);

    p.sinsaTotal = p.sizes.reduce((a,b)=>a+b.sinsa,0);

    p.centerTotal = p.sizes.reduce((a,b)=>a+b.center,0);

    // 부산 재고 있는 사이즈 중 바코드 누락된 것이 하나라도 있는지

    p.noBarcodeBusan = p.sizes.some(s => s.busan > 0 && !s.barcode);

    

    const prevTotal = prevRaw.filter(pr=>pr["품번"]===p.품번).reduce((a,b)=>a+Number(b["매장 (부산)"] ?? b["매장(부산)"] ?? 0),0);

    p.delta = prevRaw.length ? p.busanTotal - prevTotal : 0;

    p.hasMemo = MEMOS.some(m => m.code === p.품번);



    const _pm = findPromoForCode(p.품번);

    if (_pm) {

        const { promo: _pr, item: _pi, isPreview: _isPreview } = _pm;
        p.promoIsPreview = !!_isPreview;

        const _endDate = (function(period){ const m=(period||'').match(/[~～]\s*(\d{1,2}[\/\.]\d{1,2})/); return m?m[1].replace('.','/'):'' ; })(_pr.meta?.period||'');

        const _promoMeta = { promoType:'general', promoName: _pr.meta?.name||'', promoEndDate: _endDate||'' };

        p.promoEventRate  = _pi.eventRate  || 0;
        p.promoCouponRate = _pi.couponRate || 0;

        if (_pi.targetCat === activeWeeklyCat && _pi.weeklyPrice && _pi.weeklyPrice < p.소비자가) {

            p.currentPromoPrice = _pi.weeklyPrice; p.promoType = 'weekly'; p.promoName = _promoMeta.promoName;

            p.promoRate = _pi.weeklyRate || ((p.소비자가 - _pi.weeklyPrice) / p.소비자가);

            p.promoEndDate = _endDate || (_pi.targetCat==='FOOTWEAR'?'5/15':_pi.targetCat==='APPAREL'?'5/22':'5/29');

        } else if (_pi.finalPrice && _pi.finalPrice < p.소비자가) {

            p.currentPromoPrice = _pi.finalPrice; Object.assign(p, _promoMeta);

            p.promoRate = _pi.finalRate || ((p.소비자가 - _pi.finalPrice) / p.소비자가);

        } else if (_pi.finalRate > 0 && p.소비자가 > 0) {

            // finalPrice 없을 때 소비자가 × (1-rate) 로 계산

            const _computed = Math.round(p.소비자가 * (1 - _pi.finalRate) / 10) * 10;

            if (_computed < p.소비자가) {

                p.currentPromoPrice = _computed; Object.assign(p, _promoMeta);

                p.promoRate = _pi.finalRate;

            }

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



      // 필터 row 다음, 브랜드 행 앞에 삽입

      const filterDetails = $("#filterDetails");

      const brandSearchRow = $("#brandRow") || $("#brandSearch")?.parentNode?.parentNode;

      if(filterDetails && brandSearchRow && brandSearchRow.parentNode === filterDetails) filterDetails.insertBefore(container, brandSearchRow);

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

  if (!promoWrap && getPromoList().length > 0) {

      promoWrap = document.createElement("div"); promoWrap.id = "promoFilters";

      promoWrap.className = "flex gap-1.5 items-center overflow-x-auto no-scrollbar pl-[2.875rem]";

      // brandRow 앞에 삽입 (filterDetails 내)

      const _brandRowRef = $("#brandRow");

      if(_brandRowRef && _brandRowRef.parentNode) _brandRowRef.parentNode.insertBefore(promoWrap, _brandRowRef);

      else { const _bc = $("#brandChips"); if(_bc?.parentNode) _bc.parentNode.insertBefore(promoWrap, _bc); }

  }

  if (getPromoList().length > 0) {

      if(promoWrap) {

          const _isPromoActive = window.tempPromoFilter === true;

          const _showSel = _isPromoActive ? '' : 'hidden';

          promoWrap.innerHTML = `

              <select id="promoTypeSel" class="ipt text-sm font-bold bg-white border-purple-200 text-purple-700 rounded px-3 py-1.5 ${_showSel} shrink-0 outline-none"><option value="ALL">기획전 전체보기</option><option value="weekly">🔥 위클리특가만</option><option value="general">🎟️ 쿠폰사용가능만</option><option value="PREVIEW">📅 시작 전 미리보기</option></select>

              <select id="promoRateSel" class="ipt text-sm font-bold bg-white border-purple-200 text-purple-700 rounded px-3 py-1.5 ${_showSel} shrink-0 outline-none"><option value="0">할인율 전체</option><option value="10">🔥 10% 할인</option><option value="20">🔥 20% 할인</option><option value="30">🔥 30% 할인</option></select>

          `;

          const _ptSel = $("#promoTypeSel"), _prSel = $("#promoRateSel");

          if(_ptSel) _ptSel.onchange = () => { const _wasPreview = window.promoPreviewMode; window.promoPreviewMode = (_ptSel.value === 'PREVIEW'); if(window.promoPreviewMode !== _wasPreview) reapplyPromoData(); saveHistoryState(); visibleCount=60; render(); };

          if(_prSel) _prSel.onchange = () => { saveHistoryState(); visibleCount=60; render(); };

      }

  } else if (promoWrap) { promoWrap.innerHTML = ""; window._activePromoName = "ALL"; }



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



  // 브랜드 칩 렌더링 (멀티셀렉트) — 전역 노출로 resetAll 등에서 접근 가능

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

          if(window._updateBrandPreview) window._updateBrandPreview();

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

              if(window._updateBrandPreview) window._updateBrandPreview();

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

  // ── 인기순 top N 브랜드 (항상 인기순, 정렬 토글 무관) ──

  const _getTopBrands = (n) => Object.entries(brandCounts).sort((a,b)=>b[1]-a[1]).slice(0,n).map(x=>x[0]);



  // ── 브랜드 접힌 상태: 인기 top5 칩 + 선택 표시 ──────────

  const _updateBrandPreview = () => {

      const preview = $("#brandCollapsedPreview");

      const label = $("#brandToggleLabel");

      if (!preview) return;



      const top5 = _getTopBrands(10);

      preview.innerHTML = "";



      // top 5 인기 브랜드를 항상 클릭 가능한 칩으로 표시

      top5.forEach(b => {

          const btn = document.createElement("button");

          btn.className = "chip shrink-0 text-[11px]";

          btn.dataset.brand = b;

          btn.dataset.active = window._activeBrands.has(b) ? "1" : "0";

          btn.textContent = b;

          btn.onclick = () => {

              saveHistoryState();

              if (window._activeBrands.has(b)) window._activeBrands.delete(b);

              else window._activeBrands.add(b);

              _renderBrandChips();

              _updateBrandPreview();

              visibleCount = 60; render();

          };

          preview.appendChild(btn);

      });



      // top5 외에 선택된 브랜드가 있으면 "+N개 선택" 표시

      const extraSelected = [...window._activeBrands].filter(b => !top5.includes(b));

      if (extraSelected.length > 0) {

          const span = document.createElement("span");

          span.className = "text-[10px] font-black text-blue-600 shrink-0 px-1";

          span.textContent = `+${extraSelected.length}개 선택`;

          preview.appendChild(span);

      }



      // 펼치기/접기 라벨

      const isOpen = $("#brandExpandedPanel")?.classList.contains("open");

      if (label) label.textContent = isOpen ? "접기" : "전체보기";

  };



  window._renderBrandChips = (filterQ = "") => { _renderBrandChips(filterQ); _updateBrandPreview(); };

  window._updateBrandPreview = _updateBrandPreview;



  // ── 브랜드 패널 토글 ─────────────────────────────────────

  window._toggleBrandPanel = () => {

      const panel = $("#brandExpandedPanel");

      const chevron = $("#brandChevron");

      const label = $("#brandToggleLabel");

      if (!panel) return;

      const isOpen = panel.classList.contains("open");

      if (isOpen) {

          panel.classList.remove("open");

          if (chevron) chevron.style.transform = "";

          if (label) label.textContent = "펼치기";

      } else {

          panel.classList.add("open");

          if (chevron) chevron.style.transform = "rotate(180deg)";

          if (label) label.textContent = "접기";

          // 패널 열릴 때 검색창 포커스

          setTimeout(() => { const s = $("#brandSearch"); if(s) s.focus(); }, 50);

      }

  };



  _renderBrandChips();

  _updateBrandPreview();



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



    const hasPromo = getPromoList().length > 0;

    const erpApplied = !!window._erpDeductApplied;

    wrap.innerHTML = `

<button id="dashBtn" onclick="window.openAnalyticsReport()" class="flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 transition-colors whitespace-nowrap">

            <i data-lucide="bar-chart-2" class="w-3.5 h-3.5"></i><span>분석 리포트</span>

        </button>

        <button id="salesSummaryBtn" onclick="const _sp=document.getElementById('salesSummaryPanel');if(_sp&&!_sp.classList.contains('hidden')){window._salesSummaryDismissed=true;_sp.classList.add('hidden');}else{window._salesSummaryDismissed=false;renderSalesSummaryPanel();if(_sp){_sp.classList.remove('hidden');_sp.scrollIntoView({behavior:'smooth',block:'start'});}}" class="flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-600 transition-colors whitespace-nowrap">

            <i data-lucide="flame" class="w-3.5 h-3.5"></i><span>핫셀러 현황</span>

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



// ── 기획전 버튼 상태 동기화 헬퍼 ──────────────────────────────

function _syncPromoBtn(btn, active, pname) {

    if(!btn) return;

    btn.dataset.active = active ? "1" : "0";

    if(active) {

        btn.className = btn.className.replace(/bg-purple-50/g,'bg-purple-600').replace(/text-purple-700/g,'text-white').replace(/hover:bg-purple-100/g,'hover:bg-purple-700').replace(/border-purple-200/g,'border-purple-700');

        const label = (!pname || pname === "ALL") ? "기획전" : (pname.length > 9 ? pname.slice(0,9)+'…' : pname);

        btn.innerHTML = `<i data-lucide="gift" class="w-3.5 h-3.5"></i><span>${label} ✕</span>`;

    } else {

        btn.className = btn.className.replace(/bg-purple-600/g,'bg-purple-50').replace(/text-white/g,'text-purple-700').replace(/hover:bg-purple-700/g,'hover:bg-purple-100').replace(/border-purple-700/g,'border-purple-200');

        btn.innerHTML = `<i data-lucide="gift" class="w-3.5 h-3.5"></i><span>기획전</span>`;

    }

    if(window.lucide) lucide.createIcons();

}



window.togglePromoView = (btn, bypassRender = false) => {

    if(!bypassRender) saveHistoryState();

    const _promos = getPromoList();

    const _isMultiPromo = _promos.length > 1;



    // ── 멀티 기획전: 드롭다운 팝오버 ────────────────────────────

    if(_isMultiPromo) {

        if(bypassRender) {

            // 프로그래밍 방식 호출 (자동 활성화) — 드롭다운 없이 바로 적용

            window.tempPromoFilter = true;

            _syncPromoBtn(btn, true, window._activePromoName || "ALL");

            return;

        }

        // 드롭다운 열기/닫기 토글

        const existingDD = document.getElementById('promoDropdown');

        if(existingDD) { existingDD.remove(); return; }



        const dd = document.createElement('div');

        dd.id = 'promoDropdown';

        dd.style.cssText = 'position:fixed;z-index:99999;background:#fff;border:1.5px solid #e9d5ff;border-radius:14px;box-shadow:0 8px 28px rgba(88,28,135,0.18);overflow:hidden;min-width:190px;padding:6px 0;';



        const activePN = window._activePromoName || "ALL";

        const isFilterOn = window.tempPromoFilter === true;



        // 기획전 목록 아이템

        const ddItems = [

            { pname: "ALL", label: "🎁 전체 기획전" },

            ..._promos.map(pr => ({

                pname: pr.meta?.name || '기획전',

                label: `🎪 ${pr.meta?.name || '기획전'}${pr.meta?.period ? '  <span style="opacity:.6;font-size:10px;">'+escapeHtml(pr.meta.period)+'</span>' : ''}`

            }))

        ];

        ddItems.forEach(item => {

            const iBtn = document.createElement('button');

            const isSelected = isFilterOn && activePN === item.pname;

            iBtn.style.cssText = `display:block;width:100%;padding:9px 16px;text-align:left;font-size:12px;font-weight:700;border:none;cursor:pointer;transition:background 0.12s;background:${isSelected?'#7c3aed':'#fff'};color:${isSelected?'#fff':'#6d28d9'};`;

            iBtn.innerHTML = item.label;

            iBtn.addEventListener('mouseover', () => { if(!isSelected) iBtn.style.background='#f5f3ff'; });

            iBtn.addEventListener('mouseout', () => { if(!isSelected) iBtn.style.background='#fff'; });

            iBtn.addEventListener('click', e => { e.stopPropagation(); window._selectPromoItem(item.pname); dd.remove(); });

            dd.appendChild(iBtn);

        });



        // 필터 활성 시 해제 버튼

        if(isFilterOn) {

            const sep = document.createElement('div');

            sep.style.cssText = 'height:1px;background:#f3e8ff;margin:6px 8px;';

            dd.appendChild(sep);

            const xBtn = document.createElement('button');

            xBtn.style.cssText = 'display:block;width:100%;padding:8px 16px;text-align:left;font-size:11px;font-weight:700;color:#a855f7;background:#fff;border:none;cursor:pointer;';

            xBtn.innerHTML = '✕ 기획전 필터 해제';

            xBtn.addEventListener('mouseover', () => xBtn.style.background='#fdf4ff');

            xBtn.addEventListener('mouseout', () => xBtn.style.background='#fff');

            xBtn.addEventListener('click', e => { e.stopPropagation(); window._deactivatePromo(); dd.remove(); });

            dd.appendChild(xBtn);

        }



        document.body.appendChild(dd);

        const rect = btn.getBoundingClientRect();

        dd.style.top = (rect.bottom + 6) + 'px';

        dd.style.left = rect.left + 'px';



        setTimeout(() => {

            const closeDD = e => {

                if(!dd.contains(e.target) && !btn.contains(e.target)) { dd.remove(); document.removeEventListener('click', closeDD); }

            };

            document.addEventListener('click', closeDD);

        }, 10);

        return;

    }



    // ── 단일 기획전: 기존 토글 ──────────────────────────────────

    const isActive = btn.dataset.active === "1";

    if(!isActive) {

        window.tempPromoFilter = true;

        _syncPromoBtn(btn, true, "ALL");

        $("#promoTypeSel")?.classList.remove("hidden");

        $("#promoRateSel")?.classList.remove("hidden");

    } else {

        window.tempPromoFilter = false;

        window._activePromoName = "ALL";

        _syncPromoBtn(btn, false);

        $("#promoTypeSel")?.classList.add("hidden");

        $("#promoRateSel")?.classList.add("hidden");

    }

    if(!bypassRender) { visibleCount=60; render(); }

};



// 기획전 개별 선택

window._selectPromoItem = (pname) => {

    window._activePromoName = pname;

    window.tempPromoFilter = true;

    const btn = document.getElementById('promoViewBtn');

    _syncPromoBtn(btn, true, pname);

    $("#promoTypeSel")?.classList.remove("hidden");

    $("#promoRateSel")?.classList.remove("hidden");

    saveHistoryState(); visibleCount = 60; render();

};



// 기획전 필터 해제

window._deactivatePromo = () => {

    window.tempPromoFilter = false;

    window._activePromoName = "ALL";

    const btn = document.getElementById('promoViewBtn');

    _syncPromoBtn(btn, false);

    $("#promoTypeSel")?.classList.add("hidden");

    $("#promoRateSel")?.classList.add("hidden");

    saveHistoryState(); visibleCount = 60; render();

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

    document.addEventListener("click", (e) => { if(qEl && suggBox && !qEl.contains(e.target) && !suggBox.contains(e.target)) suggBox.classList.add("hidden"); });

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



// GitHub transfers 저장 (딜레이 후 저장, 연속 클릭 시 debounce)

async function _saveTransfersToGH() {

    const apiUrl = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${TRANSFERS_PATH}`;

    // 서버 최신 transfers.json을 읽어 id 기준으로 병합(union) 후 PUT.
    // 409/422(SHA 충돌) 시 최신 sha로 재병합 후 재시도 — 다른 기기 요청을 덮어쓰지 않음.
    for (let attempt = 0; attempt < 3; attempt++) {

        try {

            const r = await fetch(apiUrl + `?t=${Date.now()}`, {headers:{Authorization:"Bearer "+getPat()}});

            if(!r.ok && r.status !== 404) throw new Error('fetch ' + r.status);

            let serverData = [], sha;
            if(r.ok) { const j = await r.json(); sha = j.sha; try { serverData = JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\n/g,''))))); } catch(e2) {} }

            // id union: 서버 레코드 보존 + 로컬 레코드 반영(같은 id면 로컬 우선)
            const byId = new Map();
            for (const s of serverData) byId.set(s.id, s);
            for (const loc of TRANSFERS) byId.set(loc.id, loc);
            const merged = Array.from(byId.values());

            const body = { message:"update transfers", content: utf8ToB64(JSON.stringify(merged, null, 2)), branch: GH.branch, ...(sha && {sha}) };

            const put = await fetch(apiUrl, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });

            if(put.status === 409 || put.status === 422) continue;   // 최신 sha로 재시도
            if(!put.ok) throw new Error('PUT ' + put.status);

            TRANSFERS = merged;
            return true;

        } catch(err) { if(attempt === 2) { console.error('transfers save error:', err); showToast('RT 저장 실패. 다시 시도해주세요.', null, 'error'); return false; } }

    }

    showToast('RT 저장 실패. 다시 시도해주세요.', null, 'error'); return false;

}



async function _removeTransferFromGH(trId) {

    const apiUrl = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${TRANSFERS_PATH}`;

    // 서버 최신을 읽어 해당 id만 제거 후 PUT (다른 기기 요청 보존), 409/422 시 재시도
    for (let attempt = 0; attempt < 3; attempt++) {

        try {

            const r = await fetch(apiUrl + `?t=${Date.now()}`, {headers:{Authorization:"Bearer "+getPat()}});

            if(!r.ok) throw new Error('fetch ' + r.status);

            const j = await r.json();

            let serverData = [];
            try { serverData = JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\n/g,''))))); } catch(e2) {}

            const filtered = serverData.filter(t => t.id !== trId);

            const body = { message:"undo transfer", content: utf8ToB64(JSON.stringify(filtered, null, 2)), branch: GH.branch, sha: j.sha };

            const put = await fetch(apiUrl, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });

            if(put.status === 409 || put.status === 422) continue;
            if(!put.ok) throw new Error('PUT ' + put.status);

            TRANSFERS = filtered;
            return true;

        } catch(err) { if(attempt === 2) { console.error('transfer undo error:', err); return false; } }

    }

    return false;

}



window.quickRT = async (code, size, fromStr, qty, btn) => {

    if(!checkPat()) return;

    const p = PRODUCTS.find(x => x.품번 === code);

    if(!p) return;



    // iPad/iOS Safari 대응

    if(!btn || !btn.tagName) {

        try { btn = (window.event && (window.event.currentTarget || window.event.target)) || document.createElement('button'); }

        catch(e) { btn = document.createElement('button'); }

    }



    const finalMemo = `[${fromStr} ➡️ 부산점] 스마트보충 RT요청`;



    // ── 이미 같은 품번+사이즈+출처 이동요청이 있으면 수량 증가 ──

    const existing = TRANSFERS.find(t => t.code === code && t.size === size && t.memo === finalMemo);

    if (existing) {

        existing.qty += 1;

        // 버튼: 수량 표시 유지 (계속 클릭 가능)

        btn.innerHTML = `<i data-lucide="check" class="w-3 h-3 shrink-0"></i>${existing.qty}개`;

        if(window.lucide) lucide.createIcons();

        // debounce 저장 (800ms 내 추가 클릭이 없을 때 저장)

        clearTimeout(window._rtSaveTimer);

        window._rtSaveTimer = setTimeout(_saveTransfersToGH, 800);

        showToast(`📦 ${fromStr} → ${size} | ${existing.qty}개로 업데이트`, async () => {

            // 실행취소: 방금 올린 1개만 되돌림 (대기 중 저장 취소 후 정리)

            clearTimeout(window._rtSaveTimer);

            existing.qty -= 1;

            if (existing.qty <= 0) {

                TRANSFERS = TRANSFERS.filter(t => t.id !== existing.id);

                btn.innerHTML = `<i data-lucide="arrow-left-right" class="w-4 h-4"></i>`;

                if(window.lucide) lucide.createIcons();

                await _removeTransferFromGH(existing.id);

            } else {

                btn.innerHTML = `<i data-lucide="check" class="w-3 h-3 shrink-0"></i>${existing.qty}개`;

                if(window.lucide) lucide.createIcons();

                await _saveTransfersToGH();

            }

        });

        return;

    }



    // ── 신규 이동요청 추가 ──

    const origHtml = btn.innerHTML;

    const origClass = btn.className;



    // 버튼 → 초록 "1개" 표시, 클릭 가능 유지 (추가 클릭으로 수량 증가)

    btn.innerHTML = `<i data-lucide="check" class="w-3 h-3 shrink-0"></i>1개`;

    btn.className = origClass.replace(/(bg-\w+-\d+|hover:bg-\w+-\d+)/g, '') + ' bg-green-600 hover:bg-green-700 text-white';

    if(window.lucide) lucide.createIcons();



    const trId = "tr_" + Date.now();

    const d = new Date();

    const shortDate = `${d.getFullYear().toString().substr(2)}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;



    // 사이즈별 품목내부코드 우선 사용 (sizes[].itemCode), 없으면 품번 레벨 itemCode fallback
    const _sizeObj = p.sizes?.find(s => String(s.size).trim() === String(size).trim());
    const _trItemCode = _sizeObj?.itemCode || p.itemCode || "";

    TRANSFERS.push({ id: trId, code, product: p.품명, shopNo: p.shopNo || "", itemCode: _trItemCode, date: shortDate, size, qty: 1, memo: finalMemo });



    // 서버 최신 transfers.json과 병합 저장 (성공 확인 후에만 성공 토스트)
    const _saveOk = await _saveTransfersToGH();

    if(!_saveOk) {

        // 저장 실패 → 낙관적 UI 롤백 (실패 토스트는 _saveTransfersToGH가 표시)

        TRANSFERS = TRANSFERS.filter(t => t.id !== trId);

        btn.innerHTML = origHtml; btn.className = origClass; btn.disabled = false;

        if(window.lucide) lucide.createIcons();

        return;

    }



    showToast(`📦 ${fromStr} → ${size} 1개 RT요청 (한 번 더 누르면 +1개)`, async () => {

        // 실행취소: 서버 최신을 읽어 해당 id만 제거 후 PUT (다른 기기 요청 보존)

        TRANSFERS = TRANSFERS.filter(t => t.id !== trId);

        await _removeTransferFromGH(trId);

        btn.innerHTML = origHtml; btn.className = origClass; btn.disabled = false;

        if(window.lucide) lucide.createIcons();

    });

};



window.exportTransfersToExcel = () => {

    if(TRANSFERS.length === 0) { alert("다운로드할 이동 요청 데이터가 없습니다."); return; }

    if(!window.XLSX || !window.XLSX.writeFile) {

        alert("엑셀 모듈 로딩중입니다. 잠시 후 다시 시도해주세요.");

        const s = document.createElement('script'); s.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js'; document.head.appendChild(s); return;

    }



    // ── 이동요청리스트 양식에 맞게 출력 ──

    // 행 구성: A열(빈칸), B~L열 데이터

    const aoa = [];



    // Row1: 빈 행

    aoa.push(Array(12).fill(''));



    // Row2: 타이틀 (B2, B2:L2 병합)

    aoa.push(['', 'RACEMENT 이동요청리스트', '', '', '', '', '', '', '', '', '', '']);



    // Row3: 헤더

    aoa.push(['', 'ERP이동요청번호', '요청일', '품목내부코드', '품번', '품명', '규격', '품명', '요청수량', '물류센터재고', '매장재고', '단위이상']);



    // ── 품번(규격) → 품목내부코드 룩업 테이블 (RAW 데이터 기반, 사이즈 레벨 정확 매칭) ──
    // 기존에 itemCode가 잘못 저장된 항목도 이 테이블로 재매핑
    const _itemCodeMap = {};
    RAW.forEach(r => {
        const 품번 = String(r["품번"] || "").trim();
        const 규격 = String(r["규격"] || "").trim();
        const 코드 = String(r["품목내부코드"] || "").trim();
        if(품번 && 규격 && 코드) _itemCodeMap[`${품번}(${규격})`] = 코드;
    });

    // Row4+: 데이터

    TRANSFERS.forEach(t => {

        // 품번으로 제품 찾고 sizes 배열에서 해당 사이즈의 물류센터 재고 조회

        const prod = PRODUCTS.find(p => p.품번 === t.code);

        const sizeObj = prod?.sizes?.find(s => String(s.size).trim() === String(t.size || '').trim());

        const wms   = sizeObj !== undefined ? (sizeObj.center || 0) : '';

        const store = sizeObj !== undefined ? (sizeObj.busan  || 0) : '';

        const diff  = (typeof wms === 'number' && typeof store === 'number') ? wms - store : '';

        // 품목내부코드 우선순위:
        //   1) RAW 룩업 테이블 [품번(규격)] — 가장 정확 (사이즈 레벨)
        //   2) sizes[].itemCode — 현재 세션 rebuildIndex 결과
        //   3) TRANSFERS에 저장된 itemCode — 과거 저장값
        //   4) 품번 레벨 itemCode
        //   5) 품번 자체 (최후 fallback)
        const _lookupKey = `${t.code}(${t.size})`;
        const itemCode = _itemCodeMap[_lookupKey] || sizeObj?.itemCode || t.itemCode || prod?.itemCode || t.code;

        aoa.push([

            '',                                    // A (빈칸)

            '',                                    // B: ERP이동요청번호 (본사 입력)

            t.date ? t.date.split(' ')[0] : '',    // C: 요청일 (날짜만, 시간 제거)

            itemCode,                              // D: 품목내부코드 (ERP 내부코드)

            t.code,                                // E: 품번

            t.product,                             // F: 품명

            t.size,                                // G: 규격

            t.product,                             // H: 품명 (사이즈 미포함)

            t.qty,                                 // I: 요청수량

            wms,                                   // J: 물류센터재고

            store,                                 // K: 매장재고(부산)

            diff,                                  // L: 단위이상

        ]);

    });



    const ws = XLSX.utils.aoa_to_sheet(aoa);



    // B2:L2 병합

    ws['!merges'] = [{ s: { r: 1, c: 1 }, e: { r: 1, c: 11 } }];



    // 열 너비 — 각 열의 최대 글자 수 기준 자동 계산

    const colCount = 12;

    const colWidths = Array(colCount).fill(4);

    aoa.forEach(row => {

        row.forEach((cell, ci) => {

            const len = String(cell ?? '').length;

            if (len > colWidths[ci]) colWidths[ci] = len;

        });

    });

    colWidths[0] = 2; // A열 고정

    ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w + 2, 40) }));



    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "이동요청리스트");

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

                                    const sd = dayData[size];

                                    // 부산 중복 방지: '부산(김종훈)'과 '부산' 키 동시 존재 시 최대값만 카운트

                                    const bq = Math.max(sd['부산(김종훈)'] || 0, sd['부산'] || 0);

                                    if (bq > 0) { busanSales += bq; sizeSalesMap[size] = (sizeSalesMap[size] || 0) + bq; }

                                    for(let mgr in sd) {

                                        const qty = sd[mgr];

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

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">

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

                            const sd = dayData[size];

                            // 부산 중복 방지: '부산(김종훈)'과 '부산' 키 동시 존재 시 최대값만 카운트

                            const bq = Math.max(sd['부산(김종훈)'] || 0, sd['부산'] || 0);

                            if (bq > 0) sizeSalesMapBusan[size] = (sizeSalesMapBusan[size] || 0) + bq;

                            for (let mgr in sd) {

                                const qty = sd[mgr];

                                if (mgr.includes("승호")||mgr.includes("강")||mgr.includes("신사")) sizeSalesMapSinsa[size] = (sizeSalesMapSinsa[size]||0) + qty;

                                else if (!mgr.includes("김종훈") && !mgr.includes("부산")) sizeSalesMapCenter[size] = (sizeSalesMapCenter[size]||0) + qty;

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

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 h-full">

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

  el.className = "card card-hover p-3.5 flex flex-col h-full";

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

  if(_cardSales.d7 >= 3)      salesSpeedBadge = `<span class="bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded font-black text-[10px]">🔥 7일 ${_cardSales.d7}개</span>`;

  else if(_cardSales.d7 >= 1) salesSpeedBadge = `<span class="bg-blue-50 text-blue-500 border border-blue-100 px-2 py-0.5 rounded font-black text-[10px]">📈 7일 ${_cardSales.d7}개</span>`;



  // RT 추천 뱃지: 30일내 부산 판매 있고 타지점에 재고 있을 때

  let rtChanceBadge = "";

  if(_cardSales.d30 > 0 && (p.centerTotal > 0 || p.sinsaTotal > 0)) {

    rtChanceBadge = `<span class="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded font-black text-[10px]">🔄 RT추천</span>`;

  }



  // 오늘 POS 판매 뱃지

  let todaySoldBadge = "";

  if ((p.todaySold || 0) > 0) {

    todaySoldBadge = `<span class="bg-amber-500 text-white px-2 py-0.5 rounded font-black text-[10px]">🛍️ 오늘 ${p.todaySold}개 판매</span>`;

  }



  // DP 배지

  let dpBadge = "";

  const _dpSizes = getDPSizes(p.품번);

  if (_dpSizes.length > 0) {

    const _dpSt = getDPStatus(p);

    const _dpSizeLabel = _dpSizes.join('·');

    if (_dpSt === 'soldDP') {

      dpBadge = `<span class="bg-orange-100 text-orange-700 border border-orange-300 px-2 py-0.5 rounded font-black text-[10px]">⚠️ 품절DP ${_dpSizeLabel}</span>`;

    } else {

      dpBadge = `<span class="bg-violet-100 text-violet-700 border border-violet-300 px-2 py-0.5 rounded font-black text-[10px]">🏷️ DP ${_dpSizeLabel}</span>`;

    }

  }



  // 이미지 없음 배지 (관리자 모드에서만)

  const _noImgBadge = !IMAGES[p.shopNo || p.품번] ? `<span class="bg-gray-100 text-gray-400 border border-gray-200 px-2 py-0.5 rounded font-black text-[10px]">📷 이미지없음</span>` : "";



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
  let promoRateFlow = "";  // 하단 가격행 중간에 표시할 할인 플로우

  let priceDisplay = `<div class="text-base sm:text-[17px] font-black">${krw(p.소비자가)}</div>`;



  if (p.currentPromoPrice && p.currentPromoPrice < p.소비자가) {

      const rateInt = Math.round((p.promoRate || 0) * 100);

      const rateLabel = rateInt > 0 ? `▼${rateInt}%` : '';

      const _pnLabel = p.promoName ? `<span class="opacity-75 text-[9px] font-bold">[${p.promoName}]</span> ` : '';
      const _previewLabel = p.promoIsPreview ? `<span class="text-[9px] font-bold text-gray-400 ml-0.5">📅미리보기</span>` : '';

      if (p.promoType === 'weekly') {

          promoBadge = `<span class="${p.promoIsPreview ? 'bg-gray-400' : 'bg-red-600'} text-white px-2 py-0.5 rounded font-black flex items-center gap-1 shadow-sm"><i data-lucide="flame" class="w-3.5 h-3.5"></i>${_pnLabel}위클리특가 ${rateLabel}${p.promoEndDate?' (~'+p.promoEndDate+')':''}${_previewLabel}</span>`;

          priceDisplay = `

            <div class="flex flex-col items-end leading-tight">

                <span class="text-xs text-gray-400 line-through mb-0.5">${krw(p.소비자가)}</span>

                <span class="text-lg sm:text-[20px] font-black ${p.promoIsPreview ? 'text-gray-500' : 'text-red-600'}">${p.promoIsPreview ? '📅' : '🔥'}${krw(p.currentPromoPrice)}</span>

            </div>`;

      } else {

          const _erInt = Math.round((p.promoEventRate||0)*100);
          const _crInt = Math.round((p.promoCouponRate||0)*100);
          const _isGray = p.promoIsPreview;

          // 상단 배지: 기획전명만
          promoBadge = `<span class="${_isGray?'bg-gray-100 text-gray-400':'bg-purple-50 text-purple-600'} px-2 py-0.5 rounded text-[11px] font-black flex items-center gap-1">${_pnLabel}🎟️ 기획전${_previewLabel}</span>`;

          // 할인 칩 전용 행 — 2줄 (할인율 위 / 할인가 아래)
          const _chip = (bg, border, text, rateLabel, price) => {
            const priceRow = price
              ? `<span class="block text-center font-black" style="font-size:11px;margin-top:1px">${krw(price)}</span>`
              : '';
            return `<span class="${_isGray ? 'bg-gray-100 border-gray-200 text-gray-400' : bg+' '+border+' '+text} border rounded-md px-2 py-1 font-black leading-tight flex flex-col items-center" style="min-width:64px">` +
              `<span class="text-[11px]">${rateLabel}</span>${priceRow}</span>`;
          };
          const _arrow = `<span class="text-gray-300 font-bold text-sm self-center">›</span>`;

          let _chips = '';
          if(_erInt > 0) _chips += _chip('bg-amber-50','border-amber-300','text-amber-700', `🎁 기획전 ▼${_erInt}%`, p.promoEventPrice) + _arrow;
          if(_crInt > 0) _chips += _chip('bg-blue-50','border-blue-300','text-blue-700', `🎟️ 쿠폰 ▼${_crInt}%`, null) + _arrow;
          _chips += _chip('bg-purple-50','border-purple-300','text-purple-700', `✨ 최종 ▼${rateInt}%`, p.currentPromoPrice);
          if(p.promoEndDate) _chips += `<span class="text-[11px] text-gray-400 font-bold self-center ml-1">(~${p.promoEndDate})</span>`;
          if(_isGray) _chips += `<span class="text-[10px] text-gray-400 font-bold self-center">📅미리보기</span>`;

          promoRateFlow = `<div class="flex items-stretch gap-1 overflow-x-auto no-scrollbar">${_chips}</div>`;

          priceDisplay = `

            <div class="flex flex-col items-end leading-tight">

                <span class="text-xs text-gray-400 line-through mb-0.5">${krw(p.소비자가)}</span>

                <span class="text-[17px] sm:text-lg font-black ${_isGray ? 'text-gray-500' : 'text-purple-700'}">${krw(p.currentPromoPrice)}</span>

            </div>`;

      }

  }



  let gLabel = p.성별 || p.gender || "U";

  if(gLabel === "M" || gLabel === "남성" || gLabel === "남") gLabel = "남성"; else if(gLabel === "W" || gLabel === "여성" || gLabel === "여") gLabel = "여성"; else gLabel = "공용";

  

  let gBadgeClass = "ui-badge unisex";

  if(gLabel === "남성") gBadgeClass = "ui-badge men";

  if(gLabel === "여성") gBadgeClass = "ui-badge women";



  // 상단 상태 배지: 중요도 순으로 최대 3개만 노출, 나머지는 +N 축약 (품명이 밀리지 않게)
  const _statusBadges = [dpBadge, todaySoldBadge, rtChanceBadge, salesSpeedBadge, busanOnlyBadge, promoBadge, (getFilters().noImage ? _noImgBadge : "")].filter(Boolean);
  const _MAX_BADGES = 3;
  let _badgesHtml = _statusBadges.slice(0, _MAX_BADGES).join("");
  if (_statusBadges.length > _MAX_BADGES) {
      _badgesHtml += `<span class="bg-gray-100 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded font-black text-[10px]" title="추가 상태 ${_statusBadges.length - _MAX_BADGES}개">+${_statusBadges.length - _MAX_BADGES}</span>`;
  }

  el.innerHTML = `

    <div class="flex flex-col flex-1">

        <div class="flex flex-wrap gap-1 text-xs font-bold text-gray-500 mb-1.5 items-center">

            ${_badgesHtml}

            <span class="hidden sm:inline bg-gray-100 px-2 py-0.5 rounded border border-gray-200">${escapeHtml(p.카테고리||"-")}</span>

            <span class="hidden sm:inline bg-gray-100 px-2 py-0.5 rounded border border-gray-200">${escapeHtml(p.브랜드||"-")}</span>

            <span class="${gBadgeClass}">${escapeHtml(gLabel)}</span>

            ${deltaHtml}

        </div>



        <div class="flex justify-between items-start w-full relative mb-1.5 gap-3">

           <div class="flex-1 min-w-0">

              <div class="copyable font-extrabold text-[14px] leading-snug mb-1 text-left w-full hover:text-blue-600 text-gray-900 line-clamp-2" data-copy="${escapeHtml(p.품명)}">${escapeHtml(p.품명)}</div>



              <div class="copyable text-[11px] font-bold text-gray-400 mb-1.5 text-left w-full hover:text-blue-600 flex items-center gap-1 overflow-hidden" data-copy="${escapeHtml(p.품번)}">

                  <span class="truncate">${escapeHtml(p.품번)}</span><i data-lucide="copy" class="w-4 h-4 opacity-60 shrink-0"></i>

              </div>

              ${salesHtml}

           </div>

           

           <div class="card-img-wrap">

               ${imgSrc ? `<img src="${imgSrc}" loading="lazy" onload="this.classList.add('loaded')" class="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal">` : `<div class="w-full h-full bg-gray-50 flex items-center justify-center flex-col gap-1"><span style="font-size:32px;opacity:.35">${p.카테고리==='신발'?'👟':p.카테고리==='의류'?'👕':'🎒'}</span></div>`}

               <button class="fav-btn bookmark-overlay text-gray-400 hover:text-yellow-500 outline-none" data-active="${isFav?'1':'0'}">

                    <i data-lucide="bookmark" class="w-5 h-5 ${isFav ? 'fill-yellow-400 text-yellow-400' : ''}"></i>

               </button>

           </div>

        </div>

        

        ${memoHtml}



        <div class="size-scroll-wrap no-scrollbar">

          ${p.sizes.map(s=>{

              const q = s.busan||0;

              const soldToday = (p.todaySoldBySize || {})[String(s.size).trim()] || 0;

              const _szLabel = convertSizeLabel(s.size, p.gender||p.성별||'');
              const _szWide = window.sizeUnit !== 'KR' && _szLabel.length > 3;
              let cls = "size-cell tnum shrink-0 " + (_szWide ? "w-[52px] " : "w-[46px] ");

              if(q===0) cls+="zero"; else if(q===1) cls+="danger"; else if(q===2) cls+="warn";

              const todayTag = soldToday > 0 ? `<span class="block text-center text-orange-500 font-black leading-none" style="font-size:9px;margin-top:1px">↓${soldToday}판매</span>` : '';

              return `<div class="${cls} ${soldToday>0?'!border-orange-300':''}"><span class="sz">${_szLabel}</span><span class="qty real-qty">${q}</span>${todayTag}<span class="qty showroom-qty hidden">${q>0?'O':'X'}</span></div>`;

          }).join("")}

        </div>

    </div>



    <div class="flex flex-col gap-1.5 border-t border-gray-100 pt-2.5 mt-auto shrink-0">

        <div class="flex items-center justify-between text-[11px] font-bold text-gray-400">

            <span>총 재고</span>

            <span class="shrink-0">부산 <b class="text-blue-600">${p.busanTotal}</b> · 신사 ${p.sinsaTotal} · 물류 ${p.centerTotal}</span>

        </div>

        ${promoRateFlow ? `<div class="flex items-center min-w-0 overflow-hidden">${promoRateFlow}</div>` : ''}

        <div class="flex items-center justify-between">

            <span class="text-xs font-black text-gray-600 shrink-0">소비자가</span>

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

      saveFavsToGH();

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

    todaySoldOnly: !!$$('button.chip[data-todaysold]').find(b=>b.dataset.active==="1"),

    dpFilters: $$('button.chip[data-dp]').filter(b=>b.dataset.active==="1").map(b=>b.dataset.dp),

    noImage: !!$$('button.chip[data-noimage]').find(b=>b.dataset.active==="1"),

    noBarcode: !!$$('button.chip[data-nobarcode]').find(b=>b.dataset.active==="1"),

    sizeFw: $("#sizeSelFw") ? $("#sizeSelFw").value : "ALL",

    sizeAp: $("#sizeSelAp") ? $("#sizeSelAp").value : "ALL",

    sizeGear: $("#sizeSelGear") ? $("#sizeSelGear").value : "ALL",

    promoOnly: promoOnly,

    promoType: promoOnly && $("#promoTypeSel") && $("#promoTypeSel").value !== "" ? $("#promoTypeSel").value : "ALL",

    promoRate: promoOnly && $("#promoRateSel") && $("#promoRateSel").value !== "" ? Number($("#promoRateSel").value) : 0,

    promoName: promoOnly ? (window._activePromoName || "ALL") : "ALL"

  };

}



// ── 판매 현황 요약 패널 (카테고리별 핫셀러/보통/저조) ───────────────

window._salesSummaryDismissed = true; // 처음엔 숨김, 버튼 클릭 시에만 표시

function renderSalesSummaryPanel(filteredList) {  // filteredList는 미사용 (전체 PRODUCTS 기준)

  const panel = $("#salesSummaryPanel");

  if (!panel || window._salesSummaryDismissed) return;



  const cats = ['신발', '의류', '용품'];

  const catEmoji = { '신발': '👟', '의류': '👕', '용품': '🎒' };



  // 카테고리별로 hot/normal/slow 분류

  const grouped = {};

  cats.forEach(c => { grouped[c] = { hot: [], normal: [], slow: [] }; });



  PRODUCTS.forEach(p => {

    const cat = p.카테고리;

    if (!grouped[cat]) return;

    const s = getSalesSummary(p.품번);

    if (s.d7 >= 3) grouped[cat].hot.push({ p, d7: s.d7 });

    else if (s.d7 >= 1) grouped[cat].normal.push({ p, d7: s.d7 });

    else if (s.all > 0) grouped[cat].slow.push({ p, d7: s.d7 });

  });



  // hot 내림차순 정렬

  cats.forEach(c => {

    grouped[c].hot.sort((a, b) => b.d7 - a.d7);

    grouped[c].normal.sort((a, b) => b.d7 - a.d7);

  });



  const totalHot = cats.reduce((s, c) => s + grouped[c].hot.length, 0);

  const totalNormal = cats.reduce((s, c) => s + grouped[c].normal.length, 0);



  if (totalHot + totalNormal === 0) { panel.classList.add("hidden"); return; }

  panel.classList.remove("hidden");



  // 각 카테고리 칼럼 HTML 생성

  const colHtml = cats.map(cat => {

    const g = grouped[cat];

    const hotItems = g.hot.slice(0, 8).map(({ p, d7 }) =>

      `<div class="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-red-50 rounded px-1 transition-colors" onclick="window._quickFilterProduct('${p.품번}')">

        <span class="font-black text-[11px] text-gray-800 flex-1 truncate">${escapeHtml(p.품명)}</span>

        <span class="text-[9px] text-gray-400 font-mono shrink-0 mr-0.5">${escapeHtml(String(p.품번))}</span>

        <span class="shrink-0 text-[10px] font-black text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full">7일 ${d7}개</span>

      </div>`

    ).join('');



    const remainHot = g.hot.length > 8 ? `<div class="text-[10px] text-gray-400 font-bold px-1 pt-0.5 cursor-pointer hover:text-red-500" onclick="window._quickFilter('${cat}','hot')">+ ${g.hot.length - 8}개 더</div>` : '';



    return `

    <div class="flex-1 min-w-0 bg-white rounded-xl border border-gray-100 shadow-sm p-2.5 flex flex-col gap-1.5">

      <div class="flex items-center justify-between mb-1">

        <span class="text-xs font-black text-gray-700">${catEmoji[cat]} ${cat}</span>

        <div class="flex gap-1">

          <span class="cursor-pointer text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition-colors" onclick="window._quickFilter('${cat}','hot')">🔥 ${g.hot.length}</span>

          <span class="cursor-pointer text-[10px] font-black px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-500 hover:text-white transition-colors" onclick="window._quickFilter('${cat}','normal')">📈 ${g.normal.length}</span>

          <span class="cursor-pointer text-[10px] font-black px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-400 hover:text-white transition-colors" onclick="window._quickFilter('${cat}','slow')">📦 ${g.slow.length}</span>

        </div>

      </div>

      ${g.hot.length > 0 ? `<div class="space-y-0.5">${hotItems}${remainHot}</div>` : `<div class="text-[10px] text-gray-300 font-bold text-center py-2">핫셀러 없음</div>`}

    </div>`;

  }).join('');



  panel.innerHTML = `

    <div class="rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-gray-50">

      <div class="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-100">

        <div class="flex items-center gap-2">

          <span class="text-xs font-black text-gray-800">📊 판매 현황 요약</span>

          <span class="text-[10px] text-gray-400 font-bold">(7일 기준)</span>

          <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-500">🔥 핫셀러 ${totalHot}개</span>

          <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-500">📈 보통 ${totalNormal}개</span>

        </div>

        <button onclick="window._salesSummaryDismissed=true;document.getElementById('salesSummaryPanel').classList.add('hidden')" class="text-gray-300 hover:text-gray-500 transition-colors"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>

      </div>

      <div class="flex gap-2 p-2">${colHtml}</div>

    </div>`;



  if (window.lucide) lucide.createIcons();

}



// 카테고리+속도 퀵필터 (패널 유지 + 카드 그리드 필터)

window._quickFilter = (cat, speed) => {

  saveHistoryState();

  // 패널은 닫지 않고 유지

  $$('button.chip[data-cat]').forEach(b => b.dataset.active = (b.dataset.cat === cat ? '1' : '0'));

  _clearAllFilterChips();

  $$('button.chip[data-salesspeed]').forEach(b => b.dataset.active = (b.dataset.salesspeed === speed ? '1' : '0'));

  // 핫셀러/보통 필터 시 판매량 내림차순 정렬

  if (speed === 'hot' || speed === 'normal') { if($("#sortSel")) $("#sortSel").value = "salesDesc"; }

  visibleCount = 120; render();

  // 패널 아래 그리드로 스크롤

  setTimeout(() => { const g = $("#grid"); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);

};



// 특정 품번 퀵필터 (패널 품목 클릭 시 → 패널 유지 + 해당 제품만 그리드 표시)

window._quickFilterProduct = (code) => {

  saveHistoryState();

  // 패널은 닫지 않고 유지

  $$('button.chip[data-cat]').forEach(b => b.dataset.active = (b.dataset.cat === 'ALL' ? '1' : '0'));

  $$('button.chip[data-gender]').forEach(b => b.dataset.active = (b.dataset.gender === 'ALL' ? '1' : '0'));

  _clearAllFilterChips();

  const qEl = $("#q");

  if (qEl) qEl.value = String(code);

  visibleCount = 120; render();

  setTimeout(() => { const g = $("#grid"); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);

};



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



  const _todayKey = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

  PRODUCTS.forEach(p => {

      p.periodSales = 0;

      p.todaySold = 0;

      p.todaySoldBySize = {};

      if (SALES_HISTORY.items && SALES_HISTORY.items[p.품번]) {

          for (let date in SALES_HISTORY.items[p.품번]) {

              const dayData = SALES_HISTORY.items[p.품번][date];

              if (typeof dayData === 'object') {

                  for (let size in dayData) {

                      if (typeof dayData[size] === 'object') {

                          const sd = dayData[size];

                          // 부산 중복 방지: '부산(김종훈)'과 '부산' 키 동시 존재 시 최대값만

                          const bq = Math.max(sd['부산(김종훈)'] || 0, sd['부산'] || 0);

                          if (bq > 0) {

                              p.periodSales += bq;

                              if (date === _todayKey) {

                                  p.todaySold += bq;

                                  p.todaySoldBySize[size] = (p.todaySoldBySize[size] || 0) + bq;

                              }

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

    if(f.todaySoldOnly && !(p.todaySold > 0)) return false;

    if(f.dpFilters.length > 0) {

      const dpSt = getDPStatus(p);

      const match = f.dpFilters.some(filter => {

        if(filter === "dp")     return dpSt !== 'none';

        if(filter === "nodp")   return dpSt === 'none' && p.busanTotal > 0; // 미DP이면서 재고있는 것만

        if(filter === "soldDP") return dpSt === 'soldDP';

        return false;

      });

      if(!match) return false;

    }

    if(f.noImage && (IMAGES[p.shopNo || p.품번])) return false;

    if(f.noBarcode && !p.noBarcodeBusan) return false;

    

    if(f.promoOnly) {

        if(!p.currentPromoPrice) return false; 

        if(f.promoType !== "ALL" && f.promoType !== "PREVIEW" && p.promoType !== f.promoType) return false;

        if(f.promoRate > 0 && Math.round((p.promoRate || 0) * 100) !== f.promoRate) return false;

        if(f.promoName && f.promoName !== "ALL" && p.promoName !== f.promoName) return false;

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

  const sortMode = f.todaySoldOnly ? "todayDesc" : f.rtChance ? "salesDesc" : $("#sortSel").value;

  filteredList.sort((a,b) => {

    if(sortMode === "todayDesc") return (b.todaySold||0) - (a.todaySold||0) || String(a.품명).localeCompare(String(b.품명),"ko");

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

    if(sortMode==="promoRateDesc") return (b.promoRate||0) - (a.promoRate||0) || String(a.품명).localeCompare(String(b.품명),"ko");

    if(sortMode==="promoEventRateDesc") return (b.promoEventRate||0) - (a.promoEventRate||0) || String(a.품명).localeCompare(String(b.품명),"ko");

    if(sortMode==="promoCouponRateDesc") return (b.promoCouponRate||0) - (a.promoCouponRate||0) || String(a.품명).localeCompare(String(b.품명),"ko");

    

    const br = String(a.브랜드).localeCompare(String(b.브랜드),"ko"); if(br!==0) return br;

    return String(a.품명).localeCompare(String(b.품명),"ko");

  });



  grid.innerHTML = "";

  if(filteredList.length === 0){

      const f2 = getFilters();

      const hasQuery = !!f2.q;

      const hasFilters = f2.cat !== "ALL" || f2.gender !== "ALL" || f2.brand !== "ALL" || f2.stock || f2.favOnly || f2.memoOnly || f2.noBarcode || f2.noImage || f2.sizeFw !== "ALL" || f2.sizeAp !== "ALL" || f2.sizeGear !== "ALL";

      const nm = $("#noMatch");

      if(nm) nm.innerHTML = `

        <div class="text-2xl mb-2">${hasQuery ? '🔍' : '📭'}</div>

        <div class="text-xl font-black mb-1">결과 없음</div>

        <div class="text-sm text-gray-500 mb-4">${hasQuery ? `"<b>${f2.q}</b>" 검색 결과가 없습니다` : '조건에 맞는 상품이 없습니다'}</div>

        ${(hasQuery || hasFilters) ? `<button onclick="document.getElementById('resetAll').click()" class="brutal px-5 py-2 bg-black text-white font-black text-sm">↺ 필터 전체 초기화</button>` : ''}

      `;

      nm.classList.remove("hidden");

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



  // 판매 현황 요약 패널 갱신

  renderSalesSummaryPanel(filteredList);

  // 적용된 필터 요약 칩 갱신

  renderActiveFilterBar();



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

        TRANSFERS = oldData;

        if($("#transfersModal") && !$("#transfersModal").classList.contains("hidden")) window.renderTransfersList();

        else alert("이동 요청이 삭제되었습니다.");

    } catch(e) { alert("삭제 실패"); }

};



window._trFilter = window._trFilter || 'unconfirmed';



window.renderTransfers = () => {

    let listEl = $("#transfersList");

    if(!listEl) {

        const modal = document.createElement("div");

        modal.id = "transfersModal";

        modal.className = "modal-backdrop hidden fixed inset-0 flex items-center justify-center z-[99] p-4";

        modal.innerHTML = `

            <div class="modal-outer absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="this.closest('.modal-backdrop').classList.add('hidden')"></div>

            <div class="modal-content relative bg-white w-full max-w-lg mx-auto my-auto flex flex-col rounded-2xl overflow-hidden shadow-2xl z-10" style="max-height:90vh">

                <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">

                    <h2 class="font-black text-lg text-blue-800">🚚 RT 이동요청 목록</h2>

                    <div class="flex gap-2 items-center">

                        <button onclick="exportTransfersToExcel()" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-sm transition-colors flex items-center gap-1"><i data-lucide="download" class="w-3.5 h-3.5"></i> 엑셀</button>

                        <button onclick="deleteAllTransfers()" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-sm transition-colors flex items-center gap-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i> 전체삭제</button>

                        <button id="closeTransfers" class="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><i data-lucide="x" class="w-5 h-5 text-gray-500"></i></button>

                    </div>

                </div>

                <div class="px-4 py-2.5 border-b border-gray-100 flex gap-2 bg-white shrink-0" id="trFilterBar">

                    <button onclick="window._trFilter='unconfirmed';window.renderTransfersList()" id="trFilterUnconfirmed" class="px-3 py-1.5 rounded-lg text-xs font-black border transition-colors">미확인목록</button>

                    <button onclick="window._trFilter='confirmed';window.renderTransfersList()" id="trFilterConfirmed" class="px-3 py-1.5 rounded-lg text-xs font-black border transition-colors">확인목록</button>

                    <button onclick="window._trFilter='all';window.renderTransfersList()" id="trFilterAll" class="px-3 py-1.5 rounded-lg text-xs font-black border transition-colors">전체</button>

                </div>

                <div id="transfersList" class="p-4 overflow-y-auto flex-1 bg-gray-50 space-y-3"></div>

            </div>`;

        document.body.appendChild(modal);

        $("#closeTransfers").onclick = () => modal.classList.add("hidden");

        listEl = $("#transfersList");

    }

    $("#transfersModal").classList.remove("hidden");

    window.renderTransfersList();

};



window.renderTransfersList = () => {

    const listEl = $("#transfersList");

    if(!listEl) return;

    // 필터 버튼 스타일

    [['trFilterUnconfirmed','unconfirmed'],['trFilterConfirmed','confirmed'],['trFilterAll','all']].forEach(([id, val]) => {

        const btn = document.getElementById(id);

        if(!btn) return;

        btn.className = window._trFilter === val

            ? "px-3 py-1.5 rounded-lg text-xs font-black border transition-colors bg-blue-700 text-white border-blue-700"

            : "px-3 py-1.5 rounded-lg text-xs font-black border transition-colors bg-white text-gray-600 border-gray-200 hover:bg-gray-50";

    });

    let filtered = TRANSFERS.slice().reverse();

    if(window._trFilter === 'unconfirmed') filtered = filtered.filter(t => !t.confirmed);

    else if(window._trFilter === 'confirmed') filtered = filtered.filter(t => !!t.confirmed);

    if(filtered.length === 0) {

        const msg = window._trFilter === 'unconfirmed' ? '미확인 이동 요청이 없습니다 ✅'

                  : window._trFilter === 'confirmed' ? '확인된 이동 요청이 없습니다.'

                  : '이동 요청이 없습니다.';

        listEl.innerHTML = `<div class='text-center py-10 text-gray-400 font-bold text-sm'>${msg}</div>`;

        return;

    }

    let html = "";

    filtered.forEach(t => {

        const confirmed = !!t.confirmed;

        html += `

        <div class="p-4 bg-white rounded-xl border ${confirmed ? 'border-gray-100 opacity-55' : 'border-blue-100'} text-sm shadow-sm relative">

            <button onclick="deleteTransfer('${t.id}')" class="absolute top-3 right-3 text-gray-300 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>

            <div class="flex justify-between items-center mb-1.5 pr-8">

                <span class="font-black text-blue-700 text-base">${escapeHtml(t.code)}</span>

                <span class="text-xs text-gray-400">${escapeHtml(t.date)}</span>

            </div>

            <div class="font-bold text-gray-800 mb-2.5 text-[15px] line-clamp-2">${escapeHtml(t.product)}</div>

            <div class="flex flex-wrap gap-2 text-xs font-bold text-gray-600 mb-2.5">

                <span class="bg-gray-100 px-2.5 py-1 rounded">사이즈: ${escapeHtml(t.size)}</span>

                <span class="bg-gray-100 px-2.5 py-1 rounded">수량: <span class="text-blue-600">${t.qty}개</span></span>

                ${confirmed ? '<span class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded font-black">✅ 확인완료</span>' : ''}

            </div>

            <div class="text-blue-900 bg-blue-50 p-2.5 rounded-lg font-medium text-[13px] mb-3">${escapeHtml(t.memo)}</div>

            ${!confirmed ? `<button onclick="confirmTransfer('${t.id}')" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg font-black text-sm transition-colors">✅ 확인</button>` : ''}

        </div>`;

    });

    listEl.innerHTML = html;

    if(window.lucide) lucide.createIcons();

};



window.confirmTransfer = async (trId) => {

    if(!checkPat()) return;

    try {

        const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${TRANSFERS_PATH}`;

        const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}});

        const j = await r.json();

        let data = JSON.parse(decodeURIComponent(escape(atob(j.content))));

        const idx = data.findIndex(m => m.id === trId);

        if(idx >= 0) data[idx].confirmed = true;

        const body = { message:"confirm transfer", content: utf8ToB64(JSON.stringify(data, null, 2)), branch: GH.branch, sha: j.sha };

        await fetch(apiBase, { method:"PUT", headers:{Authorization:"Bearer "+getPat(),"Content-Type":"application/json"}, body: JSON.stringify(body) });

        TRANSFERS = data;

        window.renderTransfersList();

    } catch(e) { alert("처리 실패: " + e.message); }

};



window.deleteAllTransfers = async () => {

    if(!checkPat()) return;

    const unconfirmedCount = TRANSFERS.filter(t => !t.confirmed).length;

    const confirmedCount = TRANSFERS.filter(t => !!t.confirmed).length;

    const msg = `전체 삭제하시겠습니까?\n\n• 미확인: ${unconfirmedCount}건\n• 확인완료: ${confirmedCount}건\n\n총 ${TRANSFERS.length}건이 삭제됩니다.`;

    if(!confirm(msg)) return;

    try {

        const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${TRANSFERS_PATH}`;

        const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}});

        const j = await r.json();

        const body = { message:"delete all transfers", content: utf8ToB64(JSON.stringify([], null, 2)), branch: GH.branch, sha: j.sha };

        await fetch(apiBase, { method:"PUT", headers:{Authorization:"Bearer "+getPat(),"Content-Type":"application/json"}, body: JSON.stringify(body) });

        TRANSFERS = [];

        window.renderTransfersList();

    } catch(e) { alert("삭제 실패: " + e.message); }

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

          // 부산점 카운팅: '부산(김종훈)'과 '부산' 키가 동시에 있으면 최대값만 (중복 방지)

          const sd = dayData[size];

          const busanKJ = sd['부산(김종훈)'] || 0;

          const busanPOS = sd['부산'] || 0;

          qty += Math.max(busanKJ, busanPOS);

        } else { qty += (dayData[size]||0); } // 담당자 구분 없는 구형 데이터는 그대로 포함

      }

    }

    all += qty;

    if(diffDays <= 30) d30 += qty;

    if(diffDays <= 7) d7 += qty;

  }

  const avgDay = Math.round((d30/30)*10)/10;

  const speed = d7 >= 3 ? 'hot' : d7 >= 1 ? 'normal' : all > 0 ? 'slow' : 'none';

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

        ${p.sizes.filter(s => s.busan > 0 || s.center > 0 || s.sinsa > 0).map(s => {

            let centerRtBtn = s.center > 0

                ? `<button onclick="quickRT('${p.품번}','${s.size}','물류',1,this)" class="bg-gray-800 hover:bg-black text-white py-2 rounded-lg flex items-center justify-center w-full transition-colors shadow-sm"><i data-lucide="arrow-left-right" class="w-4 h-4"></i></button>`

                : `<button disabled class="bg-gray-50 text-gray-300 py-2 rounded-lg w-full flex items-center justify-center cursor-not-allowed border border-gray-100"><i data-lucide="minus" class="w-4 h-4"></i></button>`;



            let sinsaRtBtn = s.sinsa > 0

                ? `<button onclick="quickRT('${p.품번}','${s.size}','신사',1,this)" class="bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg flex items-center justify-center w-full transition-colors shadow-sm"><i data-lucide="arrow-left-right" class="w-4 h-4"></i></button>`

                : `<button disabled class="bg-gray-50 text-gray-300 py-2 rounded-lg w-full flex items-center justify-center cursor-not-allowed border border-gray-100"><i data-lucide="minus" class="w-4 h-4"></i></button>`;



            return `<tr class="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 ${s.busan===0?'bg-red-50/40':''}">

                <td class="py-3 px-2 font-black text-center border-r border-gray-50 text-[15px]">${s.size}</td>

                <td class="py-3 px-2 font-black text-center bg-blue-50/30 border-r border-gray-50 text-[15px] ${s.busan>0?'text-blue-600':'text-gray-300'}">${s.busan>0?s.busan:'-'}</td>

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

  

  const _memoStaffList = ["김종훈","김기태","김민정","임경준","박서영"];
  const _lastStaff = localStorage.getItem('rcm_last_memo_staff') || "";

  let stickyFooterHtml = `

      <div class="flex gap-1.5 items-center">

          <select id="memoStaff" class="ipt text-xs font-bold bg-white px-2 py-1.5 rounded-lg border border-gray-200 shrink-0" style="width:5.5rem">

              <option value="" disabled ${_lastStaff ? '' : 'selected'}>작성자</option>

              ${_memoStaffList.map(s => `<option value="${s}" ${s === _lastStaff ? 'selected' : ''}>${s}</option>`).join('')}

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



  if (checkAdminSession()) {

      const targetUrl = p.shopNo ? `https://racement.co.kr/product-detail?productNo=${p.shopNo}` : "";

      const linkHtml = p.shopNo ? `<a href="${targetUrl}" target="_blank" class="text-[11px] text-blue-600 hover:underline font-bold shrink-0">자사몰</a>` : '';

      stickyFooterHtml += `

          <div class="flex items-center gap-1 pt-1.5 border-t border-gray-100 mt-1">

              <span class="text-[11px] font-bold text-gray-400 shrink-0">🖼️</span>

              <a href="https://www.google.com/search?q=${encodeURIComponent((p.브랜드||'')+' '+(p.품번||'')+' '+(p.품명||''))}&tbm=isch" target="_blank" class="px-2 py-1.5 text-xs font-black bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg shrink-0 no-underline" title="구글 이미지 검색">🔍G</a>

              <a href="https://search.shopping.naver.com/search/all?query=${encodeURIComponent((p.브랜드||'')+' '+(p.품번||''))}" target="_blank" class="px-2 py-1.5 text-xs font-black bg-green-50 hover:bg-green-100 text-green-600 rounded-lg shrink-0 no-underline" title="네이버쇼핑 검색">🔍N</a>

              <input type="text" id="quickImgUrl" class="ipt flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 mono min-w-0" placeholder="Ctrl+V로 이미지 붙여넣기">

              <label class="px-2 py-1.5 text-xs font-black bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg shrink-0 cursor-pointer" title="파일 선택">📁<input type="file" id="quickImgFile" accept="image/*" class="hidden"></label>

              <label class="px-2 py-1.5 text-xs font-black bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg shrink-0 cursor-pointer" title="카메라로 촬영">📷<input type="file" id="quickImgCamera" accept="image/*" capture="environment" class="hidden"></label>

              <button id="quickImgSave" class="px-3 py-1.5 text-xs font-black bg-gray-700 hover:bg-black text-white rounded-lg shrink-0">저장</button>

              ${linkHtml}

          </div>

          <div id="quickImgDrop" class="mt-1 border-2 border-dashed border-gray-200 rounded-lg text-center text-[11px] text-gray-400 py-2 cursor-pointer hover:border-blue-300 hover:text-blue-400 transition-colors">이미지 드래그하여 놓기 (또는 클릭하여 파일 선택)</div>

          <div id="quickImgMsg" class="text-[11px] font-bold h-3 mt-0.5"></div>

      `;

  }



  let modalContentWrap = $("#detailModal .modal-content");

  if(!modalContentWrap) {

      modalContentWrap = document.createElement("div");

      modalContentWrap.className = "modal-content relative bg-white w-[96%] max-w-2xl mx-auto my-auto flex flex-col rounded-2xl overflow-hidden shadow-2xl z-10 max-h-[88vh]";

      $("#detailModal").className = "modal-backdrop hidden fixed inset-0 flex items-center justify-center z-[9999] p-4 bg-black/60";

      $("#detailModal").innerHTML = `<div class="modal-outer absolute inset-0 cursor-pointer" onclick="this.closest('.modal-backdrop').classList.add('hidden');document.body.style.overflow=''"></div>`;

      $("#detailModal").appendChild(modalContentWrap);

  }



  modalContentWrap.innerHTML = `

      <div class="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 shadow-sm z-10">

          <div id="detailHead" class="flex-1 min-w-0 pr-2"></div>

          <button id="closeDetail" class="p-1.5 text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full shrink-0 transition-colors" onclick="this.closest('.modal-backdrop').classList.add('hidden');document.body.style.overflow=''"><i data-lucide="x" class="w-5 h-5"></i></button>

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



  // ── 사이즈별 30일 판매량 계산 (부산 / 부산제외 분리) ───────────────────

  const _sizeSales30Busan = {};  // 부산 전용

  const _sizeSales30Etc   = {};  // 부산 제외 (신사, 물류 등)

  const _sizeSalesToday = {};

  if (SALES_HISTORY && SALES_HISTORY.items && SALES_HISTORY.items[p.품번]) {

    const _sh = SALES_HISTORY.items[p.품번];

    const _today = new Date(); _today.setHours(0,0,0,0);

    const _todayKey = `${_today.getFullYear()}-${String(_today.getMonth()+1).padStart(2,'0')}-${String(_today.getDate()).padStart(2,'0')}`;

    for (let date in _sh) {

      const diffDays = Math.floor((_today - new Date(date)) / 86400000);

      if (diffDays > 30) continue;

      const dayData = _sh[date];

      if (typeof dayData === 'object') {

        for (let size in dayData) {

          if (typeof dayData[size] === 'object') {

            const sd = dayData[size];

            // 부산 중복 방지: '부산(김종훈)'과 '부산' 키 동시 존재 시 최대값만 카운트

            const bq = Math.max(sd['부산(김종훈)'] || 0, sd['부산'] || 0);

            if (bq > 0) {

              _sizeSales30Busan[size] = (_sizeSales30Busan[size] || 0) + bq;

              if (date === _todayKey) {

                _sizeSalesToday[size] = (_sizeSalesToday[size] || 0) + bq;

              }

            }

            for (let mgr in sd) {

              const qty = sd[mgr] || 0;

              if (!mgr.includes("김종훈") && !mgr.includes("부산")) {

                // 부산 제외 (신사, 물류 등)

                _sizeSales30Etc[size] = (_sizeSales30Etc[size] || 0) + qty;

              }

            }

          } else {

            // 담당자 구분 없는 구형 데이터 → 부산제외에 포함

            const qty = dayData[size] || 0;

            _sizeSales30Etc[size] = (_sizeSales30Etc[size] || 0) + qty;

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

            <th class="py-2 px-2 text-center w-[15%] border-r border-gray-100">사이즈</th>

            <th class="py-2 px-1 text-center w-[12%] text-blue-700 bg-blue-50/60 border-r border-gray-100">🏪 부산<br><span class="font-normal text-[10px] text-blue-400">30일</span></th>

            <th class="py-2 px-1 text-center w-[12%] text-indigo-600 bg-indigo-50/60 border-r border-gray-100">🏬 타지점<br><span class="font-normal text-[10px] text-indigo-400">30일</span></th>

            <th class="py-2 px-1 text-center w-[12%] text-blue-700 bg-blue-50/60 border-r border-gray-100">부산<br><span class="font-normal text-[10px] text-blue-400">재고</span></th>

            <th class="py-2 px-2 text-center border-r border-gray-100">물류 RT <span class="text-gray-400 font-normal">(${p.centerTotal})</span></th>

            <th class="py-2 px-2 text-center">신사 RT <span class="text-gray-400 font-normal">(${p.sinsaTotal})</span></th>

            </tr>

        </thead>

        <tbody>

        ${p.sizes.filter(s => s.busan > 0 || s.center > 0 || s.sinsa > 0).map(s => {

            const _s30b = _sizeSales30Busan[s.size] || 0;

            const _s30a = _sizeSales30Etc[s.size] || 0;

            let centerRtBtn = s.center > 0

                ? `<button onclick="quickRT('${p.품번}','${s.size}','물류',1,this)" class="bg-gray-700 hover:bg-black text-white py-1 px-2 rounded-md flex items-center justify-center w-full transition-colors gap-1 text-xs font-black"><i data-lucide="arrow-left-right" class="w-3 h-3 shrink-0"></i>${s.center}</button>`

                : `<span class="text-gray-300 text-sm">-</span>`;

            let sinsaRtBtn = s.sinsa > 0

                ? `<button onclick="quickRT('${p.품번}','${s.size}','신사',1,this)" class="bg-orange-500 hover:bg-orange-600 text-white py-1 px-2 rounded-md flex items-center justify-center w-full transition-colors gap-1 text-xs font-black"><i data-lucide="arrow-left-right" class="w-3 h-3 shrink-0"></i>${s.sinsa}</button>`

                : `<span class="text-gray-300 text-sm">-</span>`;

            return `<tr class="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 ${s.busan===0?'bg-amber-50/60':''}">

                <td class="py-1.5 px-2 font-black text-center border-r border-gray-100 text-sm">${s.size}</td>

                <td class="py-1.5 px-1 font-bold text-center bg-blue-50/30 border-r border-gray-100 text-sm ${_s30b>0?'text-blue-700':'text-gray-300'}">${_s30b>0?_s30b:'-'}</td>

                <td class="py-1.5 px-1 font-bold text-center bg-indigo-50/30 border-r border-gray-100 text-sm ${_s30a>0?'text-indigo-500':'text-gray-300'}">${_s30a>0?_s30a:'-'}</td>

                <td class="py-1 px-1 text-center bg-blue-50/30 border-r border-gray-100">

                    <div class="flex flex-col items-center leading-none gap-0.5">

                        <span class="font-black text-base ${s.busan>0?'text-blue-600':'text-gray-300'}">${s.busan>0?s.busan:'-'}</span>

                        ${(_sizeSalesToday[s.size]||0)>0?`<span class="text-orange-500 text-[10px] font-bold leading-none">-${_sizeSalesToday[s.size]}↓</span>`:''}

                    </div>

                </td>

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

  const _heatLabel = !_hasData ? '데이터 없음' : _sales.d7 >= 3 ? '🔥 핫셀러' : _sales.d7 >= 1 ? '📈 보통' : '📦 저조';

  const _heatColor = !_hasData ? 'text-gray-400' : _sales.d7 >= 3 ? 'text-red-500' : _sales.d7 >= 1 ? 'text-blue-500' : 'text-gray-400';

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



  // ── DP 관리 패널 ────────────────────────────────────────────────────

  const _dpSizesModal = getDPSizes(p.품번);

  const _dpDiv = document.createElement("div");

  _dpDiv.className = "px-3 pb-3";

  _dpDiv.id = "dpPanel";

  const _renderDPPanel = () => {

    const dpSizes = getDPSizes(p.품번);

    const sizeCheckboxes = p.sizes.map(s => {

      const sz = String(s.size).trim();

      const isDPed = dpSizes.includes(sz);

      const isSoldOut = s.busan <= 0;

      let btnCls = isDPed

        ? (isSoldOut ? "bg-orange-100 border-orange-400 text-orange-700" : "bg-violet-600 border-violet-600 text-white")

        : "bg-white border-gray-200 text-gray-500 hover:border-violet-400 hover:text-violet-600";

      const icon = isDPed ? (isSoldOut ? "⚠️" : "🏷️") : "□";

      const soldLabel = (isSoldOut && isDPed) ? ` <span class="text-[9px] opacity-70">품절</span>` : "";

      return `<button onclick="window._toggleDPBtn(this,'${p.품번}','${sz}')"

        class="dp-size-btn px-3 py-1.5 rounded-lg border-2 font-black text-xs transition-all ${btnCls}"

        data-dp-size="${sz}" data-code="${p.품번}" data-active="${isDPed?'1':'0'}">

        ${icon} ${sz}${soldLabel}

      </button>`;

    }).join('');

    _dpDiv.innerHTML = `

      <div class="rounded-xl border border-violet-200 bg-violet-50 p-3">

        <div class="flex items-center justify-between mb-2.5">

          <span class="text-xs font-black text-violet-700 flex items-center gap-1.5">🏷️ DP 관리

            <span class="text-[10px] font-normal text-violet-400">눌러서 등록/해제</span>

          </span>

          <span id="dpStatusLabel" class="text-[11px] font-black px-2 py-0.5 rounded ${dpSizes.length > 0 ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-400'}">

            ${dpSizes.length > 0 ? `🏷️ DP 중: ${dpSizes.join('·')}` : '미DP'}

          </span>

        </div>

        <div class="flex flex-wrap gap-2" id="dpSizeBtns">${sizeCheckboxes}</div>

      </div>`;

  };

  _renderDPPanel();

  window._dpRenderFn = _renderDPPanel;

  $("#detailBody").appendChild(_dpDiv);



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

          let _memoRes = await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });

          // PUT 충돌(409/422) 시 최신 SHA로 1회 retry
          if(_memoRes.status === 409 || _memoRes.status === 422) {
              const r2 = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}});
              if(r2.ok){ const j2=await r2.json(); body.sha=j2.sha; }
              _memoRes = await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
          }
          if(!_memoRes.ok) throw new Error('저장 실패 ' + _memoRes.status);

          MEMOS = oldData; CURRENT_PRODUCT.hasMemo = true;

          localStorage.setItem('rcm_last_memo_staff', staff);

          msg.style.color="green"; msg.textContent="✓ 저장 완료!"; $("#memoText").value = ""; render(); openDetail(p);

      } catch(e) { msg.style.color="red"; msg.textContent="메모 저장 실패!"; }

  };



  if ($("#quickImgSave")) {

      const msgEl = $("#quickImgMsg");
      const imgKey = p.shopNo || p.품번;
      const safeKey = String(imgKey).replace(/[^a-zA-Z0-9_\-]/g, '_');
      const pat = getPat();
      const ghBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}`;
      const pagesBase = `https://${GH.owner}.github.io/${GH.repo}/product-images`;

      async function uploadAndSave(imgB64, ext, tempUrl) {
          msgEl.style.color = ""; msgEl.textContent = "GitHub에 업로드 중...";
          const imgPath = `product-images/${safeKey}.${ext}`;
          const imgFileApi = `${ghBase}/contents/${imgPath}`;
          const existRes = await fetch(imgFileApi + `?t=${Date.now()}`, {headers:{Authorization:"Bearer "+pat}});
          const existSha = existRes.ok ? (await existRes.json()).sha : undefined;
          const imgPutRes = await fetch(imgFileApi, {
              method:"PUT",
              headers:{Authorization:"Bearer "+pat, "Content-Type":"application/json"},
              body: JSON.stringify({message:`image: ${imgKey}`, content: imgB64, branch: GH.branch, ...(existSha && {sha:existSha})})
          });
          if(!imgPutRes.ok) throw new Error(`이미지 업로드 실패 (${imgPutRes.status})`);
          const finalUrl = `${pagesBase}/${safeKey}.${ext}`;
          msgEl.textContent = "images.json 업데이트 중...";
          const apiBase = `${ghBase}/contents/images.json`;
          const metaRes = await fetch(apiBase + `?t=${Date.now()}`, {headers:{Authorization:"Bearer "+pat}});
          if(!metaRes.ok) throw new Error(`images.json 조회 실패 (${metaRes.status})`);
          const meta = await metaRes.json();
          let latestImages = {};
          try { latestImages = JSON.parse(atob(meta.content.replace(/\n/g,''))); } catch(e) {}
          latestImages[imgKey] = finalUrl;
          const putRes = await fetch(apiBase, {
              method:"PUT",
              headers:{Authorization:"Bearer "+pat, "Content-Type":"application/json"},
              body: JSON.stringify({message:`image: ${imgKey}`, content: utf8ToB64(JSON.stringify(latestImages)), branch: GH.branch, sha: meta.sha})
          });
          if(!putRes.ok) throw new Error(`images.json 저장 실패 (${putRes.status})`);
          IMAGES = { ...latestImages };
          // GitHub Pages 서빙 딜레이 동안 blob URL로 즉시 표시
          if(tempUrl) IMAGES[imgKey] = tempUrl;
          sessionStorage.removeItem(CACHE_KEY);
          msgEl.style.color = "green";
          msgEl.textContent = "✓ 저장 완료! (GitHub Pages에 영구 보관)";
          render();
          setTimeout(()=>{ openDetail(p); }, 600);
      }

      function fileToB64(file) {
          return new Promise((resolve, reject) => {
              const ext = file.type.includes('png')?'png':file.type.includes('webp')?'webp':file.type.includes('gif')?'gif':'jpg';
              const reader = new FileReader();
              reader.onload = e => resolve({b64: e.target.result.split(',')[1], ext});
              reader.onerror = reject;
              reader.readAsDataURL(file);
          });
      }

      async function handleFile(file) {
          if(!file || !file.type.startsWith('image/')) return;
          if(!checkPat()) return;
          msgEl.style.color = ""; msgEl.textContent = "파일 읽는 중...";
          try {
              const {b64, ext} = await fileToB64(file);
              const tempUrl = URL.createObjectURL(file);
              await uploadAndSave(b64, ext, tempUrl);
          } catch(err) {
              delete IMAGES[p.shopNo || p.품번];
              msgEl.style.color = "red"; msgEl.textContent = "❌ 저장 실패: " + err.message;
          }
      }

      // URL 저장 버튼
      $("#quickImgSave").onclick = async () => {
          if(!checkPat()) return;
          const inputUrl = $("#quickImgUrl").value.trim(); if (!inputUrl) return;
          msgEl.style.color = ""; msgEl.textContent = "이미지 다운로드 중...";
          try {
              let imgB64 = null, ext = 'jpg';
              try {
                  const imgResp = await fetch(inputUrl, {mode:'cors'});
                  if(imgResp.ok) {
                      const ct = imgResp.headers.get('Content-Type') || '';
                      ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : ct.includes('gif') ? 'gif' : 'jpg';
                      const buf = await imgResp.arrayBuffer();
                      const bytes = new Uint8Array(buf);
                      let binary = '';
                      for(let i=0;i<bytes.byteLength;i++) binary += String.fromCharCode(bytes[i]);
                      imgB64 = btoa(binary);
                  }
              } catch(e) {}
              if(imgB64) {
                  await uploadAndSave(imgB64, ext);
              } else {
                  msgEl.textContent = "images.json 업데이트 중...";
                  const apiBase = `${ghBase}/contents/images.json`;
                  const metaRes = await fetch(apiBase + `?t=${Date.now()}`, {headers:{Authorization:"Bearer "+pat}});
                  if(!metaRes.ok) throw new Error(`images.json 조회 실패 (${metaRes.status})`);
                  const meta = await metaRes.json();
                  let latestImages = {};
                  try { latestImages = JSON.parse(atob(meta.content.replace(/\n/g,''))); } catch(e) {}
                  latestImages[imgKey] = inputUrl;
                  const putRes = await fetch(apiBase, {
                      method:"PUT",
                      headers:{Authorization:"Bearer "+pat, "Content-Type":"application/json"},
                      body: JSON.stringify({message:`image: ${imgKey}`, content: utf8ToB64(JSON.stringify(latestImages)), branch: GH.branch, sha: meta.sha})
                  });
                  if(!putRes.ok) throw new Error(`images.json 저장 실패 (${putRes.status})`);
                  IMAGES = { ...latestImages };
                  sessionStorage.removeItem(CACHE_KEY);
                  msgEl.style.color = "green";
                  msgEl.textContent = "✓ 저장 완료! (URL 저장 — CORS 제한)";
                  render();
                  setTimeout(()=>{ openDetail(p); }, 600);
              }
          } catch(err) {
              delete IMAGES[p.shopNo || p.품번];
              msgEl.style.color = "red"; msgEl.textContent = "❌ 저장 실패: " + err.message;
          }
      };

      // 파일 선택 버튼
      const fileInput = $("#quickImgFile");
      if(fileInput) fileInput.onchange = (e) => handleFile(e.target.files[0]);

      const cameraInput = $("#quickImgCamera");
      if(cameraInput) cameraInput.onchange = (e) => handleFile(e.target.files[0]);

      // 드래그 앤 드롭 + 클릭
      const dropZone = $("#quickImgDrop");
      if(dropZone) {
          dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('!border-blue-400','!text-blue-500','bg-blue-50'); };
          dropZone.ondragleave = () => dropZone.classList.remove('!border-blue-400','!text-blue-500','bg-blue-50');
          dropZone.ondrop = (e) => {
              e.preventDefault();
              dropZone.classList.remove('!border-blue-400','!text-blue-500','bg-blue-50');
              handleFile(e.dataTransfer.files[0]);
          };
          dropZone.onclick = () => { if(fileInput) fileInput.click(); };
      }

      // Ctrl+V 클립보드 붙여넣기 (이미지인 경우)
      const urlInput = $("#quickImgUrl");
      if(urlInput) urlInput.addEventListener('paste', (e) => {
          const items = e.clipboardData?.items;
          if(!items) return;
          for(const item of items) {
              if(item.type.startsWith('image/')) {
                  e.preventDefault();
                  handleFile(item.getAsFile());
                  return;
              }
          }
      });

  }



  $("#detailModal").classList.remove("hidden"); document.body.style.overflow="hidden";

  if(window.lucide) lucide.createIcons();

}



document.addEventListener("click", (e) => {

    if (e.target.classList.contains("modal-outer")) e.target.closest('.modal-backdrop').classList.add("hidden");

});



$$('button[id^="close"]').forEach(btn => {

    btn.addEventListener("click", (e) => { e.target.closest('.modal-backdrop').classList.add("hidden"); });

});



// 적용된 필터 요약 칩 바 — 켜진 필터를 한눈에 보여주고 ✕로 개별 해제
function renderActiveFilterBar() {
    const bar = $("#activeFilterBar");
    if (!bar) return;

    const items = []; // {label, onClear}

    // 카테고리 (전체 제외)
    const catBtn = $$('button.chip[data-cat]').find(b => b.dataset.active === "1");
    if (catBtn && catBtn.dataset.cat !== "ALL") {
        items.push({ label: catBtn.textContent.trim(), onClear: () => {
            $$('button.chip[data-cat]').forEach(x => x.dataset.active = (x.dataset.cat === "ALL" ? "1" : "0"));
        }});
    }
    // 성별 (전체 제외)
    const genBtn = $$('button.chip[data-gender]').find(b => b.dataset.active === "1");
    if (genBtn && genBtn.dataset.gender !== "ALL") {
        items.push({ label: genBtn.textContent.trim(), onClear: () => {
            $$('button.chip[data-gender]').forEach(x => x.dataset.active = (x.dataset.gender === "ALL" ? "1" : "0"));
        }});
    }
    // 일반 필터칩 (단일·다중)
    $$('button.chip[data-fav], button.chip[data-stock], button.chip[data-memo], button.chip[data-salesspeed], button.chip[data-rtchance], button.chip[data-busanonly], button.chip[data-todaysold], button.chip[data-dp], button.chip[data-noimage], button.chip[data-nobarcode]').forEach(btn => {
        if (btn.dataset.active === "1") {
            items.push({ label: btn.textContent.trim(), onClear: () => {
                btn.dataset.active = "0";
                btn.classList.remove('ring-2', 'ring-blue-400', 'ring-orange-400', 'ring-violet-400', 'ring-gray-400', 'ring-amber-400');
            }});
        }
    });
    // 브랜드 (다중)
    if (window._activeBrands && window._activeBrands.size > 0) {
        [...window._activeBrands].forEach(brand => {
            items.push({ label: brand, onClear: () => {
                window._activeBrands.delete(brand);
                if (window._renderBrandChips) window._renderBrandChips();
            }});
        });
    }
    // 사이즈
    [["sizeSelFw", "신발"], ["sizeSelAp", "의류"], ["sizeSelGear", "용품"]].forEach(([id]) => {
        const sel = $("#" + id);
        if (sel && sel.value !== "ALL") {
            items.push({ label: `사이즈 ${sel.value}`, onClear: () => { sel.value = "ALL"; }});
        }
    });
    // 검색어
    const qEl = $("#q");
    if (qEl && qEl.value.trim()) {
        items.push({ label: `"${qEl.value.trim()}"`, onClear: () => { qEl.value = ""; }});
    }

    if (items.length === 0) { bar.classList.add("hidden"); bar.innerHTML = ""; return; }

    bar.classList.remove("hidden");
    bar.innerHTML = "";

    const lead = document.createElement("span");
    lead.className = "text-[10px] font-bold text-[color:var(--muted)] shrink-0 self-center";
    lead.textContent = "적용된 필터";
    bar.appendChild(lead);

    items.forEach(it => {
        const chip = document.createElement("button");
        chip.className = "inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold shrink-0 hover:bg-blue-100 transition-colors";
        chip.innerHTML = `${escapeHtml(it.label)} <span class="text-blue-400 font-black">✕</span>`;
        chip.onclick = () => { saveHistoryState(); it.onClear(); visibleCount = 60; render(); };
        bar.appendChild(chip);
    });

    if (items.length >= 2) {
        const clearAll = document.createElement("button");
        clearAll.className = "inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-800 text-white text-[11px] font-bold shrink-0 hover:bg-black transition-colors ml-1";
        clearAll.textContent = "전체 해제 ↺";
        clearAll.onclick = () => { const r = $("#resetAll"); if (r) r.click(); };
        bar.appendChild(clearAll);
    }
}


// 필터 칩 전체 해제 헬퍼 (카테고리·성별·브랜드 제외, 단일선택 그룹)

function _clearAllFilterChips() {

    $$('button.chip[data-fav], button.chip[data-stock], button.chip[data-memo], button.chip[data-salesspeed], button.chip[data-rtchance]').forEach(x => x.dataset.active = "0");

    const bb = $('button.chip[data-busanonly]');

    if (bb) { bb.dataset.active = "0"; bb.classList.remove('ring-2','ring-blue-400'); }

    const tb = $('button.chip[data-todaysold]');

    if (tb) { tb.dataset.active = "0"; tb.classList.remove('ring-2','ring-orange-400'); }

}



$$('button.chip[data-cat], button.chip[data-gender], button.chip[data-fav], button.chip[data-stock], button.chip[data-memo], button.chip[data-busanonly], button.chip[data-salesspeed], button.chip[data-rtchance]').forEach(b=>b.addEventListener("click",()=>{

    saveHistoryState();

    if(b.dataset.cat) {

        // 카테고리: 단일선택 (성별과 조합 가능)

        $$('button.chip[data-cat]').forEach(x=>x.dataset.active=(x===b?"1":"0"));

    } else if(b.dataset.gender) {

        // 성별: 단일선택 (카테고리와 조합 가능)

        $$('button.chip[data-gender]').forEach(x=>x.dataset.active=(x===b?"1":"0"));

    } else {

        // 나머지 필터칩: 단일선택 (하나만 활성화)

        const isActive = b.dataset.active === "1";

        _clearAllFilterChips();

        if (!isActive) {

            b.dataset.active = "1";

            if(b.dataset.busanonly) b.classList.add('ring-2', 'ring-blue-400');

        }

    }

    visibleCount=60; render();

}));



$("#resetAll").onclick=()=>{

    saveHistoryState();

    $$('button.chip[data-cat]').forEach(b=>b.dataset.active=(b.dataset.cat==="ALL"?"1":"0"));

    $$('button.chip[data-gender]').forEach(b=>b.dataset.active=(b.dataset.gender==="ALL"?"1":"0"));

    $$('button.chip[data-fav], button.chip[data-stock], button.chip[data-memo], button.chip[data-salesspeed], button.chip[data-rtchance]').forEach(b=>b.dataset.active="0");

    window._activeBrands = new Set();

    if(window._renderBrandChips) window._renderBrandChips();

    if($("#brandSearch")) { $("#brandSearch").value = ""; }

    if($("#sortSel")) { $("#sortSel").value = "default"; }



    const busanOnlyBtn = $('button.chip[data-busanonly]');

    if(busanOnlyBtn) { busanOnlyBtn.dataset.active = "0"; busanOnlyBtn.classList.remove('ring-2', 'ring-blue-400'); }

    const todaySoldBtn = $('button.chip[data-todaysold]');

    if(todaySoldBtn) { todaySoldBtn.dataset.active = "0"; todaySoldBtn.classList.remove('ring-2', 'ring-orange-400'); }

    $$('button.chip[data-dp]').forEach(b => { b.dataset.active = "0"; b.classList.remove('ring-2','ring-violet-400','ring-orange-400'); });

    const noImgBtn = $('button.chip[data-noimage]');

    if(noImgBtn) { noImgBtn.dataset.active = "0"; noImgBtn.classList.remove('ring-2','ring-gray-400'); }

    const noBarcodeBtn = $('button.chip[data-nobarcode]');

    if(noBarcodeBtn) { noBarcodeBtn.dataset.active = "0"; noBarcodeBtn.classList.remove('ring-2','ring-amber-400'); }



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

            sessionStorage.setItem(CACHE_KEY, JSON.stringify({rows, meta, images:IMAGES, memos:MEMOS, transfers:TRANSFERS, promotions:PROMOTIONS, salesGuides:SALES_GUIDES, salesHistory:SALES_HISTORY, salesDeductions:SALES_DEDUCTIONS, displayItems:DISPLAY_ITEMS, _timestamp: Date.now()})); 

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

$("#pwdGo").onclick=()=>{ if($("#pwd").value===ADMIN_PWD){ setAdminSession(); applyDefaultPatIfNeeded(); $("#authPanel").classList.add("hidden"); $("#uploadPanel").classList.remove("hidden"); } else alert("비밀번호 오류"); };

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



                    // 반품/반입/취소 row는 판매 데이터에서 제외

                    if(typeStr && (typeStr.includes('반품') || typeStr.includes('반입') || typeStr.includes('취소') || typeStr.includes('환불'))) continue;



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

                                // Math.max 로 중복 업로드 방지 (같은 엑셀 2번 올려도 합산 안됨)

                                const existing = newItems[code][date][size][mgr] || 0;

                                const incoming = sessionData[code][date][size][mgr];

                                newItems[code][date][size][mgr] = Math.max(existing, incoming);

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



    const _promoList = getPromoList();

    card.onclick = null;



    // 기획전 목록 렌더

    let _listHtml = _promoList.length > 0 ? _promoList.map((pr, idx) =>

        `<div class="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">

            <div class="flex-1 min-w-0">

                <span class="font-bold text-gray-900 text-[13px]">🎁 ${escapeHtml(pr.meta?.name||'기획전')}</span>

                ${pr.meta?.period ? `<span class="text-[11px] text-purple-600 font-bold ml-1.5">${escapeHtml(pr.meta.period)}</span>` : ''}

                <span class="text-[11px] text-gray-400 ml-1">(${Object.keys(pr.items||{}).length}품번)</span>

            </div>

            <span class="end-promo-btn shrink-0 text-[11px] font-bold text-pink-600 bg-pink-50 px-2.5 py-1 rounded cursor-pointer hover:bg-pink-100 transition-colors" data-promoidx="${idx}">종료</span>

        </div>`

    ).join('') : `<div class="text-[12px] text-gray-400 py-1">진행 중인 기획전 없음</div>`;



    card.innerHTML = `

        <div class="flex-1 w-full cursor-default">

            <div class="flex items-center justify-between mb-2">

                <h4 class="m-0 text-gray-900 font-bold text-[14px]">🎁 기획전 관리</h4>

                <label for="promoFile" class="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded cursor-pointer hover:bg-purple-100 transition-colors shrink-0">+ 기획전 추가</label>

                <input type="file" id="promoFile" accept=".xlsx, .xls, .csv" class="hidden">

            </div>

            ${_listHtml}

        </div>

    `;



    // 종료 버튼 이벤트

    card.querySelectorAll('.end-promo-btn').forEach(btn => {

        btn.onclick = async (e) => {

            e.stopPropagation();

            if(!checkPat()) return;

            const idx = parseInt(btn.dataset.promoidx);

            const pName = _promoList[idx]?.meta?.name || '기획전';

            if(!confirm(`"${pName}"을(를) 종료하시겠습니까?`)) return;

            try {

                const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${PROMOTIONS_PATH}`;

                const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}});

                if(!r.ok) throw new Error(`GitHub 파일 조회 실패 (${r.status})`);

                const j = await r.json();

                let data = {};

                try { data = JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/[\s\n]/g, ''))))); }

                catch(e) { console.error('[기획전 종료] 파싱 실패:', e); throw new Error('기획전 데이터 파싱 실패: ' + e.message); }

                let list = Array.isArray(data.promotions) ? data.promotions : (data.meta ? [data] : []);

                if(idx >= list.length) throw new Error(`인덱스 오류: idx=${idx}, 목록 길이=${list.length}`);

                list.splice(idx, 1);

                const newData = list.length > 0 ? { promotions: list } : {};

                const body = { message:`end promotion: ${pName}`, content: utf8ToB64(JSON.stringify(newData, null, 2)), branch: GH.branch, sha: j.sha };

                const endRes = await fetch(apiBase, { method:"PUT", headers:{Authorization:"Bearer "+getPat(),"Content-Type":"application/json"}, body: JSON.stringify(body) });

                if(!endRes.ok) { const errJ = await endRes.json().catch(()=>({})); throw new Error(`GitHub 저장 실패 (${endRes.status}): ${errJ.message||''}`); }

                PROMOTIONS = newData; sessionStorage.removeItem(CACHE_KEY);

                rebuildIndex(); render(); setupQuickActionBar(); window.renderPromoAdmin();

                alert(`"${pName}" 기획전이 종료되었습니다.`);

            } catch(e) { alert("종료 실패: " + e.message); }

        };

    });



    // 파일 업로드 (기존 기획전에 추가)

    document.getElementById("promoFile").onchange = async (e) => {

        if(!checkPat()) { e.target.value = ""; return; }

        const f = e.target.files[0]; if(!f) return;

        const reader = new FileReader();

        reader.onload = async (ev) => {

            const wb = XLSX.read(new Uint8Array(ev.target.result), {type:"array"});

            // 기획전 할인 컬럼이 있는 시트를 자동 선택 (재고 시트가 첫 시트로 와도 대응)
            const _PROMO_COLS = ['최종할인가','기획전 할인가','최종 할인율','특가할인가','위클리특가'];
            let sheet = null;
            for(const sn of wb.SheetNames) {
                const _rr = XLSX.utils.sheet_to_json(wb.Sheets[sn], {header:1, defval:""});
                const _hasCode = _rr.some(r => r.some(c => String(c||"").trim()==='품번'));
                const _hasDisc = _rr.some(r => r.some(c => _PROMO_COLS.includes(String(c||"").trim())));
                if(_hasCode && _hasDisc) { sheet = wb.Sheets[sn]; break; }
            }
            if(!sheet) sheet = wb.Sheets[wb.SheetNames[0]];

            const rows = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ""});

            // ① 기획전명 기본값: 파일명 (확장자 제거)

            let promoName = f.name.replace(/\.(xlsx?|xls|csv)$/i, '').trim();

            let promoPeriod = "";

            for(let i=0; i<6; i++) {

                if(!rows[i]) continue;

                // 메타(기획전명/기간)는 시트에 따라 컬럼 위치가 달라 전체 셀 스캔
                for(const _cell of rows[i]) {

                    const col0 = String(_cell||"").trim();

                    if(!col0) continue;

                    // 명시적 기획전명 셀 우선

                    if(/기획전명/.test(col0)) promoName = col0.replace(/기획전명\s*:?\s*/,'').trim();

                    // 기간 파싱: "5.25~6.14" / "06/19 ~ 06/22" / "06/19(목) ~ 06/22(일), 4일간" 등 지원

                    if(/기간/.test(col0)) {

                        const pm = col0.match(/(\d{1,2}[\./]\d{1,2}).*?[~～\-].*?(\d{1,2}[\./]\d{1,2})/);

                        if(pm) {
                            const s = pm[1].replace('.','/');
                            const e = pm[2].replace('.','/');
                            promoPeriod = `${s}~${e}`;
                        } else {
                            promoPeriod = col0.replace(/\*?\s*기간\s*:?\s*/,'').trim();
                        }

                    }

                }

            }

            let items = {};

            let headerRowIdx = rows.findIndex(r => r.some(c => String(c||"").trim() === '품번'));

            if(headerRowIdx > -1) {

                const headers = rows[headerRowIdx].map(h => String(h||"").trim());

                const codeIdx = headers.indexOf('품번');

                const catIdx  = headers.indexOf('특가 카테고리');

                let wpIdx = headers.indexOf('위클리특가');
                if(wpIdx === -1) wpIdx = headers.indexOf('특가할인가');

                const wrIdx   = headers.indexOf('특가할인율');

                const fpIdx   = headers.indexOf('최종할인가');

                // 기획전/쿠폰 할인 컬럼
                const epIdx   = headers.indexOf('기획전 할인가');
                const erIdx   = headers.indexOf('기획전 할인율');
                const crIdx   = headers.indexOf('쿠폰 할인율');

                // 최종 할인율 컬럼: 다양한 컬럼명 지원

                let frIdx = headers.indexOf('최종 할인율');

                if(frIdx === -1) frIdx = headers.indexOf('쿠폰 할인율');

                if(frIdx === -1) frIdx = headers.indexOf('할인율');

                if(frIdx === -1) frIdx = headers.indexOf('할인');



                for(let i=headerRowIdx+1; i<rows.length; i++) {

                    const r = rows[i];

                    const code = String(r[codeIdx]||"").trim(); if(!code) continue;

                    let wRate = parseFloat(r[wrIdx])||0; if(wRate>1) wRate/=100;

                    let fRate = parseFloat(r[frIdx])||0; if(fRate>1) fRate/=100;

                    let eRate = parseFloat(r[erIdx])||0; if(eRate>1) eRate/=100;

                    let cRate = parseFloat(r[crIdx])||0; if(cRate>1) cRate/=100;

                    const fp = Number(String(r[fpIdx]||"").replace(/,/g,''))||null;

                    const ep = Number(String(r[epIdx]||"").replace(/,/g,''))||null;

                    items[code] = {

                        targetCat: String(r[catIdx]||"").trim().toUpperCase(),

                        weeklyPrice: Number(String(r[wpIdx]||"").replace(/,/g,''))||null,

                        weeklyRate: wRate,

                        finalPrice: fp,

                        finalRate: fRate,   // 가격 없을 때는 rate로 계산

                        eventPrice: ep,

                        eventRate: eRate,   // 기획전 할인율

                        couponRate: cRate   // 쿠폰 할인율

                    };

                }

            }

            const newPromo = { id: Date.now().toString(), meta: { name: promoName, period: promoPeriod }, items };

            try {

                const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${PROMOTIONS_PATH}`;

                let sha = null, existingList = [];

                try {

                    const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}});

                    if(r.ok) {

                        const j = await r.json(); sha = j.sha;

                        const data = JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/[\s\n]/g, '')))));

                        existingList = Array.isArray(data.promotions) ? data.promotions : (data.meta ? [data] : []);

                    }

                } catch(e) {}

                existingList.push(newPromo);

                const newData = { promotions: existingList };

                const body = { message:`add promotion: ${promoName}`, content: utf8ToB64(JSON.stringify(newData, null, 2)), branch: GH.branch };

                if(sha) body.sha = sha;

                const saveRes = await fetch(apiBase, { method:"PUT", headers:{Authorization:"Bearer "+getPat(),"Content-Type":"application/json"}, body: JSON.stringify(body) });

                if(!saveRes.ok) { const errJ = await saveRes.json().catch(()=>({})); throw new Error(`GitHub 저장 실패 (${saveRes.status}): ${errJ.message||''}`); }

                PROMOTIONS = newData; sessionStorage.removeItem(CACHE_KEY);

                rebuildIndex(); render(); setupQuickActionBar(); window.renderPromoAdmin();

                alert(`"${promoName}" 기획전 등록 완료! (${Object.keys(items).length}품번)`);

            } catch(err) { alert("업로드 실패: " + err.message); }

            document.getElementById("promoFile").value = "";

        };

        reader.readAsArrayBuffer(f);

    };

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

    // 사이즈 단위 토글 초기 상태 복원
    window.setSizeUnit(window.sizeUnit);



    // 🚚 상단 이동요청 버튼 복구

    if ($("#allMemosBtn") && !$("#allTransfersBtn")) {

        const trBtn = document.createElement("button");

        trBtn.id = "allTransfersBtn";

        trBtn.className = $("#allMemosBtn").className.replace(/yellow/g, 'blue');

        trBtn.innerHTML = `🚚<span class="hidden sm:inline"> 이동요청 목록</span>`;

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

    // 오늘 판매 필터 버튼

    if(stockBtn && !$('button.chip[data-todaysold]')) {

        const todayBtn = document.createElement("button");

        todayBtn.className = "chip !bg-orange-50 !text-orange-600 !border-orange-300 font-black";

        todayBtn.dataset.todaysold = "1";

        todayBtn.dataset.active = "0";

        todayBtn.innerHTML = "🛍️ 오늘 판매";

        stockBtn.parentNode.insertBefore(todayBtn, stockBtn.nextSibling);

        todayBtn.addEventListener("click", () => {

            saveHistoryState();

            todayBtn.dataset.active = todayBtn.dataset.active === "1" ? "0" : "1";

            if(todayBtn.dataset.active === "1") todayBtn.classList.add('ring-2', 'ring-orange-400');

            else todayBtn.classList.remove('ring-2', 'ring-orange-400');

            visibleCount=60; render();

        });

    }



    // ── DP 필터 칩 그룹 (전용 행에 배치) ─────────────────────────────

    const dpFilterRow = $("#dpFilterRow");

    if(dpFilterRow && !$('button.chip[data-dp="dp"]')) {

        dpFilterRow.classList.remove("hidden");

        const dpGroup = [

            { key: 'dp',     label: '🏷️ DP 중',   cls: '!bg-violet-50 !text-violet-700 !border-violet-300' },

            { key: 'nodp',   label: '🔲 미DP',      cls: '!bg-gray-50 !text-gray-600 !border-gray-300' },

            { key: 'soldDP', label: '⚠️ 품절DP',   cls: '!bg-orange-50 !text-orange-600 !border-orange-300' },

        ];

        dpGroup.forEach(({ key, label, cls }) => {

            const btn = document.createElement("button");

            btn.className = `chip ${cls} font-black`;

            btn.dataset.dp = key;

            btn.dataset.active = "0";

            btn.innerHTML = label;

            dpFilterRow.appendChild(btn);

            btn.addEventListener("click", () => {

                saveHistoryState();

                const alreadyActive = btn.dataset.active === "1";

                if (alreadyActive) {

                    btn.dataset.active = "0";

                    btn.classList.remove('ring-2','ring-violet-400','ring-orange-400');

                } else {

                    // DP 칩: 완전 단일선택 (3개 모두 상호 배타)

                    $$('button.chip[data-dp]').forEach(x => { x.dataset.active = "0"; x.classList.remove('ring-2','ring-violet-400','ring-orange-400'); });

                    btn.dataset.active = "1";

                    btn.classList.add('ring-2', key === 'soldDP' ? 'ring-orange-400' : 'ring-violet-400');

                }

                visibleCount=60; render();

            });

        });

    }



    // ── 이미지 없음 필터 칩 (DP 행에 함께) ───────────────────────────

    if(dpFilterRow && !$('button.chip[data-noimage]')) {

        const noImgBtn = document.createElement("button");

        noImgBtn.className = "chip !bg-gray-50 !text-gray-500 !border-gray-300 font-black";

        noImgBtn.dataset.noimage = "1";

        noImgBtn.dataset.active = "0";

        noImgBtn.innerHTML = "📷 이미지없음";

        dpFilterRow.appendChild(noImgBtn);

        noImgBtn.addEventListener("click", () => {

            saveHistoryState();

            noImgBtn.dataset.active = noImgBtn.dataset.active === "1" ? "0" : "1";

            if(noImgBtn.dataset.active === "1") noImgBtn.classList.add('ring-2','ring-gray-400');

            else noImgBtn.classList.remove('ring-2','ring-gray-400');

            visibleCount=60; render();

        });

    }



    // ── 바코드 누락 필터 칩 ───────────────────────────────────────────

    if(dpFilterRow && !$('button.chip[data-nobarcode]')) {

        const noBarcodeBtn = document.createElement("button");

        noBarcodeBtn.className = "chip !bg-amber-50 !text-amber-600 !border-amber-300 font-black";

        noBarcodeBtn.dataset.nobarcode = "1";

        noBarcodeBtn.dataset.active = "0";

        const _nbCount = PRODUCTS.filter(p => p.noBarcodeBusan).length;

        noBarcodeBtn.innerHTML = `🔖 바코드누락${_nbCount > 0 ? ` <span class="ml-0.5 bg-amber-400 text-white rounded-full px-1.5 text-[10px]">${_nbCount}</span>` : ''}`;

        dpFilterRow.appendChild(noBarcodeBtn);

        noBarcodeBtn.addEventListener("click", () => {

            saveHistoryState();

            noBarcodeBtn.dataset.active = noBarcodeBtn.dataset.active === "1" ? "0" : "1";

            if(noBarcodeBtn.dataset.active === "1") noBarcodeBtn.classList.add('ring-2','ring-amber-400');

            else noBarcodeBtn.classList.remove('ring-2','ring-amber-400');

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

                            <label class="block text-xs font-bold text-purple-500 mb-1">🤖 Groq API Key (AI 세일즈 가이드 자동생성)</label>

                            <input type="password" id="anthKeyInput" value="${getAnthKey()}" class="ipt w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm font-bold outline-none focus:border-purple-500 shadow-sm bg-purple-50/30" placeholder="gsk_...">

                            <p class="text-[10px] text-gray-400 font-bold mt-1">발급: <a href="https://console.groq.com" target="_blank" class="text-purple-400 underline">console.groq.com</a> → 무료 (하루 14,400회) / AI 세일즈 가이드 자동생성에 사용</p>

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

                setAdminSession();

                applyDefaultPatIfNeeded();

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

        if (checkAdminSession()) {

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

                            const rawText = await callAIGuide(brand, name, reviewText);

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

                    alert("⚠️ Admin > API 설정에서 Groq API Key를 먼저 등록해주세요.\n발급: console.groq.com (무료)");

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

                        const rawText = await callAIGuide(brand, name, "");

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

                    sessionStorage.setItem(CACHE_KEY, JSON.stringify({rows, meta, images:IMAGES, memos:MEMOS, transfers:TRANSFERS, promotions:PROMOTIONS, salesGuides:SALES_GUIDES, salesHistory:SALES_HISTORY, salesDeductions:SALES_DEDUCTIONS, displayItems:DISPLAY_ITEMS, _timestamp: Date.now()})); 

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

