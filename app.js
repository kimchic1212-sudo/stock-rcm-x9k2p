// RACEMENT Haeundae Inventory — app.js (v3.7 찐막 복구 버전)
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
function isAdminConfigured(){ return !!(GH.owner && GH.repo && getPat()); }

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
  const c = String(code||"").toUpperCase().trim();
  if(/-M$/.test(c)||/-MEN$/.test(c)||/-MENS$/.test(c)) return "M";
  if(/-W$/.test(c)||/-WMN$/.test(c)||/-F$/.test(c)||/-WOMEN$/.test(c)||/-WMNS$/.test(c)) return "W";
  if(/-K$/.test(c)||/-KIDS$/.test(c)) return "K";
  if(/-U$/.test(c)||/-UNI$/.test(c)) return "U";
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
  const m = s.match(/^T(\d+)$/); if(m) return [2,Number(m[1]),s];
  return [3,0,s];
}
function cmpSize(a,b){ const ka=sizeKey(a), kb=sizeKey(b); for(let i=0;i<3;i++){ if(ka[i]<kb[i]) return -1; if(ka[i]>kb[i]) return 1; } return 0; }
function escapeHtml(s){ return String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function isBarcodeMissing(v){ if(v==null) return true; const s=String(v).trim(); return s===""||s==="0"; }

// === 초성 검색 ===
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
      document.body.appendChild(ta); ta.select(); try{ document.execCommand("copy"); } finally { document.body.removeChild(ta); }
    }
    if(btn){
      const orig = btn.textContent; btn.classList.add("copied"); btn.textContent = "✓ 복사됨";
      setTimeout(()=>{ btn.textContent = orig; btn.classList.remove("copied"); }, 1100);
    }
  }catch(e){ console.error("copy failed:", e); if(btn){ btn.textContent = "복사 실패"; setTimeout(()=>{ btn.textContent = text; }, 1000); } }
}

function applyMeta(meta){
  if(meta && meta.updatedAt) $("#lastUpdated").textContent = "UPDATED · " + meta.updatedAt;
  if(meta && meta.fileName) $("#statSrc").textContent = meta.fileName;
}
function setSyncStatus(kind, text){ const el=$("#syncStatus"); if(!el) return; el.textContent=text; el.dataset.kind=kind; }

function showGate(){ $("#viewerGate").classList.remove("hidden"); setTimeout(()=>{ const i=$("#viewerPwdInput"); if(i) i.focus(); }, 50); }
function hideGate(){ $("#viewerGate").classList.add("hidden"); }
function enforceViewerGate(meta){
  const hash = meta && meta.viewerPasswordHash;
  if(!hash){ hideGate(); return; }
  const stored = localStorage.getItem(VIEWER_UNLOCK_KEY) || sessionStorage.getItem(VIEWER_UNLOCK_KEY);
  if(stored && stored === hash){ hideGate(); return; }
  showGate();
}
async function tryViewerLogin(){
  const v = $("#viewerPwdInput").value;
  const expected = CURRENT_META && CURRENT_META.viewerPasswordHash;
  if(!expected){ hideGate(); return; }
  const m = $("#viewerPwdMsg");
  if(!v){ m.style.color="var(--accent)"; m.textContent="비밀번호를 입력하세요."; return; }
  const h = await sha256Hex(v);
  if(h === expected){
    if($("#rememberDevice").checked) localStorage.setItem(VIEWER_UNLOCK_KEY, h);
    else sessionStorage.setItem(VIEWER_UNLOCK_KEY, h);
    hideGate(); $("#viewerPwdInput").value = ""; m.textContent = "";
  } else {
    m.style.color="var(--accent)"; m.textContent="비밀번호가 일치하지 않습니다.";
    $("#viewerPwdInput").value = ""; $("#viewerPwdInput").focus();
  }
}

async function fetchInventoryFromCloud(){
  const url = "./" + DATA_PATH + "?t=" + Date.now();
  const r = await fetch(url, { cache:"no-store" });
  if(!r.ok) throw new Error("HTTP " + r.status);
  return await r.json();
}
function loadFromCache(){ try{ const c=sessionStorage.getItem(CACHE_KEY); if(c) return JSON.parse(c); }catch(e){} return null; }
function writeCache(data){ try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); }catch(e){} }

async function loadData(force = false){
  setSyncStatus("loading","동기화 중…");
  const cached = loadFromCache();
  const now = Date.now();
  if(!force && cached && cached._timestamp && (now - cached._timestamp < 60000)){
    RAW = cached.rows || []; CURRENT_META = cached.meta || null;
    if(CURRENT_META) applyMeta(CURRENT_META);
    if(RAW.length){ rebuildIndex(); render(); } else render();
    setSyncStatus("ok","동기화 완료 (캐시)");
    enforceViewerGate(CURRENT_META);
    return;
  }
  try{
    const data = await fetchInventoryFromCloud();
    RAW = data.rows || []; CURRENT_META = data.meta || null;
    data._timestamp = now;
    if(CURRENT_META) applyMeta(CURRENT_META);
    writeCache(data);
    if(RAW.length){ rebuildIndex(); render(); } else render();
    setSyncStatus("ok","동기화 완료");
    enforceViewerGate(CURRENT_META);
  }catch(e){
    if(cached){
      RAW = cached.rows || []; CURRENT_META = cached.meta || null;
      if(CURRENT_META) applyMeta(CURRENT_META);
      if(RAW.length){ rebuildIndex(); render(); } else render();
      setSyncStatus("warn","오프라인 캐시 표시");
      enforceViewerGate(CURRENT_META);
    } else {
      RAW=[]; render(); setSyncStatus("err","데이터 없음 (업로드 필요)"); hideGate();
    }
  }
}

async function ghGet(url){ return fetch(url, { headers:{ Authorization:"Bearer "+getPat(), Accept:"application/vnd.github+json" } }); }
async function ghPut(url, body){ return fetch(url, { method:"PUT", headers:{ Authorization:"Bearer "+getPat(), Accept:"application/vnd.github+json", "Content-Type":"application/json" }, body: JSON.stringify(body) }); }
function utf8ToB64(str){ const bytes=new TextEncoder().encode(str); let bin=""; const ck=0x8000; for(let i=0;i<bytes.length;i+=ck) bin+=String.fromCharCode.apply(null, bytes.subarray(i,i+ck)); return btoa(bin); }

async function commitInventoryToGitHub(rows, meta){
  if(!GH.owner || !GH.repo) throw new Error("저장소 설정이 비어있습니다.");
  if(!getPat()) throw new Error("PAT가 설정되지 않았습니다.");
  const apiBase = "https://api.github.com/repos/"+GH.owner+"/"+GH.repo+"/contents/"+DATA_PATH;
  let sha = null;
  try{
    const r = await ghGet(apiBase + "?ref=" + encodeURIComponent(GH.branch) + "&t=" + Date.now());
    if(r.ok){ const j=await r.json(); sha=j.sha; }
  }catch(e){}
  const body = { message:"update inventory", content: utf8ToB64(JSON.stringify({ meta, rows })), branch: GH.branch };
  if(sha) body.sha = sha;
  const r2 = await ghPut(apiBase, body);
  if(!r2.ok) throw new Error("commit 실패");
  return await r2.json();
}
async function ghTestConnection(){
  if(!GH.owner||!GH.repo) throw new Error("설정 미입력");
  if(!getPat()) throw new Error("PAT 미입력");
  const r = await ghGet("https://api.github.com/repos/"+GH.owner+"/"+GH.repo);
  if(!r.ok) throw new Error("연결 실패");
  return await r.json();
}

function rebuildIndex(){
  const map = new Map();
  for(const r of RAW){
    const code = r["품번"] || ""; if(!code) continue;
    if(!map.has(code)){
      map.set(code, {
        품번:code, 품명:r["품명"]||"", 카테고리:r["카테고리2"]||r["카테고리"]||"", 분류:r["품목소분류"]||"", 브랜드: r["브랜드"] || brandFromSubcat(r["품목소분류"]||""), 성별:r["성별"]||"", gender:detectGender(code, r["성별"]), 소비자가:Number(r["소비자가"]||0), shopNo:"", sizes:[], anyBarcodeMissing:false
      });
    }
    const p = map.get(code);
    const sz = r["규격"];
    const busan = Number(r["매장 (부산)"] ?? r["매장(부산)"] ?? 0);
    const sinsa = Number(r["매장 (신사동)"] ?? r["매장(신사동)"] ?? 0);
    const center = Number(r["물류센터"] ?? 0);
    if(isBarcodeMissing(r["POS연동바코드"])) p.anyBarcodeMissing = true;
    const found = p.sizes.find(s=>String(s.size)===String(sz));
    if(found){ found.busan+=busan; found.sinsa+=sinsa; found.center+=center; } else p.sizes.push({ size:sz, busan, sinsa, center });
    if(Number(r["소비자가"]||0) > p.소비자가) p.소비자가 = Number(r["소비자가"]||0);
    if(!p.shopNo){ const sn = String(r["상품번호(샵바이)"] || "").trim(); if(sn && sn !== "0") p.shopNo = sn; }
  }
  PRODUCTS = Array.from(map.values()).map(p=>{
    p.sizes.sort((a,b)=>cmpSize(a.size,b.size));
    p.busanTotal = p.sizes.reduce((a,b)=>a+(b.busan||0),0);
    p.sinsaTotal = p.sizes.reduce((a,b)=>a+(b.sinsa||0),0);
    p.centerTotal = p.sizes.reduce((a,b)=>a+(b.center||0),0);
    p.otherTotal = p.sinsaTotal + p.centerTotal;
    p.canRequest = (p.busanTotal===0) && (p.otherTotal>0);
    p.hasLast = p.sizes.some(s=>(s.busan||0)===1);
    p.barcodeMissing = !!p.anyBarcodeMissing;
    const haySrc = [p.품번,p.품명,p.카테고리,p.브랜드,p.분류,p.성별,p.shopNo,...p.sizes.map(s=>String(s.size))].join(" ");
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
  first.onclick = ()=>{ $$('#brandChips .chip').forEach(c=>c.dataset.active=(c===first?"1":"0")); visibleCount=60; render(); };
}

function getActive(group){ return $$('button.chip[data-'+group+']').find(b=>b.dataset.active==="1"); }
function getFilters(){
  return {
    cat: (getActive("cat")||{}).dataset?.cat || "ALL",
    gender: (getActive("gender")||{}).dataset?.gender || "ALL",
    brand: ($$('#brandChips .chip').find(b=>b.dataset.active==="1")||{}).dataset?.brand || "ALL",
    q: $("#q").value.trim(),
    inStock: !!$$('button.chip[data-stock]').find(b=>b.dataset.active==="1"),
    otherOnly: !!$$('button.chip[data-other]').find(b=>b.dataset.active==="1"),
    lastOnly: !!$$('button.chip[data-last]').find(b=>b.dataset.active==="1"),
    noBarcode: !!$$('button.chip[data-nobarcode]').find(b=>b.dataset.active==="1")
  };
}

function renderRecentSearches() {
    const wrap = $("#recentSearches");
    if(!wrap) return;
    if (RECENT_SEARCHES.length === 0) { wrap.classList.add("hidden"); return; }
    wrap.classList.remove("hidden");
    wrap.innerHTML = `<span class="text-[11px] font-bold text-[color:var(--muted)] shrink-0">최근검색</span>` + 
        RECENT_SEARCHES.map(q => `<button class="chip recent-q" style="padding:0.2rem 0.5rem; font-size:0.75rem;">${escapeHtml(q)}</button>`).join("");
    $$('.recent-q', wrap).forEach(b => b.addEventListener("click", () => { $("#q").value = b.textContent; visibleCount = 60; render(); }));
}

function applyFilters(){
  const f = getFilters();
  const tokens = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  
  // 최근 검색어 등록
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
    if(f.otherOnly && !p.canRequest) return false;
    if(f.lastOnly && !p.hasLast) return false;
    if(f.noBarcode && !p.barcodeMissing) return false;
    if(tokens.length){
      for(const t of tokens){
        if(isAllChosung(t)){ if(!p._chosungHay.includes(t)) return false; } else { if(!p._hay.includes(t)) return false; }
      }
    }
    return true;
  });
  const sortMode = ($("#sortSel") && $("#sortSel").value) || "brand";
  const subSort = (a,b)=>{
    if(sortMode==="stock") return b.busanTotal-a.busanTotal || String(a.품명).localeCompare(String(b.품명),"ko");
    if(sortMode==="name") return String(a.품명).localeCompare(String(b.품명),"ko") || String(a.품번).localeCompare(String(b.품번),"ko");
    if(sortMode==="priceAsc") return (a.소비자가||0)-(b.소비자가||0);
    if(sortMode==="priceDesc") return (b.소비자가||0)-(a.소비자가||0);
    const br=String(a.브랜드).localeCompare(String(b.브랜드),"ko"); if(br!==0) return br;
    const nm=String(a.품명).localeCompare(String(b.품명),"ko"); if(nm!==0) return nm;
    return String(a.품번).localeCompare(String(b.품번),"ko");
  };
  filtered.sort((a,b)=>{
    const ca=(CAT_ORDER[a.카테고리]!==undefined)?CAT_ORDER[a.카테고리]:9;
    const cb=(CAT_ORDER[b.카테고리]!==undefined)?CAT_ORDER[b.카테고리]:9;
    if(ca!==cb) return ca-cb;
    const sa=a.busanTotal>0?0:(a.canRequest?1:2); const sb=b.busanTotal>0?0:(b.canRequest?1:2);
    if(sa!==sb) return sa-sb;
    return subSort(a,b);
  });
  $("#filterSummary").textContent = fmt(filtered.length)+" 품목 매칭";
}

function render(){
  if(!RAW.length){ $("#emptyState").classList.remove("hidden"); $("#results").classList.add("hidden"); return; }
  $("#emptyState").classList.add("hidden"); $("#results").classList.remove("hidden");
  applyFilters();
  const grid = $("#grid"); grid.innerHTML = "";
  if(filtered.length===0){ $("#noMatch").classList.remove("hidden"); $("#moreBtn").classList.add("hidden"); return; }
  $("#noMatch").classList.add("hidden");
  const slice = filtered.slice(0, visibleCount);
  const frag = document.createDocumentFragment();
  for(const p of slice) frag.appendChild(card(p));
  grid.appendChild(frag);
  if(filtered.length > visibleCount){ $("#moreBtn").classList.remove("hidden"); $("#moreBtn").textContent = "더 보기 (+" + Math.min(60, filtered.length-visibleCount) + ")"; }
  else $("#moreBtn").classList.add("hidden");
  if(window.lucide) lucide.createIcons();
  updateCartBtn();
  renderRecentSearches();
}

function card(p){
  const el = document.createElement("article");
  el.className = "card card-hover p-4 flex flex-col gap-3 cursor-pointer";
  el.addEventListener("click", (e)=>{
    if(e.target.closest('.copyable') || e.target.closest('a') || e.target.closest('button')) return;
    openDetail(p);
  });
  const g = genderLabel(p.gender);
  const hasImg = (typeof IMAGES !== "undefined" && p.shopNo && IMAGES[p.shopNo]);
  const topSection = document.createElement("div");
  topSection.className = "card-top-section" + (hasImg ? " has-image" : "");
  topSection.innerHTML =
      '<div class="top-badges">'
    +   '<span class="badge badge-cat">'+escapeHtml(p.카테고리||"-")+'</span>'
    +   '<span class="badge badge-brand">'+escapeHtml(p.브랜드||"-")+'</span>'
    +   '<span class="badge '+g.cls+'">'+g.sym+' '+g.label+'</span>'
    +   (p.barcodeMissing?'<span class="badge badge-barcode">● 바코드 누락</span>':'')
    + '</div>'
    + '<div class="flex flex-wrap items-center gap-1.5">'
    +   '<button type="button" class="copyable" data-copy="'+escapeHtml(p.품명||"")+'">'+escapeHtml(p.품명||"-")+'</button>'
    +   '<button type="button" class="copyable code" data-copy="'+escapeHtml(p.품번||"")+'">'+escapeHtml(p.품번||"-")+'</button>'
    + '</div>'
    + (hasImg ? '<img class="card-thumb-corner" src="'+escapeHtml(IMAGES[p.shopNo])+'" loading="lazy" onerror="this.remove()">' : '');
  el.appendChild(topSection);

  const sizes = document.createElement("div");
  sizes.className = "grid gap-1.5";
  sizes.style.gridTemplateColumns = "repeat(auto-fill, minmax(56px, 1fr))";
  for(const s of p.sizes){
    const q = s.busan||0; let cls = "size-cell tnum ";
    if(q===0) cls+="zero"; else if(q===1) cls+="last"; else if(q===2) cls+="low"; else cls+="ok";
    sizes.innerHTML += '<div class="'+cls+'"><span class="sz mono">'+escapeHtml(String(s.size!=null?s.size:"-"))+'</span><span class="qty mono real-qty">'+q+'</span><span class="qty mono showroom-qty hidden">'+(q>0?'O':'X')+'</span></div>';
  }
  el.appendChild(sizes);

  if(p.canRequest){
    const callout = document.createElement("div"); callout.className = "callout";
    const sinsaPill = p.sinsaTotal>0 ? '<span class="pill"><span class="mono">신사 '+p.sinsaTotal+'</span></span>' : '';
    const centerPill = p.centerTotal>0 ? '<span class="pill"><span class="mono">물류 '+p.centerTotal+'</span></span>' : '';
    callout.innerHTML = '<div class="row"><i data-lucide="package-search" class="w-4 h-4"></i><span class="font-extrabold">부산 품절 · 요청 가능</span>'+sinsaPill+centerPill+'</div>';
    el.appendChild(callout);
  }

  const loc = document.createElement("div"); loc.className = "loc mono tnum";
  const locItem = (label, n) => '<span class="loc-item '+(n>0?'has':'zero')+'"><span class="dot"></span>'+label+' '+n+'</span>';
  loc.innerHTML = locItem("부산", p.busanTotal) + locItem("신사", p.sinsaTotal) + locItem("물류", p.centerTotal)
    + '<span class="ml-auto font-extrabold" style="color:var(--ink)">'+krw(p.소비자가)+'</span>';
  el.appendChild(loc);
  return el;
}

function tile(label, n, color){
  return '<div class="hairline p-2 text-center"><div class="mono text-[10px] text-[color:var(--muted)]">'+label+'</div><div class="mono font-black tnum text-xl"'+(color?' style="color:'+color+'"':'')+'>'+fmt(n)+'</div></div>';
}

function openDetail(p){
  CURRENT_PRODUCT = p;
  const g = genderLabel(p.gender);
  const hasImg = (typeof IMAGES !== "undefined" && p.shopNo && IMAGES[p.shopNo]);
  
  // 🔥 원본 자사몰 직접 연결 버튼 복원 🔥
  const shopLinkBtn = p.shopNo ? '<div class="mt-3"><a class="shop-link-big" href="https://racement.co.kr/product-detail?productNo='+encodeURIComponent(p.shopNo)+'" target="_blank" rel="noopener"><i data-lucide="external-link" class="w-4 h-4"></i> 자사몰에서 보기</a></div>' : '';

  const headHtml =
      '<div class="flex flex-wrap items-center gap-1.5 mb-2">'
    +   '<span class="badge badge-cat">'+escapeHtml(p.카테고리||"-")+'</span>'
    +   '<span class="badge badge-brand">'+escapeHtml(p.브랜드||"-")+'</span>'
    +   '<span class="badge '+g.cls+'">'+g.sym+' '+g.label+'</span>'
    + '</div>'
    + '<div class="flex items-baseline gap-2 flex-wrap"><span class="font-extrabold text-xl leading-tight">'+escapeHtml(p.품명||"-")+'</span><span class="mono text-[12px] text-[color:var(--muted)]">'+escapeHtml(p.품번)+'</span></div>'
    + '<div class="mt-1 text-sm">소비자가 <span class="mono font-extrabold">'+krw(p.소비자가)+'</span></div>'
    + shopLinkBtn;

  if(hasImg){ $("#detailHead").innerHTML = ""; } else { $("#detailHead").innerHTML = headHtml; }
  
  const totalsRow = '<div class="grid grid-cols-3 gap-2 mb-3">'+tile("부산",p.busanTotal,"var(--accent)")+tile("신사동",p.sinsaTotal)+tile("물류센터",p.centerTotal)+'</div>';
  const head = '<tr class="text-[11px] text-[color:var(--muted)]"><th class="text-left font-bold py-1.5 px-2">규격</th><th class="px-2">부산</th><th class="px-2">신사동</th><th class="px-2">물류</th></tr>';
  const rows = p.sizes.map(s=>{
    const q = s.busan||0;
    let cls = q>0&&q===1?"color:var(--last);background:#FFF1F2": q>0?"color:#047857;background:#ECFDF5": s.sinsa+s.center>0?"color:#92400E;background:#FFFBEB":"color:#9CA3AF;";
    const lastTag = q===1 ? ' <span class="badge badge-last" style="font-size:.55rem;padding:.05rem .3rem;margin-left:.25rem;">LAST</span>' : '';
    return '<tr class="mono tnum text-sm border-t" style="border-color:var(--line)"><td class="py-1.5 px-2 font-bold">'+escapeHtml(String(s.size!=null?s.size:"-"))+'</td><td class="text-center px-2 font-extrabold" style="'+cls+'"><span class="real-qty">'+(s.busan||0)+'</span><span class="showroom-qty hidden">'+(q>0?'O':'X')+'</span>'+lastTag+'</td><td class="text-center px-2">'+(s.sinsa||0)+'</td><td class="text-center px-2">'+(s.center||0)+'</td></tr>';
  }).join("");
  
  const bodyContent = totalsRow + '<div class="hairline overflow-auto"><table class="w-full"><thead>'+head+'</thead><tbody>'+rows+'</tbody></table></div>';
  
  if(hasImg){
    $("#detailBody").innerHTML = '<div class="detail-grid"><img class="detail-thumb-side" src="'+escapeHtml(IMAGES[p.shopNo])+'" onerror="this.remove()"><div class="min-w-0">' + headHtml + bodyContent + '</div></div>';
  } else {
    $("#detailBody").innerHTML = bodyContent;
  }

  // 장바구니 사이즈 셀렉트 연결
  $("#cartSize").innerHTML = p.sizes.map(s=>`<option value="${s.size}">${s.size} (신사:${s.sinsa} / 물류:${s.center})</option>`).join("");

  // 🔥 이미지 수동 등록 패치 (images.js 연동) 🔥
  if (sessionStorage.getItem(SESSION_FLAG) === "1" && p.shopNo) {
      const adminImgBox = document.createElement("div");
      adminImgBox.className = "mt-4 p-3 rounded-lg border-2 border-dashed bg-gray-50";
      adminImgBox.innerHTML = `
        <div class="text-xs font-bold text-gray-800 mb-2">👑 이미지 주소 수동 등록</div>
        <div class="text-[10px] text-gray-500 mb-2">위에 있는 '자사몰에서 보기' 버튼을 눌러 이미지를 우클릭하고 주소를 복사해 오세요.</div>
        <div class="flex gap-2">
          <input type="text" id="quickImgUrl" class="ipt flex-1 text-xs mono" placeholder="여기에 복사한 이미지 주소 붙여넣기">
          <button id="quickImgSave" class="brutal px-3 py-1 text-xs font-black bg-black text-white rounded">저장</button>
        </div>
        <div id="quickImgMsg" class="mt-1 text-[11px] font-bold text-gray-600"></div>
      `;
      $("#detailBody").appendChild(adminImgBox);

      $("#quickImgSave").onclick = async () => {
         const url = $("#quickImgUrl").value.trim();
         if(!url) return;
         $("#quickImgMsg").textContent = "저장 중...";
         try {
             IMAGES[p.shopNo] = url;
             // images.js의 commitImagesAndMeta 함수를 빌려써서 확실하게 저장
             await commitImagesAndMeta(1); 
             $("#quickImgMsg").style.color = "green";
             $("#quickImgMsg").textContent = "✓ 깃허브 저장 완료! 창을 닫고 다시 열면 보입니다.";
             render(); 
         } catch(e) {
             $("#quickImgMsg").style.color = "red";
             $("#quickImgMsg").textContent = "실패: " + e.message;
         }
      }
  }

  $("#detailModal").classList.remove("hidden");
  if(window.lucide) lucide.createIcons();
}

// 🔥 모든 모달 바깥 터치 닫기 강제 적용 🔥
function bindModalClose(modalId){
  const modal = $('#'+modalId);
  if(modal) {
      modal.addEventListener("click", (e)=>{ 
          if(e.target===modal || e.target.classList.contains("modal-outer")) modal.classList.add("hidden"); 
      });
  }
}
bindModalClose("detailModal");
bindModalClose("adminModal");
bindModalClose("cartModal");
$("#closeDetail").addEventListener("click", ()=>$("#detailModal").classList.add("hidden"));
$("#closeCart").addEventListener("click", ()=>$("#cartModal").classList.add("hidden"));
document.addEventListener("keydown", (e)=>{ if(e.key==="Escape"){ $("#detailModal").classList.add("hidden"); $("#adminModal").classList.add("hidden"); $("#cartModal").classList.add("hidden"); } });

// 장바구니 컨트롤
function updateCartBtn(){ 
    const b=$("#cartBtn"); b.classList.toggle("hidden", !CART.length); 
    $("#cartCount").textContent = CART.length;
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
window.deleteCartItem = (idx) => { CART.splice(idx, 1); localStorage.setItem('CART', JSON.stringify(CART)); openCartModal(); updateCartBtn(); };
$("#clearCart").onclick = () => { if(confirm("전체 삭제할까요?")){ CART=[]; localStorage.removeItem('CART'); openCartModal(); updateCartBtn(); }};
$("#cartBtn").onclick = openCartModal;
$("#addCartBtn").onclick = () => {
  CART.push({ 품명:CURRENT_PRODUCT.품명, 품번:CURRENT_PRODUCT.품번, 사이즈:$("#cartSize").value, 수량:$("#cartQty").value });
  localStorage.setItem('CART', JSON.stringify(CART)); updateCartBtn(); alert("담겼습니다!"); $("#detailModal").classList.add("hidden");
};
// 🔥 엑셀 복사 (탭 분할) 🔥
$("#copyExcelBtn").onclick = () => {
  const header = "품명\t품번\t사이즈\t개수\n";
  const rows = CART.map(c => `${c.품명}\t${c.품번}\t${c.사이즈}\t${c.수량}`).join("\n");
  copyText(header + rows, $("#copyExcelBtn"));
};

function setExclusiveActive(group, btn){ $$('button.chip[data-'+group+']').forEach(b=>b.dataset.active=(b===btn?"1":"0")); }
function setToggle(btn){ btn.dataset.active = btn.dataset.active==="1" ? "0" : "1"; }
$$('button.chip[data-cat]').forEach(b=>b.addEventListener("click",()=>{ setExclusiveActive("cat",b); visibleCount=60; render(); }));
$$('button.chip[data-gender]').forEach(b=>b.addEventListener("click",()=>{ setExclusiveActive("gender",b); visibleCount=60; render(); }));
$$('button.chip[data-stock]').forEach(b=>b.addEventListener("click",()=>{ setToggle(b); visibleCount=60; render(); }));
$$('button.chip[data-other]').forEach(b=>b.addEventListener("click",()=>{ setToggle(b); visibleCount=60; render(); }));
$$('button.chip[data-last]').forEach(b=>b.addEventListener("click",()=>{ setToggle(b); visibleCount=60; render(); }));
$$('button.chip[data-nobarcode]').forEach(b=>b.addEventListener("click",()=>{ setToggle(b); visibleCount=60; render(); }));
$("#sortSel").addEventListener("change",()=>{ visibleCount=60; render(); });

let qTimer;
$("#q").addEventListener("input",()=>{ clearTimeout(qTimer); qTimer=setTimeout(()=>{ visibleCount=60; render(); },120); });
$("#clearQ").addEventListener("click",()=>{ $("#q").value=""; visibleCount=60; render(); $("#q").focus(); });
$("#moreBtn").addEventListener("click",()=>{ visibleCount+=60; render(); });
$("#resetAll").addEventListener("click",()=>{
  ["cat","gender"].forEach(g=>$$('button.chip[data-'+g+']').forEach(b=>b.dataset.active=(b.dataset[g]==="ALL"?"1":"0")));
  ["stock","other","last","nobarcode"].forEach(g=>$$('button.chip[data-'+g+']').forEach(b=>b.dataset.active="0"));
  $$('#brandChips .chip').forEach(c=>c.dataset.active=(c.dataset.brand==="ALL"?"1":"0"));
  if($("#sortSel")) $("#sortSel").value="brand";
  $("#q").value=""; visibleCount=60; render();
});

function openAdmin(){
  $("#adminModal").classList.remove("hidden");
  if(sessionStorage.getItem(SESSION_FLAG)==="1") enterAdmin();
  else { $("#authPanel").classList.remove("hidden"); $("#uploadPanel").classList.add("hidden"); $("#settingsPanel").classList.add("hidden"); setTimeout(()=>$("#pwd").focus(),50); }
  if(window.lucide) lucide.createIcons();
}
function enterAdmin(){ $("#authPanel").classList.add("hidden"); if(isAdminConfigured()) showUploadPanel(); else showSettingsPanel(); }
function showUploadPanel(){
  $("#settingsPanel").classList.add("hidden"); $("#uploadPanel").classList.remove("hidden");
  const badge = $("#ghStatusBadge");
  if(isAdminConfigured()){ badge.className="badge badge-stock"; badge.textContent="저장소: "+GH.owner+"/"+GH.repo; }
  else { badge.className="badge badge-out"; badge.textContent="저장소: 미설정"; }
}
function showSettingsPanel(){
  $("#uploadPanel").classList.add("hidden"); $("#settingsPanel").classList.remove("hidden");
  $("#ghOwner").value = GH.owner||""; $("#ghRepo").value = GH.repo||"";
  $("#ghBranch").value = GH.branch||"main"; $("#ghPat").value = getPat()||"";
  $("#ghMsg").textContent = "";
}
function closeAdmin(){ $("#adminModal").classList.add("hidden"); }
$("#adminBtn").addEventListener("click", openAdmin);
$("#adminBtn2").addEventListener("click", openAdmin);
$("#closeAdmin").addEventListener("click", closeAdmin);
$("#closeAdmin2").addEventListener("click", closeAdmin);

$("#pwdGo").addEventListener("click", tryAuth);
$("#pwd").addEventListener("keydown", e=>{ if(e.key==="Enter") tryAuth(); });
function tryAuth(){
  if($("#pwd").value === ADMIN_PWD){ sessionStorage.setItem(SESSION_FLAG,"1"); enterAdmin(); $("#pwdMsg").textContent = ""; } 
  else { $("#pwdMsg").style.color = "var(--accent)"; $("#pwdMsg").textContent = "비밀번호 오류"; $("#pwd").value=""; $("#pwd").focus(); }
}
$("#logout").addEventListener("click", ()=>{
  sessionStorage.removeItem(SESSION_FLAG);
  $("#uploadPanel").classList.add("hidden"); $("#settingsPanel").classList.add("hidden");
  $("#authPanel").classList.remove("hidden"); $("#pwd").value="";
});

$("#openSettings").addEventListener("click", showSettingsPanel);
$("#ghSave").addEventListener("click", ()=>{
  GH.owner = $("#ghOwner").value.trim(); GH.repo = $("#ghRepo").value.trim(); GH.branch = ($("#ghBranch").value.trim() || "main");
  const pat = $("#ghPat").value.trim(); if(pat) setPat(pat); saveGhConfig();
  const m = $("#ghMsg"); m.style.color="var(--green)"; m.textContent="✓ 설정 저장 완료";
  setTimeout(showUploadPanel, 600);
});
$("#ghTest").addEventListener("click", async ()=>{
  const oldOwner=GH.owner, oldRepo=GH.repo, oldBranch=GH.branch, oldPat=getPat();
  GH.owner=$("#ghOwner").value.trim(); GH.repo=$("#ghRepo").value.trim(); GH.branch=($("#ghBranch").value.trim()||"main");
  setPat($("#ghPat").value.trim());
  const m = $("#ghMsg"); m.style.color="var(--ink)"; m.textContent="연결 시도 중…";
  try{ const j = await ghTestConnection(); m.style.color="var(--green)"; m.textContent="✓ 연결 성공"; }
  catch(e){ m.style.color="var(--accent)"; m.textContent="✗ "+e.message; } 
  finally { GH.owner=oldOwner; GH.repo=oldRepo; GH.branch=oldBranch; if(oldPat) setPat(oldPat); else setPat(""); }
});
$("#refreshBtn").addEventListener("click", ()=>{ loadData(true); });
$("#showroomBtn").addEventListener("click", ()=>{ document.body.classList.toggle("showroom-mode"); $("#showroomBtn").classList.toggle("bg-[color:var(--accent)]"); $("#showroomBtn").classList.toggle("text-white"); });
$("#darkModeBtn").addEventListener("click", ()=>{ document.documentElement.classList.toggle("dark-mode"); localStorage.setItem("theme", document.documentElement.classList.contains("dark-mode") ? "dark" : "light"); });
if(localStorage.getItem("theme") === "dark") document.documentElement.classList.add("dark-mode");

const drop = $("#drop"); const fileInput = $("#file");
$("#pickBtn").addEventListener("click", e=>{ e.stopPropagation(); fileInput.click(); });
drop.addEventListener("click", ()=>fileInput.click());
fileInput.addEventListener("change", e=>{ const f = e.target.files[0]; if(f) handleFile(f); });
["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); e.stopPropagation(); drop.classList.add("dragging"); }));
["dragleave","drop"].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); e.stopPropagation(); drop.classList.remove("dragging"); }));
drop.addEventListener("drop", e=>{ const f = e.dataTransfer.files[0]; if(f) handleFile(f); });

function handleFile(file){
  const msg = $("#parseMsg");
  msg.style.color = "var(--ink)"; msg.textContent = "엑셀 파싱 중… (" + file.name + ")";
  const reader = new FileReader();
  reader.onload = async (e)=>{
    try{
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, {type:"array"});
      const sheet = wb.Sheets[wb.SheetNames[0]];
      let rows = XLSX.utils.sheet_to_json(sheet, {defval:"", raw:true});
      rows = rows.map(r=>{ const o={}; for(const k in r) o[String(k).trim()] = r[k]; return o; });
      const stamp = new Date().toLocaleString("ko-KR",{hour12:false}).replace(/\.$/,"");
      const meta = { updatedAt:stamp, fileName:file.name, count:rows.length };
      if(CURRENT_META && CURRENT_META.viewerPasswordHash) meta.viewerPasswordHash = CURRENT_META.viewerPasswordHash;
      msg.style.color="var(--ink)"; msg.textContent="GitHub에 업로드 중… ("+fmt(rows.length)+"행)";
      try{ await commitInventoryToGitHub(rows, meta); }
      catch(err){ msg.style.color="var(--accent)"; msg.textContent="업로드 실패: "+err.message; return; }
      RAW = rows; CURRENT_META = meta; applyMeta(meta); writeCache({rows, meta, _timestamp: Date.now()}); rebuildIndex();
      visibleCount = 60; render();
      msg.style.color="var(--green)"; msg.textContent="✓ 업로드 완료"; setSyncStatus("ok","업로드 반영 중");
      setTimeout(closeAdmin, 1400);
    }catch(err){ msg.style.color="var(--accent)"; msg.textContent="파싱 실패: "+err.message; }
  };
  reader.readAsArrayBuffer(file);
}

loadGhConfig();
loadData();
if(window.lucide) lucide.createIcons();
