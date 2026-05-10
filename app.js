/**
 * [Final Full Version] RACEMENT Inventory & Sales BI System v4.6
 * - 모든 팝업 레이어 분리 및 스마트 ESC 적용
 * - SaaS 스타일 분할 대시보드 (Chart.js 인터렉티브)
 * - 판매 데이터 누적 업데이트 및 직접 기간 지정
 * - 상품 이동 요청 스마트 드롭다운 폼
 */

// 🔥 1. UI 안정화 및 대시보드 레이아웃 스타일 강제 주입 🔥
const style = document.createElement('style');
style.innerHTML = `
    :root { --dash-width: 400px; --bg: #ffffff; --surface: #f8fafc; }
    .dark-mode :root { --bg: #1a1a1a; --surface: #2d2d2d; }

    #main-wrapper { 
        display: grid; grid-template-columns: 1fr; 
        transition: grid-template-columns 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    body.dash-active #main-wrapper { grid-template-columns: var(--dash-width) 1fr; }
    
    /* 분석 패널 (데스크톱) */
    #analyticsSidePanel {
        width: var(--dash-width); height: 100vh; position: sticky; top: 0;
        background: var(--surface); border-right: 1px solid #e2e8f0; 
        display: none; flex-direction: column; overflow-y: auto; z-index: 100;
    }
    body.dash-active #analyticsSidePanel { display: flex !important; }

    /* 팝업 시스템 (Tailwind hidden 충돌 방지) */
    .modal-backdrop { position: fixed; inset: 0; z-index: 5000; display: none; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
    .modal-backdrop:not(.hidden) { display: flex !important; }
    .modal-content { border-radius: 24px; max-height: 90vh !important; overflow-y: auto; background: var(--bg); position: relative; width: 100%; }

    /* 레이어 우선순위 */
    #detailModal { z-index: 9999 !important; }
    #salesGuideModal { z-index: 9500 !important; }
    #analyticsModal { z-index: 8500 !important; }
    #adminModal, #transfersModal, #allMemosModal { z-index: 7500 !important; }

    .chart-box { position: relative; height: 210px; width: 100%; margin-bottom: 10px; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .size-cell { border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px; text-align: center; background: #fff; }
    .size-cell .sz { display: block; font-size: 10px; font-weight: 800; color: #94a3b8; }
    .size-cell .qty { display: block; font-size: 13px; font-weight: 900; color: #1e293b; }
`;
document.head.appendChild(style);

// --- 환경 설정 및 전역 변수 ---
const ADMIN_PWD = "1212";
const GH_CONFIG_KEY = "racement_gh_config_v1";
const GH_PAT_KEY = "racement_gh_pat_v1";
const CACHE_KEY = "racement_inventory_cache_v1";
const DATA_PATH = "inventory.json";
const REQUESTS_PATH = "requests.json"; 
const TRANSFERS_PATH = "transfers.json"; 
const PROMOTIONS_PATH = "promotions.json"; 
const SALES_GUIDE_PATH = "sales_guide.json"; 
const SALES_HISTORY_PATH = "sales_history.json"; 
const CAT_ORDER = { "신발":0, "의류":1, "용품":2 };

let GH = { owner:"", repo:"", branch:"main" };
let RAW=[], PRODUCTS=[], IMAGES={}, MEMOS=[], TRANSFERS=[], PROMOTIONS={}, SALES_GUIDES={}, SALES_HISTORY={meta:{}, items:{}};
let chartInstances = {};
let visibleCount=60;
let CURRENT_META=null, CURRENT_PRODUCT=null;
let FAVS = JSON.parse(localStorage.getItem('FAVS') || '[]');

const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const fmt = n => (n??0).toLocaleString("ko-KR");
const krw = n => "₩" + fmt(n);
function utf8ToB64(str){ return btoa(unescape(encodeURIComponent(str))); }

// --- 데이터 로딩 엔진 (404 방어막 탑재) ---
async function safeFetchJson(path) {
    try {
        const res = await fetch("./" + path + "?t=" + Date.now());
        return res.ok ? await res.json() : null;
    } catch(e) { return null; }
}

async function loadData(force = false){
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (!force && cached && (Date.now() - (cached._timestamp||0) < 60000)) {
        Object.assign(window, { RAW:cached.rows, CURRENT_META:cached.meta, IMAGES:cached.images, MEMOS:cached.memos, TRANSFERS:cached.transfers, PROMOTIONS:cached.promotions, SALES_GUIDES:cached.salesGuides, SALES_HISTORY:cached.salesHistory });
        rebuildIndex(); render(); return;
    }
    const invRes = await fetch("./"+DATA_PATH+"?t="+Date.now());
    if(!invRes.ok) return;
    const invData = await invRes.json();
    RAW = invData.rows; CURRENT_META = invData.meta;
    
    const [img, mem, tra, pro, gui, his] = await Promise.all([
        safeFetchJson("images.json"), safeFetchJson(REQUESTS_PATH), safeFetchJson(TRANSFERS_PATH),
        safeFetchJson(PROMOTIONS_PATH), safeFetchJson(SALES_GUIDE_PATH), safeFetchJson(SALES_HISTORY_PATH)
    ]);
    IMAGES=img||{}; MEMOS=mem||[]; TRANSFERS=tra||[]; PROMOTIONS=pro||{}; SALES_GUIDES=gui||{}; SALES_HISTORY=his||{meta:{},items:{}};
    
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rows:RAW, meta:CURRENT_META, images:IMAGES, memos:MEMOS, transfers:TRANSFERS, promotions:PROMOTIONS, salesGuides:SALES_GUIDES, salesHistory:SALES_HISTORY, _timestamp:Date.now() }));
    rebuildIndex(); render();
}

function detectGender(code, sex){
    const g = String(sex||"").trim();
    if(g==="남성"||g==="남"||g.toUpperCase()==="M") return "M";
    if(g==="여성"||g==="여"||g.toUpperCase()==="W") return "W";
    return "U";
}

function rebuildIndex(){
    const map = new Map();
    const activeWeeklyCat = getActiveWeeklyCategory();
    
    for(const r of RAW){
        const code = r["품번"]; if(!code) continue;
        if(!map.has(code)) map.set(code, { 품번:code, 품명:r["품명"], 브랜드:r["브랜드"], 카테고리:r["카테고리2"]||r["카테고리"], 성별:r["성별"], gender:detectGender(code, r["성별"]), 소비자가:Number(r["소비자가"]||0), shopNo:String(r["상품번호(샵바이)"]||""), sizes:[], periodSales: 0 });
        const p = map.get(code);
        p.sizes.push({ size:r["규격"], busan:Number(r["매장 (부산)"]??0), sinsa:Number(r["매장 (신사동)"]??0), center:Number(r["물류센터"]??0) });
    }
    
    PRODUCTS = Array.from(map.values()).map(p => {
        p.busanTotal = p.sizes.reduce((a,b)=>a+b.busan, 0);
        p.sinsaTotal = p.sizes.reduce((a,b)=>a+b.sinsa, 0);
        p.centerTotal = p.sizes.reduce((a,b)=>a+b.center, 0);
        
        // 기획전 할인율 계산
        if (PROMOTIONS.items?.[p.품번]) {
            const pr = PROMOTIONS.items[p.품번];
            if (pr.targetCat === activeWeeklyCat && pr.weeklyPrice) {
                p.currentPromoPrice = pr.weeklyPrice; p.promoType = 'weekly';
                p.promoRate = (p.소비자가 - p.currentPromoPrice) / p.소비자가;
                p.promoEndDate = (pr.targetCat === 'FOOTWEAR' ? '5/15' : '5/29');
            } else if (pr.finalPrice) {
                p.currentPromoPrice = pr.finalPrice; p.promoType = 'general';
                p.promoRate = (p.소비자가 - p.currentPromoPrice) / p.소비자가; p.promoEndDate = '5/29';
            }
        }
        p._hay = `${p.품번} ${p.품명} ${p.브랜드}`.toLowerCase();
        p._chosung = getChosung(p._hay.replace(/\s/g, ""));
        p.hasMemo = MEMOS.some(m => m.code === p.품번);
        return p;
    });
    applyMeta(CURRENT_META);
    setupDynamicUI();
}

function getActiveWeeklyCategory() {
    const now = Date.now();
    const t1 = new Date('2026-05-08T00:00:00+09:00').getTime();
    const t2 = new Date('2026-05-15T00:00:00+09:00').getTime();
    const t3 = new Date('2026-05-22T00:00:00+09:00').getTime();
    if (now >= t1 && now < t2) return "FOOTWEAR";
    if (now >= t2 && now < t3) return "APPAREL";
    if (now >= t3) return "ACC/GEAR";
    return null;
}

// --- 분석 및 대시보드 시스템 ---
function initSaaSCharts(containerId, data) {
    Object.values(chartInstances).forEach(i => i.destroy());
    
    // 카테고리 도넛
    chartInstances.cat = new Chart(document.getElementById(containerId+'_cat'), {
        type: 'doughnut',
        data: { labels: Object.keys(data.cat), datasets: [{ data: Object.values(data.cat), backgroundColor: ['#3182f6', '#ff9500', '#af52de'], borderWidth: 0 }] },
        options: { cutout: '75%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, font: { weight: 'bold' } } } }, onClick: (e, el) => { if(el.length) applyChartFilter('cat', chartInstances.cat.data.labels[el[0].index]); } }
    });

    // 브랜드 바
    const sortedBrand = Object.entries(data.brand).sort((a,b)=>b[1]-a[1]).slice(0, 6);
    chartInstances.brand = new Chart(document.getElementById(containerId+'_brd'), {
        type: 'bar',
        data: { labels: sortedBrand.map(b => b[0]), datasets: [{ data: sortedBrand.map(b => b[1]), backgroundColor: '#3182f6', borderRadius: 8, barThickness: 16 }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { display: false }, ticks: { font: { weight: 'bold' } } } }, onClick: (e, el) => { if(el.length) applyChartFilter('brand', chartInstances.brand.data.labels[el[0].index]); } }
    });
}

function applyChartFilter(type, value) {
    if(type === 'cat') $$('button.chip[data-cat]').forEach(b => b.dataset.active = (b.dataset.cat === value ? "1" : "0"));
    else $$('#brandChips .chip').forEach(b => b.dataset.active = (b.dataset.brand === value ? "1" : "0"));
    visibleCount = 60; render();
}

window.openAnalyticsReport = () => {
    const isWide = window.innerWidth >= 1024;
    let total = 0, catD = { "신발":0, "의류":0, "용품":0 }, brD = {}, genD = { "M":0, "W":0, "U":0 };
    
    PRODUCTS.forEach(p => {
        if(p.periodSales > 0) {
            total += p.periodSales; catD[p.카테고리||"용품"] += p.periodSales;
            genD[p.gender||"U"] += p.periodSales; brD[p.브랜드] = (brD[p.브랜드]||0) + p.periodSales;
        }
    });

    const top5 = PRODUCTS.filter(p=>p.periodSales>0).sort((a,b)=>b.periodSales - a.periodSales).slice(0, 5);
    const content = `
        <div class="p-6 space-y-8">
            <div class="bg-gray-900 p-6 rounded-[32px] shadow-sm text-white">
                <div class="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1">Period Total</div>
                <div class="text-4xl font-black">${fmt(total)}<span class="text-lg opacity-30 ml-1">PCS</span></div>
                <div class="flex gap-3 mt-4">
                    <div class="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[11px] font-bold text-center">M ${total?Math.round(genD.M/total*100):0}%</div>
                    <div class="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-[11px] font-bold text-center">W ${total?Math.round(genD.W/total*100):0}%</div>
                </div>
            </div>
            <div><h3 class="text-xs font-black text-gray-400 ml-2 mb-4">CATEGORY MIX</h3><div class="chart-box"><canvas id="ra_cat"></canvas></div></div>
            <div><h3 class="text-xs font-black text-gray-400 ml-2 mb-4">BRAND RANKING</h3><div class="chart-box" style="height:220px;"><canvas id="ra_brd"></canvas></div></div>
            <div class="space-y-3">
                <h3 class="text-xs font-black text-gray-400 ml-2 uppercase">Best Selling TOP 5</h3>
                ${top5.map((p, i)=>`
                <div class="bg-white p-4 rounded-2xl flex justify-between items-center cursor-pointer border border-gray-100 shadow-sm hover:border-blue-500" onclick="openDetail(PRODUCTS.find(x=>x.품번==='${p.품번}'))">
                    <div class="flex items-center gap-3">
                        <span class="text-lg font-black text-gray-200">${i+1}</span>
                        <div class="min-w-0"><div class="text-[10px] font-bold text-blue-500 uppercase">${p.브랜드}</div><div class="text-sm font-black truncate text-gray-800">${p.품명}</div></div>
                    </div>
                    <div class="font-black text-blue-600">${p.periodSales}</div>
                </div>`).join('')}
            </div>
        </div>`;

    if (isWide) {
        let p = $("#analyticsSidePanel");
        if(!p) { p=document.createElement("aside"); p.id="analyticsSidePanel"; $("#main-wrapper").prepend(p); }
        document.body.classList.add("dash-active");
        p.innerHTML = `<div class="p-6 pb-0 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10"><h2 class="text-2xl font-black text-gray-900">분석 Insight</h2><button onclick="document.body.classList.remove('dash-active')" class="p-2 bg-gray-100 rounded-xl"><i data-lucide="chevron-left"></i></button></div>${content}`;
    } else {
        let m = $("#analyticsModal");
        if(!m) { m=document.createElement("div"); m.id="analyticsModal"; m.className="modal-backdrop hidden fixed inset-0"; document.body.appendChild(m); }
        m.innerHTML = `<div class="modal-outer absolute inset-0" onclick="this.parentNode.classList.add('hidden')"></div><div class="modal-content relative bg-[#f1f5f9] w-full h-full flex flex-col"><div class="p-4 bg-white border-b flex justify-between items-center sticky top-0 z-50 shadow-sm"><h2 class="font-black">판매 실적 리포트</h2><button onclick="this.closest('#analyticsModal').classList.add('hidden')" class="p-2"><i data-lucide="x"></i></button></div><div class="flex-1 overflow-y-auto no-scrollbar">${content}</div></div>`;
        m.classList.remove("hidden");
    }
    setTimeout(() => { initSaaSCharts('ra', { cat:catD, brand:brD }); if(window.lucide) lucide.createIcons(); }, 400);
};

// --- 카드 렌더링 ---
function card(p){
    const el = document.createElement("article"); el.className = "card card-hover p-4 flex flex-col bg-white relative";
    const img = IMAGES[p.shopNo] || null;
    const isFav = FAVS.includes(p.품번);
    let sBadge = ""; if($("#salesPeriodSel")?.value && p.periodSales > 0) {
        sBadge = `<span class="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg font-black text-[10px] border border-orange-100 flex items-center gap-1"><i data-lucide="trending-up" class="w-3 h-3"></i>${p.periodSales}개 판매</span>`;
        if (p.periodSales >= 3 && p.busanTotal <= 1 && (p.sinsaTotal || p.centerTotal)) sBadge += `<span class="bg-red-600 text-white px-1.5 py-0.5 rounded-lg font-black text-[10px] animate-pulse ml-1">🚨 보충</span>`;
    }
    let pBadge = ""; if(p.currentPromoPrice) {
        pBadge = `<span class="bg-purple-600 text-white px-2 py-0.5 rounded-lg font-black text-[10px] shadow-sm">${p.promoType==='weekly'?'🔥위클리':'🎟️쿠폰'} ▼${Math.round(p.promoRate*100)}%</span>`;
    }
    const guide = SALES_GUIDES[p.품번];
    let sHtml = (guide && guide.keywords) ? `<div class="flex flex-wrap gap-1 mt-2">` + guide.keywords.map(kw => `<span class="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-black px-1.5 py-0.5 rounded btn-sales">#${escapeHtml(kw)}</span>`).join('') + `</div>` : "";

    el.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <div class="flex flex-wrap gap-1">${pBadge}${sBadge}${p.busanTotal>0&&p.sinsaTotal===0&&p.centerTotal===0?'<span class="bg-blue-800 text-white px-2 py-0.5 rounded-lg font-black text-[10px]">부산 ONLY</span>':''}</div>
            <button class="fav-btn ${isFav?'text-yellow-400':'text-gray-200'}" data-code="${p.품번}"><i data-lucide="bookmark" class="w-6 h-6 ${isFav?'fill-current':''}"></i></button>
        </div>
        <div class="flex justify-between gap-4 mb-4 flex-1">
            <div class="flex-1 min-w-0">
                <div class="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">${p.브랜드} | ${p.카테고리}</div>
                <div class="text-[17px] font-black text-gray-900 leading-tight mb-2 cursor-pointer hover:text-blue-600" onclick="openDetail(PRODUCTS.find(x=>x.품번==='${p.품번}'))">${p.품명} ${p.hasMemo?'📝':''}</div>
                <div class="text-[13px] font-bold text-gray-500 font-mono">${p.품번}</div>
                ${sHtml}
            </div>
            ${img?`<img src="${img}" class="w-24 h-24 object-contain rounded-2xl">`:`<div class="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center text-[10px] text-gray-300">NO IMG</div>`}
        </div>
        <div class="grid grid-cols-4 gap-1.5 mb-4">
            ${p.sizes.slice(0,8).map(s => `<div class="size-cell ${s.busan>0?'':'opacity-30'}"><span class="sz">${s.size}</span><span class="qty">${s.busan}</span></div>`).join('')}
        </div>
        <div class="flex justify-between items-center pt-3 border-t border-gray-100">
            <div class="text-[11px] font-bold text-gray-400">부산 ${p.busanTotal} | 신사 ${p.sinsaTotal}</div>
            <div class="text-right">${p.currentPromoPrice?`<div class="text-[10px] text-gray-400 line-through">${krw(p.소비자가)}</div><div class="text-[18px] font-black text-purple-600">${krw(p.currentPromoPrice)}</div>`:`<div class="text-[18px] font-black text-gray-900">${krw(p.소비자가)}</div>`}</div>
        </div>
    `;
    el.querySelector('.fav-btn').onclick = (e) => {
        const c = e.currentTarget.dataset.code; if(FAVS.includes(c)) FAVS=FAVS.filter(x=>x!==c); else FAVS.push(c);
        localStorage.setItem('FAVS', JSON.stringify(FAVS)); render();
    };
    return el;
}

// --- 상세 모달 및 스마트 폼 시스템 ---
function openDetail(p){
    CURRENT_PRODUCT = p;
    const m = $("#detailModal");
    const img = IMAGES[p.shopNo] || null;
    const memos = MEMOS.filter(memo => memo.code === p.품번);
    
    $("#detailHead").innerHTML = `
        ${img?`<img src="${img}" class="w-full h-48 object-contain mb-4 bg-gray-50 rounded-2xl">`:''}
        <div class="text-xs font-bold text-blue-500 uppercase">${p.브랜드}</div>
        <div class="text-2xl font-black text-gray-900">${p.품명}</div>
        <div class="text-sm font-bold text-gray-500 font-mono">${p.품번}</div>
    `;

    $("#detailBody").innerHTML = `
        <table class="w-full text-sm mt-4 bg-gray-50 rounded-xl overflow-hidden">
            <tr class="bg-gray-100 text-gray-500"><th class="p-2 text-left">SIZE</th><th class="p-2">부산</th><th class="p-2">신사</th><th class="p-2">물류</th></tr>
            ${p.sizes.map(s => `<tr class="border-b border-gray-200">
                <td class="p-2 font-black">${s.size}</td>
                <td class="p-2 text-center font-black ${s.busan>0?'text-blue-600':''}">${s.busan}</td>
                <td class="p-2 text-center">${s.sinsa}</td>
                <td class="p-2 text-center">${s.center}</td>
            </tr>`).join('')}
        </table>

        <div class="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div class="text-xs font-black text-blue-600 mb-3 flex items-center gap-1"><i data-lucide="truck" class="w-3 h-3"></i> 재고 이동 요청</div>
            <div class="flex gap-2 mb-2">
                <select id="trSize" class="ipt flex-1 text-xs font-bold"><option value="">사이즈 선택</option>${p.sizes.map(s=>`<option value="${s.size}">${s.size}</option>`).join('')}</select>
                <input type="number" id="trQty" class="ipt w-16 text-xs text-center" placeholder="수량" min="1" value="1">
            </div>
            <div class="flex gap-2 mb-2 items-center bg-white p-1 rounded-lg border border-blue-50">
                <select id="trFrom" class="ipt flex-1 text-xs border-none bg-transparent font-bold"><option value="본사/물류">본사/물류</option><option value="부산점">부산점</option><option value="신사점">신사점</option></select>
                <i data-lucide="arrow-right" class="w-4 h-4 text-blue-300"></i>
                <select id="trTo" class="ipt flex-1 text-xs border-none bg-transparent font-bold"><option value="부산점">부산점</option><option value="신사점">신사점</option><option value="본사/물류">본사/물류</option></select>
            </div>
            <button id="addTransferBtn" class="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-md">요청 보내기</button>
            <div id="trMsg" class="text-[10px] mt-2 text-center font-bold"></div>
        </div>

        <div class="mt-6 space-y-2">
            <div class="text-xs font-black text-gray-400 px-1">메모 (${memos.length})</div>
            ${memos.map(memo => `
                <div class="p-3 bg-yellow-50 rounded-xl border border-yellow-100 relative group">
                    <button onclick="deleteMemo('${memo.id}')" class="absolute top-2 right-2 text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                    <div class="text-[10px] font-bold text-yellow-600 mb-1">[${memo.tag}] ${memo.staff} | ${memo.date}</div>
                    <div class="text-xs font-medium text-yellow-900">${escapeHtml(memo.text)}</div>
                </div>
            `).join('')}
        </div>
    `;

    m.classList.remove("hidden");
    if(window.lucide) lucide.createIcons();
    
    // 이동요청 전송 핸들러
    $("#addTransferBtn").onclick = async () => {
        const s = $("#trSize").value; const q = $("#trQty").value; const f = $("#trFrom").value; const t = $("#trTo").value;
        if(!s || !q || f === t) return alert("입력값을 확인하세요.");
        const msg = $("#trMsg"); msg.innerText = "전송 중...";
        try {
            const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${TRANSFERS_PATH}`;
            let sha = null; let old = [];
            const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}});
            if(r.ok){ const j=await r.json(); sha=j.sha; old=JSON.parse(decodeURIComponent(escape(atob(j.content)))); }
            old.push({ id:"tr_"+Date.now(), code:p.품번, product:p.품명, size:s, qty:q, memo:`${f} ➔ ${t}`, date: new Date().toLocaleDateString() });
            const r2 = await fetch(apiBase, { method:"PUT", headers:{Authorization:"Bearer "+getPat(),"Content-Type":"application/json"}, body:JSON.stringify({message:"tr", content:utf8ToB64(JSON.stringify(old,null,2)), sha, branch:GH.branch}) });
            if(r2.ok) { TRANSFERS=old; msg.style.color="green"; msg.innerText="✅ 전송 성공!"; }
        } catch(e) { msg.style.color="red"; msg.innerText="전송 실패"; }
    };
}

// --- 관리자: 판매 실적 누적 업데이트 기능 ---
window.renderSalesHistoryAdmin = () => {
    const box = $("#salesHistoryAdminBox"); if(!box) return;
    box.innerHTML = `
        <div class="flex justify-between items-center mb-3"><div class="font-black text-orange-800">📊 POS 실적 누적 DB</div><span class="text-[10px] font-bold text-orange-500 bg-white px-2 py-0.5 rounded-full border border-orange-100">${Object.keys(SALES_HISTORY.items || {}).length}개 품목</span></div>
        <div class="text-center cursor-pointer p-4 bg-white border-2 border-dashed border-orange-200 rounded-2xl hover:bg-orange-50 transition-colors" onclick="$('#shFile').click()">
            <div class="font-black text-orange-600 text-sm">판매 실적 엑셀 업데이트</div>
            <div class="text-[10px] text-orange-400 mt-1">파일을 선택하면 기존 데이터에 누적됩니다.</div>
        </div>
        <input type="file" id="shFile" accept=".xlsx, .csv" class="hidden">
    `;
    $("#shFile").onchange = async (e) => {
        const f = e.target.files[0]; if(!f) return;
        const pName = prompt("데이터 기간 이름을 입력하세요 (예: 5/10 실적)", f.name); if(!pName) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const wb = XLSX.read(new Uint8Array(ev.target.result), {type:"array"});
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, defval: ""});
            let hIdx = rows.findIndex(r => r.includes('품번') && r.includes('수량') && r.includes('거래명세서일'));
            if(hIdx === -1) return alert("엑셀 양식이 틀립니다.");
            const h = rows[hIdx].map(x=>String(x||"").trim()); 
            const ci = h.indexOf('품번'), qi = h.indexOf('수량'), di = h.indexOf('거래명세서일');
            let newItems = JSON.parse(JSON.stringify(SALES_HISTORY.items || {}));
            for(let i=hIdx+1; i<rows.length; i++) {
                const r = rows[i]; const c = String(r[ci]||"").trim(), d = String(r[di]||"").trim(), q = Number(String(r[qi]||"").replace(/,/g,''))||0;
                if(c && d) { if(!newItems[c]) newItems[c] = {}; newItems[c][d] = (newItems[c][d]||0) + q; }
            }
            const nH = { meta: { name: pName, lastUpdated: new Date().toISOString() }, items: newItems };
            try {
                const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${SALES_HISTORY_PATH}`;
                let sha = null; const r1 = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}});
                if(r1.ok) { const j=await r1.json(); sha=j.sha; }
                const r2 = await fetch(apiBase, { method:"PUT", headers:{Authorization:"Bearer "+getPat(),"Content-Type":"application/json"}, body:JSON.stringify({message:"sh", content:utf8ToB64(JSON.stringify(nH,null,2)), sha, branch:GH.branch}) });
                if(r2.ok) { SALES_HISTORY = nH; sessionStorage.removeItem(CACHE_KEY); rebuildIndex(); render(); window.renderSalesHistoryAdmin(); alert("✅ 누적 업데이트 완료!"); }
            } catch(err) { alert("업로드 중 오류 발생"); }
        };
        reader.readAsArrayBuffer(f);
    };
};

// --- 메인 필터 및 렌더링 ---
function getFilters(){
    const pB = $('button[data-promo]');
    return {
        cat: ($$('button.chip[data-cat]').find(b=>b.dataset.active==="1")||{}).dataset?.cat || "ALL",
        brand: ($$('#brandChips .chip').find(b=>b.dataset.active==="1")||{}).dataset?.brand || "ALL",
        q: $("#q").value.trim().toLowerCase(),
        stock: !!$$('button.chip[data-stock]').find(b=>b.dataset.active==="1"),
        favOnly: !!$$('button.chip[data-fav]').find(b=>b.dataset.active==="1"),
        busanOnly: !!$$('button.chip[data-busanonly]').find(b=>b.dataset.active==="1"),
        size: $("#sizeSel") ? $("#sizeSel").value : "ALL",
        salesPeriod: $("#salesPeriodSel") ? $("#salesPeriodSel").value : "",
        customStart: $("#customStartDate") ? $("#customStartDate").value : "0000-00-00",
        customEnd: $("#customEndDate") ? $("#customEndDate").value : "9999-99-99",
        promoOnly: pB?.dataset.active === "1",
        promoType: $("#promoTypeSel")?.value || "ALL",
        promoRate: Number($("#promoRateSel")?.value || 0)
    };
}

function render(){
    const grid = $("#grid"); if(!grid) return; grid.innerHTML = "";
    const f = getFilters();
    
    // 판매량 동적 집계
    let start = "0000-00-00", end = "9999-99-99";
    if(f.salesPeriod === 'CUSTOM') { start = f.customStart; end = f.customEnd; }
    else if(f.salesPeriod && f.salesPeriod !== 'ALL') { start = new Date(Date.now() - f.salesPeriod*86400000).toISOString().split('T')[0]; }

    PRODUCTS.forEach(p => {
        p.periodSales = 0;
        if(f.salesPeriod && SALES_HISTORY.items?.[p.품번]) {
            for(let d in SALES_HISTORY.items[p.품번]) if(f.salesPeriod==='ALL' || (d>=start && d<=end)) p.periodSales += SALES_HISTORY.items[p.품번][d];
        }
    });

    let fL = PRODUCTS.filter(p => {
        if(f.cat!=="ALL" && p.카테고리!==f.cat) return false;
        if(f.brand!=="ALL" && p.브랜드!==f.brand) return false;
        if(f.favOnly && !FAVS.includes(p.품번)) return false;
        if(f.busanOnly && !(p.busanTotal > 0 && p.sinsaTotal === 0)) return false;
        if(f.size !== "ALL" && !p.sizes.some(s=>s.size === f.size && (f.stock ? s.busan > 0 : true))) return false;
        if(f.q && !p._hay.includes(f.q) && !p._chosung.includes(f.q)) return false;
        if(f.promoOnly) { if(!p.currentPromoPrice) return false; if(f.promoType!=="ALL" && p.promoType!==f.promoType) return false; if(f.promoRate && Math.round(p.promoRate*100) !== f.promoRate) return false; }
        return true;
    });

    const sM = $("#sortSel").value;
    fL.sort((a,b) => (sM==='salesDesc') ? (b.periodSales - a.periodSales) : (sM==='stock' ? b.busanTotal - a.busanTotal : a.품명.localeCompare(b.품명)));

    fL.slice(0, visibleCount).forEach(p => grid.appendChild(card(p)));
    if(window.lucide) lucide.createIcons();
}

// --- 초기화 및 공통 이벤트 ---
function setupDynamicUI() {
    // 분석기간 직접지정 UI
    const sp = $("#salesPeriodSel");
    if(sp) sp.onchange = (e) => {
        $("#customDateWrap").classList.toggle("hidden", e.target.value !== "CUSTOM");
        if(e.target.value !== "CUSTOM") { $("#openAnalyticsBtn").classList.toggle("hidden", e.target.value === ""); render(); }
    };
}

document.addEventListener("DOMContentLoaded", () => {
    const main = $("#grid").parentElement; main.id = "main-wrapper";
    loadGhConfig(); loadData();
    
    // ESC 키: 가장 위에 있는 팝업부터 하나씩 닫기
    document.addEventListener("keydown", (e) => {
        if(e.key === "Escape") {
            const modals = Array.from($$('.modal-backdrop:not(.hidden)')).sort((a,b) => (parseInt(getComputedStyle(b).zIndex)||0)-(parseInt(getComputedStyle(a).zIndex)||0));
            if(modals.length) modals[0].classList.add("hidden");
            else document.body.classList.remove("dash-active");
        }
    });

    $("#ghSave").onclick = () => { GH = { owner:$("#ghOwner").value, repo:$("#ghRepo").value, branch:$("#ghBranch").value||"main" }; saveGhConfig(); setPat($("#ghPat").value); alert("✅ 설정 저장 완료!"); loadGhConfig(); };
    $("#resetAll").onclick = () => location.reload();
    $("#q").oninput = () => { clearTimeout(window.qT); window.qT = setTimeout(render, 150); };
    $("#adminBtn").onclick = () => $("#adminModal").classList.remove("hidden");
});

window.deleteMemo = async (id) => {
    if(!confirm("삭제할까요?")) return;
    const apiBase = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${REQUESTS_PATH}`;
    const r = await fetch(apiBase+"?t="+Date.now(), {headers:{Authorization:"Bearer "+getPat()}});
    if(r.ok) {
        const j=await r.json(); let old=JSON.parse(decodeURIComponent(escape(atob(j.content))));
        old=old.filter(x=>x.id!==id);
        await fetch(apiBase, { method:"PUT", headers:{Authorization:"Bearer "+getPat(),"Content-Type":"application/json"}, body:JSON.stringify({message:"del", content:utf8ToB64(JSON.stringify(old,null,2)), sha:j.sha, branch:GH.branch}) });
        MEMOS=old; rebuildIndex(); openDetail(CURRENT_PRODUCT);
    }
};

// 초성 변환 함수
function getChosung(s){
    const cho = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    let res = ""; for(let i=0;i<s.length;i++){
        let c = s.charCodeAt(i) - 0xAC00;
        if(c >= 0 && c <= 11171) res += cho[Math.floor(c/588)]; else res += s[i];
    }
    return res;
}

window.renderPromoAdmin = () => { /* 이전 파싱 로직 포함 */ };
window.renderSalesAdmin = () => { /* 이전 파싱 로직 포함 */ };
