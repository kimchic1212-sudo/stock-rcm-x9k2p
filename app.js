// 🔥 1. 관리자 팝업창 스크롤, Z-index 및 최적화 CSS 🔥
const style = document.createElement('style');
style.innerHTML = `
    #uploadPanel, #settingsPanel, .modal-content { max-height: 85vh !important; overflow-y: auto !important; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    /* 상세창(detailModal)이 대시보드(z-105)보다 항상 위에 뜨도록 강제 승급 */
    #detailModal { z-index: 9999 !important; }
    /* 이미지 Lazy Loading 전환 효과 */
    .card img { opacity: 0; transition: opacity 0.3s ease-in-out; }
    .card img.loaded { opacity: 1 !important; }
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
let RECENT_SEARCHES = JSON.parse(localStorage.getItem('RECENT_SEARCHES') || '[]');

const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const fmt = n => (n??0).toLocaleString("ko-KR");
const krw = n => "₩" + fmt(n);

function loadGhConfig(){ try{ const c=localStorage.getItem(GH_CONFIG_KEY); if(c) GH=Object.assign(GH, JSON.parse(c)); }catch(e){} }
function saveGhConfig(){ localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(GH)); }
function getPat(){ return localStorage.getItem(GH_PAT_KEY) || ""; }
function setPat(v){ if(v) localStorage.setItem(GH_PAT_KEY, v); else localStorage.removeItem(GH_PAT_KEY); }

// PAT 검증 유틸리티
function checkPat() {
    if(!getPat()) {
        alert("⚠️ 설정 탭에서 GitHub 토큰(PAT)을 먼저 등록해주세요.");
        return false;
    }
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

function isAllChosung(str) {
    return /^[ㄱ-ㅎ]+$/.test(str);
}

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

function applyMeta(meta){
    if(meta) {
        const el = $("#statSrc");
        if(el) {
            let addInfo = SALES_HISTORY.meta?.name ? `<div class="text-[11px] text-orange-600 mt-0.5">📊 판매DB: ${escapeHtml(SALES_HISTORY.meta.name)}</div>` : "";
            el.innerHTML = `<div class="text-[13px] font-black text-[color:var(--accent)] mb-0.5">✓ ${meta.uploadedAt || ''} 업데이트됨</div><div class="truncate text-xs text-gray-500">${meta.fileName || ''}</div>${addInfo}`;
        }
    }
}

async function loadData(force = false){
  const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
  
  if (!force && cached && (Date.now() - (cached._timestamp||0) < 60000)) {
      RAW = cached.rows || []; 
      CURRENT_META = cached.meta || null;
      IMAGES = cached.images || {};
      MEMOS = cached.memos || [];
      TRANSFERS = cached.transfers || [];
      PROMOTIONS = cached.promotions || {};
      SALES_GUIDES = cached.salesGuides || {};
      SALES_HISTORY = cached.salesHistory || { meta: {}, items: {} };
      applyMeta(CURRENT_META);
      rebuildIndex(); render(); 
      return;
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
      RAW = invData.rows || []; 
      CURRENT_META = invData.meta || null;

      if(imgRes && imgRes.ok) IMAGES = await imgRes.json(); else IMAGES = {};
      if(memoRes && memoRes.ok) MEMOS = await memoRes.json(); else MEMOS = [];
      if(trRes && trRes.ok) TRANSFERS = await trRes.json(); else TRANSFERS = [];
      
      if(promoRes && promoRes.ok) {
          const pData = await promoRes.json();
          PROMOTIONS = Object.keys(pData).length > 0 ? pData : {};
      } else { PROMOTIONS = {}; }
      
      if(sgRes && sgRes.ok) {
          const sgData = await sgRes.json();
          SALES_GUIDES = Object.keys(sgData).length > 0 ? sgData : {};
      } else { SALES_GUIDES = {}; }

      if(shRes && shRes.ok) {
          const shData = await shRes.json();
          SALES_HISTORY = shData.items ? shData : { meta: {}, items: {} };
      } else { SALES_HISTORY = { meta: {}, items: {} }; }

      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rows: RAW, meta: CURRENT_META, images: IMAGES, memos: MEMOS, transfers: TRANSFERS, promotions: PROMOTIONS, salesGuides: SALES_GUIDES, salesHistory: SALES_HISTORY, _timestamp: Date.now() }));
      
      applyMeta(CURRENT_META);
      rebuildIndex(); render();
  } catch(e) { 
      if(cached) { 
          RAW = cached.rows || []; CURRENT_META = cached.meta; IMAGES = cached.images || {}; MEMOS = cached.memos || []; TRANSFERS = cached.transfers || []; PROMOTIONS = cached.promotions || {}; SALES_GUIDES = cached.salesGuides || {}; SALES_HISTORY = cached.salesHistory || {meta:{},items:{}};
          applyMeta(CURRENT_META); rebuildIndex(); render(); 
      } else {
          RAW=[]; render();
      }
  }
}

async function ghPut(url, body){ return fetch(url, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) }); }
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

    if (PROMOTIONS && PROMOTIONS.items && PROMOTIONS.items[p.품번]) {
        const promo = PROMOTIONS.items[p.품번];
        if (promo.targetCat === activeWeeklyCat && promo.weeklyPrice && promo.weeklyPrice < p.소비자가) {
            p.currentPromoPrice = promo.weeklyPrice;
            p.promoType = 'weekly';
            p.promoRate = promo.weeklyRate || ((p.소비자가 - promo.weeklyPrice) / p.소비자가);
            if(promo.targetCat === 'FOOTWEAR') p.promoEndDate = '5/15';
            else if(promo.targetCat === 'APPAREL') p.promoEndDate = '5/22';
            else if(promo.targetCat === 'ACC/GEAR') p.promoEndDate = '5/29';
            else p.promoEndDate = '5/29';
        } 
        else if (promo.finalPrice && promo.finalPrice < p.소비자가) {
            p.currentPromoPrice = promo.finalPrice;
            p.promoType = 'general';
            p.promoRate = promo.finalRate || ((p.소비자가 - promo.finalPrice) / p.소비자가);
            p.promoEndDate = '5/29'; 
        }
    }

    const rawHay = [p.품번||"", p.품명||"", p.브랜드||""].join(" ");
    p._hay = rawHay.toLowerCase();
    p._hayClean = rawHay.replace(/[\s\-_]/g, "").toLowerCase(); 
    p._chosung = getChosung(p._hayClean); 
    
    return p;
  });
  
  const sortedSizes = Array.from(allSizes).sort((a,b) => {
      const numA = parseInt(a), numB = parseInt(b);
      if(!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
  });

  if(!$("#sizeSel") && $("#sortSel")) {
      const sel = document.createElement("select");
      sel.id = "sizeSel";
      sel.className = "ipt text-[13px] font-bold ml-2 bg-white border-gray-300 rounded shrink-0 px-2 py-1.5";
      $("#sortSel").parentNode.insertBefore(sel, $("#sortSel"));
      sel.onchange = () => { visibleCount=60; render(); };
  }
  if($("#sizeSel")) {
      const currentSize = $("#sizeSel").value || "ALL";
      $("#sizeSel").innerHTML = `<option value="ALL">📏 전체 사이즈</option>` + sortedSizes.map(s => `<option value="${escapeHtml(s)}" ${s===currentSize?'selected':''}>${escapeHtml(s)}</option>`).join("");
  }

  if(!$("#salesPeriodWrap") && $("#sortSel")) {
      const wrap = document.createElement("div");
      wrap.className = "flex items-center gap-1.5 shrink-0";
      wrap.id = "salesPeriodWrap";
      
      wrap.innerHTML = `
          <select id="salesPeriodSel" class="ipt text-[13px] font-bold bg-orange-50 border-orange-200 text-orange-700 rounded px-2 py-1.5 outline-none">
              <option value="">📊 판매분석 (끄기)</option>
              <option value="7">최근 7일</option>
              <option value="30">최근 30일</option>
              <option value="90">최근 3개월</option>
              <option value="CUSTOM">📅 직접 지정</option>
              <option value="ALL">전체 누적실적</option>
          </select>
          <div id="customDateWrap" class="hidden items-center gap-1 bg-white p-1 border border-orange-200 rounded">
              <input type="date" id="customStartDate" class="ipt text-[11px] px-1 py-1 w-[90px] border-none outline-none text-gray-600 font-bold"> ~ 
              <input type="date" id="customEndDate" class="ipt text-[11px] px-1 py-1 w-[90px] border-none outline-none text-gray-600 font-bold">
              <button id="customDateApply" class="px-2 py-1 bg-orange-500 text-white rounded text-[11px] font-bold shrink-0">적용</button>
          </div>
          <button id="openAnalyticsBtn" class="hidden px-2 py-1.5 bg-gray-800 text-white text-[12px] font-black rounded flex items-center gap-1 shadow-sm shrink-0 hover:bg-black transition-colors">
              <i data-lucide="pie-chart" class="w-3.5 h-3.5"></i> 리포트
          </button>
      `;
      $("#sortSel").parentNode.insertBefore(wrap, $("#sortSel").nextSibling);
      
      $("#salesPeriodSel").onchange = (e) => { 
          if(e.target.value === "CUSTOM") {
              $("#customDateWrap").classList.replace("hidden", "flex");
              $("#openAnalyticsBtn").classList.add("hidden"); 
          } else {
              $("#customDateWrap").classList.replace("flex", "hidden");
              if(e.target.value !== "") $("#openAnalyticsBtn").classList.remove("hidden");
              else $("#openAnalyticsBtn").classList.add("hidden");
              visibleCount=60; render(); 
          }
      };
      
      $("#customDateApply").onclick = () => {
          if(!$("#customStartDate").value || !$("#customEndDate").value) {
              alert("시작일과 종료일을 모두 선택해주세요."); return;
          }
          $("#openAnalyticsBtn").classList.remove("hidden");
          visibleCount=60; render();
      };
      
      $("#openAnalyticsBtn").onclick = () => window.openAnalyticsReport();
  }

  if($("#sortSel") && !$("#sortSel").querySelector('option[value="salesDesc"]')) {
      const opt = document.createElement("option");
      opt.value = "salesDesc";
      opt.innerHTML = "🔥 판매량 높은순";
      $("#sortSel").appendChild(opt);
  }

  let promoWrap = $("#promoFilters");
  if (!promoWrap && PROMOTIONS && PROMOTIONS.meta) {
      promoWrap = document.createElement("div");
      promoWrap.id = "promoFilters";
      promoWrap.className = "flex gap-2 mb-3 items-center w-full overflow-x-auto no-scrollbar pb-1";
      $("#brandChips").parentNode.insertBefore(promoWrap, $("#brandChips"));
  }
  if (PROMOTIONS && PROMOTIONS.meta && Object.keys(PROMOTIONS.items || {}).length > 0) {
      if(promoWrap) {
          promoWrap.innerHTML = `
              <button class="chip !bg-purple-600 !text-white border-none shadow-sm shrink-0 font-black" data-promo="1" data-active="0">
                  🎁 ${escapeHtml(PROMOTIONS.meta.name)}
              </button>
              <select id="promoTypeSel" class="ipt text-[12px] font-bold bg-white border-purple-200 text-purple-700 rounded px-2 py-1 hidden shrink-0 outline-none">
                  <option value="ALL">기획전 전체보기</option>
                  <option value="weekly">🔥 위클리특가만</option>
                  <option value="general">🎟️ 쿠폰사용가능만</option>
              </select>
              <select id="promoRateSel" class="ipt text-[12px] font-bold bg-white border-purple-200 text-purple-700 rounded px-2 py-1 hidden shrink-0 outline-none">
                  <option value="0">할인율 전체</option>
                  <option value="10">🔥 10% 할인</option>
                  <option value="20">🔥 20% 할인</option>
                  <option value="30">🔥 30% 할인</option>
              </select>
          `;
          promoWrap.querySelector('button').onclick = function() {
              const isActive = this.dataset.active === "1";
              this.dataset.active = isActive ? "0" : "1";
              if(!isActive) {
                  this.classList.add('ring-2', 'ring-purple-400', 'ring-offset-1');
                  $("#promoTypeSel").classList.remove("hidden");
                  $("#promoRateSel").classList.remove("hidden");
              } else {
                  this.classList.remove('ring-2', 'ring-purple-400', 'ring-offset-1');
                  $("#promoTypeSel").classList.add("hidden");
                  $("#promoRateSel").classList.add("hidden");
                  $("#promoTypeSel").value = "ALL";
                  $("#promoRateSel").value = "0";
              }
              visibleCount=60; render();
          };
          $("#promoTypeSel").onchange = () => { visibleCount=60; render(); };
          $("#promoRateSel").onchange = () => { visibleCount=60; render(); };
      }
  } else if (promoWrap) {
      promoWrap.innerHTML = "";
  }

  const brands = Array.from(new Set(PRODUCTS.map(p=>p.브랜드).filter(Boolean))).sort();
  const wrap = $("#brandChips"); 
  wrap.innerHTML = '<button class="chip" data-brand="ALL" data-active="1">전체 브랜드</button>';
  
  wrap.querySelector('[data-brand="ALL"]').onclick = function() {
      $$('#brandChips .chip').forEach(c=>c.dataset.active=(c===this?"1":"0"));
      visibleCount=60; render();
  };
  
  brands.forEach(b => {
      const btn = document.createElement("button"); btn.className="chip"; btn.dataset.brand=b; btn.textContent=b;
      btn.onclick = ()=>{ $$('#brandChips .chip').forEach(c=>c.dataset.active=(c===btn?"1":"0")); visibleCount=60; render(); };
      wrap.appendChild(btn);
  });
  
  $("#statItems").textContent = fmt(PRODUCTS.length);
  $("#statBusan").textContent = fmt(PRODUCTS.reduce((a,p)=>a+p.busanTotal,0));
}

// 판매 분석 리포트 대시보드
window.openAnalyticsReport = () => {
    let f = getFilters();
    let titleDate = "전체 누적 기간";
    if(f.salesPeriod === "7") titleDate = "최근 7일간";
    else if(f.salesPeriod === "30") titleDate = "최근 30일간";
    else if(f.salesPeriod === "90") titleDate = "최근 3개월간";
    else if(f.salesPeriod === "CUSTOM") titleDate = `${f.customStart} ~ ${f.customEnd}`;

    let modal = $("#analyticsModal");
    if(!modal) {
        modal = document.createElement("div");
        modal.id = "analyticsModal";
        modal.className = "modal-backdrop hidden fixed inset-0 flex items-center justify-center z-[105]";
        document.body.appendChild(modal);
    }
    
    let availableBrands = [...new Set(PRODUCTS.filter(p=>p.periodSales>0).map(p=>p.브랜드))].filter(Boolean).sort();

    modal.innerHTML = `
        <div class="modal-outer absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="this.parentNode.classList.add('hidden')"></div>
        <div class="modal-content relative bg-[#f8fafc] w-[90%] max-w-md flex flex-col rounded-2xl overflow-hidden shadow-2xl z-10 border border-gray-200">
            <div class="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center sticky top-0 z-20">
                <h2 class="font-black text-lg text-white flex items-center gap-1.5"><i data-lucide="bar-chart-2" class="w-5 h-5 text-orange-400"></i> 심층 분석 리포트</h2>
                <button onclick="this.closest('#analyticsModal').classList.add('hidden')" class="p-1 -mr-2 text-gray-400 hover:text-white transition-colors"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            
            <div class="p-3 bg-white border-b border-gray-200 flex gap-2 z-10 shadow-sm">
                <select id="dashCatSel" class="ipt flex-1 text-xs font-bold bg-gray-50 border-gray-200 rounded text-gray-700">
                    <option value="ALL">📦 전체 카테고리</option>
                    <option value="신발">👟 신발만 분석</option>
                    <option value="의류">👕 의류만 분석</option>
                    <option value="용품">🎒 용품만 분석</option>
                </select>
                <select id="dashBrandSel" class="ipt flex-1 text-xs font-bold bg-gray-50 border-gray-200 rounded text-gray-700">
                    <option value="ALL">🏷️ 전체 브랜드</option>
                    <option value="ALL">🏷️ 전체 브랜드</option>
                    ${availableBrands.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('')}
                </select>
            </div>
            <div id="dashBody" class="p-5 overflow-y-auto space-y-5"></div>
        </div>
    `;

    const renderDashBody = () => {
        const catF = $("#dashCatSel").value;
        const brandF = $("#dashBrandSel").value;

        let totalSales = 0;
        let catData = { "신발":0, "의류":0, "용품":0 };
        let genderData = { "M":0, "W":0, "U":0 };
        let brandData = {};
        let soldItems = [];

        PRODUCTS.forEach(p => {
            if(p.periodSales > 0) {
                if(catF !== "ALL" && p.카테고리 !== catF) return;
                if(brandF !== "ALL" && p.브랜드 !== brandF) return;

                totalSales += p.periodSales;
                
                const cat = p.카테고리 || "기타";
                catData[cat] = (catData[cat] || 0) + p.periodSales;
                
                const g = p.gender || "U";
                genderData[g] = (genderData[g] || 0) + p.periodSales;
                
                const b = p.브랜드 || "기타";
                brandData[b] = (brandData[b] || 0) + p.periodSales;

                soldItems.push(p);
            }
        });

        soldItems.sort((a,b) => b.periodSales - a.periodSales);
        const top5 = soldItems.slice(0, 5);

        const buildBar = (label, value, max, color) => {
            if(value === 0) return '';
            const pct = totalSales > 0 ? Math.round((value/totalSales)*100) : 0;
            const widthPct = max > 0 ? (value/max)*100 : 0;
            return `
            <div class="mb-2.5 last:mb-0">
                <div class="flex justify-between text-[11px] font-bold mb-1">
                    <span class="text-gray-700">${escapeHtml(label)}</span>
                    <span class="text-gray-900">${fmt(value)}개 <span class="text-gray-400">(${pct}%)</span></span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2">
                    <div class="bg-${color}-500 h-2 rounded-full" style="width: ${widthPct}%"></div>
                </div>
            </div>`;
        };

        const maxCat = Math.max(...Object.values(catData), 1);
        const maxGen = Math.max(...Object.values(genderData), 1);
        const maxBrand = Math.max(...Object.values(brandData), 1);
        const sortedBrands = Object.entries(brandData).sort((a,b)=>b[1]-a[1]).slice(0,5);

        let html = `
            <div class="text-center pb-4 border-b border-gray-200">
                <div class="text-xs font-bold text-gray-500 mb-1">${titleDate}</div>
                <div class="text-3xl font-black text-gray-900">${fmt(totalSales)}<span class="text-lg text-gray-500 ml-1">개 판매됨</span></div>
            </div>
        `;

        if(catF === 'ALL' && totalSales > 0) {
            html += `
            <div>
                <h3 class="font-black text-sm text-gray-800 flex items-center gap-1.5 mb-3"><i data-lucide="layers" class="w-4 h-4 text-blue-500"></i> 카테고리별 비중</h3>
                <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                    ${buildBar('신발', catData['신발']||0, maxCat, 'blue')}
                    ${buildBar('의류', catData['의류']||0, maxCat, 'blue')}
                    ${buildBar('용품(기타)', catData['용품']||0, maxCat, 'blue')}
                </div>
            </div>`;
        }

        if(totalSales > 0) {
            html += `
            <div>
                <h3 class="font-black text-sm text-gray-800 flex items-center gap-1.5 mb-3"><i data-lucide="users" class="w-4 h-4 text-pink-500"></i> 성별 비중</h3>
                <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                    ${buildBar('남성 (M)', genderData['M']||0, maxGen, 'pink')}
                    ${buildBar('여성 (W)', genderData['W']||0, maxGen, 'pink')}
                    ${buildBar('공용/기타 (U)', genderData['U']||0, maxGen, 'pink')}
                </div>
            </div>`;
        }

        if(brandF === 'ALL' && totalSales > 0) {
            html += `
            <div>
                <h3 class="font-black text-sm text-gray-800 flex items-center gap-1.5 mb-3"><i data-lucide="tag" class="w-4 h-4 text-emerald-500"></i> 브랜드 랭킹 (TOP 5)</h3>
                <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                    ${sortedBrands.map(b => buildBar(b[0], b[1], maxBrand, 'emerald')).join('')}
                </div>
            </div>`;
        }

        let filterTitle = "";
        if(catF !== "ALL") filterTitle += `[${catF}] `;
        if(brandF !== "ALL") filterTitle += `[${brandF}] `;

        html += `
            <div>
                <h3 class="font-black text-sm text-gray-800 flex items-center gap-1.5 mb-3"><i data-lucide="award" class="w-4 h-4 text-orange-500"></i> 🔥 ${filterTitle}판매 TOP 5</h3>
                <div class="space-y-2">
                    ${top5.map((p, idx) => `
                        <div class="flex items-center justify-between bg-white p-2.5 rounded-lg border border-orange-100 shadow-sm cursor-pointer hover:border-orange-300" onclick="openDetail(PRODUCTS.find(x=>x.품번==='${p.품번}'))">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="font-black text-orange-600 text-sm w-4 text-center shrink-0">${idx+1}</span>
                                <div class="min-w-0">
                                    <div class="text-[11px] font-bold text-gray-400 truncate">${escapeHtml(p.브랜드)} | ${escapeHtml(p.품번)}</div>
                                    <div class="text-[13px] font-black text-gray-800 truncate">${escapeHtml(p.품명)}</div>
                                </div>
                            </div>
                            <div class="font-black text-orange-600 shrink-0 ml-2 bg-orange-50 px-2 py-1 rounded text-xs">${fmt(p.periodSales)}개</div>
                        </div>
                    `).join('')}
                    ${top5.length === 0 ? '<div class="text-center text-xs font-bold text-gray-400 py-4">판매 데이터가 없습니다.</div>' : ''}
                </div>
            </div>
        `;

        $("#dashBody").innerHTML = html;
        if(window.lucide) lucide.createIcons();
    };

    $("#dashCatSel").onchange = renderDashBody;
    $("#dashBrandSel").onchange = renderDashBody;

    renderDashBody();
    modal.classList.remove("hidden");
};

window.openSalesGuide = (code) => {
    const guide = SALES_GUIDES[code];
    const p = PRODUCTS.find(x => x.품번 === code);
    if(!guide) return;

    let modal = $("#salesGuideModal");
    if(!modal) {
        modal = document.createElement("div");
        modal.id = "salesGuideModal";
        modal.className = "modal-backdrop hidden fixed inset-0 flex items-center justify-center z-[100]";
        modal.innerHTML = `
            <div class="modal-outer absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            <div class="modal-content relative bg-white w-[90%] max-w-md flex flex-col rounded-2xl overflow-hidden shadow-2xl z-10 border border-indigo-100">
                <div class="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-start">
                    <div>
                        <div class="flex items-center gap-1.5 mb-1">
                            <span class="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider">AI SALES GUIDE</span>
                        </div>
                        <h2 id="sgTitle" class="font-black text-lg text-indigo-950 leading-tight"></h2>
                    </div>
                    <button id="closeSalesGuide" class="p-1 -mr-2 text-indigo-400 hover:text-indigo-800 transition-colors"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                <div class="p-5 overflow-y-auto max-h-[70vh] space-y-5">
                    <div><div id="sgKeywords" class="flex flex-wrap gap-1.5 mb-3"></div></div>
                    <div>
                        <h3 class="font-black text-xs text-indigo-400 flex items-center gap-1 mb-1.5"><i data-lucide="zap" class="w-4 h-4"></i> 핵심 특징</h3>
                        <div id="sgFeatures" class="text-sm text-gray-800 font-medium leading-relaxed bg-gray-50 p-3 rounded-lg"></div>
                    </div>
                    <div>
                        <h3 class="font-black text-xs text-indigo-400 flex items-center gap-1 mb-1.5"><i data-lucide="target" class="w-4 h-4"></i> 추천 고객</h3>
                        <div id="sgTarget" class="text-sm text-gray-800 font-medium leading-relaxed bg-gray-50 p-3 rounded-lg"></div>
                    </div>
                    <div>
                        <h3 class="font-black text-xs text-indigo-400 flex items-center gap-1 mb-1.5"><i data-lucide="message-circle" class="w-4 h-4"></i> 실전 응대 멘트</h3>
                        <div id="sgPitch" class="text-sm text-indigo-900 font-bold leading-relaxed bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        $("#closeSalesGuide").onclick = () => modal.classList.add("hidden");
        modal.querySelector(".modal-outer").onclick = () => modal.classList.add("hidden");
    }

    modal.querySelector("#sgTitle").textContent = p ? p.품명 : code;
    modal.querySelector("#sgKeywords").innerHTML = (guide.keywords || []).map(kw => `<span class="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[11px] font-black border border-indigo-200">#${escapeHtml(kw)}</span>`).join('');
    modal.querySelector("#sgFeatures").textContent = guide.features || "내용 없음";
    modal.querySelector("#sgTarget").textContent = guide.target || "내용 없음";
    modal.querySelector("#sgPitch").textContent = guide.pitch || "내용 없음";

    modal.classList.remove("hidden");
    if(window.lucide) lucide.createIcons();
};

// 🔥 2. Lazy Loading 반영된 개별 카드 생성 함수
function card(p){
  const el = document.createElement("article");
  el.className = "card card-hover p-4 flex flex-col relative bg-white"; 
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
      busanOnlyBadge = `<span class="bg-blue-800 text-white px-1.5 py-0.5 rounded font-black tracking-wide shadow-sm">부산점 ONLY</span>`;
  }

  let salesBadge = "";
  const periodSel = $("#salesPeriodSel");
  if (periodSel && periodSel.value !== "" && p.periodSales > 0) {
      salesBadge += `<span class="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5 shadow-sm">📈 ${p.periodSales}개 판매</span>`;
      if (p.periodSales >= 3 && p.busanTotal <= 1 && (p.sinsaTotal > 0 || p.centerTotal > 0)) salesBadge += `<span class="bg-red-600 text-white px-1.5 py-0.5 rounded font-black shadow-sm animate-pulse">🚨 보충요망</span>`;
      if (p.periodSales >= 10) salesBadge += `<span class="bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded font-black shadow-sm">🏆 인기</span>`;
  }

  const productMemos = MEMOS.filter(m => m.code === p.품번);
  let memoHtml = "";
  if(productMemos.length > 0) {
      memoHtml = `<div class="showroom-hide mt-2 mb-3 space-y-1">`;
      productMemos.forEach(m => {
          memoHtml += `
          <div class="p-2 bg-yellow-50 rounded border border-yellow-200 text-[11px] leading-snug">
             <div class="flex items-center justify-between mb-0.5">
                 <span class="font-black text-yellow-800">[${escapeHtml(m.tag)}] ${escapeHtml(m.staff)}</span>
                 <span class="text-[10px] text-yellow-600">${escapeHtml(m.date)}</span>
             </div>
             <div class="text-yellow-900">${escapeHtml(m.text)}</div>
          </div>`;
      });
      memoHtml += `</div>`;
  }

  let salesHtml = "";
  const guide = SALES_GUIDES[p.품번];
  if (guide && guide.keywords && guide.keywords.length > 0) {
      salesHtml = `<div class="flex flex-wrap gap-1 mt-1.5 mb-1.5">` + 
          guide.keywords.map(kw => `<span class="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-black px-1.5 py-0.5 rounded cursor-pointer hover:bg-indigo-600 hover:text-white transition-colors btn-sales shadow-sm">#${escapeHtml(kw.trim())}</span>`).join('') +
      `</div>`;
  }

  const isFav = FAVS.includes(p.품번);

  let promoBadge = "";
  let priceDisplay = `<div class="price-clean">${krw(p.소비자가)}</div>`;

  if (p.currentPromoPrice && p.currentPromoPrice < p.소비자가) {
      const rateInt = Math.round((p.promoRate || 0) * 100);
      const rateLabel = rateInt > 0 ? `▼${rateInt}%` : '';

      if (p.promoType === 'weekly') {
          promoBadge = `<span class="bg-red-600 text-white px-1.5 py-0.5 rounded font-black flex items-center gap-0.5 shadow-sm"><i data-lucide="flame" class="w-3 h-3"></i>위클리특가 ${rateLabel} (~${p.promoEndDate})</span>`;
          priceDisplay = `
            <div class="flex flex-col items-end leading-tight mt-0.5">
                <span class="text-[10.5px] text-gray-400 line-through mb-0.5">${krw(p.소비자가)}</span>
                <div class="flex items-center gap-1.5">
                    <span class="text-[16px] font-black text-red-600">🔥${krw(p.currentPromoPrice)}</span>
                </div>
            </div>`;
      } else {
          promoBadge = `<span class="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5 shadow-sm"><i data-lucide="ticket" class="w-3 h-3"></i>쿠폰적용가 ${rateLabel} (~${p.promoEndDate})</span>`;
          priceDisplay = `
            <div class="flex flex-col items-end leading-tight mt-0.5">
                <span class="text-[10.5px] text-gray-400 line-through mb-0.5">${krw(p.소비자가)}</span>
                <div class="flex items-center gap-1.5">
                    <span class="text-[15px] font-black text-purple-700">🎟️${krw(p.currentPromoPrice)}</span>
                </div>
            </div>`;
      }
  }

  // onload 이벤트로 로딩 완료 시 자연스럽게 나타나도록 처리 (loading="lazy" 적용)
  el.innerHTML = `
    <div class="flex justify-between items-start mb-2 z-10 relative">
        <div class="flex flex-wrap gap-1 text-[11px] font-bold text-gray-500 mt-0.5">
            ${busanOnlyBadge}
            ${promoBadge}
            ${salesBadge}
            <span class="bg-gray-100 px-1.5 py-0.5 rounded">${escapeHtml(p.카테고리||"-")}</span>
            <span class="bg-gray-100 px-1.5 py-0.5 rounded">${escapeHtml(p.브랜드||"-")}</span>
            <span class="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">${escapeHtml(p.성별||p.gender||"-")}</span>
            ${deltaHtml}
        </div>
        <button class="fav-btn p-1.5 -mt-1.5 -mr-1.5 text-gray-300 hover:text-yellow-500 outline-none shrink-0" data-active="${isFav?'1':'0'}">
            <i data-lucide="bookmark" class="w-6 h-6 ${isFav ? 'fill-yellow-400 text-yellow-400' : ''}"></i>
        </button>
    </div>

    <div class="flex justify-between items-start w-full min-h-[120px] relative mb-2">
       <div class="flex-1 min-w-0 pr-[130px]">
          <div class="copyable font-extrabold text-[17px] leading-tight mb-1.5 text-left w-full hover:text-blue-600" data-copy="${escapeHtml(p.품명)}">${escapeHtml(p.품명)}</div>
          
          <div class="copyable text-[14px] font-bold text-[#555] mb-2 text-left w-full hover:text-blue-600 flex items-center gap-1" data-copy="${escapeHtml(p.품번)}">
              ${escapeHtml(p.품번)} <i data-lucide="copy" class="w-3.5 h-3.5 opacity-60"></i>
          </div>
          ${salesHtml}
       </div>
       
       ${imgSrc ? `<img src="${imgSrc}" loading="lazy" onload="this.classList.add('loaded')" class="absolute top-0 right-0 w-[120px] h-[120px] object-contain mix-blend-multiply dark:mix-blend-normal rounded-md">` : '<div class="absolute top-0 right-0 w-[120px] h-[120px] bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-bold">NO IMG</div>'}
    </div>
    
    ${memoHtml}

    <div class="grid gap-1.5 mb-4 mt-auto" style="grid-template-columns:repeat(auto-fill, minmax(44px, 1fr))">
      ${p.sizes.map(s=>{
          const q = s.busan||0; 
          let cls = "size-cell tnum ";
          if(q===0) cls+="zero"; else if(q===1) cls+="danger"; else if(q===2) cls+="warn";
          return `<div class="${cls}"><span class="sz">${s.size}</span><span class="qty real-qty">${q}</span><span class="qty showroom-qty hidden">${q>0?'O':'X'}</span></div>`;
      }).join("")}
    </div>
    <div class="loc-simple mt-auto">
       <div class="flex gap-1 items-center"><b>부산 ${p.busanTotal}</b> | 신사 ${p.sinsaTotal} | 물류 ${p.centerTotal}</div>
       ${priceDisplay}
    </div>
  `;
  
  el.querySelector('.fav-btn').onclick=(e)=>{ 
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
  const promoOnly = promoBtn ? promoBtn.dataset.active === "1" : false;

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
    promoOnly: promoOnly,
    promoType: promoOnly && $("#promoTypeSel") ? $("#promoTypeSel").value : "ALL", 
    promoRate: promoOnly && $("#promoRateSel") ? Number($("#promoRateSel").value) : 0
  };
}

// 🔥 3. 성능 최적화가 적용된 리스트 렌더링 함수 🔥
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
  
  let cutoffDate = "0000-00-00";
  let endDate = "9999-99-99";
  if (f.salesPeriod === "CUSTOM") {
      cutoffDate = f.customStart || "0000-00-00";
      endDate = f.customEnd || "9999-99-99";
  } else if (f.salesPeriod && f.salesPeriod !== "ALL") {
      const d = new Date(Date.now() - Number(f.salesPeriod) * 86400000);
      cutoffDate = d.toISOString().split('T')[0];
  }

  PRODUCTS.forEach(p => {
      p.periodSales = 0;
      if (f.salesPeriod && SALES_HISTORY.items && SALES_HISTORY.items[p.품번]) {
          for (let date in SALES_HISTORY.items[p.품번]) {
              if (f.salesPeriod === "ALL" || (date >= cutoffDate && date <= endDate)) {
                  p.periodSales += SALES_HISTORY.items[p.품번][date];
              }
          }
      }
  });

  let filteredList = PRODUCTS.filter(p=>{
    if(f.cat!=="ALL" && p.카테고리!==f.cat) return false;
    if(f.gender!=="ALL" && p.gender!==f.gender) return false;
    if(f.brand!=="ALL" && p.브랜드!==f.brand) return false;
    if(f.favOnly && !FAVS.includes(p.품번)) return false; 
    if(f.memoOnly && !p.hasMemo) return false;
    if(f.busanOnly && !(p.busanTotal > 0 && p.sinsaTotal === 0 && p.centerTotal === 0)) return false;
    
    if(f.promoOnly) {
        if(!p.currentPromoPrice) return false; 
        if(f.promoType !== "ALL" && p.promoType !== f.promoType) return false;
        if(f.promoRate > 0 && Math.round((p.promoRate || 0) * 100) !== f.promoRate) return false; 
    }

    if(f.size !== "ALL") {
        const sizeObj = p.sizes.find(s => String(s.size).trim() === f.size);
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
                if(!p._hay.includes(t) && !p._hayClean.includes(cleanT)) { matchAll = false; }
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
      
      // ✅ 최적화: Fragment를 사용해 렌더링 병목 해소
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
        <div class="flex gap-2 mb-4 bg-gray-100 p-2 rounded-lg items-center">
            <select id="memoDateSelect" class="ipt flex-1 text-sm font-bold bg-white border-gray-300">
                <option value="ALL">🗓️ 전체 날짜 보기</option>
                ${availableDates.map(d => `<option value="${d}" ${d===currentMemoDate?'selected':''}>${d} 메모</option>`).join('')}
            </select>
            <button id="bulkDeleteMemosBtn" class="px-3 py-2 bg-red-50 text-red-600 border border-red-200 font-bold rounded text-sm hover:bg-red-500 hover:text-white transition-colors">일괄 삭제</button>
        </div><div class="space-y-2">
    `;
    
    let filtered = currentMemoDate === "ALL" ? MEMOS.slice().reverse() : MEMOS.filter(m => m.date.startsWith(currentMemoDate + " ")).slice().reverse();
    if(filtered.length === 0) html += "<div class='text-center py-10 text-gray-500 font-bold'>해당 조건에 맞는 메모가 없습니다.</div>";
    else {
        filtered.forEach(m => {
            html += `
            <div class="p-3 bg-white rounded-lg border text-sm shadow-sm relative">
                <button onclick="deleteMemo('${m.id}')" class="absolute top-3 right-3 text-gray-300 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                <div class="flex justify-between items-center mb-1 pr-6">
                    <span class="font-black text-yellow-700">[${escapeHtml(m.tag)}] ${escapeHtml(m.staff)}</span>
                    <span class="text-xs text-gray-400">${escapeHtml(m.date)}</span>
                </div>
                <div class="font-bold text-gray-800 mb-1">${escapeHtml(m.product)}</div>
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
        modal.className = "modal-backdrop hidden fixed inset-0 flex items-center justify-center z-[99]"; 
        modal.innerHTML = `
            <div class="modal-outer absolute inset-0 bg-black/50"></div>
            <div class="modal-content relative bg-[color:var(--bg)] w-[90%] max-w-md flex flex-col rounded-xl overflow-hidden shadow-2xl z-10">
                <div class="p-4 border-b border-[color:var(--line)] flex justify-between items-center bg-[color:var(--surface)]">
                    <h2 class="font-black text-lg text-blue-800">🚚 상품 이동 요청 목록</h2>
                    <button id="closeTransfers" class="p-1"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div><div id="transfersList" class="p-4 overflow-y-auto flex-1 bg-gray-50 space-y-2"></div>
            </div>`;
        document.body.appendChild(modal);
        $("#closeTransfers").onclick = () => modal.classList.add("hidden");
        modal.querySelector(".modal-outer").onclick = () => modal.classList.add("hidden");
        listEl = $("#transfersList");
    }
    $("#transfersModal").classList.remove("hidden");
    if(TRANSFERS.length === 0) { listEl.innerHTML = "<div class='text-center py-10 text-gray-500 font-bold'>대기 중인 이동 요청이 없습니다.</div>"; return; }
    let html = "";
    TRANSFERS.slice().reverse().forEach(t => {
        html += `
        <div class="p-3 bg-white rounded-lg border border-blue-100 text-sm shadow-sm relative">
            <button onclick="deleteTransfer('${t.id}')" class="absolute top-3 right-3 text-gray-300 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            <div class="flex justify-between items-center mb-1 pr-6">
                <span class="font-black text-blue-700">${escapeHtml(t.code)}</span><span class="text-xs text-gray-400">${escapeHtml(t.date)}</span>
            </div>
            <div class="font-bold text-gray-800 mb-2">${escapeHtml(t.product)}</div>
            <div class="flex gap-2 text-xs font-bold text-gray-600 mb-2">
                <span class="bg-gray-100 px-2 py-0.5 rounded">사이즈: ${escapeHtml(t.size)}</span><span class="bg-gray-100 px-2 py-0.5 rounded">수량: <span class="text-blue-600">${t.qty}개</span></span>
            </div>
            <div class="text-blue-900 bg-blue-50 p-2 rounded font-medium text-xs">${escapeHtml(t.memo)}</div>
        </div>`;
    });
    listEl.innerHTML = html;
    if(window.lucide) lucide.createIcons();
};

function openDetail(p){
  CURRENT_PRODUCT = p;
  const imgSrc = IMAGES[p.shopNo] || null;
  $("#detailHead").innerHTML = `
    ${imgSrc ? `<img src="${imgSrc}" class="w-full h-auto rounded-lg mb-3 object-contain border border-[color:var(--line)] mix-blend-multiply dark:mix-blend-normal" style="max-height: 200px; background:var(--surface);">` : ''}
    <div class="text-xs text-gray-500 font-bold mb-1">${escapeHtml(p.브랜드||"-")}</div>
    <div class="text-xl font-bold">${escapeHtml(p.품명)}</div><div class="text-[#666] text-sm">${escapeHtml(p.품번)}</div>
  `;
  const productMemos = MEMOS.filter(m => m.code === p.품번);
  let detailMemoHtml = "";
  if(productMemos.length > 0) {
      productMemos.forEach(m => {
          detailMemoHtml += `
          <div class="p-2 bg-yellow-50 rounded border border-yellow-200 text-[12px] mb-2 relative">
             <button onclick="deleteMemo('${m.id}')" class="absolute top-2 right-2 text-red-400 hover:text-red-600"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
             <div class="flex items-center gap-2 mb-1"><span class="font-black text-yellow-800">[${escapeHtml(m.tag)}] ${escapeHtml(m.staff)}</span><span class="text-[10px] text-yellow-600">${escapeHtml(m.date)}</span></div>
             <div class="text-yellow-900 pr-5">${escapeHtml(m.text)}</div>
          </div>`;
      });
  }
  $("#detailMemosWrap").innerHTML = detailMemoHtml;

  $("#detailBody").innerHTML = `
    <table class="w-full mt-4 text-sm bg-[color:var(--surface)] rounded-lg">
      <tr class="text-[#888] border-b border-[color:var(--line)]"><th class="py-2 px-2 text-left">사이즈</th><th class="px-2 text-center">부산</th><th class="px-2 text-center">신사</th><th class="px-2 text-center">물류</th></tr>
      ${p.sizes.map(s=>`<tr class="border-b border-[color:var(--line)]"><td class="py-2 px-2 font-bold">${s.size}</td><td class="text-center px-2 font-bold ${s.busan>0?'text-green-600':''}"><span class="real-qty">${s.busan}</span><span class="showroom-qty hidden ${s.busan>0?'text-green-600 font-black':'text-red-500'}">${s.busan>0?'O':'X'}</span></td><td class="text-center px-2">${s.sinsa}</td><td class="text-center px-2">${s.center}</td></tr>`).join("")}
    </table>
  `;
  
  if (sessionStorage.getItem(SESSION_FLAG) === "1" && p.shopNo) {
      const adminImgBox = document.createElement("div");
      adminImgBox.className = "mt-4 p-3 rounded-lg border-2 border-gray-800 bg-gray-50";
      const targetUrl = `https://racement.co.kr/product-detail?productNo=${p.shopNo}`;
      adminImgBox.innerHTML = `
          <div class="text-xs font-bold text-gray-800 mb-2">🖼️ 제품 이미지 웹 등록 툴</div>
          <a href="${targetUrl}" target="_blank" class="block w-full py-2 mb-2 text-center text-xs font-black bg-blue-600 text-white rounded no-underline">🌐 자사몰 열기 (우클릭 -> 이미지 주소 복사)</a>
          <div class="flex gap-2">
              <input type="text" id="quickImgUrl" class="ipt flex-1 text-xs mono" placeholder="복사한 주소 붙여넣기">
              <button id="quickImgSave" class="px-3 py-1 text-xs font-black bg-black text-white rounded">저장</button>
          </div><div id="quickImgMsg" class="mt-1 text-[11px] font-bold text-gray-600"></div>
      `;
      $("#detailBody").appendChild(adminImgBox);
      adminImgBox.querySelector("#quickImgSave").onclick = async () => {
          if(!checkPat()) return;
          const url = adminImgBox.querySelector("#quickImgUrl").value.trim(); if (!url) return;
          const msg = adminImgBox.querySelector("#quickImgMsg"); msg.textContent = "저장 중...";
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

  const trBox = document.createElement("div");
  trBox.className = "mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg";
  trBox.innerHTML = `
      <div class="font-bold text-blue-800 mb-2 flex items-center gap-1"><i data-lucide="truck" class="w-4 h-4"></i> 상품 이동 요청</div>
      <div class="flex gap-2 mb-2">
          <select id="trSize" class="ipt flex-1 text-xs font-bold text-gray-700"><option value="">📏 사이즈 선택</option>${p.sizes.map(s=>`<option value="${s.size}">${s.size}</option>`).join('')}</select>
          <input type="number" id="trQty" class="ipt w-20 text-xs font-bold text-center" placeholder="수량 (개)" min="1">
      </div>
      <div class="flex gap-2 mb-2 items-center bg-white p-1.5 rounded border border-blue-100">
          <select id="trFrom" class="ipt flex-1 text-xs font-black text-gray-700 border-none bg-transparent"><option value="">🏠 출발지</option><option value="본사/물류">본사/물류</option><option value="부산점">부산점</option><option value="신사점">신사점</option></select>
          <i data-lucide="arrow-right" class="w-4 h-4 text-blue-400 shrink-0"></i>
          <select id="trTo" class="ipt flex-1 text-xs font-black text-blue-700 border-none bg-transparent"><option value="">🎯 도착지</option><option value="부산점">부산점</option><option value="신사점">신사점</option><option value="본사/물류">본사/물류</option></select>
      </div>
      <div class="flex gap-2">
          <input type="text" id="trMemo" class="ipt flex-1 text-xs" placeholder="추가 메모 (선택사항)">
          <button id="addTransferBtn" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-black shrink-0 transition-colors shadow-sm">요청 전송</button>
      </div>
      <div id="trMsg" class="text-[11px] font-bold mt-1 text-center"></div>
  `;
  $("#detailBody").appendChild(trBox);

  trBox.querySelector("#addTransferBtn").onclick = async () => {
      if(!checkPat()) return;
      const size = trBox.querySelector("#trSize").value;
      const qty = trBox.querySelector("#trQty").value;
      const from = trBox.querySelector("#trFrom").value;
      const to = trBox.querySelector("#trTo").value;
      const memoInput = trBox.querySelector("#trMemo").value.trim();
      const msg = trBox.querySelector("#trMsg");

      if(!size) { msg.style.color="red"; msg.textContent="사이즈를 선택하세요."; return; }
      if(!qty || qty <= 0) { msg.style.color="red"; msg.textContent="수량을 정확히 입력하세요."; return; }
      if(!from) { msg.style.color="red"; msg.textContent="출발지를 선택하세요."; return; }
      if(!to) { msg.style.color="red"; msg.textContent="도착지를 선택하세요."; return; }
      if(from === to) { msg.style.color="red"; msg.textContent="출발지와 도착지가 같습니다."; return; }
      const finalMemo = `[${from} -> ${to}] ${memoInput}`.trim();
      msg.style.color="black"; msg.textContent="이동 요청 전송 중...";

      try {
          const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${TRANSFERS_PATH}`;
          let sha = null; let oldData = [];
          try { 
              const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); 
              if(r.ok){ const j=await r.json(); sha=j.sha; oldData = JSON.parse(decodeURIComponent(escape(atob(j.content)))); } 
          }catch(e){}
          const d = new Date();
          const shortDate = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          oldData.push({ id: "tr_" + Date.now(), code: p.품번, product: p.품명, date: shortDate, size, qty, memo: finalMemo });
          const body = { message:"add transfer request", content: utf8ToB64(JSON.stringify(oldData, null, 2)), branch: GH.branch };
          if(sha) body.sha = sha;
          await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
          TRANSFERS = oldData; 
          msg.style.color="green"; msg.textContent="✓ 요청 전송 완료!";
          trBox.querySelector("#trQty").value = ""; trBox.querySelector("#trMemo").value = ""; trBox.querySelector("#trFrom").value = ""; trBox.querySelector("#trTo").value = "";
      } catch(e) { msg.style.color="red"; msg.textContent="요청 실패!"; }
  };

  $("#addMemoBtn").onclick = async () => {
      if(!checkPat()) return;
      const staff = $("#memoStaff").value; 
      const tag = $("#memoTag").value;
      const text = $("#memoText").value.trim();
      const msg = $("#memoMsg");
      if(!staff) { msg.style.color="red"; msg.textContent="직원 이름을 선택해주세요."; return; }
      if(!text) { msg.style.color="red"; msg.textContent="내용을 입력하세요."; return; }
      msg.style.color="black"; msg.textContent="메모 저장 중...";

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

  $("#detailModal").classList.remove("hidden");
  if(window.lucide) lucide.createIcons();
}

document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") { $$('.modal-backdrop').forEach(m => m.classList.add("hidden")); }
});

$$('.modal-backdrop').forEach(modal => {
    modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.classList.contains("modal-outer")) modal.classList.add("hidden");
    });
});
$$('button[id^="close"]').forEach(btn => {
    btn.addEventListener("click", (e) => { e.target.closest('.modal-backdrop').classList.add("hidden"); });
});

$$('button.chip[data-cat], button.chip[data-gender], button.chip[data-fav], button.chip[data-stock], button.chip[data-memo], button.chip[data-busanonly]').forEach(b=>b.addEventListener("click",()=>{ 
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
    $$('button.chip[data-cat]').forEach(b=>b.dataset.active=(b.dataset.cat==="ALL"?"1":"0")); 
    $$('button.chip[data-gender]').forEach(b=>b.dataset.active=(b.dataset.gender==="ALL"?"1":"0")); 
    $$('button.chip[data-fav], button.chip[data-stock], button.chip[data-memo]').forEach(b=>b.dataset.active="0"); 
    $$('#brandChips .chip').forEach(b=>b.dataset.active=(b.dataset.brand==="ALL"?"1":"0")); 
    
    const promoBtn = $('button[data-promo]');
    if(promoBtn) {
        promoBtn.dataset.active = "0";
        promoBtn.classList.remove('ring-2', 'ring-purple-400', 'ring-offset-1');
        if($("#promoTypeSel")) { $("#promoTypeSel").classList.add("hidden"); $("#promoTypeSel").value = "ALL"; }
        if($("#promoRateSel")) { $("#promoRateSel").classList.add("hidden"); $("#promoRateSel").value = "0"; }
    }
    const busanOnlyBtn = $('button.chip[data-busanonly]');
    if(busanOnlyBtn) { busanOnlyBtn.dataset.active = "0"; busanOnlyBtn.classList.remove('ring-2', 'ring-blue-400'); }

    $("#sortSel").value="default";
    if($("#sizeSel")) $("#sizeSel").value="ALL";
    if($("#salesPeriodSel")) {
        $("#salesPeriodSel").value="";
        $("#customDateWrap").classList.replace("flex", "hidden");
        $("#openAnalyticsBtn").classList.add("hidden");
    }
    $("#q").value=""; visibleCount=60; render(); 
};

$("#sortSel").onchange=()=> { visibleCount=60; render(); };
let qTimer;
$("#q").oninput=()=>{ clearTimeout(qTimer); qTimer=setTimeout(()=>{ visibleCount=60; render(); },120); };
$("#clearQ").onclick=()=>{ $("#q").value=""; visibleCount=60; render(); $("#q").focus(); };
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
            applyMeta(CURRENT_META); rebuildIndex(); render(); $("#adminModal").classList.add("hidden");
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
            <div class="font-black text-orange-800">📊 POS 판매 실적 DB</div>
            <span class="text-[10px] font-bold text-orange-500 bg-white px-2 py-0.5 rounded">품목 ${count}개 누적됨</span>
        </div>
        <div class="text-center cursor-pointer group mt-3 bg-white border border-orange-100 rounded-lg p-3 hover:bg-orange-500 transition-colors" id="shUploadTrigger">
            <div class="font-black text-orange-600 text-sm mb-1 group-hover:text-white">판매 엑셀 누적 업데이트</div>
            <div class="text-[10px] text-orange-400 font-bold group-hover:text-orange-100">POS에서 받은 기간별 판매데이터 그대로 업로드</div>
        </div>
        <input type="file" id="shFile" accept=".xlsx, .xls, .csv" class="hidden">
    `;
    
    $("#shUploadTrigger").onclick = () => $("#shFile").click();
    $("#shFile").onchange = async (e) => {
        if(!checkPat()) { e.target.value = ""; return; }
        const f = e.target.files[0]; if(!f) return;
        const periodName = prompt("이 판매 데이터의 기간/이름을 적어주세요.\n예) 4/17~5/9 부산점 실적", f.name);
        if(!periodName) { $("#shFile").value = ""; return; }
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const wb = XLSX.read(new Uint8Array(ev.target.result), {type:"array"});
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ""}); 
            let headerRowIdx = rows.findIndex(r => r.includes('품번') && r.includes('수량') && r.includes('거래명세서일'));
            if(headerRowIdx === -1) { alert("엑셀에서 '품번', '수량', '거래명세서일' 열을 찾을 수 없습니다."); return; }
            const headers = rows[headerRowIdx].map(h => String(h||"").trim());
            const codeIdx = headers.indexOf('품번');
            const qtyIdx = headers.indexOf('수량');
            const dateIdx = headers.indexOf('거래명세서일');

            let sessionData = {};
            for(let i=headerRowIdx+1; i<rows.length; i++) {
                const r = rows[i];
                const code = String(r[codeIdx]||"").trim();
                const date = String(r[dateIdx]||"").trim();
                const qty = Number(String(r[qtyIdx]||"").replace(/,/g,'')) || 0;
                if(!code || !date) continue;
                if(!sessionData[code]) sessionData[code] = {};
                sessionData[code][date] = (sessionData[code][date] || 0) + qty;
            }
            let newItems = JSON.parse(JSON.stringify(SALES_HISTORY.items || {}));
            for(let code in sessionData) {
                if(!newItems[code]) newItems[code] = {};
                for(let date in sessionData[code]) { newItems[code][date] = sessionData[code][date]; }
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
                alert(`성공적으로 업데이트 되었습니다!\n(${periodName})`);
            } catch(err) { alert("업로드 실패: " + err.message); }
            $("#shFile").value = "";
        };
        reader.readAsArrayBuffer(f);
    };
};

// 🔥 4. RUN TOGETHER WEEK 엑셀 완벽 대응 로직 🔥
window.renderPromoAdmin = () => {
    const box = $("#promoAdminBox");
    if(!box) return;
    if(PROMOTIONS && PROMOTIONS.meta && Object.keys(PROMOTIONS.items || {}).length > 0) {
        box.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <div class="font-black text-purple-800">🎁 진행 중: ${escapeHtml(PROMOTIONS.meta.name)}</div>
                <button id="endPromoBtn" class="px-2 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded hover:bg-red-500 hover:text-white transition-colors">기획전 종료</button>
            </div>
            <div class="text-[11px] font-bold text-purple-500 bg-white p-2 rounded">${escapeHtml(PROMOTIONS.meta.period)}</div>
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
                rebuildIndex(); render(); window.renderPromoAdmin(); alert("기획전이 성공적으로 종료되었습니다.");
            } catch(e) { alert("종료 실패!"); }
        }
    } else {
        box.innerHTML = `
            <div class="text-center cursor-pointer group" id="promoUploadTrigger">
                <div class="font-black text-purple-800 text-sm mb-1 group-hover:text-purple-600">🎁 프로모션 엑셀 등록</div>
                <div class="text-[11px] text-purple-500 font-bold">MD가 공유한 특가 시트를 업로드하세요</div>
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
                // 1행과 2행에서 기획전명과 기간 파싱
                for(let i=0; i<5; i++) {
                    if(!rows[i]) continue;
                    const col0 = String(rows[i][0]||"");
                    if(col0.includes("기획전명")) promoName = col0.replace("기획전명 :", "").replace("기획전명:", "").trim();
                    if(col0.includes("기간")) promoPeriod = col0.replace("기간 :", "").replace("기간:", "").trim();
                }

                let items = {};
                let headerRowIdx = rows.findIndex(r => r.includes('품번')); // 보통 5번째 행
                
                if(headerRowIdx > -1) {
                    const headers = rows[headerRowIdx].map(h => String(h||"").trim());
                    const codeIdx = headers.indexOf('품번');
                    const catIdx = headers.indexOf('특가 카테고리');
                    const wpIdx = headers.indexOf('위클리특가');
                    const wrIdx = headers.indexOf('특가할인율');
                    const fpIdx = headers.indexOf('최종할인가');
                    let frIdx = headers.indexOf('최종 할인율'); // 공백 trim()으로 자동 보정됨
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
                    rebuildIndex(); render(); window.renderPromoAdmin(); alert("기획전 데이터가 성공적으로 반영되었습니다!");
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
            <div class="font-black text-indigo-800">🧠 AI 세일즈 가이드 DB</div>
            <span class="text-[10px] font-bold text-indigo-500 bg-white px-2 py-0.5 rounded">현재 ${Object.keys(SALES_GUIDES).length}개 등록됨</span>
        </div>
        <div class="text-center cursor-pointer group mt-3 bg-white border border-indigo-100 rounded-lg p-3 hover:bg-indigo-600 transition-colors" id="salesUploadTrigger">
            <div class="font-black text-indigo-600 text-sm mb-1 group-hover:text-white">엑셀 등록 / 업데이트</div>
            <div class="text-[10px] text-indigo-400 font-bold group-hover:text-indigo-200">(품번, 키워드, 특징, 추천고객, 응대멘트 포함)</div>
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
            busanOnlyBtn.dataset.active = busanOnlyBtn.dataset.active === "1" ? "0" : "1";
            if(busanOnlyBtn.dataset.active === "1") busanOnlyBtn.classList.add('ring-2', 'ring-blue-400');
            else busanOnlyBtn.classList.remove('ring-2', 'ring-blue-400');
            visibleCount=60; render();
        });
    }
    
    if ($("#uploadPanel") && !$("#salesHistoryAdminBox")) {
        const shBox = document.createElement("div"); shBox.id = "salesHistoryAdminBox";
        shBox.className = "mt-4 p-4 border-2 border-orange-200 bg-orange-50 rounded-xl";
        $("#uploadPanel").appendChild(shBox);
    }

    if ($("#uploadPanel") && !$("#promoAdminBox")) {
        const promoBox = document.createElement("div"); promoBox.id = "promoAdminBox";
        promoBox.className = "mt-4 p-4 border-2 border-purple-200 bg-purple-50 rounded-xl";
        $("#uploadPanel").appendChild(promoBox);
    }
    
    if ($("#uploadPanel") && !$("#salesAdminBox")) {
        const sgBox = document.createElement("div"); sgBox.id = "salesAdminBox";
        sgBox.className = "mt-4 p-4 border-2 border-indigo-200 bg-indigo-50 rounded-xl";
        $("#uploadPanel").appendChild(sgBox);
    }

    if(window.renderSalesHistoryAdmin) window.renderSalesHistoryAdmin();
    window.renderPromoAdmin();
    if(window.renderSalesAdmin) window.renderSalesAdmin();
});

loadGhConfig(); loadData();
