// RACEMENT Haeundae Inventory — app.js (v4.3 이미지 동시로딩 / 메모 / 색상 패치)
const ADMIN_PWD = "1212";
const SESSION_FLAG = "racement_admin_session";
const GH_CONFIG_KEY = "racement_gh_config_v1";
const GH_PAT_KEY = "racement_gh_pat_v1";
const CACHE_KEY = "racement_inventory_cache_v1";
const DATA_PATH = "inventory.json";
const REQUESTS_PATH = "requests.json"; 
const CAT_ORDER = { "신발":0, "의류":1, "용품":2 };

let GH = { owner:"", repo:"", branch:"main" };
let RAW=[], PRODUCTS=[], filtered=[];
let IMAGES = {}; // 글로벌 이미지 객체
let MEMOS = []; // 글로벌 메모 객체
let visibleCount=60;
let CURRENT_META = null;
let CURRENT_PRODUCT = null;

let FAVS = JSON.parse(localStorage.getItem('FAVS') || '[]');
let CART = JSON.parse(localStorage.getItem('CART') || '[]');
let RECENT_SEARCHES = JSON.parse(localStorage.getItem('RECENT_SEARCHES') || '[]');

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

// 스마트 컬러 뱃지 (파스텔 톤)
function genderBadge(g){
  if(g==="M") return `<span class="bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded text-[11px] font-bold">남성</span>`;
  if(g==="W") return `<span class="bg-pink-50 text-pink-600 border border-pink-100 px-1.5 py-0.5 rounded text-[11px] font-bold">여성</span>`;
  return `<span class="bg-gray-100 text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded text-[11px] font-bold">공용</span>`;
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

async function copyText(text, btn){
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){ await navigator.clipboard.writeText(text); } 
    else {
      const ta = document.createElement("textarea"); ta.value = text; ta.style.position="fixed"; ta.style.opacity="0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    if(btn){
      const orig = btn.textContent; btn.classList.add("copied"); btn.textContent = "✓ 복사 완료";
      setTimeout(()=>{ btn.textContent = orig; btn.classList.remove("copied"); }, 1200);
    }
  }catch(e){ alert("복사 실패"); }
}

// 🔥 데이터 동시 로딩 패치 (이미지 누락 완벽 해결) 🔥
async function loadData(force = false){
  const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
  
  if (!force && cached && (Date.now() - (cached._timestamp||0) < 60000)) {
      RAW = cached.rows || []; 
      CURRENT_META = cached.meta || null;
      IMAGES = cached.images || {};
      MEMOS = cached.memos || [];
      rebuildIndex(); render(); 
      return;
  }
  
  try {
      // 재고, 이미지, 메모를 동시에 다 받아올 때까지 기다림
      const [invRes, imgRes, memoRes] = await Promise.all([
          fetch("./" + DATA_PATH + "?t=" + Date.now()),
          fetch("./images.json?t=" + Date.now()).catch(()=>null),
          fetch("./" + REQUESTS_PATH + "?t=" + Date.now()).catch(()=>null)
      ]);

      if(!invRes.ok) throw new Error("재고 로드 실패");
      const invData = await invRes.json();
      RAW = invData.rows || []; 
      CURRENT_META = invData.meta || null;

      if(imgRes && imgRes.ok) IMAGES = await imgRes.json();
      else IMAGES = {};

      if(memoRes && memoRes.ok) MEMOS = await memoRes.json();
      else MEMOS = [];

      // 캐시에 이미지, 메모도 같이 저장해서 다음번 로딩 속도 향상
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rows: RAW, meta: CURRENT_META, images: IMAGES, memos: MEMOS, _timestamp: Date.now() }));
      
      rebuildIndex(); render();
  } catch(e) { 
      if(cached) { 
          RAW = cached.rows || []; CURRENT_META = cached.meta; IMAGES = cached.images || {}; MEMOS = cached.memos || []; 
          rebuildIndex(); render(); 
      } 
  }
}

async function ghPut(url, body){ return fetch(url, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) }); }
function utf8ToB64(str){ return btoa(unescape(encodeURIComponent(str))); }

async function commitInventoryToGitHub(rows, meta){
  const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${DATA_PATH}`;
  let sha = null;
  try{ const r = await fetch(apiBase + "?t=" + Date.now(), { headers:{ Authorization:"Bearer "+getPat() } }); if(r.ok){ const j=await r.json(); sha=j.sha; } }catch(e){}
  const body = { message:"update", content: utf8ToB64(JSON.stringify({ meta, rows })), branch: GH.branch };
  if(sha) body.sha = sha;
  const r2 = await ghPut(apiBase, body);
  if(!r2.ok) throw new Error("업로드 실패");
}

function rebuildIndex(){
  const map = new Map();
  const prevRaw = JSON.parse(localStorage.getItem('PREV_RAW') || '[]');
  
  for(const r of RAW){
    const code = r["품번"]; if(!code) continue;
    if(!map.has(code)){
      map.set(code, { 품번:code, 품명:r["품명"], 브랜드:r["브랜드"], 카테고리:r["카테고리2"]||r["카테고리"], 성별:r["성별"], gender:detectGender(code, r["성별"]), 소비자가:Number(r["소비자가"]||0), shopNo:String(r["상품번호(샵바이)"]||""), sizes:[], hasMemo: false });
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
    
    // 메모 여부 매핑
    p.hasMemo = MEMOS.some(m => m.shopNo === p.shopNo || m.product === p.품명);

    const hay = [p.품번, p.품명, p.브랜드].join(" ").toLowerCase();
    p._hay = hay; p._chosung = getChosung(hay);
    return p;
  });
  
  const brands = Array.from(new Set(PRODUCTS.map(p=>p.브랜드).filter(Boolean))).sort();
  const wrap = $("#brandChips"); 
  wrap.innerHTML = '<button class="chip" data-brand="ALL" data-active="1">전체</button>';
  
  wrap.querySelector('[data-brand="ALL"]').onclick = function() {
      $$('#brandChips .chip').forEach(c=>c.dataset.active=(c===this?"1":"0"));
      visibleCount=60; render();
  };
  
  brands.forEach(b => {
      const btn = document.createElement("button"); btn.className="chip"; btn.dataset.brand=b; btn.textContent=b;
      btn.onclick = ()=>{ $$('#brandChips .chip').forEach(c=>c.dataset.active=(c===btn?"1":"0")); visibleCount=60; render(); };
      wrap.appendChild(btn);
  });
}

function card(p){
  const el = document.createElement("article");
  el.className = "card card-hover p-4 flex flex-col";
  el.onclick = (e)=>{ 
    const copyBtn = e.target.closest('[data-copy]');
    if(copyBtn) { copyText(copyBtn.dataset.copy, copyBtn); return; }
    if(!e.target.closest('button')) openDetail(p); 
  };
  
  const imgSrc = IMAGES[p.shopNo] || null;
  
  let deltaHtml = "";
  if (p.delta > 0) deltaHtml = `<span class="bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded ml-1 text-[10px] font-bold">▲+${p.delta}</span>`;
  else if (p.delta < 0) deltaHtml = `<span class="bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded ml-1 text-[10px] font-bold">▼${p.delta}</span>`;

  let memoHtml = p.hasMemo ? `<span class="bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded ml-1 text-[10px] font-bold">📝 메모있음</span>` : "";

  const smartTags = `<span class="bg-black text-white px-1.5 py-0.5 rounded text-[11px] font-bold">${escapeHtml(p.카테고리||"-")}</span> <span class="text-[#666] font-bold text-[11px]">${escapeHtml(p.브랜드||"-")}</span> ${genderBadge(p.gender)}`;
  const imgHtml = imgSrc ? `<img src="${imgSrc}" class="boxless-img" onerror="this.style.display='none'">` : '';

  el.innerHTML = `
    <button class="fav-btn text-xl absolute top-4 right-4 z-10" style="${imgSrc?'right:85px;':''}">${FAVS.includes(p.품번)?'★':'☆'}</button>
    ${imgHtml}
    
    <div class="pr-[70px]">
        <div class="flex items-center flex-wrap gap-1 mb-2">${smartTags}${deltaHtml}${memoHtml}</div>
        <div class="copyable font-bold text-[16px] leading-tight mb-1 truncate text-left w-full" data-copy="${escapeHtml(p.품명)}">${escapeHtml(p.품명)}</div>
        <div class="copyable text-[14px] text-[#666] mb-3 text-left w-full" data-copy="${escapeHtml(p.품번)}">${escapeHtml(p.품번)}</div>
    </div>
    <div class="grid gap-1.5 mt-1 mb-4" style="grid-template-columns:repeat(auto-fill, minmax(44px, 1fr))">
      ${p.sizes.map(s=>`<div class="size-cell ${s.busan===0?'zero':(s.busan<=2?'low':'')}"><span class="sz">${s.size}</span><span class="qty real-qty">${s.busan}</span><span class="qty showroom-qty hidden">${s.busan>0?'O':'X'}</span></div>`).join("")}
    </div>
    <div class="loc-simple">
       <div class="flex gap-1 items-center"><b>부산 ${p.busanTotal}</b> | 신사 ${p.sinsaTotal} | 물류 ${p.centerTotal}</div>
       <div class="price-clean">${krw(p.소비자가)}</div>
    </div>
  `;
  el.querySelector('.fav-btn').onclick=(e)=>{ e.stopPropagation(); if(FAVS.includes(p.품번)) FAVS=FAVS.filter(id=>id!==p.품번); else FAVS.push(p.품번); localStorage.setItem('FAVS', JSON.stringify(FAVS)); render(); };
  return el;
}

function getFilters(){
  return {
    cat: ($$('button.chip[data-cat]').find(b=>b.dataset.active==="1")||{}).dataset?.cat || "ALL",
    brand: ($$('#brandChips .chip').find(b=>b.dataset.active==="1")||{}).dataset?.brand || "ALL",
    q: $("#q").value.trim().toLowerCase(),
    stock: !!$$('button.chip[data-stock]').find(b=>b.dataset.active==="1"),
    favOnly: !!$$('button.chip[data-fav]').find(b=>b.dataset.active==="1"),
    memoOnly: !!$$('button.chip[data-memo]').find(b=>b.dataset.active==="1") // 메모 필터 연동
  };
}

function renderRecentSearches() {
    const wrap = $("#recentSearches"); if(!wrap) return;
    if (RECENT_SEARCHES.length === 0) { wrap.classList.add("hidden"); return; }
    wrap.classList.remove("hidden");
    wrap.innerHTML = `<span class="text-[11px] font-bold text-[color:var(--muted)] shrink-0">최근검색</span>` + 
        RECENT_SEARCHES.map(q => `<button class="chip recent-q" style="padding:0.2rem 0.5rem; font-size:0.75rem;">${escapeHtml(q)}</button>`).join("");
    $$('.recent-q', wrap).forEach(b => b.addEventListener("click", () => { $("#q").value = b.textContent; visibleCount = 60; render(); }));
}

function render(){
  const grid = $("#grid"); grid.innerHTML = "";
  const f = getFilters();
  
  if(f.q && (!RECENT_SEARCHES.length || RECENT_SEARCHES[0] !== f.q)) {
      RECENT_SEARCHES = RECENT_SEARCHES.filter(q => q !== f.q);
      RECENT_SEARCHES.unshift(f.q);
      if(RECENT_SEARCHES.length > 5) RECENT_SEARCHES.pop();
      localStorage.setItem('RECENT_SEARCHES', JSON.stringify(RECENT_SEARCHES));
      renderRecentSearches();
  }

  let filteredList = PRODUCTS.filter(p=>{
    if(f.cat!=="ALL" && p.카테고리!==f.cat) return false;
    if(f.brand!=="ALL" && p.브랜드!==f.brand) return false;
    if(f.favOnly && !FAVS.includes(p.품번)) return false; 
    if(f.stock && p.busanTotal <= 0) return false;
    if(f.memoOnly && !p.hasMemo) return false; // 메모 필터 작동
    
    if(f.q) { 
        const tokens = f.q.split(/\s+/).filter(Boolean);
        for(const t of tokens){
            if(isAllChosung(t)){ 
                if(!p._chosung.includes(t)) return false; 
            } else { 
                if(!p._hay.includes(t)) return false; 
            }
        }
    }
    return true;
  });

  const sortMode = $("#sortSel").value;
  filteredList.sort((a,b) => {
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
    if(sortMode==="priceAsc") return (a.소비자가||0) - (b.소비자가||0);
    if(sortMode==="priceDesc") return (b.소비자가||0) - (a.소비자가||0);
    
    const br = String(a.브랜드).localeCompare(String(b.브랜드),"ko"); if(br!==0) return br;
    return String(a.품명).localeCompare(String(b.품명),"ko");
  });

  filteredList.slice(0, visibleCount).forEach(p=>grid.appendChild(card(p)));
  
  if(filteredList.length === 0){ $("#emptyState").classList.remove("hidden"); } 
  else { $("#emptyState").classList.add("hidden"); }

  if(window.lucide) lucide.createIcons();
  updateCartStatus();
}

function updateCartStatus(){
  const btn = $("#cartBtn");
  if(btn){ btn.classList.toggle("hidden", !CART.length); $("#cartCount").textContent = CART.length; }
}

function openCartModal(){
  const listEl = $("#cartList"); listEl.innerHTML = "";
  if(!CART.length) { listEl.innerHTML = "<p class='text-center py-10 text-gray-400'>담긴 상품이 없습니다.</p>"; }
  CART.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "flex justify-between items-center py-2 border-b text-sm";
    row.innerHTML = `
      <div class="flex-1">
        <div class="font-bold">${item.품명}</div>
        <div class="text-xs text-gray-500">${item.품번} | ${item.사이즈} | ${item.수량}개</div>
      </div>
      <button class="p-2 text-red-500" onclick="deleteCartItem(${idx})"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    `;
    listEl.appendChild(row);
  });
  if(window.lucide) lucide.createIcons();
  $("#cartModal").classList.remove("hidden");
}
window.deleteCartItem = (idx) => { CART.splice(idx, 1); localStorage.setItem('CART', JSON.stringify(CART)); openCartModal(); updateCartStatus(); };

function openDetail(p){
  CURRENT_PRODUCT = p;
  const imgSrc = IMAGES[p.shopNo] || null;
  const smartTags = `<span class="bg-black text-white px-1.5 py-0.5 rounded text-[11px] font-bold">${escapeHtml(p.카테고리||"-")}</span> <span class="text-[#666] font-bold text-[11px]">${escapeHtml(p.브랜드||"-")}</span> ${genderBadge(p.gender)}`;
  
  $("#detailHead").innerHTML = `
    ${imgSrc ? `<img src="${imgSrc}" class="w-full h-auto rounded-lg mb-3 object-contain border border-[color:var(--line)] mix-blend-multiply dark:mix-blend-normal" style="max-height: 200px; background:var(--surface);">` : ''}
    <div class="flex gap-1 mb-2 items-center">${smartTags}</div>
    <div class="text-xl font-bold">${escapeHtml(p.품명)}</div><div class="text-[#666] text-sm">${escapeHtml(p.품번)}</div>
  `;
  $("#detailBody").innerHTML = `
    <table class="w-full mt-4 text-sm bg-[color:var(--surface)] rounded-lg">
      <tr class="text-[#888] border-b border-[color:var(--line)]"><th class="py-2 px-2 text-left">사이즈</th><th class="px-2 text-center">부산</th><th class="px-2 text-center">신사</th><th class="px-2 text-center">물류</th></tr>
      ${p.sizes.map(s=>`<tr class="border-b border-[color:var(--line)]"><td class="py-2 px-2 font-bold">${s.size}</td><td class="text-center px-2 font-bold ${s.busan>0?'text-green-600':''}"><span class="real-qty">${s.busan}</span><span class="showroom-qty hidden ${s.busan>0?'text-green-600 font-black':'text-red-500'}">${s.busan>0?'O':'X'}</span></td><td class="text-center px-2">${s.sinsa}</td><td class="text-center px-2">${s.center}</td></tr>`).join("")}
    </table>
  `;
  const sz = $("#cartSize"); sz.innerHTML = p.sizes.map(s=>`<option value="${s.size}">${s.size} (신사:${s.sinsa} / 물류:${s.center})</option>`).join("");
  
  if (sessionStorage.getItem(SESSION_FLAG) === "1" && p.shopNo) {
      const adminImgBox = document.createElement("div");
      adminImgBox.className = "mt-4 p-3 rounded-lg border-2 border-gray-800 bg-gray-50";
      const targetUrl = `https://racement.co.kr/product-detail?productNo=${p.shopNo}`;
      adminImgBox.innerHTML = `
          <div class="text-xs font-bold text-gray-800 mb-2">👑 점장 이미지 관리</div>
          <a href="${targetUrl}" target="_blank" class="block w-full py-2 mb-2 text-center text-xs font-black bg-blue-600 text-white rounded no-underline">
              🌐 자사몰 열기 (우클릭 -> 이미지 주소 복사)
          </a>
          <div class="flex gap-2">
              <input type="text" id="quickImgUrl" class="ipt flex-1 text-xs mono" placeholder="여기에 복사한 이미지 주소 붙여넣기">
              <button id="quickImgSave" class="px-3 py-1 text-xs font-black bg-black text-white rounded">저장</button>
          </div>
          <div id="quickImgMsg" class="mt-1 text-[11px] font-bold text-gray-600"></div>
      `;
      $("#detail
