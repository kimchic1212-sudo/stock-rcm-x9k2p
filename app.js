// RACEMENT Haeundae Inventory — app.js (v3.2 긴급 복구 버전)
const ADMIN_PWD = "1212";
const SESSION_FLAG = "racement_admin_session";
const GH_CONFIG_KEY = "racement_gh_config_v1";
const GH_PAT_KEY = "racement_gh_pat_v1";
const CACHE_KEY = "racement_inventory_cache_v1";
const DATA_PATH = "inventory.json";
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

// 헬퍼 함수
function detectGender(code, sex){
  const g = String(sex||"").trim();
  if(g==="남성"||g==="남"||g.toUpperCase()==="M") return "M";
  if(g==="여성"||g==="여"||g.toUpperCase()==="W") return "W";
  return "U";
}
function genderLabel(g){
  if(g==="M") return {sym:"♂", label:"남성", cls:"badge-men"};
  if(g==="W") return {sym:"♀", label:"여성", cls:"badge-women"};
  return {sym:"⚥", label:"공용", cls:"badge-uni"};
}
function escapeHtml(s){ return String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function isAllChosung(s){ return /^[ㄱ-ㅎ]+$/.test(s); }
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

// 데이터 로드 (API 방어 로직 포함)
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

// 업로드 핵심 로직 (에러 방지 패치)
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
  if(!r2.ok) throw new Error();
}

// 인덱스 재구성 및 렌더링 (점장님 UI 지침 적용)
function rebuildIndex(){
  const map = new Map();
  const prevRaw = JSON.parse(localStorage.getItem('PREV_RAW') || '[]');
  for(const r of RAW){
    const code = r["품번"]; if(!code) continue;
    if(!map.has(code)){
      map.set(code, { 품번:code, 품명:r["품명"], 브랜드:r["브랜드"], 카테고리:r["카테고리2"], 성별:r["성별"], gender:detectGender(code, r["성별"]), 소비자가:Number(r["소비자가"]||0), shopNo:String(r["상품번호(샵바이)"]||""), sizes:[] });
    }
    const p = map.get(code);
    p.sizes.push({ size:r["규격"], busan:Number(r["매장 (부산)"]||0), sinsa:Number(r["매장 (신사동)"]||0), center:Number(r["물류센터"]||0) });
  }
  PRODUCTS = Array.from(map.values()).map(p=>{
    p.busanTotal = p.sizes.reduce((a,b)=>a+b.busan,0);
    p.sinsaTotal = p.sizes.reduce((a,b)=>a+b.sinsa,0);
    p.centerTotal = p.sizes.reduce((a,b)=>a+b.center,0);
    p.urgentRestock = p.sizes.some(s=> s.busan===0 && (['260','265','270','275','235','240','245'].includes(String(s.size))));
    const pt = prevRaw.filter(pr=>pr["품번"]===p.품번).reduce((a,b)=>a+Number(b["매장 (부산)"]||0),0);
    p.delta = prevRaw.length? p.busanTotal-pt : 0;
    const hay = [p.품번, p.품명, p.브랜드].join(" ").toLowerCase();
    p._hay = hay; p._chosung = getChosung(hay);
    return p;
  });
}

function card(p){
  const el = document.createElement("article");
  el.className = "card card-hover p-4 relative flex flex-col gap-0";
  el.onclick = (e)=>{ if(!e.target.closest('button')) openDetail(p); };
  
  const imgSrc = (typeof IMAGES !== "undefined" && IMAGES[p.shopNo]) ? IMAGES[p.shopNo] : null;
  const tags = [p.카테고리, p.브랜드, genderLabel(p.gender).label].filter(Boolean).join(" · ");
  
  el.innerHTML = `
    <div class="flex justify-between items-start gap-3 w-full">
       <div class="flex-1 min-w-0 pt-1">
          <div class="text-[12px] text-[#888] font-semibold mb-1">${tags}</div>
          <div class="font-bold text-[16px] leading-tight mb-1 truncate">${escapeHtml(p.품명)}</div>
          <div class="text-[14px] text-[#666] mb-3">${escapeHtml(p.품번)}</div>
       </div>
       <div class="shrink-0 flex flex-col items-end gap-2">
          <button class="fav-btn text-xl">${FAVS.includes(p.품번)?'★':'☆'}</button>
          ${imgSrc ? `<img src="${imgSrc}" class="w-[60px] h-[60px] object-contain">` : ''}
       </div>
    </div>
    <div class="grid gap-1.5 mt-1" style="grid-template-columns:repeat(auto-fill, minmax(44px, 1fr))">
      ${p.sizes.map(s=>`<div class="size-cell ${s.busan===0?'zero':(s.busan<=2?'low':'')}"><span class="sz">${s.size}</span><span class="qty real-qty">${s.busan}</span><span class="qty showroom-qty hidden">${s.busan>0?'O':'X'}</span></div>`).join("")}
    </div>
    <div class="mt-4 pt-3 border-t border-[color:var(--line)] flex justify-between items-center text-[13px]">
       <div class="loc-text flex gap-1.5 font-medium text-[#666]">
          <span class="font-bold text-[#111]">부산 ${p.busanTotal}</span> | 신사 ${p.sinsaTotal} | 물류 ${p.centerTotal}
       </div>
       <div class="font-semibold text-black" style="font-size:15px;">${krw(p.소비자가)}</div>
    </div>
  `;
  el.querySelector('.fav-btn').onclick=(e)=>{ e.stopPropagation(); if(FAVS.includes(p.품번)) FAVS=FAVS.filter(id=>id!==p.품번); else FAVS.push(p.품번); localStorage.setItem('FAVS', JSON.stringify(FAVS)); render(); };
  return el;
}

function render(){
  const grid = $("#grid"); grid.innerHTML = "";
  $("#emptyState").classList.toggle("hidden", PRODUCTS.length>0);
  $("#results").classList.toggle("hidden", PRODUCTS.length===0);
  
  const f = { q: $("#q").value.trim().toLowerCase(), fav: !!$('[data-fav]').dataset.active==="1" };
  const filtered = PRODUCTS.filter(p=>{
    if(f.fav && !FAVS.includes(p.품번)) return false;
    if(f.q) { if(isAllChosung(f.q)) return p._chosung.includes(f.q); return p._hay.includes(f.q); }
    return true;
  });
  filtered.slice(0, visibleCount).forEach(p=>grid.appendChild(card(p)));
  if(window.lucide) lucide.createIcons();
}

function openDetail(p){
  CURRENT_PRODUCT = p;
  const imgSrc = (typeof IMAGES !== "undefined" && IMAGES[p.shopNo]) ? IMAGES[p.shopNo] : null;
  $("#detailHead").innerHTML = `
    ${imgSrc ? `<img src="${imgSrc}" class="w-full h-48 object-contain mb-4">` : ''}
    <div class="text-xl font-bold">${p.품명}</div><div class="text-[#666]">${p.품번}</div>
  `;
  $("#detailBody").innerHTML = `
    <table class="w-full mt-4 text-sm">
      <tr class="text-[#888] border-b"><th class="py-2 text-left">사이즈</th><th>부산</th><th>신사</th><th>물류</th></tr>
      ${p.sizes.map(s=>`<tr class="border-b"><td class="py-2 font-bold">${s.size}</td><td class="text-center font-bold ${s.busan>0?'text-green-600':''}"><span class="real-qty">${s.busan}</span><span class="showroom-qty hidden">${s.busan>0?'O':'X'}</span></td><td class="text-center">${s.sinsa}</td><td class="text-center">${s.center}</td></tr>`).join("")}
    </table>
  `;
  const sz = $("#cartSize"); sz.innerHTML = p.sizes.map(s=>`<option value="${s.size}">${s.size}</option>`).join("");
  $("#detailModal").classList.remove("hidden");
}

// 이벤트 리스너들
$("#closeDetail").onclick=()=>$("#detailModal").classList.add("hidden");
$("#detailModal").onclick=(e)=>{if(e.target===$("#detailModal")||e.target.closest('.modal-outer')) $("#detailModal").classList.add("hidden");};
$("#addCartBtn").onclick=()=>{
  CART.push({ 품명:CURRENT_PRODUCT.품명, 품번:CURRENT_PRODUCT.품번, 사이즈:$("#cartSize").value, 수량:$("#cartQty").value });
  localStorage.setItem('CART', JSON.stringify(CART)); updateCartBtn(); $("#detailModal").classList.add("hidden");
};
function updateCartBtn(){ const b=$("#copyCartBtn"); b.classList.toggle("hidden", !CART.length); b.textContent=`🛒 복사 (${CART.length})`; }
$("#copyCartBtn").onclick=()=>{
  const txt = CART.map(c=>`${c.품명} / ${c.품번} / ${c.사이즈} / ${c.수량}개`).join("\n");
  copyText("[해운대점 이동요청]\n"+txt, $("#copyCartBtn")); CART=[]; localStorage.removeItem('CART'); updateCartBtn();
};

$("#q").oninput=()=>render();
$("#refreshBtn").onclick=()=>loadData(true);
$("#showroomBtn").onclick=()=>{ document.body.classList.toggle("showroom-mode"); $("#showroomBtn").classList.toggle("bg-orange-500"); };
$("#darkModeBtn").onclick=()=>{ document.documentElement.classList.toggle("dark-mode"); };

$("#file").onchange=async(e)=>{
  const f=e.target.files[0]; if(!f) return;
  localStorage.setItem('PREV_RAW', JSON.stringify(RAW));
  const reader = new FileReader();
  reader.onload=async(ev)=>{
    const wb = XLSX.read(new Uint8Array(ev.target.result), {type:"array"});
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:""});
    try {
      await commitInventoryToGitHub(rows, { fileName:f.name });
      alert("업로드 성공!"); location.reload();
    } catch(e) { alert("업로드 실패! 설정을 확인하세요."); }
  };
  reader.readAsArrayBuffer(f);
};

$("#adminBtn").onclick=()=>$("#adminModal").classList.remove("hidden");
$("#closeAdmin").onclick=()=>$("#adminModal").classList.add("hidden");
$("#pwdGo").onclick=()=>{ if($("#pwd").value===ADMIN_PWD){ $("#authPanel").classList.add("hidden"); $("#uploadPanel").classList.remove("hidden"); } else alert("비번 오류"); };
$("#ghSave").onclick=()=>{
  GH = { owner:$("#ghOwner").value.trim(), repo:$("#ghRepo").value.trim(), branch:$("#ghBranch").value.trim()||"main" };
  saveGhConfig(); setPat($("#ghPat").value.trim()); alert("저장됨");
};

loadGhConfig(); loadData();
