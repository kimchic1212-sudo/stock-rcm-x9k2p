// RACEMENT Haeundae Inventory — app.js (v3.3 최종 안정화 버전)
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

// 인덱스 재구성 및 렌더링
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
  el.onclick = (e)=>{ 
    const copyBtn = e.target.closest('[data-copy]');
    if(copyBtn) { copyText(copyBtn.dataset.copy, copyBtn); return; }
    if(!e.target.closest('button')) openDetail(p); 
  };
  
  const imgSrc = (typeof IMAGES !== "undefined" && IMAGES[p.shopNo]) ? IMAGES[p.shopNo] : null;
  const tags = [p.카테고리, p.브랜드, genderLabel(p.gender).label].filter(Boolean).join(" · ");
  
  let extraBadges = "";
  if (p.delta > 0) extraBadges += `<span class="delta-badge ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">▲+${p.delta}</span>`;
  else if (p.delta < 0) extraBadges += `<span class="delta-badge ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">▼${p.delta}</span>`;
  if (p.urgentRestock) extraBadges += `<span class="urgent-badge ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold border border-red-500 text-red-600">🚨 황금결품</span>`;

  el.innerHTML = `
    <div class="flex justify-between items-start gap-3 w-full pr-6">
       <div class="flex-1 min-w-0 pt-1">
          <div class="text-[12px] text-[#888] font-semibold mb-1 leading-tight">${tags}${extraBadges}</div>
          <div class="copyable font-bold text-[16px] leading-tight mb-1 truncate text-left w-full" data-copy="${escapeHtml(p.품명)}">${escapeHtml(p.품명)}</div>
          <div class="copyable text-[14px] text-[#666] mb-3 text-left w-full" data-copy="${escapeHtml(p.품번)}">${escapeHtml(p.품번)}</div>
       </div>
       <div class="shrink-0 flex flex-col items-end gap-2">
          <button class="fav-btn text-xl absolute top-4 right-4 z-10">${FAVS.includes(p.품번)?'★':'☆'}</button>
          ${imgSrc ? `<img src="${imgSrc}" class="w-[60px] h-[60px] object-contain mix-blend-multiply dark:mix-blend-normal bg-transparent">` : ''}
       </div>
    </div>
    <div class="grid gap-1.5 mt-1" style="grid-template-columns:repeat(auto-fill, minmax(44px, 1fr))">
      ${p.sizes.map(s=>`<div class="size-cell ${s.busan===0?'zero':(s.busan<=2?'low':'')}"><span class="sz">${s.size}</span><span class="qty real-qty">${s.busan}</span><span class="qty showroom-qty hidden">${s.busan>0?'O':'X'}</span></div>`).join("")}
    </div>
    <div class="mt-4 pt-3 border-t border-[color:var(--line)] flex justify-between items-center text-[13px]">
       <div class="loc-text flex gap-1.5 font-medium text-[#666] dark:text-gray-400">
          <span class="font-bold text-[#111] dark:text-gray-100">부산 ${p.busanTotal}</span> | 신사 ${p.sinsaTotal} | 물류 ${p.centerTotal}
       </div>
       <div class="font-semibold text-black dark:text-white" style="font-size:15px; font-family:sans-serif;">${krw(p.소비자가)}</div>
    </div>
  `;
  el.querySelector('.fav-btn').onclick=(e)=>{ e.stopPropagation(); if(FAVS.includes(p.품번)) FAVS=FAVS.filter(id=>id!==p.품번); else FAVS.push(p.품번); localStorage.setItem('FAVS', JSON.stringify(FAVS)); render(); };
  return el;
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

function render(){
  const grid = $("#grid"); grid.innerHTML = "";
  $("#emptyState").classList.toggle("hidden", PRODUCTS.length>0);
  $("#results").classList.toggle("hidden", PRODUCTS.length===0);
  
  const f = { q: $("#q").value.trim().toLowerCase(), fav: !!$('[data-fav]').dataset.active==="1" };
  
  if(f.q && (!RECENT_SEARCHES.length || RECENT_SEARCHES[0] !== f.q)) {
      RECENT_SEARCHES = RECENT_SEARCHES.filter(q => q !== f.q);
      RECENT_SEARCHES.unshift(f.q);
      if(RECENT_SEARCHES.length > 5) RECENT_SEARCHES.pop();
      localStorage.setItem('RECENT_SEARCHES', JSON.stringify(RECENT_SEARCHES));
      renderRecentSearches();
  }

  const filteredList = PRODUCTS.filter(p=>{
    if(f.fav && !FAVS.includes(p.품번)) return false;
    if(f.q) { if(isAllChosung(f.q)) return p._chosung.includes(f.q); return p._hay.includes(f.q); }
    return true;
  });
  filteredList.slice(0, visibleCount).forEach(p=>grid.appendChild(card(p)));
  if(window.lucide) lucide.createIcons();
  updateCartCopyBtn();
}

function openDetail(p){
  CURRENT_PRODUCT = p;
  const imgSrc = (typeof IMAGES !== "undefined" && IMAGES[p.shopNo]) ? IMAGES[p.shopNo] : null;
  $("#detailHead").innerHTML = `
    ${imgSrc ? `<img src="${imgSrc}" class="w-full h-auto rounded-lg mb-3 object-contain border border-[color:var(--line)]" style="max-height: 200px; background:var(--surface);">` : ''}
    <div class="text-[12px] text-[#888] font-semibold mb-1">${p.브랜드} · ${genderLabel(p.gender).label}</div>
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
      adminImgBox.className = "mt-4 p-3 rounded-lg border-2 border-dashed border-gray-400 bg-gray-50";
      const targetUrl = `https://racement.co.kr/product-detail?productNo=${p.shopNo}`;
      adminImgBox.innerHTML = `
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-gray-600">👑 이미지 관리</div>
            <div class="flex gap-1">
                <a href="${targetUrl}" target="_blank" class="px-2 py-1.5 text-[11px] font-black bg-blue-600 text-white rounded no-underline">자사몰 열기</a>
                <button id="autoFetchBtn" class="px-2 py-1.5 text-[11px] font-black bg-green-600 text-white rounded">오토스크랩</button>
            </div>
          </div>
          <div class="flex gap-2">
              <input type="text" id="quickImgUrl" class="ipt flex-1 text-xs mono" placeholder="실패 시 주소 직접 복붙">
              <button id="quickImgSave" class="px-3 py-1 text-xs font-black bg-black text-white rounded">저장</button>
          </div>
          <div id="quickImgMsg" class="mt-1 text-[11px] font-bold text-gray-600"></div>
      `;
      $("#detailBody").appendChild(adminImgBox);

      adminImgBox.querySelector("#autoFetchBtn").addEventListener("click", async () => {
          const msg = adminImgBox.querySelector("#quickImgMsg"); msg.textContent = "탐색 중... (2~4초)";
          try {
              const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
              const res = await fetch(proxyUrl); const data = await res.json();
              const match = data.contents.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
              if (match && match[1]) {
                  let imgUrl = match[1]; if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl; 
                  adminImgBox.querySelector("#quickImgUrl").value = imgUrl;
                  msg.style.color = "green"; msg.textContent = "✓ 추출 성공! '저장'을 누르세요.";
              } else { msg.style.color = "red"; msg.textContent = "실패. '자사몰 열기'를 눌러 직접 복사하세요."; }
          } catch (e) { msg.style.color = "red"; msg.textContent = "통신 에러"; }
      });

      adminImgBox.querySelector("#quickImgSave").addEventListener("click", async () => {
          const url = adminImgBox.querySelector("#quickImgUrl").value.trim(); if (!url) return;
          const msg = adminImgBox.querySelector("#quickImgMsg"); msg.textContent = "저장 중...";
          try {
              if (typeof commitImagesAndMeta !== "undefined") {
                  IMAGES[p.shopNo] = url; await commitImagesAndMeta(1);
                  msg.style.color = "green"; msg.textContent = "✓ 깃허브 저장 완료!";
                  render(); openDetail(p); 
              }
          } catch (err) { msg.style.color = "red"; msg.textContent = "실패: " + err.message; }
      });
  }
  $("#detailModal").classList.remove("hidden");
}

// 이벤트 리스너들
$("#closeDetail").onclick=()=>$("#detailModal").classList.add("hidden");
$("#detailModal").onclick=(e)=>{if(e.target===$("#detailModal")||e.target.closest('.modal-outer')===e.target) $("#detailModal").classList.add("hidden");};
$("#addCartBtn").onclick=()=>{
  CART.push({ 품명:CURRENT_PRODUCT.품명, 품번:CURRENT_PRODUCT.품번, 사이즈:$("#cartSize").value, 수량:$("#cartQty").value });
  localStorage.setItem('CART', JSON.stringify(CART)); updateCartCopyBtn(); $("#detailModal").classList.add("hidden");
};
function updateCartCopyBtn(){ const b=$("#copyCartBtn"); b.classList.toggle("hidden", !CART.length); b.textContent=`🛒 복사 (${CART.length})`; }
$("#copyCartBtn").onclick=()=>{
  const txt = CART.map(c=>`${c.품명} / ${c.품번} / ${c.사이즈} / ${c.수량}개`).join("\n");
  copyText("[해운대점 이동요청]\n"+txt, $("#copyCartBtn")); CART=[]; localStorage.removeItem('CART'); updateCartCopyBtn();
};

$("#q").oninput=()=>render();
$("#clearQ").onclick=()=>{ $("#q").value=""; render(); $("#q").focus(); };
$("#refreshBtn").onclick=()=>loadData(true);
$("#showroomBtn").onclick=()=>{ document.body.classList.toggle("showroom-mode"); $("#showroomBtn").classList.toggle("bg-orange-500"); };
$("#darkModeBtn").onclick=()=>{ document.documentElement.classList.toggle("dark-mode"); localStorage.setItem("theme", document.documentElement.classList.contains("dark-mode") ? "dark" : "light"); };
$$('button.chip[data-cat], button.chip[data-gender], button.chip[data-fav]').forEach(b=>b.addEventListener("click",()=>{ 
    if(b.dataset.cat||b.dataset.gender) { $$('button.chip[data-'+(b.dataset.cat?'cat':'gender')+']').forEach(x=>x.dataset.active=(x===b?"1":"0")); }
    else { b.dataset.active = b.dataset.active==="1" ? "0" : "1"; }
    visibleCount=60; render(); 
}));
$("#resetAll").onclick=()=>{ ["cat","gender"].forEach(g=>$$('button.chip[data-'+g+']').forEach(b=>b.dataset.active=(b.dataset[g]==="ALL"?"1":"0"))); $$('button.chip[data-fav]').forEach(b=>b.dataset.active="0"); $("#q").value=""; render(); };

// 🔥 실수로 빠졌던 어드민 패널 클릭 스위치 완벽 복구 🔥
$("#adminBtn").onclick=()=>$("#adminModal").classList.remove("hidden");
$("#closeAdmin").onclick=()=>$("#adminModal").classList.add("hidden");
$("#drop").onclick=()=>$("#file").click(); 
$("#openSettings").onclick=()=>{ $("#uploadPanel").classList.add("hidden"); $("#settingsPanel").classList.remove("hidden"); }; 

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

$("#pwdGo").onclick=()=>{ if($("#pwd").value===ADMIN_PWD){ $("#authPanel").classList.add("hidden"); $("#uploadPanel").classList.remove("hidden"); } else alert("비번 오류"); };
$("#ghSave").onclick=()=>{
  GH = { owner:$("#ghOwner").value.trim(), repo:$("#ghRepo").value.trim(), branch:$("#ghBranch").value.trim()||"main" };
  saveGhConfig(); setPat($("#ghPat").value.trim()); alert("저장됨");
};

loadGhConfig(); loadData();
