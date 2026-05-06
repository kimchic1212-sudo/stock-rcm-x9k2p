// RACEMENT Haeundae Inventory — images.js (자사몰 og:image 자동 동기화)
// app.js에서 노출된 변수들 사용: GH, getPat, ghGet, ghPut, utf8ToB64, fmt
const IMAGES_PATH = "images.json";
const CORS_PROXIES = [
  "https://corsproxy.io/?url=",
  "https://api.allorigins.win/raw?url="
];
let IMAGES = {};       // shopNo → imageUrl
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

// 단일 제품 페이지에서 og:image 추출
async function fetchOgImage(shopNo){
  const productUrl = "https://racement.co.kr/product-detail?productNo=" + encodeURIComponent(shopNo);
  for(const proxy of CORS_PROXIES){
    try{
      const r = await fetch(proxy + encodeURIComponent(productUrl), { redirect:"follow" });
      if(!r.ok) continue;
      const html = await r.text();
      // og:image 우선, 없으면 first product image
      let m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if(!m) m = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if(m && m[1]) return m[1];
    }catch(e){ /* try next proxy */ }
  }
  return null;
}

// 신규 shopNo만 골라서 fetch → IMAGES 업데이트 → GitHub 저장
async function syncImages(products, onProgress){
  const targets = [];
  const seen = new Set();
  for(const p of products){
    if(p.shopNo && !IMAGES[p.shopNo] && !seen.has(p.shopNo)){
      seen.add(p.shopNo);
      targets.push(p.shopNo);
    }
  }
  if(targets.length === 0){
    if(onProgress) onProgress({phase:"skip", total:0, done:0});
    return { fetched:0, total:Object.keys(IMAGES).length };
  }
  if(onProgress) onProgress({phase:"start", total:targets.length, done:0});
  let done = 0, ok = 0;
  // 병렬 5개씩 처리
  const queue = targets.slice();
  async function worker(){
    while(queue.length){
      const sn = queue.shift();
      const url = await fetchOgImage(sn);
      if(url){ IMAGES[sn] = url; ok++; }
      done++;
      if(onProgress) onProgress({phase:"progress", total:targets.length, done, ok});
    }
  }
  await Promise.all([worker(), worker(), worker(), worker(), worker()]);
  // 저장
  if(onProgress) onProgress({phase:"saving", total:targets.length, done, ok});
  const meta = {
    updatedAt: new Date().toLocaleString("ko-KR",{hour12:false}).replace(/\.$/,""),
    fetchedCount: ok,
    totalCount: Object.keys(IMAGES).length
  };
  IMAGES_META = meta;
  try{
    await commitImagesToGitHub(IMAGES, meta);
  }catch(e){
    if(onProgress) onProgress({phase:"error", error:e.message});
    throw e;
  }
  if(onProgress) onProgress({phase:"done", total:targets.length, done, ok});
  return { fetched:ok, total:Object.keys(IMAGES).length };
}

// 초기 로드 (직원·관리자 공통)
async function loadImages(){
  try{
    const data = await fetchImagesFromCloud();
    IMAGES = data.images || {};
    IMAGES_META = data.meta || null;
  }catch(e){ console.warn("images.json load failed:", e); }
}

// 앱 로드 후 자동 호출
loadImages().then(()=>{
  // 이미지 캐시 후 카드 다시 그리기 (있으면 썸네일 표시)
  if(typeof render === "function") render();
});
