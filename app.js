// RACEMENT Haeundae Inventory — app.js (v3.6 실무 완성 버전)
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

async function copyText(text, btn){
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){ await navigator.clipboard.writeText(text); } 
    else {
      const ta = document.createElement("textarea"); ta.value = text; ta.style.position="fixed"; ta.style.opacity="0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    if(btn){
      const orig = btn.textContent; btn.classList.add("copied"); btn.textContent = "✓ 복사 성공";
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
    const hay = [p.품번, p.품명, p.브랜드].join(" ").toLowerCase();
    p._hay = hay; p._chosung = getChosung(hay);
    return p;
  });
  
  const brands = Array.from(new Set(PRODUCTS.map(p=>p.브랜드).filter(Boolean))).sort();
  const wrap = $("#brandChips"); wrap.innerHTML = '<button class="chip" data-brand="ALL" data-active="1">브랜드 전체</button>';
  brands.forEach(b => {
    const btn = document.createElement("button"); btn.className="chip"; btn.dataset.brand=b; btn.textContent=b;
    btn.onclick=()=>{ $$('#brandChips .chip').forEach(c=>c.dataset.active=(c===btn?"1":"0")); render(); };
    wrap.appendChild(btn);
  });
  $("#statItems").textContent = fmt(PRODUCTS.length);
  $("#statBusan").textContent = fmt(PRODUCTS.reduce((a,p)=>a+p.busanTotal,0));
  if(CURRENT_META) $("#statSrc").textContent = CURRENT_META.fileName;
}

function card(p){
  const el = document.createElement("article");
  el.className = "card card-hover p-4 relative flex flex-col gap-0";
  el.onclick = (e)=>{ if(!e.target.closest('button')) openDetail(p); };
  
  const imgSrc = (typeof IMAGES !== "undefined" && IMAGES[p.shopNo]) ? IMAGES[p.shopNo] : null;
  const tags = [p.카테고리, p.브랜드, genderLabel(p.gender).label].filter(Boolean).join(" · ");
  
  el.innerHTML = `
    <div class="flex justify-between items-start gap-3 w-full pr-6">
       <div class="flex-1 min-w-0 pt-1">
          <div class="text-[12px] text-[#888] font-semibold mb-1">${tags}</div>
          <div class="copyable font-bold text-[16px] leading-tight mb-1 truncate" data-copy="${escapeHtml(p.품명)}">${escapeHtml(p.품명)}</div>
          <div class="copyable text-[14px] text-[#666] mb-3" data-copy="${escapeHtml(p.품번)}">${escapeHtml(p.품번)}</div>
       </div>
       <div class="shrink-0">
          ${imgSrc ? `<img src="${imgSrc}" class="w-[60px] h-[60px] object-contain">` : '<div class="w-[60px] h-[60px] bg-gray-100 rounded-lg"></div>'}
       </div>
    </div>
    <div class="grid gap-1.5 mt-1" style="grid-template-columns:repeat(auto-fill, minmax(44px, 1fr))">
      ${p.sizes.map(s=>`<div class="size-cell ${s.busan===0?'zero':(s.busan<=2?'low':'')}"><span class="sz">${s.size}</span><span class="qty real-qty">${s.busan}</span><span class="qty showroom-qty hidden">${s.busan>0?'O':'X'}</span></div>`).join("")}
    </div>
    <div class="mt-4 pt-3 border-t flex justify-between items-center text-[13px]">
       <div class="loc-text flex gap-1.5 font-medium text-[#666]">
          <span class="font-bold text-[#111]">부산 ${p.busanTotal}</span> | 신사 ${p.sinsaTotal} | 물류 ${p.centerTotal}
       </div>
       <div class="font-semibold text-black" style="font-size:15px;">${krw(p.소비자가)}</div>
    </div>
  `;
  el.querySelectorAll('.copyable').forEach(c=>c.onclick=(e)=>{ e.stopPropagation(); copyText(c.dataset.copy, c); });
  return el;
}

function render(){
  const grid = $("#grid"); grid.innerHTML = "";
  const f = { 
    q: $("#q").value.trim().toLowerCase(), 
    cat: ($$('button.chip[data-cat]').find(b=>b.dataset.active==="1")||{}).dataset?.cat || "ALL",
    brand: ($$('#brandChips .chip').find(b=>b.dataset.active==="1")||{}).dataset?.brand || "ALL",
    fav: ($('[data-fav]')||{}).dataset?.active === "1"
  };
  
  const list = PRODUCTS.filter(p=>{
    if(f.cat!=="ALL" && p.카테고리!==f.cat) return false;
    if(f.brand!=="ALL" && p.브랜드!==f.brand) return false;
    if(f.fav && !FAVS.includes(p.품번)) return false;
    if(f.q) { if(isAllChosung(f.q)) return p._chosung.includes(f.q); return p._hay.includes(f.q); }
    return true;
  }).sort((a,b)=>{
    const ca=CAT_ORDER[a.카테고리]??9; const cb=CAT_ORDER[b.카테고리]??9;
    if(ca!==cb) return ca-cb;
    return (b.busanTotal>0?1:0) - (a.busanTotal>0?1:0) || a.품명.localeCompare(b.품명);
  });
  
  list.slice(0, visibleCount).forEach(p=>grid.appendChild(card(p)));
  $("#emptyState").classList.toggle("hidden", list.length>0);
  if(window.lucide) lucide.createIcons();
  updateCartStatus();
}

function openDetail(p){
  CURRENT_PRODUCT = p;
  const imgSrc = (typeof IMAGES !== "undefined" && IMAGES[p.shopNo]) ? IMAGES[p.shopNo] : null;
  $("#detailHead").innerHTML = `
    ${imgSrc ? `<img src="${imgSrc}" class="w-full h-48 object-contain mb-4">` : ''}
    <div class="text-xl font-bold">${p.품명}</div><div class="text-[#666] mb-4">${p.품번}</div>
  `;
  $("#detailBody").innerHTML = `
    <table class="w-full text-sm">
      <tr class="text-[#888] border-b"><th class="py-2 text-left">사이즈</th><th>부산</th><th>신사</th><th>물류</th></tr>
      ${p.sizes.map(s=>`<tr class="border-b"><td class="py-2 font-bold">${s.size}</td><td class="text-center font-bold">${s.busan}</td><td class="text-center">${s.sinsa}</td><td class="text-center">${s.center}</td></tr>`).join("")}
    </table>
  `;
  $("#cartSize").innerHTML = p.sizes.map(s=>`<option value="${s.size}">${s.size}</option>`).join("");
  
  if (sessionStorage.getItem(SESSION_FLAG) === "1" && p.shopNo) {
      const box = document.createElement("div");
      box.className = "mt-4 p-3 border-2 border-dashed bg-gray-50";
      box.innerHTML = `
        <div class="text-xs font-bold mb-2">👑 점장 이미지 관리</div>
        <div class="flex gap-2">
          <input type="text" id="imgUrlIpt" class="ipt flex-1 text-xs" placeholder="이미지 주소 복붙">
          <button id="imgSaveBtn" class="brutal px-3 bg-black text-white text-xs">저장</button>
        </div>
        <div id="imgMsg" class="mt-1 text-[10px]"></div>
      `;
      $("#detailBody").appendChild(box);
      $("#imgSaveBtn").onclick = async () => {
          const url = $("#imgUrlIpt").value.trim(); if(!url) return;
          $("#imgMsg").textContent = "저장 중...";
          try {
              IMAGES[p.shopNo] = url;
              await commitImagesToGitHub(IMAGES, { fetchedCount: 1 });
              $("#imgMsg").className="text-green-600"; $("#imgMsg").textContent="✓ 저장 완료!"; render();
          } catch(e) { $("#imgMsg").className="text-red-600"; $("#imgMsg").textContent="실패: "+e.message; }
      };
  }
  $("#detailModal").classList.remove("hidden");
}

// 🔥 장바구니 기능 고도화 🔥
function updateCartStatus(){
  $("#cartBtn").classList.toggle("hidden", !CART.length);
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

window.deleteCartItem = (idx) => {
  CART.splice(idx, 1);
  localStorage.setItem('CART', JSON.stringify(CART));
  openCartModal(); updateCartStatus();
};

$("#clearCart").onclick = () => { if(confirm("전체 삭제할까요?")){ CART=[]; localStorage.removeItem('CART'); openCartModal(); updateCartStatus(); }};

// 🔥 엑셀 붙여넣기 최적화 복사 (탭 구분자) 🔥
$("#copyExcelBtn").onclick = () => {
  const header = "품명\t품번\t사이즈\t개수\n";
  const rows = CART.map(c => `${c.품명}\t${c.품번}\t${c.사이즈}\t${c.수량}`).join("\n");
  copyText(header + rows, $("#copyExcelBtn"));
};

$("#cartBtn").onclick = openCartModal;
$("#closeCart").onclick = () => $("#cartModal").classList.add("hidden");
$("#addCartBtn").onclick = () => {
  CART.push({ 품명:CURRENT_PRODUCT.품명, 품번:CURRENT_PRODUCT.품번, 사이즈:$("#cartSize").value, 수량:$("#cartQty").value });
  localStorage.setItem('CART', JSON.stringify(CART)); updateCartStatus(); alert("담겼습니다!");
};

// 나머지 기본 리스너
$("#q").oninput=()=>render();
$("#refreshBtn").onclick=()=>loadData(true);
$("#showroomBtn").onclick=()=>document.body.classList.toggle("showroom-mode");
$("#darkModeBtn").onclick=()=>document.documentElement.classList.toggle("dark-mode");
$("#closeDetail").onclick=()=>$("#detailModal").classList.add("hidden");
$("#adminBtn").onclick=()=>$("#adminModal").classList.remove("hidden");
$("#pwdGo").onclick=()=>{ if($("#pwd").value===ADMIN_PWD){ $("#authPanel").classList.add("hidden"); $("#uploadPanel").classList.remove("hidden"); } };
$("#openSettings").onclick=()=>{ $("#uploadPanel").classList.add("hidden"); $("#settingsPanel").classList.remove("hidden"); };
$("#ghSave").onclick=()=>{ GH={owner:$("#ghOwner").value.trim(), repo:$("#ghRepo").value.trim(), branch:"main"}; saveGhConfig(); setPat($("#ghPat").value.trim()); alert("저장됨"); };
$("#file").onchange=async(e)=>{
  const f=e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload=async(ev)=>{
    const wb = XLSX.read(new Uint8Array(ev.target.result), {type:"array"});
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:""});
    try { await commitInventoryToGitHub(rows, {fileName:f.name}); alert("업로드 성공!"); location.reload(); } catch(e){ alert("실패!"); }
  };
  reader.readAsArrayBuffer(f);
};
$("#drop").onclick=()=>$("#file").click();

loadGhConfig(); loadData();
