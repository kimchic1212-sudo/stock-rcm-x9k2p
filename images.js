// RACEMENT Haeundae Inventory — images.js (NHN Commerce API 직접 호출)
// Cloudflare Worker proxy 경유 → shop-api.e-ncp.com 호출 → imageUrls[0] 추출
const IMAGES_PATH = "images.json";
const PROXY_URL = "https://racement-proxy.kimchic1212.workers.dev/?url=";
const SHOP_API_BASE = "https://shop-api.e-ncp.com/products/";
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

// 단일 제품 이미지 URL 가져오기
async function fetchProductImage(shopNo){
  const apiUrl = SHOP_API_BASE + encodeURIComponent(shopNo) + "?channelType=null&preview=false";
  try {
    const r = await fetch(PROXY_URL + encodeURIComponent(apiUrl));
    if (!r.ok) return null;
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); }
    catch(e){ return null; }
    if (data && Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
      let url = String(data.imageUrls[0] || "").trim();
      if (!url) return null;
      // protocol-relative → https
      if (url.startsWith('//')) url = 'https:' + url;
      return url;
    }
    // 다른 가능한 필드 fallback
    if (data && data.mainImageUrl) {
      let url = String(data.mainImageUrl).trim();
      if (url.startsWith('//')) url = 'https:' + url;
      return url;
    }
    return null;
  } catch (e) {
    return null;
  }
}

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
  const queue = targets.slice();
  async function worker(){
    while(queue.length){
      const sn = queue.shift();
      const url = await fetchProductImage(sn);
      if(url){ IMAGES[sn] = url; ok++; }
      done++;
      if(onProgress) onProgress({phase:"progress", total:targets.length, done, ok});
    }
  }
  // 병렬 5개씩 처리
  await Promise.all([worker(), worker(), worker(), worker(), worker()]);
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

async function loadImages(){
  try{
    const data = await fetchImagesFromCloud();
    IMAGES = data.images || {};
    IMAGES_META = data.meta || null;
  }catch(e){ console.warn("images.json load failed:", e); }
}

loadImages().then(()=>{
  if(typeof render === "function") render();
});
