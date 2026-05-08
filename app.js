const ADMIN_PWD = "1212";
const SESSION_FLAG = "racement_admin_session";
const GH_CONFIG_KEY = "racement_gh_config_v1";
const GH_PAT_KEY = "racement_gh_pat_v1";
const CACHE_KEY = "racement_inventory_cache_v1";
const VIEWER_UNLOCK_KEY = "racement_viewer_unlock_v1";
const DATA_PATH = "inventory.json";
const CAT_ORDER = { "신발":0, "의류":1, "용품":2 };

let GH = { owner:"", repo:"", branch:"main" };
let RAW=[], PRODUCTS=[], BRANDS=[], filtered=[];
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

async function sha256Hex(str){
  const buf = new TextEncoder().encode(str);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function detectGender(code, sex){
  const g = String(sex||"").trim();
  if(g==="남성"||g==="남"||g.toUpperCase()==="M"||g.toUpperCase()==="MEN") return "M";
  if(g==="여성"||g==="여"||g.toUpperCase()==="W"||g.toUpperCase()==="F"||g.toUpperCase()==="WOMEN") return "W";
  if(g==="키즈"||g.toUpperCase()==="KIDS"||g.toUpperCase()==="K") return "K";
  if(g==="공용"||g==="남,여"||g.toUpperCase()==="U"||g.toUpperCase()==="UNISEX") return "U";
  return "U";
}
function genderLabel(g){
  if(g==="M") return {sym:"♂", label:"남성", cls:"badge-men"};
  if(g==="W") return {sym:"♀", label:"여성", cls:"badge-women"};
  if(g==="K") return {sym:"★", label:"키즈", cls:"badge-kids"};
  return {sym:"⚥", label:"공용", cls:"badge-uni"};
}
function brandFromSubcat(sub){
  if(!sub) return "";
  const m = String(sub).match(/[\(（]([^)）]+)[)）]/);
  return m ? m[1].trim() : String(sub).trim();
}
const SIZE_ORDER = ["XXS","XS","S","S/M","M","M/L","L","XL","XXL","XXXL","1SIZE","OSFW"];
function sizeKey(sz){
  if(sz==null) return [9,9999,""];
  const s = String(sz).trim().toUpperCase();
  const n = Number(s);
  if(!Number.isNaN(n) && s!=="") return [0,n,s];
  const idx = SIZE_ORDER.indexOf(s);
  if(idx>=0) return [1,idx,s];
  return [3,0,s];
}
function cmpSize(a,b){ const ka=sizeKey(a), kb=sizeKey(b); for(let i=0;i<3;i++){ if(ka[i]<kb[i]) return -1; if(ka[i]>kb[i]) return 1; } return 0; }
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
function isAllChosung(s){ return /^[ㄱ-ㅎ]+$/.test(s); }

async function copyText(text, btn){
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){ await navigator.clipboard.writeText(text); } 
    else {
      const ta = document.createElement("textarea"); ta.value = text; ta.style.position="fixed"; ta.style.opacity="0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    if(btn){
      const orig = btn.textContent; btn.classList.add("copied"); btn.textContent = "✓ 복사됨";
      setTimeout(()=>{ btn.textContent = orig; btn.classList.remove("copied"); }, 1100);
    }
  }catch(e){}
}

function applyMeta(meta){
  if(meta && meta.fileName) $("#statSrc").textContent = meta.fileName;
}
function setSyncStatus(kind, text){ const el=$("#syncStatus"); if(!el) return; el.textContent=text; el.dataset.kind=kind; }

async function loadData(force = false){
  setSyncStatus("loading","동기화 중…");
  const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
  const now = Date.now();

  if (!force && cached && cached._timestamp && (now - cached._timestamp < 60000)) {
    RAW = cached.rows || []; CURRENT_META = cached.meta || null;
    applyMeta(CURRENT_META);
    if(RAW.length){ rebuildIndex(); render(); } else render();
    setSyncStatus("ok","동기화 완료 (캐시)");
    renderRecentSearches();
    return;
  }

  try{
    const r = await fetch("./" + DATA_PATH + "?t=" + Date.now(), { cache:"no-store" });
    if(!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    RAW = data.rows || []; CURRENT_META = data.meta || null;
    data._timestamp = now;
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    applyMeta(CURRENT_META);
    if(RAW.length){ rebuildIndex(); render(); } else render();
    setSyncStatus("ok","동기화 완료");
  }catch(e){
    if(cached){
      RAW = cached.rows || []; CURRENT_META = cached.meta || null;
      applyMeta(CURRENT_META); rebuildIndex(); render();
      setSyncStatus("warn","오프라인 캐시 표시");
    } else {
      RAW=[]; render(); setSyncStatus("err","데이터 없음");
    }
  }
  renderRecentSearches();
}

async function ghPut(url, body){ return fetch(url, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), Accept:"application/vnd.github+json", "Content-Type":"application/json" }, body: JSON.stringify(body) }); }
function utf8ToB64(str){ const bytes=new TextEncoder().encode(str); let bin=""; const ck=0x8000; for(let i=0;i<bytes.length;i+=ck) bin+=String.fromCharCode.apply(null, bytes.subarray(i,i+ck)); return btoa(bin); }

async function commitInventoryToGitHub(rows, meta){
  const apiBase = "https://api.github.com/repos/"+GH.owner+"/"+GH.repo+"/contents/"+DATA_PATH;
  let sha = null;
  try{
    const r = await fetch(apiBase + "?ref=" + encodeURIComponent(GH.branch) + "&t=" + Date.now(), { headers:{ Authorization:"Bearer "+getPat() } });
    if(r.ok){ const j=await r.json(); sha=j.sha; }
  }catch(e){}
  const body = { message:"update inventory", content: utf8ToB64(JSON.stringify({ meta, rows })), branch: GH.branch };
  if(sha) body.sha = sha;
  const r2 = await ghPut(apiBase, body);
  if(!r2.ok) throw new Error("commit 실패");
  return await r2.json();
}

function rebuildIndex(){
  const map = new Map();
  const prevRaw = JSON.parse(localStorage.getItem('PREV_RAW') || '[]');

  for(const r of RAW){
    const code = r["품번"] || ""; if(!code) continue;
    if(!map.has(code)){
      map.set(code, {
        품번:code, 품명:r["품명"]||"", 카테고리:r["카테고리2"]||r["카테고리"]||"",
        브랜드: r["브랜드"] || brandFromSubcat(r["품목소분류"]||""),
        성별:r["성별"]||"", gender:detectGender(code, r["성별"]),
        소비자가:Number(r["소비자가"]||0), shopNo:"", sizes:[], anyBarcodeMissing:false
      });
    }
    const p = map.get(code);
    const sz = r["규격"];
    const busan = Number(r["매장 (부산)"] ?? r["매장(부산)"] ?? 0);
    const sinsa = Number(r["매장 (신사동)"] ?? r["매장(신사동)"] ?? 0);
    const center = Number(r["물류센터"] ?? 0);
    
    if(isBarcodeMissing(r["POS연동바코드"])) p.anyBarcodeMissing = true;

    const found = p.sizes.find(s=>String(s.size)===String(sz));
    if(found){ found.busan+=busan; found.sinsa+=sinsa; found.center+=center; }
    else p.sizes.push({ size:sz, busan, sinsa, center });
    
    if(Number(r["소비자가"]||0) > p.소비자가) p.소비자가 = Number(r["소비자가"]||0);
    if(!p.shopNo){
      const sn = String(r["상품번호(샵바이)"] || "").trim();
      if(sn && sn !== "0") p.shopNo = sn;
    }
  }

  const GOLDEN_M = ['260', '265', '270', '275'];
  const GOLDEN_W = ['235', '240', '245'];

  PRODUCTS = Array.from(map.values()).map(p=>{
    p.sizes.sort((a,b)=>cmpSize(a.size,b.size));
    p.busanTotal = p.sizes.reduce((a,b)=>a+(b.busan||0),0);
    p.sinsaTotal = p.sizes.reduce((a,b)=>a+(b.sinsa||0),0);
    p.centerTotal = p.sizes.reduce((a,b)=>a+(b.center||0),0);
    p.otherTotal = p.sinsaTotal + p.centerTotal;
    p.canRequest = (p.busanTotal===0) && (p.otherTotal>0);
    p.hasLast = p.sizes.some(s=>(s.busan||0)===1);
    p.barcodeMissing = !!p.anyBarcodeMissing;

    let urgent = false;
    p.sizes.forEach(s => {
        if (s.busan === 0) {
            if (p.gender === 'M' && GOLDEN_M.includes(String(s.size))) urgent = true;
            if (p.gender === 'W' && GOLDEN_W.includes(String(s.size))) urgent = true;
        }
    });
    p.urgentRestock = urgent;

    const prevTotal = prevRaw.filter(r => r["품번"] === p.품번).reduce((sum, r) => sum + Number(r["매장 (부산)"] ?? r["매장(부산)"] ?? 0), 0);
    p.delta = prevRaw.length > 0 ? (p.busanTotal - prevTotal) : 0;

    const haySrc = [p.품번,p.품명,p.카테고리,p.브랜드,p.성별,p.shopNo,...p.sizes.map(s=>String(s.size))].join(" ");
    p._hay = haySrc.toLowerCase(); p._chosungHay = getChosung(haySrc);
    return p;
  });

  BRANDS = Array.from(new Set(PRODUCTS.map(p=>p.브랜드).filter(Boolean))).sort((a,b)=>PRODUCTS.filter(p=>p.브랜드===b).length - PRODUCTS.filter(p=>p.브랜드===a).length);
  populateBrandChips();
  $("#statItems").textContent = fmt(PRODUCTS.length);
  $("#statBusan").textContent = fmt(PRODUCTS.reduce((a,p)=>a+p.busanTotal,0));
}

function populateBrandChips(){
  const wrap = $("#brandChips"); const first = wrap.querySelector('[data-brand="ALL"]');
  wrap.innerHTML = ""; wrap.appendChild(first);
  for(const b of BRANDS){
    const btn = document.createElement("button"); btn.className="chip"; btn.dataset.brand=b; btn.textContent=b;
    btn.addEventListener("click", ()=>{ $$('#brandChips .chip').forEach(c=>c.dataset.active=(c===btn?"1":"0")); visibleCount=60; render(); });
    wrap.appendChild(btn);
  }
}

function getFilters(){
  return {
    cat: ($$('button.chip[data-cat]').find(b=>b.dataset.active==="1")||{}).dataset?.cat || "ALL",
    gender: ($$('button.chip[data-gender]').find(b=>b.dataset.active==="1")||{}).dataset?.gender || "ALL",
    brand: ($$('#brandChips .chip').find(b=>b.dataset.active==="1")||{}).dataset?.brand || "ALL",
    q: $("#q").value.trim(),
    inStock: !!$$('button.chip[data-stock]').find(b=>b.dataset.active==="1"),
    favOnly: !!$$('button.chip[data-fav]').find(b=>b.dataset.active==="1")
  };
}

function applyFilters(){
  const f = getFilters();
  const tokens = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  
  if(f.q && (!RECENT_SEARCHES.length || RECENT_SEARCHES[0] !== f.q)) {
      RECENT_SEARCHES = RECENT_SEARCHES.filter(q => q !== f.q);
      RECENT_SEARCHES.unshift(f.q);
      if(RECENT_SEARCHES.length > 5) RECENT_SEARCHES.pop();
      localStorage.setItem('RECENT_SEARCHES', JSON.stringify(RECENT_SEARCHES));
      renderRecentSearches();
  }

  filtered = PRODUCTS.filter(p=>{
    if(f.cat!=="ALL" && p.카테고리!==f.cat) return false;
    if(f.gender!=="ALL" && p.gender!==f.gender) return false;
    if(f.brand!=="ALL" && p.브랜드!==f.brand) return false;
    if(f.inStock && p.busanTotal<=0) return false;
    if(f.favOnly && !FAVS.includes(p.품번)) return false; 
    if(tokens.length){
      for(const t of tokens){
        if(isAllChosung(t)){ if(!p._chosungHay.includes(t)) return false; } 
        else { if(!p._hay.includes(t)) return false; }
      }
    }
    return true;
  });

  filtered.sort((a,b) => {
    const ca=(CAT_ORDER[a.카테고리]!==undefined)?CAT_ORDER[a.카테고리]:9;
    const cb=(CAT_ORDER[b.카테고리]!==undefined)?CAT_ORDER[b.카테고리]:9;
    if(ca!==cb) return ca-cb;
    const sa=a.busanTotal>0?0:1; const sb=b.busanTotal>0?0:1;
    if(sa!==sb) return sa-sb;
    return String(a.품명).localeCompare(String(b.품명));
  });
  $("#filterSummary").textContent = fmt(filtered.length)+" 품목 매칭";
}

function renderRecentSearches() {
    const wrap = $("#recentSearches");
    if(!wrap) return;
    if (RECENT_SEARCHES.length === 0) { wrap.classList.add("hidden"); return; }
    wrap.classList.remove("hidden");
    wrap.innerHTML = `<span class="text-[11px] font-bold text-[color:var(--muted)] shrink-0">최근검색</span>` + 
        RECENT_SEARCHES.map(q => `<button class="chip recent-q" style="padding:0.2rem 0.5rem; font-size:0.75rem;">${escapeHtml(q)}</button>`).join("");
    
    $$('.recent-q', wrap).forEach(b => b.addEventListener("click", () => {
        $("#q").value = b.textContent;
        visibleCount = 60; render();
    }));
}

function render(){
  if(!RAW.length){ $("#emptyState").classList.remove("hidden"); $("#results").classList.add("hidden"); return; }
  $("#emptyState").classList.add("hidden"); $("#results").classList.remove("hidden");
  applyFilters();
  const grid = $("#grid"); grid.innerHTML = "";
  if(filtered.length===0){ $("#noMatch").classList.remove("hidden"); $("#moreBtn").classList.add("hidden"); return; }
  $("#noMatch").classList.add("hidden");
  const slice = filtered.slice(0, visibleCount);
  
  for(const p of slice) grid.appendChild(card(p));
  if(filtered.length > visibleCount){ $("#moreBtn").classList.remove("hidden"); $("#moreBtn").textContent = "더 보기 (+" + Math.min(60, filtered.length-visibleCount) + ")"; }
  else $("#moreBtn").classList.add("hidden");
  if(window.lucide) lucide.createIcons();
  updateCartCopyBtn();
}

function card(p){
  const el = document.createElement("article");
  el.className = "card card-hover p-4 flex flex-col gap-0 relative";
  
  el.addEventListener("click", (e)=> {
    const copyBtn = e.target.closest('[data-copy]');
    if(copyBtn) { copyText(copyBtn.dataset.copy, copyBtn); return; }
    if(e.target.closest('a') || e.target.closest('button')) return;
    openDetail(p);
  });

  const g = genderLabel(p.gender);
  
  // UX 개편: 태그를 텍스트로 단순화
  const tags = [p.카테고리, p.브랜드, g.label].filter(Boolean).join(" · ");
  
  let extraBadges = "";
  if (p.delta > 0) extraBadges += `<span class="delta-badge ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">▲+${p.delta}</span>`;
  else if (p.delta < 0) extraBadges += `<span class="delta-badge ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">▼${p.delta}</span>`;
  if (p.barcodeMissing) extraBadges += `<span class="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold" style="background:#F2E7FE;color:#5E35B1;">바코드 누락</span>`;
  if (p.urgentRestock) extraBadges += `<span class="urgent-badge ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold border border-red-500 text-red-600">🚨 황금결품</span>`;

  const favIcon = FAVS.includes(p.품번) ? '★' : '☆';
  const imgSrc = (typeof IMAGES !== "undefined" && IMAGES[p.shopNo]) ? IMAGES[p.shopNo] : null;

  // UX 개편: Boxless 썸네일 구조
  const headerHtml = `
    <div class="flex justify-between items-start gap-3 w-full">
       <div class="flex-1 min-w-0 flex flex-col items-start pt-1">
          <div class="text-[12px] text-[#888] font-semibold mb-1.5 flex flex-wrap items-center leading-tight">${tags}${extraBadges}</div>
          <div class="copyable text-[16px] font-bold leading-tight mb-1 text-ellipsis overflow-hidden w-full text-left" data-copy="${escapeHtml(p.품명)}">${escapeHtml(p.품명||"-")}</div>
          <div class="copyable text-[14px] text-[#666] mb-3 border-none px-0 w-full text-left" data-copy="${escapeHtml(p.품번)}">${escapeHtml(p.품번||"-")}</div>
       </div>
       <div class="shrink-0 flex flex-col items-end gap-2">
          <button class="fav-btn text-xl leading-none z-10">${favIcon}</button>
          ${imgSrc ? `<img src="${imgSrc}" class="w-[60px] h-[60px] object-contain mix-blend-multiply dark:mix-blend-normal bg-transparent">` : ''}
       </div>
    </div>
  `;
  
  const headWrapper = document.createElement("div");
  headWrapper.innerHTML = headerHtml;
  const favBtn = headWrapper.querySelector('.fav-btn');
  favBtn.onclick = (e) => {
      e.stopPropagation();
      if(FAVS.includes(p.품번)) FAVS = FAVS.filter(id => id !== p.품번);
      else FAVS.push(p.품번);
      localStorage.setItem('FAVS', JSON.stringify(FAVS));
      render();
  };
  el.appendChild(headWrapper);

  // UX 개편: 라스트 뱃지 제거 및 터치 타겟이 보장된 사이즈 그리드
  const sizes = document.createElement("div");
  sizes.className = "grid gap-1.5 mt-1";
  sizes.style.gridTemplateColumns = "repeat(auto-fill, minmax(44px, 1fr))";
  for(const s of p.sizes){
    const q = s.busan||0;
    let cls = "size-cell tnum ";
    if(q === 0) cls += "zero";
    else if(q <= 2) cls += "low";

    sizes.innerHTML += `
        <div class="${cls}">
            <span class="sz mono">${escapeHtml(String(s.size))}</span>
            <span class="qty mono real-qty">${q}</span>
            <span class="qty mono showroom-qty hidden">${q>0?'O':'X'}</span>
        </div>
    `;
  }
  el.appendChild(sizes);

  // UX 개편: 가독성 강화 하단 영역 (도트 삭제 및 폰트 변경)
  const locInfo = document.createElement("div");
  locInfo.className = "mt-4 pt-3 border-t border-[color:var(--line)] flex justify-between items-center text-[13px]";
  locInfo.innerHTML = `
    <div class="loc-text flex gap-1.5 items-center">
       <span class="font-bold text-[#111] dark:text-gray-100">부산 ${p.busanTotal}</span>
       <span class="text-[#999]">|</span>
       <span class="text-[#666] dark:text-gray-400">신사 ${p.sinsaTotal}</span>
       <span class="text-[#999]">|</span>
       <span class="text-[#666] dark:text-gray-400">물류 ${p.centerTotal}</span>
    </div>
    <div class="ml-auto font-semibold text-black dark:text-white tracking-tight" style="font-family: sans-serif; font-size: 15px;">${krw(p.소비자가)}</div>
  `;
  el.appendChild(locInfo);

  return el;
}

function openDetail(p){
  CURRENT_PRODUCT = p;
  const g = genderLabel(p.gender);
  
  const imgSrc = (typeof IMAGES !== "undefined" && IMAGES[p.shopNo]) ? IMAGES[p.shopNo] : null;
  const imgHtml = imgSrc ? `<img src="${imgSrc}" class="w-full h-auto rounded-lg mb-3 object-contain border border-[color:var(--line)]" style="max-height: 200px; background:var(--surface);">` : '';

  $("#detailHead").innerHTML = `
    ${imgHtml}
    <div class="flex gap-1.5 mb-2"><span class="badge badge-brand">${escapeHtml(p.브랜드)}</span><span class="badge ${g.cls}">${g.label}</span></div>
    <div class="font-extrabold text-xl">${escapeHtml(p.품명)}</div>
    <div class="mono text-sm text-[color:var(--muted)] mt-1">${escapeHtml(p.품번)}</div>
  `;

  const head = '<tr class="text-[11px] text-[color:var(--muted)]"><th class="text-left font-bold py-1.5 px-2">규격</th><th class="px-2 text-center">부산</th><th class="px-2 text-center">신사동</th><th class="px-2 text-center">물류</th></tr>';
  const rows = p.sizes.map(s=>`
    <tr class="mono tnum text-sm border-t border-[color:var(--line)]">
        <td class="py-2 px-2 font-bold">${escapeHtml(String(s.size))}</td>
        <td class="text-center px-2 font-extrabold">
            <span class="real-qty ${s.busan>0?'text-green-700':'text-gray-400'}">${s.busan||0}</span>
            <span class="showroom-qty hidden ${s.busan>0?'text-green-700 font-black':'text-red-500'}">${s.busan>0?'O':'X'}</span>
        </td>
        <td class="text-center px-2">${s.sinsa||0}</td>
        <td class="text-center px-2">${s.center||0}</td>
    </tr>`).join("");

  $("#detailBody").innerHTML = `<table class="w-full mt-4 bg-[color:var(--surface)] rounded-lg"><thead>${head}</thead><tbody>${rows}</tbody></table>`;

  const sizeSelect = $("#cartSize");
  sizeSelect.innerHTML = p.sizes.map(s => `<option value="${s.size}">${s.size} (신사:${s.sinsa} / 물류:${s.center})</option>`).join("");

  if (sessionStorage.getItem(SESSION_FLAG) === "1" && p.shopNo) {
      const adminImgBox = document.createElement("div");
      adminImgBox.className = "mt-4 p-3 rounded-lg border-2 border-dashed border-gray-400 bg-gray-50";
      
      const currentImgMsg = imgSrc ? `<div class="text-[11px] text-blue-600 font-bold mb-2">※ 현재 이 상품은 이미지가 등록되어 있습니다.</div>` : ``;
      const targetUrl = `https://racement.co.kr/product-detail?productNo=${p.shopNo}`;

      adminImgBox.innerHTML = `
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-gray-600">👑 이미지 관리</div>
            <div class="flex gap-1">
                <a href="${targetUrl}" target="_blank" class="px-2 py-1.5 text-[11px] font-black bg-blue-600 text-white rounded no-underline">자사몰 열기</a>
                <button id="autoFetchBtn" class="px-2 py-1.5 text-[11px] font-black bg-green-600 text-white rounded">오토스크랩</button>
            </div>
          </div>
          ${currentImgMsg}
          <div class="flex gap-2">
              <input type="text" id="quickImgUrl" class="ipt flex-1 text-xs mono" placeholder="실패 시 주소 직접 복붙">
              <button id="quickImgSave" class="px-3 py-1 text-xs font-black bg-black text-white rounded">저장</button>
          </div>
          <div id="quickImgMsg" class="mt-1 text-[11px] font-bold text-gray-600"></div>
      `;
      $("#detailBody").appendChild(adminImgBox);

      adminImgBox.querySelector("#autoFetchBtn").addEventListener("click", async () => {
          const msg = adminImgBox.querySelector("#quickImgMsg");
          msg.textContent = "탐색 중... (2~4초)";
          try {
              const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
              const res = await fetch(proxyUrl);
              const data = await res.json();
              const match = data.contents.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
              
              if (match && match[1]) {
                  let imgUrl = match[1]; if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl; 
                  adminImgBox.querySelector("#quickImgUrl").value = imgUrl;
                  msg.style.color = "green"; msg.textContent = "✓ 추출 성공! '저장'을 누르세요.";
              } else {
                  msg.style.color = "red"; msg.textContent = "실패. '자사몰 열기'를 눌러 직접 복사하세요."; 
              }
          } catch (e) { msg.style.color = "red"; msg.textContent = "통신 에러가 발생했습니다."; }
      });

      adminImgBox.querySelector("#quickImgSave").addEventListener("click", async () => {
          const url = adminImgBox.querySelector("#quickImgUrl").value.trim();
          if (!url) return;
          const msg = adminImgBox.querySelector("#quickImgMsg");
          msg.textContent = "저장 중...";
          try {
              if (typeof commitImagesAndMeta !== "undefined") {
                  IMAGES[p.shopNo] = url; 
                  await commitImagesAndMeta(1);
                  msg.style.color = "green"; msg.textContent = "✓ 깃허브 저장 완료!";
                  render(); 
                  openDetail(p); 
              }
          } catch (err) { msg.style.color = "red"; msg.textContent = "실패: " + err.message; }
      });
  }

  $("#detailModal").classList.remove("hidden");
}

$("#detailModal").addEventListener("click", (e) => {
    if (e.target.id === "detailModal" || e.target.classList.contains("modal-outer")) {
        $("#detailModal").classList.add("hidden");
    }
});
$("#closeDetail").addEventListener("click", () => $("#detailModal").classList.add("hidden"));

$("#addCartBtn").addEventListener("click", () => {
    if(!CURRENT_PRODUCT) return;
    const size = $("#cartSize").value;
    const qty = $("#cartQty").value;
    CART.push({ 품명: CURRENT_PRODUCT.품명, 품번: CURRENT_PRODUCT.품번, 사이즈: size, 수량: qty });
    localStorage.setItem('CART', JSON.stringify(CART));
    alert(`${CURRENT_PRODUCT.품명} (${size}) ${qty}개 담겼습니다.`);
    updateCartCopyBtn();
    $("#detailModal").classList.add("hidden");
});

function updateCartCopyBtn() {
    const btn = $("#copyCartBtn");
    if(CART.length > 0) {
        btn.classList.remove("hidden");
        btn.innerHTML = `🛒 요청 복사 (${CART.length})`;
    } else { btn.classList.add("hidden"); }
}

$("#copyCartBtn").addEventListener("click", () => {
    const text = CART.map((c) => `${c.품명} / ${c.품번} / ${c.사이즈} / ${c.수량}개`).join("\n");
    copyText(`[해운대점 이동요청]\n${text}`, $("#copyCartBtn"));
    CART = []; localStorage.removeItem('CART'); updateCartCopyBtn(); 
});

$$('button.chip[data-cat], button.chip[data-gender], button.chip[data-fav]').forEach(b=>b.addEventListener("click",()=>{ 
    if(b.dataset.cat||b.dataset.gender) { $$('button.chip[data-'+(b.dataset.cat?'cat':'gender')+']').forEach(x=>x.dataset.active=(x===b?"1":"0")); }
    else { b.dataset.active = b.dataset.active==="1" ? "0" : "1"; }
    visibleCount=60; render(); 
}));

$("#resetAll").addEventListener("click",()=>{
  ["cat","gender"].forEach(g=>$$('button.chip[data-'+g+']').forEach(b=>b.dataset.active=(b.dataset[g]==="ALL"?"1":"0")));
  $$('button.chip[data-fav]').forEach(b=>b.dataset.active="0");
  $("#q").value=""; visibleCount=60; render();
});

let qTimer;
$("#q").addEventListener("input",()=>{ clearTimeout(qTimer); qTimer=setTimeout(()=>{ visibleCount=60; render(); },120); });
$("#clearQ").addEventListener("click",()=>{ $("#q").value=""; visibleCount=60; render(); $("#q").focus(); });
$("#refreshBtn").addEventListener("click", ()=>{ loadData(true); });

$("#darkModeBtn").addEventListener("click", () => {
    document.documentElement.classList.toggle("dark-mode");
    localStorage.setItem("theme", document.documentElement.classList.contains("dark-mode") ? "dark" : "light");
});
if(localStorage.getItem("theme") === "dark") document.documentElement.classList.add("dark-mode");

$("#showroomBtn").addEventListener("click", () => {
    document.body.classList.toggle("showroom-mode");
    $("#showroomBtn").style.background = document.body.classList.contains("showroom-mode") ? "var(--accent)" : "var(--surface)";
    $("#showroomBtn").style.color = document.body.classList.contains("showroom-mode") ? "#fff" : "var(--ink-2)";
});

$("#file").addEventListener("change", e=>{ 
    const f = e.target.files[0]; if(!f) return;
    localStorage.setItem('PREV_RAW', JSON.stringify(RAW)); 
    const reader = new FileReader();
    reader.onload = async (ev)=>{
        const wb = XLSX.read(new Uint8Array(ev.target.result), {type:"array"});
        let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:"", raw:true});
        const meta = { fileName:f.name };
        try{ 
            await commitInventoryToGitHub(rows, meta); 
            RAW = rows; CURRENT_META = meta; sessionStorage.setItem(CACHE_KEY, JSON.stringify({rows, meta})); 
            rebuildIndex(); render();
            $("#adminModal").classList.add("hidden");
            alert("업로드 성공!");
        } catch(err){ alert("업로드 실패"); }
    };
    reader.readAsArrayBuffer(f);
});

$("#adminBtn").addEventListener("click", () => $("#adminModal").classList.remove("hidden"));
$("#closeAdmin").addEventListener("click", () => $("#adminModal").classList.add("hidden"));
$("#drop").addEventListener("click", () => $("#file").click());
$("#pwdGo").addEventListener("click", () => {
    if($("#pwd").value === ADMIN_PWD) { sessionStorage.setItem(SESSION_FLAG,"1"); $("#authPanel").classList.add("hidden"); $("#uploadPanel").classList.remove("hidden"); }
    else alert("비밀번호 오류");
});
$("#openSettings").addEventListener("click", () => { $("#uploadPanel").classList.add("hidden"); $("#settingsPanel").classList.remove("hidden"); });
$("#ghSave").addEventListener("click", () => {
    GH = { owner:$("#ghOwner").value.trim(), repo:$("#ghRepo").value.trim(), branch:$("#ghBranch").value.trim()||"main" };
    saveGhConfig(); setPat($("#ghPat").value.trim()); alert("저장됨");
});

loadGhConfig();
loadData();
