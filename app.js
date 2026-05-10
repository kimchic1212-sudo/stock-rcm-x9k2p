// 🔥 1. 전역 스타일 강제 주입: 팝업 스크롤 및 레이어 우선순위 해결 🔥
const style = document.createElement('style');
style.innerHTML = `
    .modal-backdrop { display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal-content { 
        max-height: 90vh !important; 
        overflow-y: auto !important; 
        display: flex; 
        flex-content: column; 
        position: relative;
        -webkit-overflow-scrolling: touch;
    }
    #detailModal { z-index: 9999 !important; } /* 상세창이 무조건 1순위 */
    #analyticsModal { z-index: 9000 !important; }
    #salesGuideModal { z-index: 8000 !important; }
    #allMemosModal, #transfersModal, #adminModal { z-index: 7000 !important; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
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
let IMAGES = {}; let MEMOS = []; let TRANSFERS = []; let PROMOTIONS = {}; let SALES_GUIDES = {}; let SALES_HISTORY = { meta: {}, items: {} }; 
let visibleCount=60;
let CURRENT_META = null;
let CURRENT_PRODUCT = null;

let FAVS = JSON.parse(localStorage.getItem('FAVS') || '[]');
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const fmt = n => (n??0).toLocaleString("ko-KR");
const krw = n => "₩" + fmt(n);

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

function applyMeta(meta){
    if(meta) {
        const el = $("#statSrc");
        if(el) {
            let addInfo = SALES_HISTORY.meta?.name ? `<div class="text-[11px] text-orange-600 mt-0.5 font-bold">📊 ${escapeHtml(SALES_HISTORY.meta.name)}</div>` : "";
            el.innerHTML = `<div class="text-[13px] font-black text-[color:var(--accent)] mb-0.5">✓ ${meta.uploadedAt || ''} 업데이트됨</div><div class="truncate text-xs text-gray-500">${meta.fileName || ''}</div>${addInfo}`;
        }
    }
}

async function loadData(force = false){
  const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
  if (!force && cached && (Date.now() - (cached._timestamp||0) < 60000)) {
      RAW = cached.rows || []; CURRENT_META = cached.meta || null; IMAGES = cached.images || {}; MEMOS = cached.memos || []; TRANSFERS = cached.transfers || []; PROMOTIONS = cached.promotions || {}; SALES_GUIDES = cached.salesGuides || {}; SALES_HISTORY = cached.salesHistory || { meta: {}, items: {} };
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
      RAW = invData.rows || []; CURRENT_META = invData.meta || null;
      if(imgRes && imgRes.ok) IMAGES = await imgRes.json();
      if(memoRes && memoRes.ok) MEMOS = await memoRes.json();
      if(trRes && trRes.ok) TRANSFERS = await trRes.json();
      if(promoRes && promoRes.ok) PROMOTIONS = await promoRes.json();
      if(sgRes && sgRes.ok) SALES_GUIDES = await sgRes.json();
      if(shRes && shRes.ok) SALES_HISTORY = await shRes.json();

      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rows: RAW, meta: CURRENT_META, images: IMAGES, memos: MEMOS, transfers: TRANSFERS, promotions: PROMOTIONS, salesGuides: SALES_GUIDES, salesHistory: SALES_HISTORY, _timestamp: Date.now() }));
      applyMeta(CURRENT_META); rebuildIndex(); render();
  } catch(e) { 
      if(cached) { RAW = cached.rows; CURRENT_META = cached.meta; IMAGES = cached.images; MEMOS = cached.memos; TRANSFERS = cached.transfers; PROMOTIONS = cached.promotions; SALES_GUIDES = cached.salesGuides; SALES_HISTORY = cached.salesHistory; applyMeta(CURRENT_META); rebuildIndex(); render(); }
  }
}

async function ghPut(url, body){ return fetch(url, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) }); }
function utf8ToB64(str){ return btoa(unescape(encodeURIComponent(str))); }

async function commitInventoryToGitHub(rows, meta){
  loadGhConfig(); // 최신 설정 로드 확인
  const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${DATA_PATH}`;
  let sha = null;
  try{ const r = await fetch(apiBase + "?t=" + Date.now(), { headers:{ Authorization:"Bearer "+getPat() } }); if(r.ok){ const j=await r.json(); sha=j.sha; } }catch(e){}
  const body = { message:"update", content: utf8ToB64(JSON.stringify({ meta, rows })), branch: GH.branch };
  if(sha) body.sha = sha;
  const r2 = await ghPut(apiBase, body);
  if(!r2.ok) throw new Error("업로드 실패");
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
            p.currentPromoPrice = promo.weeklyPrice; p.promoType = 'weekly';
            p.promoRate = promo.weeklyRate || ((p.소비자가 - promo.weeklyPrice) / p.소비자가);
            p.promoEndDate = (promo.targetCat === 'FOOTWEAR') ? '5/15' : (promo.targetCat === 'APPAREL' ? '5/22' : '5/29');
        } else if (promo.finalPrice && promo.finalPrice < p.소비자가) {
            p.currentPromoPrice = promo.finalPrice; p.promoType = 'general';
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
      sel.id = "sizeSel"; sel.className = "ipt text-[13px] font-bold ml-2 bg-white border-gray-300 rounded shrink-0 px-2 py-1.5";
      $("#sortSel").parentNode.insertBefore(sel, $("#sortSel"));
      sel.onchange = () => { visibleCount=60; render(); };
  }
  if($("#sizeSel")) {
      const currentSize = $("#sizeSel").value || "ALL";
      $("#sizeSel").innerHTML = `<option value="ALL">📏 전체 사이즈</option>` + sortedSizes.map(s => `<option value="${escapeHtml(s)}" ${s===currentSize?'selected':''}>${escapeHtml(s)}</option>`).join("");
  }

  if(!$("#salesPeriodWrap") && $("#sortSel")) {
      const wrap = document.createElement("div"); wrap.className = "flex items-center gap-1.5 shrink-0"; wrap.id = "salesPeriodWrap";
      wrap.innerHTML = `
          <select id="salesPeriodSel" class="ipt text-[13px] font-bold bg-orange-50 border-orange-200 text-orange-700 rounded px-2 py-1.5 outline-none">
              <option value="">📊 판매분석 (끄기)</option><option value="7">최근 7일</option><option value="30">최근 30일</option><option value="90">최근 3개월</option><option value="CUSTOM">📅 직접 지정</option><option value="ALL">전체 누적실적</option>
          </select>
          <div id="customDateWrap" class="hidden items-center gap-1 bg-white p-1 border border-orange-200 rounded">
              <input type="date" id="customStartDate" class="ipt text-[11px] px-1 py-1 w-[90px] border-none outline-none text-gray-600 font-bold"> ~ <input type="date" id="customEndDate" class="ipt text-[11px] px-1 py-1 w-[90px] border-none outline-none text-gray-600 font-bold">
              <button id="customDateApply" class="px-2 py-1 bg-orange-500 text-white rounded text-[11px] font-bold shrink-0">적용</button>
          </div>
          <button id="openAnalyticsBtn" class="hidden px-2 py-1.5 bg-gray-800 text-white text-[12px] font-black rounded flex items-center gap-1 shadow-sm shrink-0 hover:bg-black transition-colors"><i data-lucide="pie-chart" class="w-3.5 h-3.5"></i> 리포트</button>
      `;
      $("#sortSel").parentNode.insertBefore(wrap, $("#sortSel").nextSibling);
      $("#salesPeriodSel").onchange = (e) => { 
          if(e.target.value === "CUSTOM") { $("#customDateWrap").classList.replace("hidden", "flex"); $("#openAnalyticsBtn").classList.add("hidden"); }
          else { $("#customDateWrap").classList.replace("flex", "hidden"); if(e.target.value !== "") $("#openAnalyticsBtn").classList.remove("hidden"); else $("#openAnalyticsBtn").classList.add("hidden"); visibleCount=60; render(); }
      };
      $("#customDateApply").onclick = () => { if(!$("#customStartDate").value || !$("#customEndDate").value) { alert("날짜를 선택하세요."); return; } $("#openAnalyticsBtn").classList.remove("hidden"); visibleCount=60; render(); };
      $("#openAnalyticsBtn").onclick = () => window.openAnalyticsReport();
  }

  if($("#sortSel") && !$("#sortSel").querySelector('option[value="salesDesc"]')) {
      const opt = document.createElement("option"); opt.value = "salesDesc"; opt.innerHTML = "🔥 판매량 높은순"; $("#sortSel").appendChild(opt);
  }

  let promoWrap = $("#promoFilters");
  if (!promoWrap && PROMOTIONS && PROMOTIONS.meta) {
      promoWrap = document.createElement("div"); promoWrap.id = "promoFilters"; promoWrap.className = "flex gap-2 mb-3 items-center w-full overflow-x-auto no-scrollbar pb-1";
      $("#brandChips").parentNode.insertBefore(promoWrap, $("#brandChips"));
  }
  if (PROMOTIONS && PROMOTIONS.meta && Object.keys(PROMOTIONS.items || {}).length > 0) {
      if(promoWrap) {
          promoWrap.innerHTML = `
              <button class="chip !bg-purple-600 !text-white border-none shadow-sm shrink-0 font-black" data-promo="1" data-active="0">🎁 ${escapeHtml(PROMOTIONS.meta.name)}</button>
              <select id="promoTypeSel" class="ipt text-[12px] font-bold bg-white border-purple-200 text-purple-700 rounded px-2 py-1 hidden shrink-0 outline-none">
                  <option value="ALL">기획전 전체</option><option value="weekly">🔥 위클리특가</option><option value="general">🎟️ 쿠폰사용가능</option>
              </select>
              <select id="promoRateSel" class="ipt text-[12px] font-bold bg-white border-purple-200 text-purple-700 rounded px-2 py-1 hidden shrink-0 outline-none">
                  <option value="0">할인율 전체</option><option value="10">🔥 10% 할인</option><option value="20">🔥 20% 할인</option><option value="30">🔥 30% 할인</option>
              </select>
          `;
          promoWrap.querySelector('button').onclick = function() {
              const isActive = this.dataset.active === "1"; this.dataset.active = isActive ? "0" : "1";
              if(!isActive) { this.classList.add('ring-2', 'ring-purple-400', 'ring-offset-1'); $("#promoTypeSel").classList.remove("hidden"); $("#promoRateSel").classList.remove("hidden"); }
              else { this.classList.remove('ring-2', 'ring-purple-400', 'ring-offset-1'); $("#promoTypeSel").classList.add("hidden"); $("#promoRateSel").classList.add("hidden"); $("#promoTypeSel").value = "ALL"; $("#promoRateSel").value = "0"; }
              visibleCount=60; render();
          };
          $("#promoTypeSel").onchange = () => { visibleCount=60; render(); };
          $("#promoRateSel").onchange = () => { visibleCount=60; render(); };
      }
  }

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

// 🔥 2. 판매 분석 리포트 대시보드 함수 🔥
window.openAnalyticsReport = () => {
    let f = getFilters();
    let titleDate = f.salesPeriod === "CUSTOM" ? `${f.customStart} ~ ${f.customEnd}` : (f.salesPeriod === "ALL" ? "전체 기간" : `최근 ${f.salesPeriod}일`);
    let modal = $("#analyticsModal");
    if(!modal) { modal = document.createElement("div"); modal.id = "analyticsModal"; modal.className = "modal-backdrop hidden fixed inset-0"; document.body.appendChild(modal); }
    let brands = [...new Set(PRODUCTS.filter(p=>p.periodSales>0).map(p=>p.브랜드))].filter(Boolean).sort();
    modal.innerHTML = `
        <div class="modal-outer absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="this.parentNode.classList.add('hidden')"></div>
        <div class="modal-content relative bg-[#f8fafc] w-[90%] max-w-md flex flex-col rounded-2xl shadow-2xl z-10 border border-gray-200">
            <div class="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center sticky top-0 z-20 text-white">
                <h2 class="font-black text-lg flex items-center gap-1.5"><i data-lucide="bar-chart-2" class="w-5 h-5 text-orange-400"></i> 심층 분석 리포트</h2>
                <button onclick="this.closest('#analyticsModal').classList.add('hidden')" class="p-1"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            <div class="p-3 bg-white border-b border-gray-200 flex gap-2 z-10 shadow-sm">
                <select id="dashCatSel" class="ipt flex-1 text-xs font-bold bg-gray-50 border-gray-200 rounded text-gray-700"><option value="ALL">📦 전체 카테고리</option><option value="신발">👟 신발만</option><option value="의류">👕 의류만</option><option value="용품">🎒 용품만</option></select>
                <select id="dashBrandSel" class="ipt flex-1 text-xs font-bold bg-gray-50 border-gray-200 rounded text-gray-700"><option value="ALL">🏷️ 전체 브랜드</option>${brands.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('')}</select>
            </div>
            <div id="dashBody" class="p-5 overflow-y-auto space-y-5"></div>
        </div>
    `;
    const renderDashBody = () => {
        const catF = $("#dashCatSel").value; const brandF = $("#dashBrandSel").value;
        let total = 0; let catD = { "신발":0, "의류":0, "용품":0 }; let genD = { "M":0, "W":0, "U":0 }; let brD = {}; let sold = [];
        PRODUCTS.forEach(p => {
            if(p.periodSales > 0) {
                if(catF !== "ALL" && p.카테고리 !== catF) return; if(brandF !== "ALL" && p.브랜드 !== brandF) return;
                total += p.periodSales; catD[p.카테고리||"용품"] = (catD[p.카테고리||"용품"]||0) + p.periodSales;
                genD[p.gender||"U"] = (genD[p.gender||"U"]||0) + p.periodSales; brD[p.브랜드||"기타"] = (brD[p.브랜드||"기타"]||0) + p.periodSales;
                sold.push(p);
            }
        });
        sold.sort((a,b) => b.periodSales - a.periodSales); const top5 = sold.slice(0, 5);
        const buildBar = (l, v, m, c) => { if(v===0) return ''; const p = total > 0 ? Math.round((v/total)*100) : 0; const w = m > 0 ? (v/m)*100 : 0;
            return `<div class="mb-2.5"><div class="flex justify-between text-[11px] font-bold mb-1"><span>${escapeHtml(l)}</span><span>${fmt(v)}개 (${p}%)</span></div><div class="w-full bg-gray-100 rounded-full h-2"><div class="bg-${c}-500 h-2 rounded-full" style="width: ${w}%"></div></div></div>`;
        };
        const maxC = Math.max(...Object.values(catD), 1); const maxG = Math.max(...Object.values(genD), 1); const maxB = Math.max(...Object.values(brD), 1);
        let html = `<div class="text-center pb-4 border-b border-gray-200"><div class="text-xs font-bold text-gray-500 mb-1">${titleDate}</div><div class="text-3xl font-black text-gray-900">${fmt(total)}<span class="text-lg text-gray-500 ml-1">개 판매</span></div></div>`;
        if(catF === 'ALL' && total > 0) html += `<div><h3 class="font-black text-sm mb-3">📦 카테고리 비중</h3><div class="bg-white p-3 rounded-xl border shadow-sm">${buildBar('신발', catD['신발'], maxC, 'blue')}${buildBar('의류', catD['의류'], maxC, 'blue')}${buildBar('용품', catD['용품'], maxC, 'blue')}</div></div>`;
        if(total > 0) html += `<div><h3 class="font-black text-sm mb-3">🚻 성별 비중</h3><div class="bg-white p-3 rounded-xl border shadow-sm">${buildBar('남성', genD['M'], maxG, 'pink')}${buildBar('여성', genD['W'], maxG, 'pink')}${buildBar('공용', genD['U'], maxG, 'pink')}</div></div>`;
        html += `<div><h3 class="font-black text-sm mb-3">🔥 TOP 5 품목</h3><div class="space-y-2">${top5.map((p, i) => `<div class="flex items-center justify-between bg-white p-2.5 rounded-lg border shadow-sm cursor-pointer" onclick="openDetail(PRODUCTS.find(x=>x.품번==='${p.품번}'))"><div class="min-w-0"><div class="text-[11px] font-bold text-gray-400 truncate">${escapeHtml(p.브랜드)} | ${escapeHtml(p.품번)}</div><div class="text-[13px] font-black truncate">${escapeHtml(p.품명)}</div></div><div class="font-black text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs">${fmt(p.periodSales)}개</div></div>`).join('')}</div></div>`;
        $("#dashBody").innerHTML = html; if(window.lucide) lucide.createIcons();
    };
    $("#dashCatSel").onchange = renderDashBody; $("#dashBrandSel").onchange = renderDashBody;
    renderDashBody(); modal.classList.remove("hidden");
};

function card(p){
  const el = document.createElement("article"); el.className = "card card-hover p-4 flex flex-col relative bg-white"; 
  el.onclick = (e)=>{ 
    const copyBtn = e.target.closest('[data-copy]'); if(copyBtn) { copyText(copyBtn.dataset.copy, copyBtn); return; }
    if(e.target.closest('.btn-sales')) { e.stopPropagation(); window.openSalesGuide(p.품번); return; }
    if(!e.target.closest('button')) openDetail(p); 
  };
  const imgSrc = IMAGES[p.shopNo] || null;
  let deltaHtml = p.delta > 0 ? `<span class="text-emerald-600 font-black">▲+${p.delta}</span>` : (p.delta < 0 ? `<span class="text-red-600 font-black">▼${p.delta}</span>` : "");
  let busanOnlyBadge = (p.busanTotal > 0 && p.sinsaTotal === 0 && p.centerTotal === 0) ? `<span class="bg-blue-800 text-white px-1.5 py-0.5 rounded font-black tracking-wide shadow-sm">부산점 ONLY</span>` : "";
  let salesBadge = ""; const periodSel = $("#salesPeriodSel");
  if (periodSel && periodSel.value !== "" && p.periodSales > 0) {
      salesBadge += `<span class="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5 shadow-sm">📈 ${p.periodSales}개</span>`;
      if (p.periodSales >= 3 && p.busanTotal <= 1 && (p.sinsaTotal > 0 || p.centerTotal > 0)) salesBadge += `<span class="bg-red-600 text-white px-1.5 py-0.5 rounded font-black shadow-sm animate-pulse">🚨 보충요망</span>`;
  }
  const productMemos = MEMOS.filter(m => m.code === p.품번);
  let memoHtml = productMemos.length > 0 ? `<div class="showroom-hide mt-2 mb-3 space-y-1">` + productMemos.map(m => `<div class="p-2 bg-yellow-50 rounded border border-yellow-200 text-[11px] leading-snug"><div class="flex items-center justify-between mb-0.5"><span class="font-black text-yellow-800">[${escapeHtml(m.tag)}] ${escapeHtml(m.staff)}</span><span class="text-[10px] text-yellow-600">${escapeHtml(m.date)}</span></div><div class="text-yellow-900">${escapeHtml(m.text)}</div></div>`).join("") + `</div>` : "";
  const guide = SALES_GUIDES[p.품번];
  let salesHtml = (guide && guide.keywords) ? `<div class="flex flex-wrap gap-1 mt-1.5 mb-1.5">` + guide.keywords.map(kw => `<span class="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-black px-1.5 py-0.5 rounded cursor-pointer hover:bg-indigo-600 hover:text-white transition-colors btn-sales shadow-sm">#${escapeHtml(kw.trim())}</span>`).join('') + `</div>` : "";
  const isFav = FAVS.includes(p.품번);
  let promoBadge = ""; let priceDisplay = `<div class="price-clean">${krw(p.소비자가)}</div>`;
  if (p.currentPromoPrice && p.currentPromoPrice < p.소비자가) {
      const rateLabel = `▼${Math.round((p.promoRate || 0) * 100)}%`;
      if (p.promoType === 'weekly') {
          promoBadge = `<span class="bg-red-600 text-white px-1.5 py-0.5 rounded font-black flex items-center gap-0.5 shadow-sm"><i data-lucide="flame" class="w-3 h-3"></i>위클리특가 ${rateLabel}</span>`;
          priceDisplay = `<div class="flex flex-col items-end leading-tight"><span class="text-[10.5px] text-gray-400 line-through">${krw(p.소비자가)}</span><span class="text-[16px] font-black text-red-600">🔥${krw(p.currentPromoPrice)}</span></div>`;
      } else {
          promoBadge = `<span class="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5 shadow-sm"><i data-lucide="ticket" class="w-3 h-3"></i>쿠폰적용가 ${rateLabel}</span>`;
          priceDisplay = `<div class="flex flex-col items-end leading-tight"><span class="text-[10.5px] text-gray-400 line-through">${krw(p.소비자가)}</span><span class="text-[15px] font-black text-purple-700">🎟️${krw(p.currentPromoPrice)}</span></div>`;
      }
  }
  el.innerHTML = `
    <div class="flex justify-between items-start mb-2 z-10 relative">
        <div class="flex flex-wrap gap-1 text-[11px] font-bold text-gray-500 mt-0.5">${busanOnlyBadge}${promoBadge}${salesBadge}<span class="bg-gray-100 px-1.5 py-0.5 rounded">${escapeHtml(p.카테고리||"-")}</span><span class="bg-gray-100 px-1.5 py-0.5 rounded">${escapeHtml(p.브랜드||"-")}</span><span class="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">${escapeHtml(p.성별||p.gender||"-")}</span>${deltaHtml}</div>
        <button class="fav-btn p-1.5 -mt-1.5 -mr-1.5 text-gray-300 hover:text-yellow-500 outline-none shrink-0" data-active="${isFav?'1':'0'}"><i data-lucide="bookmark" class="w-6 h-6 ${isFav ? 'fill-yellow-400 text-yellow-400' : ''}"></i></button>
    </div>
    <div class="flex justify-between items-start w-full min-h-[120px] relative mb-2">
       <div class="flex-1 min-w-0 pr-[130px]"><div class="copyable font-extrabold text-[17px] leading-tight mb-1.5 hover:text-blue-600" data-copy="${escapeHtml(p.품명)}">${escapeHtml(p.품명)}</div><div class="copyable text-[14px] font-bold text-[#555] mb-2 hover:text-blue-600 flex items-center gap-1" data-copy="${escapeHtml(p.품번)}">${escapeHtml(p.품번)} <i data-lucide="copy" class="w-3.5 h-3.5 opacity-60"></i></div>${salesHtml}</div>
       ${imgSrc ? `<img src="${imgSrc}" class="absolute top-0 right-0 w-[120px] h-[120px] object-contain mix-blend-multiply dark:mix-blend-normal rounded-md">` : '<div class="absolute top-0 right-0 w-[120px] h-[120px] bg-gray-50 rounded-lg border flex items-center justify-center text-[10px] text-gray-400 font-bold">NO IMG</div>'}
    </div>
    ${memoHtml}
    <div class="grid gap-1.5 mb-4 mt-auto" style="grid-template-columns:repeat(auto-fill, minmax(44px, 1fr))">${p.sizes.map(s=>{ const q = s.busan||0; let cls = "size-cell tnum "; if(q===0) cls+="zero"; else if(q===1) cls+="danger"; else if(q===2) cls+="warn"; return `<div class="${cls}"><span class="sz">${s.size}</span><span class="qty real-qty">${q}</span><span class="qty showroom-qty hidden">${q>0?'O':'X'}</span></div>`; }).join("")}</div>
    <div class="loc-simple mt-auto"><div class="flex gap-1 items-center text-[12px]"><b>부산 ${p.busanTotal}</b> | 신사 ${p.sinsaTotal} | 물류 ${p.centerTotal}</div>${priceDisplay}</div>
  `;
  el.querySelector('.fav-btn').onclick=(e)=>{ e.stopPropagation(); if(FAVS.includes(p.품번)) FAVS=FAVS.filter(id=>id!==p.품번); else FAVS.push(p.품번); localStorage.setItem('FAVS', JSON.stringify(FAVS)); render(); };
  return el;
}

function getFilters(){
  const promoBtn = $('button[data-promo]');
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
    promoOnly: promoBtn ? promoBtn.dataset.active === "1" : false,
    promoType: $("#promoTypeSel") ? $("#promoTypeSel").value : "ALL", 
    promoRate: $("#promoRateSel") ? Number($("#promoRateSel").value) : 0
  };
}

function render(){
  const grid = $("#grid"); grid.innerHTML = "";
  if(!RAW.length) { $("#emptyState").classList.remove("hidden"); $("#results").classList.add("hidden"); return; }
  $("#emptyState").classList.add("hidden"); $("#results").classList.remove("hidden");
  const f = getFilters();
  let cS = "0000-00-00", cE = "9999-99-99";
  if (f.salesPeriod === "CUSTOM") { cS = f.customStart || cS; cE = f.customEnd || cE; } 
  else if (f.salesPeriod && f.salesPeriod !== "ALL") { cS = new Date(Date.now() - Number(f.salesPeriod) * 86400000).toISOString().split('T')[0]; }

  PRODUCTS.forEach(p => {
      p.periodSales = 0;
      if (f.salesPeriod && SALES_HISTORY.items && SALES_HISTORY.items[p.품번]) {
          for (let date in SALES_HISTORY.items[p.품번]) { if (f.salesPeriod === "ALL" || (date >= cS && date <= cE)) p.periodSales += SALES_HISTORY.items[p.품번][date]; }
      }
  });

  let filteredList = PRODUCTS.filter(p=>{
    if(f.cat!=="ALL" && p.카테고리!==f.cat) return false;
    if(f.gender!=="ALL" && p.gender!==f.gender) return false;
    if(f.brand!=="ALL" && p.브랜드!==f.brand) return false;
    if(f.favOnly && !FAVS.includes(p.품번)) return false; 
    if(f.memoOnly && !p.hasMemo) return false;
    if(f.busanOnly && !(p.busanTotal > 0 && p.sinsaTotal === 0 && p.centerTotal === 0)) return false;
    if(f.promoOnly) { if(!p.currentPromoPrice) return false; if(f.promoType !== "ALL" && p.promoType !== f.promoType) return false; if(f.promoRate > 0 && Math.round((p.promoRate || 0) * 100) !== f.promoRate) return false; }
    if(f.size !== "ALL") { const sO = p.sizes.find(s => String(s.size).trim() === f.size); if(!sO) return false; if(f.stock && sO.busan <= 0) return false; } 
    else { if(f.stock && p.busanTotal <= 0) return false; }
    if(f.q) { const tk = f.q.split(/\s+/).filter(Boolean); let mA = true; for(const t of tk){ const cT = t.replace(/[\s\-_]/g, "").toLowerCase(); if(isAllChosung(cT)){ if(!p._chosung.includes(cT)) mA = false; } else { if(!p._hay.includes(t) && !p._hayClean.includes(cT)) mA = false; } } if(!mA) return false; }
    return true;
  });

  const sM = $("#sortSel").value;
  filteredList.sort((a,b) => {
    if(sM === "salesDesc") return (b.periodSales||0) - (a.periodSales||0) || String(a.품명).localeCompare(String(b.품명),"ko");
    if(sM === "default") { const ca = CAT_ORDER[a.카테고리] ?? 9, cb = CAT_ORDER[b.카테고리] ?? 9; if(ca!==cb) return ca-cb; const sa=a.busanTotal>0?0:1, sb=b.busanTotal>0?0:1; if(sa!==sb) return sa-sb; return String(a.품명).localeCompare(String(b.품명),"ko"); }
    if(sM === "stock") return b.busanTotal - a.busanTotal || String(a.품명).localeCompare(String(b.품명),"ko");
    if(sM === "name") return String(a.품명).localeCompare(String(b.품명),"ko");
    const pA = a.currentPromoPrice || a.소비자가 || 0, pB = b.currentPromoPrice || b.소비자가 || 0;
    return sM === "priceAsc" ? pA - pB : (sM === "priceDesc" ? pB - pA : 0);
  });

  const slice = filteredList.slice(0, visibleCount);
  slice.forEach(p=>grid.appendChild(card(p)));
  if(filteredList.length > visibleCount) { $("#moreWrap").classList.remove("hidden"); $("#moreBtn").textContent = `더 보기 (+${Math.min(60, filteredList.length - visibleCount)})`; }
  else { $("#moreWrap").classList.add("hidden"); }
  if(filteredList.length === 0) $("#noMatch").classList.remove("hidden"); else $("#noMatch").classList.add("hidden");
  if(window.lucide) lucide.createIcons();
}

$("#moreBtn").onclick = () => { visibleCount+=60; render(); };

// 🔥 3. ESC 키 스마트 닫기 시스템: 최상단 팝업 하나만 닫기 🔥
document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") {
        const modals = Array.from(document.querySelectorAll('.modal-backdrop:not(.hidden)'));
        if(modals.length > 0) {
            // Z-index가 가장 높은 순서대로 찾아서 하나만 닫기
            modals.sort((a,b) => {
                const zA = parseInt(window.getComputedStyle(a).zIndex) || 0;
                const zB = parseInt(window.getComputedStyle(b).zIndex) || 0;
                return zB - zA;
            });
            modals[0].classList.add("hidden");
        }
    }
});

// 🔥 4. 설정 관리 저장 시 피드백 추가 🔥
$("#ghSave").onclick=()=>{ 
    GH = { owner:$("#ghOwner").value.trim(), repo:$("#ghRepo").value.trim(), branch:$("#ghBranch").value.trim()||"main" };
    saveGhConfig(); setPat($("#ghPat").value.trim()); 
    alert("✅ 깃허브 설정이 안전하게 저장되었습니다."); 
};

// 나머지 클릭 이벤트들
$$('.modal-backdrop').forEach(modal => { modal.addEventListener("click", (e) => { if (e.target === modal || e.target.classList.contains("modal-outer")) modal.classList.add("hidden"); }); });
$$('button[id^="close"]').forEach(btn => { btn.addEventListener("click", (e) => { e.target.closest('.modal-backdrop').classList.add("hidden"); }); });
$$('button.chip[data-cat], button.chip[data-gender], button.chip[data-fav], button.chip[data-stock], button.chip[data-memo], button.chip[data-busanonly]').forEach(b=>b.addEventListener("click",()=>{ if(b.dataset.cat) { $$('button.chip[data-cat]').forEach(x=>x.dataset.active=(x===b?"1":"0")); } else if(b.dataset.gender) { $$('button.chip[data-gender]').forEach(x=>x.dataset.active=(x===b?"1":"0")); } else { b.dataset.active = b.dataset.active==="1" ? "0" : "1"; } if(b.dataset.busanonly) { if(b.dataset.active === "1") b.classList.add('ring-2', 'ring-blue-400'); else b.classList.remove('ring-2', 'ring-blue-400'); } visibleCount=60; render(); }));
$("#resetAll").onclick=()=>{ $$('button.chip[data-cat]').forEach(b=>b.dataset.active=(b.dataset.cat==="ALL"?"1":"0")); $$('button.chip[data-gender]').forEach(b=>b.dataset.active=(b.dataset.gender==="ALL"?"1":"0")); $$('button.chip[data-fav], button.chip[data-stock], button.chip[data-memo]').forEach(b=>b.dataset.active="0"); $$('#brandChips .chip').forEach(b=>b.dataset.active=(b.dataset.brand==="ALL"?"1":"0")); const pB = $('button[data-promo]'); if(pB) { pB.dataset.active = "0"; pB.classList.remove('ring-2', 'ring-purple-400', 'ring-offset-1'); if($("#promoTypeSel")) $("#promoTypeSel").classList.add("hidden"); if($("#promoRateSel")) $("#promoRateSel").classList.add("hidden"); } const bO = $('button.chip[data-busanonly]'); if(bO) { bO.dataset.active = "0"; bO.classList.remove('ring-2', 'ring-blue-400'); } $("#sortSel").value="default"; if($("#sizeSel")) $("#sizeSel").value="ALL"; if($("#salesPeriodSel")) { $("#salesPeriodSel").value=""; $("#customDateWrap").classList.replace("flex", "hidden"); $("#openAnalyticsBtn").classList.add("hidden"); } $("#q").value=""; visibleCount=60; render(); };
$("#sortSel").onchange=()=> { visibleCount=60; render(); };
let qT; $("#q").oninput=()=>{ clearTimeout(qT); qT=setTimeout(()=>{ visibleCount=60; render(); },120); };
$("#clearQ").onclick=()=>{ $("#q").value=""; visibleCount=60; render(); $("#q").focus(); };
$("#refreshBtn").onclick=()=>loadData(true);
$("#darkModeBtn").onclick=()=>{ document.documentElement.classList.toggle("dark-mode"); localStorage.setItem("theme", document.documentElement.classList.contains("dark-mode") ? "dark" : "light"); };
$("#showroomBtn").onclick=()=>{ document.body.classList.toggle("showroom-mode"); $("#showroomBtn").classList.toggle("bg-orange-500"); };
$("#adminBtn").onclick=()=>$("#adminModal").classList.remove("hidden");
$("#drop").onclick=()=>$("#file").click(); $("#openSettings").onclick=()=>{ $("#uploadPanel").classList.add("hidden"); $("#settingsPanel").classList.remove("hidden"); }; $("#backToUpload").onclick=()=>{ $("#settingsPanel").classList.add("hidden"); $("#uploadPanel").classList.remove("hidden"); };
$("#pwdGo").onclick=()=>{ if($("#pwd").value===ADMIN_PWD){ sessionStorage.setItem(SESSION_FLAG,"1"); $("#authPanel").classList.add("hidden"); $("#uploadPanel").classList.remove("hidden"); } else alert("비밀번호 오류"); };

window.renderSalesHistoryAdmin = () => {
    const box = $("#salesHistoryAdminBox"); if(!box) return;
    box.innerHTML = `<div class="flex justify-between items-center mb-2"><div class="font-black text-orange-800">📊 POS 판매 실적 DB</div><span class="text-[10px] font-bold text-orange-500 bg-white px-2 py-0.5 rounded">${Object.keys(SALES_HISTORY.items || {}).length}개 품목</span></div><div class="text-center cursor-pointer group mt-3 bg-white border border-orange-100 rounded-lg p-3 hover:bg-orange-500 transition-colors" id="shUploadTrigger"><div class="font-black text-orange-600 text-sm group-hover:text-white">판매 엑셀 누적 업데이트</div></div><input type="file" id="shFile" accept=".xlsx, .xls, .csv" class="hidden">`;
    $("#shUploadTrigger").onclick = () => $("#shFile").click();
    $("#shFile").onchange = async (e) => {
        const f = e.target.files[0]; if(!f) return;
        const pN = prompt("기간 이름을 적어주세요.\n예) 4/17~5/9 부산점 실적", f.name); if(!pN) { $("#shFile").value = ""; return; }
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const wb = XLSX.read(new Uint8Array(ev.target.result), {type:"array"}); const sheet = wb.Sheets[wb.SheetNames[0]]; const rows = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ""}); 
            let hIdx = rows.findIndex(r => r.includes('품번') && r.includes('수량') && r.includes('거래명세서일'));
            if(hIdx === -1) { alert("엑셀 양식을 확인하세요."); return; }
            const h = rows[hIdx].map(x => String(x||"").trim()); const cI = h.indexOf('품번'), qI = h.indexOf('수량'), dI = h.indexOf('거래명세서일');
            let sD = {};
            for(let i=hIdx+1; i<rows.length; i++) {
                const r = rows[i]; const c = String(r[cI]||"").trim(), d = String(r[dI]||"").trim(), q = Number(String(r[qI]||"").replace(/,/g,'')) || 0;
                if(!c || !d) continue; if(!sD[c]) sD[c] = {}; sD[c][d] = (sD[c][d] || 0) + q;
            }
            let nI = JSON.parse(JSON.stringify(SALES_HISTORY.items || {}));
            for(let c in sD) { if(!nI[c]) nI[c] = {}; for(let d in sD[c]) { nI[c][d] = sD[c][d]; } }
            const nH = { meta: { name: pN, lastUpdated: new Date().toISOString() }, items: nI };
            try {
                const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${SALES_HISTORY_PATH}`;
                let sha = null; try { const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); if(r.ok){ const j=await r.json(); sha=j.sha; } }catch(e){}
                await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify({ message:"update", content: utf8ToB64(JSON.stringify(nH, null, 2)), branch: GH.branch, sha }) });
                SALES_HISTORY = nH; sessionStorage.removeItem(CACHE_KEY); rebuildIndex(); render(); window.renderSalesHistoryAdmin(); alert("업데이트 완료!");
            } catch(err) { alert("업로드 실패"); }
            $("#shFile").value = "";
        };
        reader.readAsArrayBuffer(f);
    };
};

// 🔥 초기 로드 및 UI 주입 🔥
window.addEventListener('DOMContentLoaded', () => {
    if ($("#allMemosBtn") && !$("#allTransfersBtn")) {
        const trBtn = document.createElement("button"); trBtn.id = "allTransfersBtn"; trBtn.className = $("#allMemosBtn").className.replace(/yellow/g, 'blue');
        trBtn.innerHTML = `🚚 이동요청 목록`; trBtn.onclick = window.renderTransfers; $("#allMemosBtn").parentNode.insertBefore(trBtn, $("#allMemosBtn").nextSibling);
    }
    const stockBtn = $('button.chip[data-stock]');
    if(stockBtn && !$('button.chip[data-busanonly]')) {
        const bOBtn = document.createElement("button"); bOBtn.className = "chip !bg-blue-50 !text-blue-700 !border-blue-200 font-black"; bOBtn.dataset.busanonly = "1"; bOBtn.dataset.active = "0"; bOBtn.innerHTML = "🌊 부산점 ONLY";
        stockBtn.parentNode.insertBefore(bOBtn, stockBtn.nextSibling);
    }
    if ($("#uploadPanel") && !$("#salesHistoryAdminBox")) {
        const shB = document.createElement("div"); shB.id = "salesHistoryAdminBox"; shB.className = "mt-4 p-4 border-2 border-orange-200 bg-orange-50 rounded-xl"; $("#uploadPanel").appendChild(shB);
        const prB = document.createElement("div"); prB.id = "promoAdminBox"; prB.className = "mt-4 p-4 border-2 border-purple-200 bg-purple-50 rounded-xl"; $("#uploadPanel").appendChild(prB);
        const sgB = document.createElement("div"); sgB.id = "salesAdminBox"; sgB.className = "mt-4 p-4 border-2 border-indigo-200 bg-indigo-50 rounded-xl"; $("#uploadPanel").appendChild(sgB);
    }
    window.renderSalesHistoryAdmin(); window.renderPromoAdmin(); if(window.renderSalesAdmin) window.renderSalesAdmin();
});

loadGhConfig(); loadData();
