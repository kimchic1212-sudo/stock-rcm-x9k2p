const ADMIN_PWD = "1212";
const SESSION_FLAG = "racement_admin_session";
const GH_CONFIG_KEY = "racement_gh_config_v1";
const GH_PAT_KEY = "racement_gh_pat_v1";
const CACHE_KEY = "racement_inventory_cache_v1";
const DATA_PATH = "inventory.json";
const REQUESTS_PATH = "requests.json"; 
const TRANSFERS_PATH = "transfers.json"; 
const CAT_ORDER = { "신발":0, "의류":1, "용품":2 };

let GH = { owner:"", repo:"", branch:"main" };
let RAW=[], PRODUCTS=[], filtered=[];
let IMAGES = {}; 
let MEMOS = []; 
let TRANSFERS = []; 
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
            el.innerHTML = `<div class="text-[13px] font-black text-[color:var(--accent)] mb-0.5">✓ ${meta.uploadedAt || ''} 업데이트됨</div><div class="truncate text-xs text-gray-500">${meta.fileName || ''}</div>`;
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
      applyMeta(CURRENT_META);
      rebuildIndex(); render(); 
      return;
  }
  
  try {
      const [invRes, imgRes, memoRes, trRes] = await Promise.all([
          fetch("./" + DATA_PATH + "?t=" + Date.now()),
          fetch("./images.json?t=" + Date.now()).catch(()=>null),
          fetch("./" + REQUESTS_PATH + "?t=" + Date.now()).catch(()=>null),
          fetch("./" + TRANSFERS_PATH + "?t=" + Date.now()).catch(()=>null)
      ]);

      if(!invRes.ok) throw new Error("재고 로드 실패");
      const invData = await invRes.json();
      RAW = invData.rows || []; 
      CURRENT_META = invData.meta || null;

      if(imgRes && imgRes.ok) IMAGES = await imgRes.json();
      else IMAGES = {};

      if(memoRes && memoRes.ok) MEMOS = await memoRes.json();
      else MEMOS = [];

      if(trRes && trRes.ok) TRANSFERS = await trRes.json();
      else TRANSFERS = [];

      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rows: RAW, meta: CURRENT_META, images: IMAGES, memos: MEMOS, transfers: TRANSFERS, _timestamp: Date.now() }));
      
      applyMeta(CURRENT_META);
      rebuildIndex(); render();
  } catch(e) { 
      if(cached) { 
          RAW = cached.rows || []; CURRENT_META = cached.meta; IMAGES = cached.images || {}; MEMOS = cached.memos || []; TRANSFERS = cached.transfers || []; 
          applyMeta(CURRENT_META); rebuildIndex(); render(); 
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
  const allSizes = new Set(); // 🔥 사이즈 필터를 위한 데이터 수집
  
  for(const r of RAW){
    const code = r["품번"]; if(!code) continue;
    if(r["규격"]) allSizes.add(String(r["규격"]).trim()); // 규격 추가

    if(!map.has(code)){
      // 🔥 성별 데이터(p.성별) 원본 저장 추가
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
    
    p.hasMemo = MEMOS.some(m => m.code === p.품번);

    const rawHay = [p.품번||"", p.품명||"", p.브랜드||""].join(" ");
    p._hay = rawHay.toLowerCase();
    p._hayClean = rawHay.replace(/[\s\-_]/g, "").toLowerCase(); 
    p._chosung = getChosung(p._hayClean); 
    
    return p;
  });
  
  // 🔥 동적 사이즈 필터 박스 생성 로직 🔥
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
  // 🔥 상단 패딩 축소 및 레이아웃 최적화
  el.className = "card card-hover p-4 flex flex-col relative bg-white"; 
  el.onclick = (e)=>{ 
    const copyBtn = e.target.closest('[data-copy]');
    if(copyBtn) { copyText(copyBtn.dataset.copy, copyBtn); return; }
    if(!e.target.closest('button')) openDetail(p); 
  };
  
  const imgSrc = IMAGES[p.shopNo] || null;
  
  let deltaHtml = "";
  if (p.delta > 0) deltaHtml = `<span class="text-emerald-600 font-black">▲+${p.delta}</span>`;
  else if (p.delta < 0) deltaHtml = `<span class="text-red-600 font-black">▼${p.delta}</span>`;

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

  const isFav = FAVS.includes(p.품번);

  // 🔥 이미지 확대, 성별 뱃지 추가, 즐겨찾기 우상단 배치 🔥
  el.innerHTML = `
    <div class="flex justify-between items-start mb-2 z-10 relative">
        <div class="flex flex-wrap gap-1.5 text-[11px] font-bold text-gray-500 mt-0.5">
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
       </div>
       
       ${imgSrc ? `<img src="${imgSrc}" class="absolute top-0 right-0 w-[120px] h-[120px] object-contain mix-blend-multiply dark:mix-blend-normal rounded-md">` : '<div class="absolute top-0 right-0 w-[120px] h-[120px] bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-bold">NO IMG</div>'}
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
       <div class="price-clean">${krw(p.소비자가)}</div>
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
  return {
    cat: ($$('button.chip[data-cat]').find(b=>b.dataset.active==="1")||{}).dataset?.cat || "ALL",
    gender: ($$('button.chip[data-gender]').find(b=>b.dataset.active==="1")||{}).dataset?.gender || "ALL",
    brand: ($$('#brandChips .chip').find(b=>b.dataset.active==="1")||{}).dataset?.brand || "ALL",
    q: $("#q").value.trim().toLowerCase(),
    stock: !!$$('button.chip[data-stock]').find(b=>b.dataset.active==="1"),
    favOnly: !!$$('button.chip[data-fav]').find(b=>b.dataset.active==="1"),
    memoOnly: !!$$('button.chip[data-memo]').find(b=>b.dataset.active==="1"),
    size: $("#sizeSel") ? $("#sizeSel").value : "ALL" // 🔥 사이즈 필터값 읽어오기
  };
}

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
  
  let filteredList = PRODUCTS.filter(p=>{
    if(f.cat!=="ALL" && p.카테고리!==f.cat) return false;
    if(f.gender!=="ALL" && p.gender!==f.gender) return false;
    if(f.brand!=="ALL" && p.브랜드!==f.brand) return false;
    if(f.favOnly && !FAVS.includes(p.품번)) return false; 
    if(f.memoOnly && !p.hasMemo) return false;
    
    // 🔥 사이즈 필터 & 재고 조건 통합 처리 🔥
    if(f.size !== "ALL") {
        const sizeObj = p.sizes.find(s => String(s.size).trim() === f.size);
        if(!sizeObj) return false; // 선택한 사이즈 자체가 없는 제품 제외
        if(f.stock && sizeObj.busan <= 0) return false; // 사이즈는 있지만 부산 재고가 없으면 제외
    } else {
        if(f.stock && p.busanTotal <= 0) return false; // 전체 사이즈일 때는 총 재고 확인
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
      $("#grid").parentElement.classList.remove("hidden");
      $("#moreWrap").classList.add("hidden");
  } else {
      $("#noMatch").classList.add("hidden");
      $("#grid").parentElement.classList.remove("hidden");
      
      const slice = filteredList.slice(0, visibleCount);
      slice.forEach(p=>grid.appendChild(card(p)));
      
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
    
    if(!currentMemoDate && availableDates.length > 0) {
        currentMemoDate = availableDates[0]; 
    }

    let html = `
        <div class="flex gap-2 mb-4 bg-gray-100 p-2 rounded-lg items-center">
            <select id="memoDateSelect" class="ipt flex-1 text-sm font-bold bg-white border-gray-300">
                <option value="ALL">🗓️ 전체 날짜 보기</option>
                ${availableDates.map(d => `<option value="${d}" ${d===currentMemoDate?'selected':''}>${d} 메모</option>`).join('')}
            </select>
            <button id="bulkDeleteMemosBtn" class="px-3 py-2 bg-red-50 text-red-600 border border-red-200 font-bold rounded text-sm hover:bg-red-500 hover:text-white transition-colors">
                일괄 삭제
            </button>
        </div>
        <div class="space-y-2">
    `;
    
    let filtered = currentMemoDate === "ALL" ? MEMOS.slice().reverse() : MEMOS.filter(m => m.date.startsWith(currentMemoDate + " ")).slice().reverse();
    
    if(filtered.length === 0) {
        html += "<div class='text-center py-10 text-gray-500 font-bold'>해당 조건에 맞는 메모가 없습니다.</div>";
    } else {
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

    $("#memoDateSelect").onchange = (e) => {
        currentMemoDate = e.target.value;
        renderAllMemos();
    };
    
    $("#bulkDeleteMemosBtn").onclick = async () => {
        const targetText = currentMemoDate === 'ALL' ? '전체' : `${currentMemoDate} 일자`;
        if(!confirm(`⚠️ 정말 [${targetText}] 메모를 일괄 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
        
        try {
            const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${REQUESTS_PATH}`;
            const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); 
            if(!r.ok) throw new Error("로드 실패");
            const j = await r.json(); 
            let oldData = JSON.parse(decodeURIComponent(escape(atob(j.content))));
            
            if(currentMemoDate === "ALL") {
                oldData = [];
            } else {
                oldData = oldData.filter(m => !m.date.startsWith(currentMemoDate + " "));
            }
            
            const body = { message:"bulk delete memos", content: utf8ToB64(JSON.stringify(oldData, null, 2)), branch: GH.branch, sha: j.sha };
            const r2 = await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
            if(!r2.ok) throw new Error("API 에러");
            
            MEMOS = oldData;
            alert("🗑️ 일괄 삭제가 완료되었습니다.");
            
            if(CURRENT_PRODUCT) {
                CURRENT_PRODUCT.hasMemo = MEMOS.some(m => m.code === CURRENT_PRODUCT.품번);
                openDetail(CURRENT_PRODUCT); 
            }
            render();
            currentMemoDate = "ALL"; 
            renderAllMemos();
        } catch(e) { alert("메모 일괄 삭제 실패"); }
    };
}

$("#allMemosBtn").onclick = () => {
    currentMemoDate = ""; 
    renderAllMemos();
    $("#allMemosModal").classList.remove("hidden");
};

window.deleteMemo = async (memoId) => {
    if(!confirm("이 메모를 삭제하시겠습니까?")) return;
    try {
        const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${REQUESTS_PATH}`;
        const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); 
        if(!r.ok) throw new Error("로드 실패");
        const j = await r.json(); 
        let oldData = JSON.parse(decodeURIComponent(escape(atob(j.content))));
        
        oldData = oldData.filter(m => m.id !== memoId);
        
        const body = { message:"delete memo", content: utf8ToB64(JSON.stringify(oldData, null, 2)), branch: GH.branch, sha: j.sha };
        const r2 = await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
        if(!r2.ok) throw new Error("API 에러");
        
        MEMOS = oldData;
        alert("삭제되었습니다.");
        
        if(CURRENT_PRODUCT) {
            CURRENT_PRODUCT.hasMemo = MEMOS.some(m => m.code === CURRENT_PRODUCT.품번);
            openDetail(CURRENT_PRODUCT); 
        }
        render();
        if(!$("#allMemosModal").classList.contains("hidden")) renderAllMemos();
    } catch(e) { alert("메모 삭제 실패"); }
};

window.deleteTransfer = async (trId) => {
    if(!confirm("이 이동 요청을 삭제/취소하시겠습니까?")) return;
    try {
        const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${TRANSFERS_PATH}`;
        const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); 
        if(!r.ok) throw new Error("로드 실패");
        const j = await r.json(); 
        let oldData = JSON.parse(decodeURIComponent(escape(atob(j.content))));
        
        oldData = oldData.filter(m => m.id !== trId);
        
        const body = { message:"delete transfer", content: utf8ToB64(JSON.stringify(oldData, null, 2)), branch: GH.branch, sha: j.sha };
        const r2 = await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
        if(!r2.ok) throw new Error("API 에러");
        
        TRANSFERS = oldData;
        alert("이동 요청이 삭제되었습니다.");
        if($("#transfersModal") && !$("#transfersModal").classList.contains("hidden")) {
            window.renderTransfers();
        }
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
            <div class="modal-content relative bg-[color:var(--bg)] w-[90%] max-w-md max-h-[80vh] flex flex-col rounded-xl overflow-hidden shadow-2xl z-10">
                <div class="p-4 border-b border-[color:var(--line)] flex justify-between items-center bg-[color:var(--surface)]">
                    <h2 class="font-black text-lg text-blue-800">🚚 상품 이동 요청 목록</h2>
                    <button id="closeTransfers" class="p-1"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                <div id="transfersList" class="p-4 overflow-y-auto flex-1 bg-gray-50 space-y-2"></div>
            </div>
        `;
        document.body.appendChild(modal);
        $("#closeTransfers").onclick = () => modal.classList.add("hidden");
        modal.querySelector(".modal-outer").onclick = () => modal.classList.add("hidden");
        listEl = $("#transfersList");
    }

    $("#transfersModal").classList.remove("hidden");
    
    if(TRANSFERS.length === 0) {
        listEl.innerHTML = "<div class='text-center py-10 text-gray-500 font-bold'>대기 중인 이동 요청이 없습니다.</div>";
        return;
    }

    let html = "";
    TRANSFERS.slice().reverse().forEach(t => {
        html += `
        <div class="p-3 bg-white rounded-lg border border-blue-100 text-sm shadow-sm relative">
            <button onclick="deleteTransfer('${t.id}')" class="absolute top-3 right-3 text-gray-300 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            <div class="flex justify-between items-center mb-1 pr-6">
                <span class="font-black text-blue-700">${escapeHtml(t.code)}</span>
                <span class="text-xs text-gray-400">${escapeHtml(t.date)}</span>
            </div>
            <div class="font-bold text-gray-800 mb-2">${escapeHtml(t.product)}</div>
            <div class="flex gap-2 text-xs font-bold text-gray-600 mb-2">
                <span class="bg-gray-100 px-2 py-0.5 rounded">사이즈: ${escapeHtml(t.size)}</span>
                <span class="bg-gray-100 px-2 py-0.5 rounded">수량: <span class="text-blue-600">${t.qty}개</span></span>
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
             <div class="flex items-center gap-2 mb-1">
                 <span class="font-black text-yellow-800">[${escapeHtml(m.tag)}] ${escapeHtml(m.staff)}</span>
                 <span class="text-[10px] text-yellow-600">${escapeHtml(m.date)}</span>
             </div>
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
          <a href="${targetUrl}" target="_blank" class="block w-full py-2 mb-2 text-center text-xs font-black bg-blue-600 text-white rounded no-underline">
              🌐 자사몰 열기 (우클릭 -> 이미지 주소 복사)
          </a>
          <div class="flex gap-2">
              <input type="text" id="quickImgUrl" class="ipt flex-1 text-xs mono" placeholder="복사한 주소 붙여넣기">
              <button id="quickImgSave" class="px-3 py-1 text-xs font-black bg-black text-white rounded">저장</button>
          </div>
          <div id="quickImgMsg" class="mt-1 text-[11px] font-bold text-gray-600"></div>
      `;
      $("#detailBody").appendChild(adminImgBox);

      adminImgBox.querySelector("#quickImgSave").onclick = async () => {
          const url = adminImgBox.querySelector("#quickImgUrl").value.trim(); if (!url) return;
          const msg = adminImgBox.querySelector("#quickImgMsg"); msg.textContent = "저장 중...";
          try {
              IMAGES[p.shopNo] = url; 
              const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/images.json`;
              let sha = null;
              try { const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}}); if(r.ok){ const j=await r.json(); sha=j.sha; } }catch(e){}
              const body = { message:"update image manual", content: utf8ToB64(JSON.stringify(IMAGES)), branch: GH.branch };
              if(sha) body.sha = sha;
              const r2 = await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
              if(!r2.ok) throw new Error("API 에러");

              msg.style.color = "green"; msg.textContent = "✓ 완벽하게 저장되었습니다!";
              render(); setTimeout(()=>{openDetail(p);}, 500);
          } catch (err) { msg.style.color = "red"; msg.textContent = "실패: " + err.message; }
      };
  }

  const trBox = document.createElement("div");
  trBox.className = "mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg";
  trBox.innerHTML = `
      <div class="font-bold text-blue-800 mb-2">🚚 상품 이동 요청</div>
      <div class="flex gap-2 mb-2">
          <select id="trSize" class="ipt flex-1 text-xs"><option value="">사이즈 선택</option>${p.sizes.map(s=>`<option value="${s.size}">${s.size}</option>`).join('')}</select>
          <input type="number" id="trQty" class="ipt w-16 text-xs" placeholder="수량">
      </div>
      <div class="flex gap-2">
          <input type="text" id="trMemo" class="ipt flex-1 text-xs" placeholder="요청 내용 (예: 본사 -> 부산)">
          <button id="addTransferBtn" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-black shrink-0 transition-colors">전송</button>
      </div>
      <div id="trMsg" class="text-[11px] font-bold mt-1"></div>
  `;
  $("#detailBody").appendChild(trBox);

  trBox.querySelector("#addTransferBtn").onclick = async () => {
      const size = trBox.querySelector("#trSize").value;
      const qty = trBox.querySelector("#trQty").value;
      const memo = trBox.querySelector("#trMemo").value.trim();
      const msg = trBox.querySelector("#trMsg");

      if(!size) { msg.style.color="red"; msg.textContent="사이즈를 선택하세요."; return; }
      if(!qty || qty <= 0) { msg.style.color="red"; msg.textContent="수량을 정확히 입력하세요."; return; }
      if(!memo) { msg.style.color="red"; msg.textContent="요청 내용을 입력하세요."; return; }
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
          
          oldData.push({ id: "tr_" + Date.now(), code: p.품번, product: p.품명, date: shortDate, size, qty, memo });
          const body = { message:"add transfer request", content: utf8ToB64(JSON.stringify(oldData, null, 2)), branch: GH.branch };
          if(sha) body.sha = sha;
          
          const r2 = await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
          if(!r2.ok) throw new Error("API 에러");
          
          TRANSFERS = oldData; 
          msg.style.color="green"; msg.textContent="✓ 요청 전송 완료!";
          trBox.querySelector("#trQty").value = "";
          trBox.querySelector("#trMemo").value = "";
      } catch(e) { msg.style.color="red"; msg.textContent="요청 실패!"; }
  };

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
          
          const d = new Date();
          const shortDate = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          const uniqueId = "memo_" + Date.now(); 
          
          oldData.push({ id: uniqueId, code: p.품번, date: shortDate, product: p.품명, shopNo: p.shopNo, staff, tag, text });
          const body = { message:"add memo", content: utf8ToB64(JSON.stringify(oldData, null, 2)), branch: GH.branch };
          if(sha) body.sha = sha;
          
          const r2 = await fetch(apiBase, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), "Content-Type":"application/json" }, body: JSON.stringify(body) });
          if(!r2.ok) throw new Error("API 에러");
          
          MEMOS = oldData; 
          CURRENT_PRODUCT.hasMemo = true;
          
          msg.style.color="green"; msg.textContent="✓ 저장 완료!";
          $("#memoText").value = "";
          render(); 
          openDetail(p); 
      } catch(e) { msg.style.color="red"; msg.textContent="메모 저장 실패!"; }
  };

  $("#detailModal").classList.remove("hidden");
  if(window.lucide) lucide.createIcons();
}

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
    if($("#sizeSel")) $("#sizeSel").value="ALL";
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
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({rows, meta, images:IMAGES, memos:MEMOS, transfers:TRANSFERS, _timestamp: Date.now()})); 
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

window.addEventListener('DOMContentLoaded', () => {
    if ($("#allMemosBtn") && !$("#allTransfersBtn")) {
        const trBtn = document.createElement("button");
        trBtn.id = "allTransfersBtn";
        trBtn.className = $("#allMemosBtn").className.replace(/yellow/g, 'blue');
        trBtn.innerHTML = `🚚 이동요청 목록`;
        trBtn.onclick = window.renderTransfers;
        $("#allMemosBtn").parentNode.insertBefore(trBtn, $("#allMemosBtn").nextSibling);
    }
});

loadGhConfig(); loadData();
