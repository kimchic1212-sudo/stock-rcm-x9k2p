// RACEMENT Haeundae Inventory — app.js (cloud-sync via GitHub)
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

// === 초성 검색 (Korean initial-consonant) ===
const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
function getChosung(str){
  let r = "";
  const s = String(str||"");
  for(let i=0;i<s.length;i++){
    const code = s.charCodeAt(i);
    if(code >= 0xAC00 && code <= 0xD7A3) r += CHO[Math.floor((code - 0xAC00) / 588)];
    else r += s[i].toLowerCase();
  }
  return r;
}
function isAllChosung(s){ return /^[ㄱ-ㅎ]+$/.test(s); }

// === 클릭 복사 ===
async function copyText(text, btn){
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position="fixed"; ta.style.opacity="0";
      document.body.appendChild(ta); ta.select();
      try{ document.execCommand("copy"); } finally { document.body.removeChild(ta); }
    }
    if(btn){
      const orig = btn.textContent;
      btn.classList.add("copied");
      btn.textContent = "✓ 복사됨";
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
    hideGate();
    $("#viewerPwdInput").value = "";
    m.textContent = "";
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

// [FIX #4] 이미지 로드 완료를 기다렸다가 render() 호출
// images.js가 window._rcmImagesReady 프로미스를 설정하면 여기서 await
async function renderAfterImages(){
  if(window._rcmImagesReady) await window._rcmImagesReady;
  render();
}

async function loadData(force = false){
  setSyncStatus("loading","동기화 중…");
  const cached = loadFromCache();
  const cacheAgeLimit = 60 * 1000;
  const now = Date.now();
  // 60초 내 캐시 재사용 (force=true이면 무시 → 새로고침 버튼)
  if(!force && cached && cached._timestamp && (now - cached._timestamp < cacheAgeLimit)){
    RAW = cached.rows || []; CURRENT_META = cached.meta || null;
    if(CURRENT_META) applyMeta(CURRENT_META);
    if(RAW.length){ rebuildIndex(); await renderAfterImages(); } else await renderAfterImages();
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
    if(RAW.length){ rebuildIndex(); await renderAfterImages(); } else await renderAfterImages();
    setSyncStatus("ok","동기화 완료");
    enforceViewerGate(CURRENT_META);
  }catch(e){
    if(cached){
      RAW = cached.rows || []; CURRENT_META = cached.meta || null;
      if(CURRENT_META) applyMeta(CURRENT_META);
      if(RAW.length){ rebuildIndex(); await renderAfterImages(); } else await renderAfterImages();
      setSyncStatus("warn","오프라인 캐시 표시");
      enforceViewerGate(CURRENT_META);
    } else {
      RAW=[]; render(); setSyncStatus("err","데이터 없음 (관리자 업로드 필요)"); hideGate();
    }
    console.warn("Inventory fetch failed:", e);
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
    // 캐시 버스팅 — 연속 commit 시 409 Conflict 방지
    const r = await ghGet(apiBase + "?ref=" + encodeURIComponent(GH.branch) + "&t=" + Date.now());
    if(r.ok){ const j=await r.json(); sha=j.sha; }
    else if(r.status!==404){ const j=await r.json().catch(()=>({})); throw new Error("API "+r.status+": "+(j.message||"")); }
  }catch(e){ if(e.message && !e.message.includes("404")) throw e; }
  const body = {
    message:"update inventory: "+(meta.fileName||"")+" ("+(meta.count||rows.length)+"행)",
    content: utf8ToB64(JSON.stringify({ meta, rows })),
    branch: GH.branch
  };
  if(sha) body.sha = sha;
  const r2 = await ghPut(apiBase, body);
  if(!r2.ok){ const j=await r2.json().catch(()=>({message:r2.statusText})); throw new Error("commit 실패 ("+r2.status+"): "+(j.message||"")); }
  return await r2.json();
}
async function ghTestConnection(){
  if(!GH.owner||!GH.repo) throw new Error("사용자명/저장소명이 비어있습니다.");
  if(!getPat()) throw new Error("PAT가 비어있습니다.");
  const r = await ghGet("https://api.github.com/repos/"+GH.owner+"/"+GH.repo);
  if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error("연결 실패 ("+r.status+"): "+(j.message||"")); }
  return await r.json();
}

function rebuildIndex(){
  const map = new Map();
  for(const r of RAW){
    const code = r["품번"] || ""; if(!code) continue;
    if(!map.has(code)){
      const explicitBrand = r["브랜드"] && String(r["브랜드"]).trim();
      map.set(code, {
        품번:code, 품명:r["품명"]||"",
        카테고리:r["카테고리2"]||r["카테고리"]||"",
        분류:r["품목소분류"]||"",
        브랜드: explicitBrand || brandFromSubcat(r["품목소분류"]||""),
        성별:r["성별"]||"", gender:detectGender(code, r["성별"]),
        소비자가:Number(r["소비자가"]||0),
        shopNo:"",
        sizes:[], anyBarcodeMissing:false
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
    // 자사몰 상품번호 (샵바이) — 첫 번째 비어있지 않은 값 사용
    if(!p.shopNo){
      const sn = String(r["상품번호(샵바이)"] || "").trim();
      if(sn && sn !== "0") p.shopNo = sn;
    }
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
    // 검색 인덱스 사전 계산 (일반 + 초성)
    const haySrc = [p.품번,p.품명,p.카테고리,p.브랜드,p.분류,p.성별,p.shopNo,...p.sizes.map(s=>String(s.size))].join(" ");
    p._hay = haySrc.toLowerCase();
    p._chosungHay = getChosung(haySrc);
    return p;
  });
  // [코드품질] 브랜드별 카운트를 Map으로 미리 계산해 O(n²) → O(n) 정렬
  const brandCount = new Map();
  PRODUCTS.forEach(p => brandCount.set(p.브랜드, (brandCount.get(p.브랜드)||0)+1));
  BRANDS = Array.from(new Set(PRODUCTS.map(p=>p.브랜드).filter(Boolean)))
    .sort((a,b) => (brandCount.get(b)||0) - (brandCount.get(a)||0));
  populateBrandChips();
  $("#statItems").textContent = fmt(PRODUCTS.length);
  $("#statBusan").textContent = fmt(PRODUCTS.reduce((a,p)=>a+p.busanTotal,0));
}
function populateBrandChips(){
  const wrap = $("#brandChips");
  const first = wrap.querySelector('[data-brand="ALL"]');
  wrap.innerHTML = ""; wrap.appendChild(first);
  for(const b of BRANDS){
    const btn = document.createElement("button");
    btn.className="chip"; btn.dataset.brand=b; btn.textContent=b;
    btn.addEventListener("click", ()=>{
      $$('#brandChips .chip').forEach(c=>c.dataset.active=(c===btn?"1":"0"));
      visibleCount=60; render();
    });
    wrap.appendChild(btn);
  }
  first.onclick = ()=>{
    $$('#brandChips .chip').forEach(c=>c.dataset.active=(c===first?"1":"0"));
    visibleCount=60; render();
  };
}

function getActive(group){ return $$('button.chip[data-'+group+']').find(b=>b.dataset.active==="1"); }
function getFilters(){
  const cat = (getActive("cat")||{}).dataset?.cat || "ALL";
  const gender = (getActive("gender")||{}).dataset?.gender || "ALL";
  const brand = ($$('#brandChips .chip').find(b=>b.dataset.active==="1")||{}).dataset?.brand || "ALL";
  return {
    cat, gender, brand, q: $("#q").value.trim(),
    inStock: !!$$('button.chip[data-stock]').find(b=>b.dataset.active==="1"),
    otherOnly: !!$$('button.chip[data-other]').find(b=>b.dataset.active==="1"),
    lastOnly: !!$$('button.chip[data-last]').find(b=>b.dataset.active==="1"),
    noBarcode: !!$$('button.chip[data-nobarcode]').find(b=>b.dataset.active==="1")
  };
}
function applyFilters(){
  const f = getFilters();
  const tokens = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  filtered = PRODUCTS.filter(p=>{
    if(f.cat!=="ALL" && p.카테고리!==f.cat) return false;
    if(f.gender!=="ALL" && p.gender!==f.gender) return false;
    if(f.brand!=="ALL" && p.브랜드!==f.brand) return false;
    if(f.inStock && p.busanTotal<=0) return false;
    if(f.otherOnly && !p.canRequest) return false;
    if(f.lastOnly && !p.hasLast) return false;
    if(f.noBarcode && !p.barcodeMissing) return false;
    if(tokens.length){
      const hay = p._hay || "";
      const chosungHay = p._chosungHay || "";
      for(const t of tokens){
        if(isAllChosung(t)){
          if(!chosungHay.includes(t)) return false;
        } else {
          if(!hay.includes(t)) return false;
        }
      }
    }
    return true;
  });
  const sortMode = ($("#sortSel") && $("#sortSel").value) || "brand";
  const subSort = (a,b)=>{
    if(sortMode==="stock"){ if(b.busanTotal!==a.busanTotal) return b.busanTotal-a.busanTotal; return String(a.품명||"").localeCompare(String(b.품명||""),"ko"); }
    if(sortMode==="name"){ const n=String(a.품명||"").localeCompare(String(b.품명||""),"ko"); if(n!==0) return n; return String(a.품번||"").localeCompare(String(b.품번||""),"ko"); }
    if(sortMode==="priceAsc") return (a.소비자가||0)-(b.소비자가||0);
    if(sortMode==="priceDesc") return (b.소비자가||0)-(a.소비자가||0);
    const br=String(a.브랜드||"").localeCompare(String(b.브랜드||""),"ko"); if(br!==0) return br;
    const nm=String(a.품명||"").localeCompare(String(b.품명||""),"ko"); if(nm!==0) return nm;
    return String(a.품번||"").localeCompare(String(b.품번||""),"ko");
  };
  filtered.sort((a,b)=>{
    const ca=(CAT_ORDER[a.카테고리]!==undefined)?CAT_ORDER[a.카테고리]:9;
    const cb=(CAT_ORDER[b.카테고리]!==undefined)?CAT_ORDER[b.카테고리]:9;
    if(ca!==cb) return ca-cb;
    const sa=a.busanTotal>0?0:(a.canRequest?1:2);
    const sb=b.busanTotal>0?0:(b.canRequest?1:2);
    if(sa!==sb) return sa-sb;
    return subSort(a,b);
  });
  $("#filterSummary").textContent = fmt(filtered.length)+" 품목 매칭 · 부산재고 "+fmt(filtered.reduce((a,p)=>a+p.busanTotal,0))+" EA"
    + (f.otherOnly?"  ·  타지점 요청 가능만":"")
    + (f.lastOnly?"  ·  라스트피스":"")
    + (f.noBarcode?"  ·  바코드 누락":"")
    + (f.q?'  ·  "'+f.q+'"':"");
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
}

function card(p){
  const el = document.createElement("article");
  el.className = "card card-hover p-4 flex flex-col gap-3 cursor-pointer";
  // 이벤트 버블링 차단: 카드 내 버튼/링크/복사칩 클릭 시 모달 안 뜨게
  el.addEventListener("click", (e)=>{
    if(e.target.closest('.copyable') || e.target.closest('a') || e.target.closest('button')) return;
    openDetail(p);
  });
  const g = genderLabel(p.gender);
  const hasImg = (typeof IMAGES !== "undefined" && p.shopNo && IMAGES[p.shopNo]);
  const shopLink = p.shopNo
    ? '<a class="shop-link" href="https://racement.co.kr/product-detail?productNo='+encodeURIComponent(p.shopNo)+'" target="_blank" rel="noopener" title="Racement 자사몰"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>자사몰</a>'
    : '';

  // 상단 섹션 (배지 + 품명/품번) — 이미지 있으면 우측 100px 패딩으로 모서리 이미지 영역 확보
  const topSection = document.createElement("div");
  topSection.className = "card-top-section" + (hasImg ? " has-image" : "");
  topSection.innerHTML =
      '<div class="top-badges">'
    +   '<span class="badge badge-cat">'+escapeHtml(p.카테고리||"-")+'</span>'
    +   '<span class="badge badge-brand">'+escapeHtml(p.브랜드||"-")+'</span>'
    +   '<span class="badge '+g.cls+'"><span style="font-size:.95em;line-height:1">'+g.sym+'</span> '+g.label+'</span>'
    +   shopLink
    +   (p.barcodeMissing?'<span class="badge badge-barcode" title="POS연동바코드 미입력">● 바코드 누락</span>':'')
    + '</div>'
    + '<div class="flex flex-wrap items-center gap-1.5">'
    +   '<button type="button" class="copyable" data-copy="'+escapeHtml(p.품명||"")+'" title="클릭해서 품명 복사">'+escapeHtml(p.품명||"-")+'</button>'
    +   '<button type="button" class="copyable code" data-copy="'+escapeHtml(p.품번||"")+'" title="클릭해서 품번 복사">'+escapeHtml(p.품번||"-")+'</button>'
    + '</div>'
    + (hasImg ? '<img class="card-thumb-corner" src="'+escapeHtml(IMAGES[p.shopNo])+'" alt="'+escapeHtml(p.품명||"")+'" loading="lazy" onerror="this.remove()">' : '');
  el.appendChild(topSection);

  const sizes = document.createElement("div");
  sizes.className = "grid gap-1.5";
  sizes.style.gridTemplateColumns = "repeat(auto-fill, minmax(56px, 1fr))";
  for(const s of p.sizes){
    const cell = document.createElement("div");
    const q = s.busan||0;
    let cls = "size-cell tnum ";
    if(q===0) cls+="zero"; else if(q===1) cls+="last"; else if(q===2) cls+="low"; else cls+="ok";
    cell.className = cls;
    const otherLine = (s.sinsa||s.center) ? "\n신사 "+s.sinsa+" · 물류 "+s.center : "";
    cell.title = "규격 "+s.size+"\n부산 "+q+otherLine;
    cell.innerHTML = '<span class="sz mono">'+escapeHtml(String(s.size!=null?s.size:"-"))+'</span><span class="qty mono">'+q+'</span>';
    sizes.appendChild(cell);
  }
  el.appendChild(sizes);

  if(p.canRequest){
    const callout = document.createElement("div");
    callout.className = "callout";
    const sinsaPill = p.sinsaTotal>0 ? '<span class="pill"><span class="mono">신사 '+p.sinsaTotal+'</span></span>' : '';
    const centerPill = p.centerTotal>0 ? '<span class="pill"><span class="mono">물류 '+p.centerTotal+'</span></span>' : '';
    callout.innerHTML = '<div class="row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg><span class="font-extrabold">부산 품절 · 요청 가능</span>'+sinsaPill+centerPill+'</div>';
    el.appendChild(callout);
  }

  const loc = document.createElement("div");
  loc.className = "loc mono tnum";
  const locItem = (label, n) => '<span class="loc-item '+(n>0?'has':'zero')+'"><span class="dot"></span>'+label+' '+n+'</span>';
  loc.innerHTML = locItem("부산", p.busanTotal) + locItem("신사", p.sinsaTotal) + locItem("물류", p.centerTotal)
    + '<span class="ml-auto font-extrabold" style="color:var(--ink)">'+krw(p.소비자가)+'</span>';
  el.appendChild(loc);
  return el;
}

function tile(label, n, color){
  return '<div class="hairline p-2 text-center"><div class="mono text-[10px] tracking-[.16em] text-[color:var(--muted)]">'+label+'</div><div class="mono font-black tnum text-xl"'+(color?' style="color:'+color+'"':'')+'>'+fmt(n)+'</div></div>';
}
function openDetail(p){
  const g = genderLabel(p.gender);
  const hasImg = (typeof IMAGES !== "undefined" && p.shopNo && IMAGES[p.shopNo]);
  const headHtml =
      '<div class="flex flex-wrap items-center gap-1.5 mb-2">'
    +   '<span class="badge badge-cat">'+escapeHtml(p.카테고리||"-")+'</span>'
    +   '<span class="badge badge-brand">'+escapeHtml(p.브랜드||"-")+'</span>'
    +   '<span class="badge '+g.cls+'">'+g.sym+' '+g.label+'</span>'
    +   (p.barcodeMissing?'<span class="badge badge-barcode">● 바코드 누락</span>':'')
    + '</div>'
    + '<div class="flex items-baseline gap-2 flex-wrap"><span class="font-extrabold text-xl leading-tight">'+escapeHtml(p.품명||"-")+'</span><span class="mono text-[12px] text-[color:var(--muted)]">'+escapeHtml(p.품번)+'</span></div>'
    + '<div class="mt-1 text-sm">소비자가 <span class="mono font-extrabold">'+krw(p.소비자가)+'</span></div>'
    + (p.shopNo ? '<div class="mt-3"><a class="shop-link-big" href="https://racement.co.kr/product-detail?productNo='+encodeURIComponent(p.shopNo)+'" target="_blank" rel="noopener"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>자사몰에서 보기</a></div>' : '');
  if(hasImg){
    $("#detailHead").innerHTML = "";
  } else {
    $("#detailHead").innerHTML = headHtml;
  }
  const totalsRow = '<div class="grid grid-cols-3 gap-2 mb-3">'+tile("부산",p.busanTotal,"var(--accent)")+tile("신사동",p.sinsaTotal)+tile("물류센터",p.centerTotal)+'</div>';
  const head = '<tr class="text-[11px] text-[color:var(--muted)]"><th class="text-left font-bold py-1.5 px-2">규격</th><th class="px-2">부산</th><th class="px-2">신사동</th><th class="px-2">물류</th></tr>';
  const rows = p.sizes.map(s=>{
    const q = s.busan||0;
    let cls = q>0&&q===1?"color:var(--last);background:#FFF1F2": q>0?"color:#047857;background:#ECFDF5": s.sinsa+s.center>0?"color:#92400E;background:#FFFBEB":"color:#9CA3AF;";
    const lastTag = q===1 ? ' <span class="badge badge-last" style="font-size:.55rem;padding:.05rem .3rem;margin-left:.25rem;vertical-align:middle;">LAST</span>' : '';
    return '<tr class="mono tnum text-sm border-t" style="border-color:var(--line)"><td class="py-1.5 px-2 font-bold">'+escapeHtml(String(s.size!=null?s.size:"-"))+'</td><td class="text-center px-2 font-extrabold" style="'+cls+'">'+(s.busan||0)+lastTag+'</td><td class="text-center px-2">'+(s.sinsa||0)+'</td><td class="text-center px-2">'+(s.center||0)+'</td></tr>';
  }).join("");
  let actionTip = "";
  if(p.canRequest) actionTip = '<div class="mt-3 callout"><div class="row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg><span class="font-extrabold">부산 품절 · 요청 가능</span>'+(p.sinsaTotal>0?'<span class="pill"><span class="mono">신사 '+p.sinsaTotal+'</span></span>':'')+(p.centerTotal>0?'<span class="pill"><span class="mono">물류 '+p.centerTotal+'</span></span>':'')+'</div></div>';
  else if(p.busanTotal===0) actionTip = '<div class="mt-3 rounded-lg p-3 text-sm font-bold text-[color:var(--ink-2)]" style="background:#F4F4F4;border:1px solid #E5E5E5;">모든 매장·창고에 재고가 없습니다.</div>';
  const bodyContent = totalsRow + '<div class="hairline overflow-auto"><table class="w-full"><thead>'+head+'</thead><tbody>'+rows+'</tbody></table></div>' + actionTip;
  if(hasImg){
    $("#detailBody").innerHTML =
        '<div class="detail-grid">'
      +   '<img class="detail-thumb-side" src="'+escapeHtml(IMAGES[p.shopNo])+'" alt="'+escapeHtml(p.품명||"")+'" loading="lazy" onerror="this.remove()">'
      +   '<div class="min-w-0">' + headHtml + bodyContent + '</div>'
      + '</div>';
  } else {
    $("#detailBody").innerHTML = bodyContent;
  }
  $("#detailModal").classList.remove("hidden");
  if(window.lucide) lucide.createIcons();
}

function bindModalClose(modalId){
  const modal = $('#'+modalId);
  modal.addEventListener("click", (e)=>{ if(e.target===modal || e.target.classList.contains("modal-outer")) modal.classList.add("hidden"); });
}
bindModalClose("detailModal");
bindModalClose("adminModal");
$("#closeDetail").addEventListener("click", ()=>$("#detailModal").classList.add("hidden"));
document.addEventListener("keydown", (e)=>{ if(e.key==="Escape"){ $("#detailModal").classList.add("hidden"); $("#adminModal").classList.add("hidden"); } });

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
  if(window.lucide) lucide.createIcons();
}
function showSettingsPanel(){
  $("#uploadPanel").classList.add("hidden"); $("#settingsPanel").classList.remove("hidden");
  $("#ghOwner").value = GH.owner||""; $("#ghRepo").value = GH.repo||"";
  $("#ghBranch").value = GH.branch||"main"; $("#ghPat").value = getPat()||"";
  $("#ghMsg").textContent = "";
  if(window.lucide) lucide.createIcons();
}
function closeAdmin(){ $("#adminModal").classList.add("hidden"); }
$("#adminBtn").addEventListener("click", openAdmin);
$("#adminBtn2").addEventListener("click", openAdmin);
$("#closeAdmin").addEventListener("click", closeAdmin);
$("#closeAdmin2").addEventListener("click", closeAdmin);

$("#pwdGo").addEventListener("click", tryAuth);
$("#pwd").addEventListener("keydown", e=>{ if(e.key==="Enter") tryAuth(); });
function tryAuth(){
  if($("#pwd").value === ADMIN_PWD){
    sessionStorage.setItem(SESSION_FLAG,"1"); enterAdmin(); $("#pwdMsg").textContent = "";
  } else {
    $("#pwdMsg").style.color = "var(--accent)";
    $("#pwdMsg").textContent = "비밀번호가 일치하지 않습니다.";
    $("#pwd").value=""; $("#pwd").focus();
  }
}
$("#logout").addEventListener("click", ()=>{
  sessionStorage.removeItem(SESSION_FLAG);
  $("#uploadPanel").classList.add("hidden"); $("#settingsPanel").classList.add("hidden");
  $("#authPanel").classList.remove("hidden"); $("#pwd").value="";
});

$("#openSettings").addEventListener("click", showSettingsPanel);
$("#ghSave").addEventListener("click", ()=>{
  GH.owner = $("#ghOwner").value.trim(); GH.repo = $("#ghRepo").value.trim();
  GH.branch = ($("#ghBranch").value.trim() || "main");
  const pat = $("#ghPat").value.trim();
  if(pat) setPat(pat);
  saveGhConfig();
  const m = $("#ghMsg"); m.style.color="var(--green)"; m.textContent="✓ 설정 저장 완료";
  setTimeout(showUploadPanel, 600);
});
$("#ghTest").addEventListener("click", async ()=>{
  const oldOwner=GH.owner, oldRepo=GH.repo, oldBranch=GH.branch, oldPat=getPat();
  GH.owner=$("#ghOwner").value.trim(); GH.repo=$("#ghRepo").value.trim(); GH.branch=($("#ghBranch").value.trim()||"main");
  setPat($("#ghPat").value.trim());
  const m = $("#ghMsg"); m.style.color="var(--ink)"; m.textContent="연결 시도 중…";
  try{
    const j = await ghTestConnection();
    m.style.color="var(--green)"; m.textContent="✓ 연결 성공 — "+j.full_name+" ("+(j.private?"비공개":"공개")+")";
  }catch(e){
    m.style.color="var(--accent)"; m.textContent="✗ "+e.message;
  } finally {
    GH.owner=oldOwner; GH.repo=oldRepo; GH.branch=oldBranch;
    if(oldPat) setPat(oldPat); else setPat("");
  }
});
$("#ghForget").addEventListener("click", ()=>{
  if(!confirm("이 기기에 저장된 토큰을 삭제할까요? (저장소 설정은 유지)")) return;
  setPat(""); $("#ghPat").value="";
  $("#ghMsg").style.color="var(--accent)"; $("#ghMsg").textContent="토큰 삭제됨";
});
$("#refreshBtn").addEventListener("click", ()=>{ loadData(true); });

// 카드 내부 .copyable 클릭 시 복사 (이벤트 위임 + 카드 클릭 전파 차단)
$("#grid").addEventListener("click", (e)=>{
  const t = e.target.closest && e.target.closest(".copyable");
  if(t){ e.stopPropagation(); copyText(t.dataset.copy || t.textContent.trim(), t); }
});

// 모바일 필터 펼치기/접기
$("#toggleFilters").addEventListener("click", ()=>{
  const d = $("#filterDetails");
  const expanded = d.classList.toggle("expanded");
  $("#toggleFiltersLabel").textContent = expanded ? "필터 접기" : "필터 펼치기";
});

$("#viewerPwdGo").addEventListener("click", tryViewerLogin);
$("#viewerPwdInput").addEventListener("keydown", e=>{ if(e.key==="Enter") tryViewerLogin(); });

$("#applyViewerPwd").addEventListener("click", async ()=>{
  if(!isAdminConfigured()){
    const m = $("#ghMsg"); m.style.color="var(--accent)";
    m.textContent="먼저 GitHub 저장소 설정과 PAT를 저장하세요."; return;
  }
  const newPwd = $("#viewerNewPwd").value.trim();
  if(newPwd && !confirm("새 비밀번호를 적용하면 모든 직원이 다음 새로고침부터 새 비밀번호로 로그인해야 합니다. 진행할까요?")) return;
  if(!newPwd && !confirm("잠금을 해제합니다 (URL만 알면 누구나 접속). 진행할까요?")) return;

  const m = $("#ghMsg"); m.style.color="var(--ink)"; m.textContent="GitHub에서 현재 데이터 가져오는 중…";
  let data;
  try{ data = await fetchInventoryFromCloud(); }
  catch(e){ data = { rows:[], meta:{} }; }
  const newMeta = Object.assign({}, data.meta || {});
  newMeta.updatedAt = new Date().toLocaleString("ko-KR",{hour12:false}).replace(/\.$/,"");
  newMeta.count = (data.rows||[]).length;
  if(newPwd) newMeta.viewerPasswordHash = await sha256Hex(newPwd);
  else delete newMeta.viewerPasswordHash;

  m.textContent = "GitHub에 비밀번호 적용 중…";
  try{ await commitInventoryToGitHub(data.rows||[], newMeta); }
  catch(e){ m.style.color="var(--accent)"; m.textContent="적용 실패: "+e.message; return; }
  CURRENT_META = newMeta;
  if(newPwd) localStorage.setItem(VIEWER_UNLOCK_KEY, newMeta.viewerPasswordHash);
  else localStorage.removeItem(VIEWER_UNLOCK_KEY);
  $("#viewerNewPwd").value = "";
  m.style.color="var(--green)";
  m.textContent = newPwd ? "✓ 비밀번호 적용 완료. 직원 화면 반영 1~2분." : "✓ 잠금 해제됨.";
});

const drop = $("#drop");
const fileInput = $("#file");
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
      const required = ["품명","품번","규격","소비자가"];
      const sample = rows[0] || {};
      const missing = required.filter(k=>!(k in sample));
      if(missing.length){ msg.style.color="var(--accent)"; msg.textContent="필수 컬럼 누락: "+missing.join(", "); return; }
      const stamp = new Date().toLocaleString("ko-KR",{hour12:false}).replace(/\.$/,"");
      const meta = { updatedAt:stamp, fileName:file.name, count:rows.length };
      // Preserve viewer password from existing inventory if any
      if(CURRENT_META && CURRENT_META.viewerPasswordHash) meta.viewerPasswordHash = CURRENT_META.viewerPasswordHash;
      msg.style.color="var(--ink)"; msg.textContent="GitHub에 업로드 중… ("+fmt(rows.length)+"행)";
      try{ await commitInventoryToGitHub(rows, meta); }
      catch(err){ msg.style.color="var(--accent)"; msg.textContent="업로드 실패: "+err.message; return; }
      RAW = rows; CURRENT_META = meta; applyMeta(meta); writeCache({rows, meta}); rebuildIndex();
      visibleCount = 60; render();
      msg.style.color="var(--green)";
      msg.textContent="✓ 업로드 완료 · "+fmt(rows.length)+"행 · "+stamp;
      setSyncStatus("ok","업로드 반영 중");
      // 이미지 자동 동기화 (백그라운드, 모달 닫힌 후에도 진행됨)
      if(typeof runImageSync === "function") runImageSync();
      setTimeout(closeAdmin, 1400);
    }catch(err){ msg.style.color="var(--accent)"; msg.textContent="파싱 실패: "+err.message; console.error(err); }
  };
  reader.onerror = ()=>{ msg.style.color="var(--accent)"; msg.textContent="파일 읽기 실패"; };
  reader.readAsArrayBuffer(file);
}

$("#clearData").addEventListener("click", async ()=>{
  if(!confirm("GitHub의 재고 데이터를 모두 비웁니다. 진행할까요?")) return;
  const stamp = new Date().toLocaleString("ko-KR",{hour12:false});
  const meta = { updatedAt:stamp, fileName:"(데이터 비움)", count:0 };
  if(CURRENT_META && CURRENT_META.viewerPasswordHash) meta.viewerPasswordHash = CURRENT_META.viewerPasswordHash;
  try{
    await commitInventoryToGitHub([], meta);
    RAW=[]; PRODUCTS=[]; filtered=[]; BRANDS=[];
    CURRENT_META = meta; applyMeta(meta); writeCache({rows:[], meta});
    populateBrandChips(); render();
    alert("비움 완료. 직원 화면에 1~2분 후 반영됩니다.");
  }catch(e){ alert("실패: "+e.message); }
});

$("#loadDemo").addEventListener("click", ()=>{
  RAW = buildDemo();
  const stamp = new Date().toLocaleString("ko-KR",{hour12:false});
  const meta = { updatedAt:stamp+" (DEMO · 로컬만)", fileName:"DEMO_DATA.xlsx", count:RAW.length };
  CURRENT_META = meta; applyMeta(meta); writeCache({rows:RAW, meta});
  rebuildIndex(); visibleCount=60; render();
});

function buildDemo(){
  const out = [];
  const items = [
    {분류:"신발(온러닝)", 품명:"CLOUDMONSTER 3", 품번:"ON-CM3-W", cat:"신발", price:259000, sex:"여성", sizes:[230,235,240,245,250,255]},
    {분류:"신발(호카)", 품명:"MACH X 2", 품번:"HOKA-MACHX2-M", cat:"신발", price:289000, sex:"남성", sizes:[260,265,270,275,280,285], lastSize:265},
    {분류:"신발(나이키)", 품명:"VAPORFLY 4", 품번:"NIKE-VF4-M", cat:"신발", price:329000, sex:"남성", sizes:[260,265,270,275,280], bcMissing:true},
    {분류:"의류(나이키)", 품명:"DRI-FIT TEE", 품번:"NIKE-DFT-M-S26", cat:"의류", price:59000, sex:"남성", sizes:["S","M","L","XL"]},
    {분류:"용품(가민)", 품명:"FORERUNNER 970", 품번:"GRM-FR970", cat:"용품", price:799000, sex:"공용", sizes:["1SIZE"], bcMissing:true}
  ];
  items.forEach(s=>{
    s.sizes.forEach(sz=>{
      const isLast = (s.lastSize!==undefined) && (String(sz)===String(s.lastSize));
      // [FIX #2] "CM3-M" → "CM3-W" : 실제 품번이 "ON-CM3-W"이므로 조건 수정
      const busan = s.품번.includes("CM3-W") ? 0 : (isLast ? 1 : Math.floor(Math.random()*4));
      out.push({
        "브랜드":"", "품목소분류":s.분류, "품명":s.품명, "품번":s.품번, "카테고리2":s.cat,
        "규격":sz, "성별":s.sex, "단위":"개", "시즌":"26SS", "소비자가":s.price,
        "POS연동바코드": s.bcMissing ? "" : ("99000000"+Math.floor(Math.random()*9999999)),
        "상품번호(샵바이)": s.품번.includes("CM3") ? "132872637" : s.품번.includes("MACHX2") ? "133469075" : "",
        "매장 (부산)": busan, "매장 (신사동)": Math.floor(Math.random()*3),
        "물류센터": Math.floor(Math.random()*4)
      });
    });
  });
  return out;
}

// === 이미지 동기화 (admin) ===
async function runImageSync(){
  const msg = $("#imgSyncMsg");
  if(!msg) return;
  if(typeof syncImages !== "function"){ msg.className="img-progress err"; msg.textContent="images.js 로드 실패"; return; }
  if(!isAdminConfigured()){ msg.className="img-progress err"; msg.textContent="GitHub 설정/PAT 먼저 입력하세요"; return; }
  if(!PRODUCTS || PRODUCTS.length===0){ msg.className="img-progress err"; msg.textContent="먼저 엑셀을 업로드하세요"; return; }
  msg.className = "img-progress";
  msg.textContent = "이미지 동기화 시작…";
  try{
    await syncImages(PRODUCTS, (s)=>{
      if(s.phase === "skip"){ msg.className="img-progress ok"; msg.textContent="신규 이미지 없음 (모두 캐시됨 · 총 "+Object.keys(IMAGES).length+"개)"; return; }
      if(s.phase === "start"){ msg.className="img-progress"; msg.textContent="신규 이미지 "+s.total+"개 가져오는 중…"; return; }
      if(s.phase === "progress"){ msg.textContent="이미지 "+s.done+" / "+s.total+" 처리 중… ("+s.ok+"개 성공)"; return; }
      if(s.phase === "saving"){ msg.textContent="GitHub에 저장 중… ("+s.ok+"/"+s.total+")"; return; }
      if(s.phase === "done"){ msg.className="img-progress ok"; msg.textContent="✓ "+s.ok+"개 신규 이미지 저장 완료 (전체 "+Object.keys(IMAGES).length+"개)"; render(); return; }
      if(s.phase === "error"){ msg.className="img-progress err"; msg.textContent="에러: "+s.error; return; }
    });
  }catch(e){ msg.className="img-progress err"; msg.textContent="이미지 동기화 실패: "+e.message; }
}

setTimeout(()=>{ const b=document.getElementById("syncImagesBtn"); if(b) b.addEventListener("click", runImageSync); }, 100);

loadGhConfig();
loadData();
if(window.lucide) lucide.createIcons();
