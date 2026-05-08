// RACEMENT Haeundae Inventory — app.js (v5.0 진짜 실무 완성판)
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
let IMAGES = {}; 
let MEMOS = []; 
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

// 스마트 컬러 뱃지
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
      const orig = btn.innerHTML; btn.classList.add("copied"); btn.innerHTML = "✓ 복사됨";
      setTimeout(()=>{ btn.innerHTML = orig; btn.classList.remove("copied"); }, 1200);
    }
  }catch(e){ alert("복사 실패"); }
}

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

      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rows: RAW, meta: CURRENT_META, images: IMAGES, memos: MEMOS, _timestamp: Date.now() }));
      rebuildIndex(); render();
  } catch(e) { 
      if(cached) { 
          RAW = cached.rows || []; CURRENT_META = cached.meta; IMAGES = cached.images || {}; MEMOS = cached.memos || []; 
          rebuildIndex(); render(); 
      } else {
          RAW=[]; render();
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
    
    // 메모 존재 여부 확인
    p.hasMemo = MEMOS.some(m => m.shopNo === p.shopNo || m.product === p.품명);

    const hay = [p.품번||"", p.품명||"", p.브랜드||""].join(" ").toLowerCase();
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

  // 🔥 이미지 사이즈업(80x80) & 별표 위치 고정 컨테이너 🔥
  el.innerHTML = `
    <div class="flex justify-between items-start gap-3 w-full mb-2">
       <div class="flex-1 min-w-0 pt-1">
          <div class="flex items-center flex-wrap gap-1 mb-2">${smartTags}${deltaHtml}${memoHtml}</div>
          <button class="copyable font-extrabold text-[17px] leading-tight mb-1 truncate text-left w-full hover:text-blue-600" data-copy="${escapeHtml(p.품명)}">${escapeHtml(p.품명)}</button>
          <button class="copyable text-[15px] font-bold text-[#555] text-left w-full hover:text-blue-600 flex items-center gap-1" data-copy="${escapeHtml(p.품번)}">
              ${escapeHtml(p.품번)} <i data-lucide="copy" class="w-3.5 h-3.5 opacity-50"></i>
          </button>
       </div>
       <div class="shrink-0 flex flex-col items-end gap-2 relative w-[80px]">
          <button class="fav-btn text-2xl leading-none z-10">${FAVS.includes(p.품번)?'★':'☆'}</button>
          ${imgSrc ? `<img src="${imgSrc}" class="w-[80px] h-[80px] object-contain mix-blend-multiply dark:mix-blend-normal">` : '<div class="w-[80px] h-[80px] bg-transparent"></div>'}
       </div>
    </div>

    <div class="grid gap-1.5 mt-2 mb-4" style="grid-template-columns:repeat(auto-fill, minmax(44px, 1fr))">
      ${p.sizes.map(s=>{
          const q = s.busan||0; 
          let cls = "size-cell tnum ";
          if(q===0) cls+="zero"; else if(q===1) cls+="danger"; else if(q===2) cls+="warn";
          return `<div class="${cls}"><span class="sz">${s.size}</span><span class="qty real-qty">${q}</span><span class="qty showroom-qty hidden">${q>0?'O':'X'}</span></div>`;
      }).join("")}
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
    gender: ($$('button.chip[data-gender]').find(b=>b.dataset.active==="1")||{}).dataset?.gender || "ALL",
    brand: ($$('#brandChips .chip').find(b=>b.dataset.active==="1")||{}).dataset?.brand || "ALL",
    q: $("#q").value.trim().toLowerCase(),
    stock: !!$$('button.chip[data-stock]').find(b=>b.dataset.active==="1"),
    favOnly: !!$$('button.chip[data-fav]').find(b=>b.dataset.active==="1"),
    memoOnly: !!$$('button.chip[data-memo]').find(b=>b.dataset.active==="1") 
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

// 🔥 검색 결과 노출 오류 완벽 수정 🔥
function render(){
  const grid = $("#grid"); grid.innerHTML = "";
  
  if(!RAW.length) { 
      $("#emptyState").classList.remove("hidden"); 
      $("#results").classList.add("hidden"); 
      return; 
  }
  
  $("#emptyState").classList.add("hidden");
  $("#results").classList.remove("hidden");

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
    if(f.gender!=="ALL" && p.gender!==f.gender) return false;
    if(f.brand!=="ALL" && p.브랜드!==f.brand) return false;
    if(f.favOnly && !FAVS.includes(p.품번)) return false; 
    if(f.stock && p.busanTotal <= 0) return false;
    if(f.memoOnly && !p.hasMemo) return false;
    
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

  if(filteredList.length === 0){
      $("#noMatch").classList.remove("hidden");
      $("#moreWrap").classList.add("hidden");
  } else {
      $("#noMatch").classList.add("hidden");
      filteredList.slice(0, visibleCount).forEach(p=>grid.appendChild(card(p)));
      
      // 🔥 더보기 버튼 로직 부활 🔥
      if(filteredList.length > visibleCount) {
          $("#moreWrap").classList.remove("hidden");
      } else {
          $("#moreWrap").classList.add("hidden");
      }
  }

  if(window.lucide) lucide.createIcons();
  updateCartStatus();
}

$("#moreBtn").onclick = () => { visibleCount+=60; render(); };

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
      
      // 🔥 툴 이름 변경 🔥
      adminImgBox.innerHTML = `
          <div class="text-xs font-bold text-gray-800 mb-2">🖼️ 제품 이미지 웹 등록 툴</div>
          <a href="${targetUrl}" target="_blank" class="block w-full py-2 mb-2 text-center text-xs font-black bg-blue-600 text-white rounded no-underline">
              🌐 자사몰 열기 (우클릭 -> 이미지 주소 복사)
          </a>
          <div class="flex gap-2">
              <input type="text" id="quickImgUrl" class="ipt flex-1 text-xs mono" placeholder="여기에 복사한 이미지 주소 붙여넣기">
              <button id="quickImgSave" class="px-3 py-1 text-xs font-black bg-black text-white rounded">저장</button>
          </div>
          <div id="quickImgMsg" class="mt-1 text-[11px] font-bold text-gray-600"></div>
      `;
      $("#detailBody").appendChild(adminImgBox);

      adminImgBox.querySelector("#quickImgSave").onclick = async () => {
          const url = adminImgBox.querySelector("#quickImgUrl").value.trim(); if (!url) return;
          const msg = adminImgBox.querySelector("#quickImgMsg"); msg.textContent = "저장 중...";
          try {
              if (typeof IMAGES === "undefined") window.IMAGES = {};
              IMAGES[p.shopNo] = url; 
              
              const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/images.json`;
              let sha = null;
              try { const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); if(r.ok){ const j=await r.json(); sha=j.sha; } }catch(e){}
              const body = { message:"update image manual", content: utf8ToB64(JSON.stringify(IMAGES)), branch: GH.branch };
              if(sha) body.sha = sha;
              const r2 = await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
              if(!r2.ok) throw new Error("API 에러");

              msg.style.color = "green"; msg.textContent = "✓ 완벽하게 저장되었습니다!";
              render(); 
              setTimeout(()=>{openDetail(p);}, 500);
          } catch (err) { msg.style.color = "red"; msg.textContent = "실패: " + err.message; }
      };
  }

  $("#addMemoBtn").onclick = async () => {
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
          
          oldData.push({ date: new Date().toLocaleString(), product: p.품명, shopNo: p.shopNo, staff, tag, text });
          const body = { message:"add memo", content: utf8ToB64(JSON.stringify(oldData, null, 2)), branch: GH.branch };
          if(sha) body.sha = sha;
          
          const r2 = await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
          if(!r2.ok) throw new Error("API 에러");
          
          MEMOS = oldData; 
          
          // 🔥 메모 저장 즉시 상태 변경 및 화면 갱신 (버그 해결) 🔥
          CURRENT_PRODUCT.hasMemo = true;
          const prodIndex = PRODUCTS.findIndex(pr => pr.품번 === CURRENT_PRODUCT.품번);
          if (prodIndex > -1) PRODUCTS[prodIndex].hasMemo = true;
          
          msg.style.color="green"; msg.textContent="✓ 메모가 저장되었습니다.";
          $("#memoText").value = "";
          render(); 
      } catch(e) { msg.style.color="red"; msg.textContent="메모 저장 실패!"; }
  };

  $("#detailModal").classList.remove("hidden");
}

// 🔥 ESC 키 누르면 팝업 닫기 추가 🔥
document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") {
        $$('.modal-backdrop').forEach(m => m.classList.add("hidden"));
    }
});

$$('.modal-backdrop').forEach(modal => {
    modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.classList.contains("modal-outer")) {
            modal.classList.add("hidden");
        }
    });
});
$$('button[id^="close"]').forEach(btn => {
    btn.addEventListener("click", (e) => {
        e.target.closest('.modal-backdrop').classList.add("hidden");
    });
});

$("#addCartBtn").onclick=()=>{
  CART.push({ 품명:CURRENT_PRODUCT.품명, 품번:CURRENT_PRODUCT.품번, 사이즈:$("#cartSize").value, 수량:$("#cartQty").value });
  localStorage.setItem('CART', JSON.stringify(CART)); updateCartStatus(); 
  $("#detailModal").classList.add("hidden"); alert("장바구니에 담겼습니다.");
};

$("#copyExcelBtn").onclick = () => {
  const header = "품명\t품번\t사이즈\t개수\n";
  const rows = CART.map(c => `${c.품명}\t${c.품번}\t${c.사이즈}\t${c.수량}`).join("\n");
  copyText(header + rows, $("#copyExcelBtn"));
};
$("#clearCart").onclick = () => { if(confirm("전체 삭제할까요?")){ CART=[]; localStorage.removeItem('CART'); openCartModal(); updateCartStatus(); }};
$("#cartBtn").onclick = openCartModal;

$$('button.chip[data-cat], button.chip[data-gender], button.chip[data-fav], button.chip[data-stock], button.chip[data-memo]').forEach(b=>b.addEventListener("click",()=>{ 
    if(b.dataset.cat) { $$('button.chip[data-cat]').forEach(x=>x.dataset.active=(x===b?"1":"0")); }
    else if(b.dataset.gender) { $$('button.chip[data-gender]').forEach(x=>x.dataset.active=(x===b?"1":"0")); }
    else { b.dataset.active = b.dataset.active==="1" ? "0" : "1"; }
    visibleCount=60; render(); 
}));

$("#resetAll").onclick=()=>{ 
    $$('button.chip[data-cat]').forEach(b=>b.dataset.active=(b.dataset.cat==="ALL"?"1":"0")); 
    $$('button.chip[data-gender]').forEach(b=>b.dataset.active=(b.dataset.gender==="ALL"?"1":"0")); 
    $$('button.chip[data-fav], button.chip[data-stock], button.chip[data-memo]').forEach(b=>b.dataset.active="0"); 
    $$('#brandChips .chip').forEach(b=>b.dataset.active=(b.dataset.brand==="ALL"?"1":"0")); 
    $("#sortSel").value="default";
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
    const f = e.target.files[0]; if(!f) return;
    localStorage.setItem('PREV_RAW', JSON.stringify(RAW)); 
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const wb = XLSX.read(new Uint8Array(ev.target.result), {type:"array"});
        let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:"", raw:true});
        const meta = { fileName:f.name };
        try { 
            await commitInventoryToGitHub(rows, meta); 
            RAW = rows; CURRENT_META = meta; 
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({rows, meta, images:IMAGES, memos:MEMOS, _timestamp: Date.now()})); 
            applyMeta(CURRENT_META);
            rebuildIndex(); render();
            $("#adminModal").classList.add("hidden");
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
$("#ghSave").onclick=()=>{
    GH = { owner:$("#ghOwner").value.trim(), repo:$("#ghRepo").value.trim(), branch:$("#ghBranch").value.trim()||"main" };
    saveGhConfig(); setPat($("#ghPat").value.trim()); alert("저장됨");
};

loadGhConfig(); loadData();
