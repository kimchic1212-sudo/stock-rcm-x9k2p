// RACEMENT Haeundae Inventory — images.js (수동 이미지 등록 모드)
// 자사몰 자동 fetch는 차단되어 사용 안 함. 점장이 ADMIN에서 직접 등록.
const IMAGES_PATH = "images.json";
let IMAGES = {};
let IMAGES_META = null;

async function fetchImagesFromCloud(){
  const url = "./" + IMAGES_PATH + "?t=" + Date.now();
  try{
    const r = await fetch(url, { cache:"no-store" });
    if(!r.ok) return { meta:null, images:{} };
    return await r.json();
  }catch(e){ return { meta:null, images:{} }; }
}

async function commitImagesToGitHub(images, meta){
  if(!GH.owner || !GH.repo) throw new Error("저장소 설정 없음");
  if(!getPat()) throw new Error("PAT 없음");
  const apiBase = "https://api.github.com/repos/"+GH.owner+"/"+GH.repo+"/contents/"+IMAGES_PATH;
  let sha = null;
  try{
    const r = await ghGet(apiBase + "?ref=" + encodeURIComponent(GH.branch));
    if(r.ok){ const j=await r.json(); sha=j.sha; }
  }catch(e){}
  const body = {
    message:"update images: "+(meta.fetchedCount||0)+" 신규 / "+(Object.keys(images).length||0)+" 총",
    content: utf8ToB64(JSON.stringify({ meta, images })),
    branch: GH.branch
  };
  if(sha) body.sha = sha;
  const r2 = await ghPut(apiBase, body);
  if(!r2.ok){ const j=await r2.json().catch(()=>({})); throw new Error("images.json commit 실패: "+(j.message||r2.status)); }
  return await r2.json();
}

async function commitImagesAndMeta(addedCount){
  const meta = {
    updatedAt: new Date().toLocaleString("ko-KR",{hour12:false}).replace(/\.$/,""),
    fetchedCount: addedCount,
    totalCount: Object.keys(IMAGES).length
  };
  IMAGES_META = meta;
  await commitImagesToGitHub(IMAGES, meta);
}

async function loadImages(){
  try{
    const data = await fetchImagesFromCloud();
    IMAGES = data.images || {};
    IMAGES_META = data.meta || null;
  }catch(e){ console.warn("images.json load failed:", e); }
}

// 호환성: app.js의 runImageSync()이 호출하지만 자동 동기화 없음
async function syncImages(){
  return { fetched:0, total:Object.keys(IMAGES).length };
}

// === UI helpers ===
function refreshManualImageList(){
  const list = document.getElementById("manualImgList");
  const count = document.getElementById("imgCount");
  if(count) count.textContent = Object.keys(IMAGES).length;
  if(!list) return;
  const entries = Object.entries(IMAGES);
  if(entries.length === 0){
    list.innerHTML = '<div style="color:var(--muted);padding:.4rem 0;">등록된 이미지 없음</div>';
    return;
  }
  const shopMap = {};
  if(typeof PRODUCTS !== "undefined") for(const p of PRODUCTS) if(p.shopNo) shopMap[p.shopNo] = p;
  list.innerHTML = entries.map(([sn, url]) => {
    const p = shopMap[sn];
    const label = p ? (escapeHtml(p.품번) + " · " + escapeHtml(p.품명||"")) : escapeHtml(sn);
    return '<div style="display:flex;align-items:center;gap:.5rem;padding:.4rem 0;border-top:1px solid var(--line);">'
      + '<img src="' + escapeHtml(url) + '" style="width:40px;height:40px;object-fit:cover;border-radius:4px;border:1px solid var(--line);background:#fafaf7;flex-shrink:0;" loading="lazy" onerror="this.style.opacity=0.3"/>'
      + '<div style="min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + label + '</div>'
      + '<button class="hairline" style="padding:.25rem .5rem;font-size:.7rem;font-weight:700;flex-shrink:0;" data-del-shop="' + escapeHtml(sn) + '">삭제</button>'
      + '</div>';
  }).join("");
}

function populateProductCodesList(){
  const dl = document.getElementById("productCodes");
  if(!dl || typeof PRODUCTS === "undefined") return;
  dl.innerHTML = PRODUCTS.filter(p => p.shopNo).slice(0, 2000).map(p =>
    '<option value="' + escapeHtml(p.품번) + '">' + escapeHtml(p.품명||"") + '</option>'
  ).join("");
}

async function addManualImage(){
  const codeInput = document.getElementById("manualImgCode");
  const urlInput = document.getElementById("manualImgUrl");
  const msg = document.getElementById("imgSyncMsg");
  const code = codeInput.value.trim();
  const url = urlInput.value.trim();
  if(!code || !url){ msg.className="img-progress err"; msg.textContent="품번과 이미지 URL 모두 입력하세요"; return; }
  if(typeof PRODUCTS === "undefined" || PRODUCTS.length === 0){
    msg.className="img-progress err"; msg.textContent="먼저 엑셀을 업로드하세요"; return;
  }
  const p = PRODUCTS.find(x => x.품번 === code);
  if(!p){ msg.className="img-progress err"; msg.textContent='품번 "' + code + '"을(를) 찾을 수 없음'; return; }
  if(!p.shopNo){ msg.className="img-progress err"; msg.textContent='"' + code + '"에 자사몰 상품번호 없음'; return; }
  msg.className="img-progress"; msg.textContent="GitHub에 저장 중…";
  const backup = IMAGES[p.shopNo];
  IMAGES[p.shopNo] = url;
  try{
    await commitImagesAndMeta(1);
    codeInput.value = ""; urlInput.value = "";
    msg.className="img-progress ok"; msg.textContent="✓ " + p.품번 + " 저장 완료. 직원 화면 1~2분 후 반영";
    refreshManualImageList();
    if(typeof render === "function") render();
  }catch(e){
    if(backup === undefined) delete IMAGES[p.shopNo]; else IMAGES[p.shopNo] = backup;
    msg.className="img-progress err"; msg.textContent="저장 실패: " + e.message;
  }
}

async function bulkAddImages(){
  const ta = document.getElementById("bulkImgInput");
  const msg = document.getElementById("imgSyncMsg");
  const lines = ta.value.split(/\n/).map(l => l.trim()).filter(Boolean);
  if(lines.length === 0){ msg.className="img-progress err"; msg.textContent="입력 내용 없음"; return; }
  if(typeof PRODUCTS === "undefined" || PRODUCTS.length === 0){
    msg.className="img-progress err"; msg.textContent="먼저 엑셀 업로드"; return;
  }
  let ok = 0, fail = 0;
  const failed = [];
  const backups = {};
  for(const line of lines){
    const idx = line.search(/[,\t]/);
    if(idx < 0){ fail++; failed.push(line); continue; }
    const code = line.slice(0, idx).trim();
    const url = line.slice(idx + 1).trim();
    if(!code || !url){ fail++; failed.push(line); continue; }
    const p = PRODUCTS.find(x => x.품번 === code);
    if(!p || !p.shopNo){ fail++; failed.push(line); continue; }
    backups[p.shopNo] = IMAGES[p.shopNo];
    IMAGES[p.shopNo] = url;
    ok++;
  }
  if(ok === 0){ msg.className="img-progress err"; msg.textContent="모두 실패. 형식: 품번,URL"; return; }
  msg.className="img-progress"; msg.textContent="GitHub에 " + ok + "개 저장 중…";
  try{
    await commitImagesAndMeta(ok);
    msg.className="img-progress ok";
    msg.textContent="✓ " + ok + "개 저장 완료" + (fail > 0 ? " · " + fail + "개 실패 (품번/형식 오류)" : "");
    ta.value = failed.join("\n");
    refreshManualImageList();
    if(typeof render === "function") render();
  }catch(e){
    for(const sn in backups){
      if(backups[sn] === undefined) delete IMAGES[sn]; else IMAGES[sn] = backups[sn];
    }
    msg.className="img-progress err"; msg.textContent="저장 실패: " + e.message;
  }
}

async function deleteImage(shopNo){
  if(!confirm("이 이미지를 삭제할까요?")) return;
  const msg = document.getElementById("imgSyncMsg");
  const backup = IMAGES[shopNo];
  delete IMAGES[shopNo];
  msg.className="img-progress"; msg.textContent="GitHub에서 삭제 중…";
  try{
    await commitImagesAndMeta(0);
    msg.className="img-progress ok"; msg.textContent="✓ 삭제 완료";
    refreshManualImageList();
    if(typeof render === "function") render();
  }catch(e){
    IMAGES[shopNo] = backup;
    msg.className="img-progress err"; msg.textContent="삭제 실패: " + e.message;
  }
}

// === Wire up handlers ===
setTimeout(() => {
  const addBtn = document.getElementById("manualImgAdd");
  if(addBtn) addBtn.addEventListener("click", addManualImage);
  const bulkBtn = document.getElementById("bulkImgAdd");
  if(bulkBtn) bulkBtn.addEventListener("click", bulkAddImages);
  // Refresh list when admin opens settings
  const openSettingsBtn = document.getElementById("openSettings");
  if(openSettingsBtn){
    openSettingsBtn.addEventListener("click", () => {
      setTimeout(() => { refreshManualImageList(); populateProductCodesList(); }, 80);
    });
  }
  // Also refresh whenever settings panel becomes visible (first admin login goes straight to settings if not configured)
  const sp = document.getElementById("settingsPanel");
  if(sp && typeof MutationObserver !== "undefined"){
    new MutationObserver(() => {
      if(!sp.classList.contains("hidden")){
        refreshManualImageList(); populateProductCodesList();
      }
    }).observe(sp, { attributes:true, attributeFilter:["class"] });
  }
  // Delete event delegation
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-del-shop]");
    if(btn) deleteImage(btn.dataset.delShop);
  });
}, 200);

loadImages().then(() => {
  if(typeof render === "function") render();
  refreshManualImageList();
});
