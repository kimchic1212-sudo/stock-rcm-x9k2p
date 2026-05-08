// RACEMENT Haeundae Inventory — app.js (v4.2 스마트 컬러 / 기능 완벽 복구 버전)
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

// 🔥 스마트 컬러 코딩 (파스텔 톤 뱃지로 0.1초 인지) 🔥
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

async function loadData(force = false){
  const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
  if (!force && cached && (Date.now() - (cached._timestamp||0) < 60000)) {
    RAW = cached.rows; CURRENT_META = cached.meta;
    rebuildIndex(); render(); return;
  }
  try{
    const r = await fetch("./" + DATA_PATH + "?t=" + Date.now());
    if(!r.ok) throw new Error();
    const data = await r.json();
    RAW = data.rows; CURRENT_META = data.meta;
    data._timestamp = Date.now();
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    rebuildIndex(); render();
  }catch(e){ if(cached){ RAW=cached.rows; rebuildIndex(); render(); } }
}

async function ghPut(url, body){ return fetch(url, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) }); }
function utf8ToB64(str){ return btoa(unescape(encodeURIComponent(str))); }

async function commitInventoryToGitHub(rows, meta){
  const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${DATA_PATH}`;
  let sha = null;
  try{
    const r = await fetch(apiBase + "?t=" + Date.now(), { headers:{ Authorization:"Bearer "+getPat() } });
    if(r.ok){ const j=await r.json(); sha=j.sha; }
  }catch(e){}
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
      map.set(code, { 품번:code, 품명:r["품명"], 브랜드:r["브랜드"], 카테고리:r["카테고리2"]||r["카테고리"], 성별:r["성별"], gender:detectGender(code, r["성별"]), 소비자가:Number(r["소비자가"]||0), shopNo:String(r["상품번호(샵바이)"]||""), sizes:[] });
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
    
    const hay = [p.품번, p.품명, p.브랜드].join(" ").toLowerCase();
    p._hay = hay; p._chosung = getChosung(hay);
    return p;
  });
  
  // 🔥 브랜드 '전체' 버튼 작동안하던 이슈 수정 🔥
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
  
  $("#statItems").textContent = fmt(PRODUCTS.length);
  $("#statBusan").textContent = fmt(PRODUCTS.reduce((a,p)=>a+p.busanTotal,0));
}

function card(p){
  const el = document.createElement("article");
  el.className = "card card-hover p-4 flex flex-col";
  el.onclick = (e)=>{ 
    const copyBtn = e.target.closest('[data-copy]');
    if(copyBtn) { copyText(copyBtn.dataset.copy, copyBtn); return; }
    if(!e.target.closest('button')) openDetail(p); 
  };
  
  const imgSrc = (typeof IMAGES !== "undefined" && IMAGES[p.shopNo]) ? IMAGES[p.shopNo] : null;
  
  let deltaHtml = "";
  if (p.delta > 0) deltaHtml = `<span class="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded ml-1 text-[10px] font-bold">▲+${p.delta}</span>`;
  else if (p.delta < 0) deltaHtml = `<span class="bg-red-50 text-red-600 px-1.5 py-0.5 rounded ml-1 text-[10px] font-bold">▼${p.delta}</span>`;

  // 스마트 컬러 태그 적용
  const smartTags = `
      <span class="bg-black text-white px-1.5 py-0.5 rounded text-[11px] font-bold">${escapeHtml(p.카테고리||"-")}</span>
      <span class="text-[#666] font-bold text-[11px]">${escapeHtml(p.브랜드||"-")}</span>
      ${genderBadge(p.gender)}
  `;

  el.innerHTML = `
    <button class="fav-btn text-xl absolute top-4 right-4 z-10" style="${imgSrc?'right:85px;':''}">${FAVS.includes(p.품번)?'★':'☆'}</button>
    ${imgSrc ? `<img src="${imgSrc}" class="absolute top-4 right-4 w-[60px] h-[60px] object-contain mix-blend-multiply dark:mix-blend-normal">` : ''}
    
    <div class="pr-[70px]">
        <div class="flex items-center flex-wrap gap-1 mb-2">${smartTags}${deltaHtml}</div>
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
    favOnly: !!$$('button.chip[data-fav]').find(b=>b.dataset.active==="1")
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
    if(f.q) { 
        const tokens = f.q.split(/\s+/).filter(Boolean);
        for(const t of tokens){
            if(isAllChosung(t)){ if(!p._chosung.includes(t)) return false; } 
            else { if(!p._hay.includes(t)) return false; }
        }
    }
    return true;
  });

  // 🔥 3. 기본 정렬 및 클로드 필터 셀렉트박스 완벽 적용 🔥
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
  if(filteredList.length === 0) $("#emptyState").classList.remove("hidden");
  else $("#emptyState").classList.add("hidden");

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
  CURRENT
