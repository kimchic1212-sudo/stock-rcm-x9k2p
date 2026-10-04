/**
 * guide_batch.js — AI 세일즈 가이드 v4 일괄 조사 (무료 경로)
 *
 * 신발을 모델(브랜드·품명·성별) 단위로 묶어, 부산 재고 많은 모델부터 허브(/api/ai-guide, mode 'research4')에
 * 조사를 맡긴다. 허브는 RunRepeat·Doctors of Running 리뷰 발췌 + Groq 무료 한도로 한국어 카드를 만들고,
 * 출처에 없는 수치·경쟁모델은 서버에서 걸러낸다. 같은 리뷰를 못 찾으면 found:false.
 *
 * 저장 (비공개 데이터 저장소 stock-rcm-data):
 *   sales_guide_models.json — 모델별 v4 전체 본문 (키 = 브랜드|품명|성별, 앱의 _guideModelKey와 같음)
 *   sales_guide_v2.json     — 품번별 요약 + 옛 화면 호환 필드 (새 앱 배포 전에도 기존 화면이 그대로 보이게)
 *   guide_batch_status.json — 마지막 실행 결과 (상품명 포함 상세는 여기에만 남긴다)
 * 공개 저장소의 Actions 로그라 상품명·재고 수치는 로그에 찍지 않는다.
 *
 * 건너뛰는 모델: 직원이 직접 쓴 가이드(manual)가 있는 모델, 이미 v4로 확인된 모델,
 *               v4에서 리뷰를 못 찾은 지 30일이 안 된 모델.
 * 하루 AI 한도(429 daily)에 닿으면 저장하고 멈춘다 — 다음 실행이 이어서 한다.
 *
 * 러닝화가 아닌 신발(리커버리 슬리퍼·클로그·하이킹화 등)은 조사하지 않고 'skip'으로 표시한다 — 앱에서 직원이 ✏️ 직접 입력.
 * 리뷰 사이트에 없는 모델은 실행당 WEB_MAX개까지 허브의 웹 검색(공식·판매 페이지 사양)으로 한 번 더 찾는다(토큰을 많이 씀).
 *
 * env: DATA_REPO_PAT, CRON_SECRET (필수) / MAX_MODELS(기본 20) / GAP_SEC(기본 55) / WEB_MAX(기본 4) / DRY_RUN=1(조사 없이 대상만 셈)
 */
const OWNER = 'kimchic1212-sudo', REPO = 'stock-rcm-data', BRANCH = 'main';
const PAT = (process.env.DATA_REPO_PAT || '').trim();
const CRON_SECRET = (process.env.CRON_SECRET || '').trim();
const HUB = (process.env.HUB_URL || 'https://racement-hub.vercel.app').replace(/\/$/, '');
const MAX = Math.max(1, Math.min(60, Number(process.env.MAX_MODELS) || 20));
const GAP_MS = Math.max(10, Number(process.env.GAP_SEC) || 55) * 1000;   // Groq 무료 분당 한도(8K 토큰) — 모델당 약 5K
const DRY_RUN = process.env.DRY_RUN === '1';
const WEB_MAX = Math.max(0, Math.min(20, Number(process.env.WEB_MAX ?? 4) || 0));
// 러닝화가 아닌 신발 — 리뷰 사이트 대상이 아니라 조사하지 않는다 (2026-10-04: 우포스 리커버리, 온 클라우드소마 모크, 나이키 마인드 001·ACG 제가마 하이크 등)
const NON_RUNNING_BRANDS = new Set(['우포스']);
const NON_RUNNING_NAME = /모크|클로그|슬라이드|샌들|슬리퍼|뮬|하이크|마인드s*0|테스트s*품목/;
function isNonRunning(p) { return NON_RUNNING_BRANDS.has(String(p.브랜드 || '').trim()) || NON_RUNNING_NAME.test(String(p.품명 || '')); }
// RETRY_NOTFOUND=1: 30일이 안 된 '리뷰 없음'도 다시 조사 (검색 규칙을 고친 뒤 한 번 돌릴 때)
const RETRY_NOTFOUND = process.env.RETRY_NOTFOUND === '1';
const RETRY_NOTFOUND_DAYS = 30;
// 검색 규칙 버전 — 규칙을 고치면 올린다. 이보다 옛 규칙으로 난 '리뷰 없음'은 30일을 기다리지 않고 다시 조사한다.
// 2 (2026-10-04): 한글 이름 사전·폭 표기 제거·변형 모델은 기본 모델 리뷰·리뷰 사이트 2곳 추가·웹 검색 대체
const SEARCH_REV = 2;
const freshNotFound = (v) => v && v.method === 'notfound' && (Number(v.searchRev) || 1) >= SEARCH_REV && !RETRY_NOTFOUND && daysSince(v.researchedAt) < RETRY_NOTFOUND_DAYS;
const SAVE_EVERY = 5;
const GUIDES = 'sales_guide_v2.json', MODELS = 'sales_guide_models.json', STATUS = 'guide_batch_status.json';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
function todayKst() { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); }
function daysSince(ymd) { const t = Date.parse(ymd || ''); return isFinite(t) ? (Date.now() - t) / 86400e3 : Infinity; }

// ── GitHub (1MB 넘는 파일은 Contents API가 content를 비워 주므로 blob으로 읽는다) ──
async function gh(method, path, body) {
  const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${PAT}`, Accept: 'application/vnd.github+json', 'User-Agent': 'guide-batch', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* 본문 없음 */ }
  return { status: r.status, json };
}
async function loadJson(file) {
  const meta = await gh('GET', `contents/${file}?ref=${BRANCH}`);
  if (meta.status === 404) return { data: null, sha: null };
  if (meta.status !== 200) throw new Error(`${file} 읽기 실패 ${meta.status}`);
  let b64 = meta.json.content;
  if (!b64) {
    const blob = await gh('GET', `git/blobs/${meta.json.sha}`);
    if (blob.status !== 200) throw new Error(`${file} blob 읽기 실패 ${blob.status}`);
    b64 = blob.json.content;
  }
  return { data: JSON.parse(Buffer.from(b64, 'base64').toString('utf8')), sha: meta.json.sha };
}
// 서버 최신본을 다시 읽어 바뀐 키만 덮어쓴다 — 그 사이 앱에서 저장한 다른 가이드를 지우지 않는다.
// 저장은 공백 없는 JSON (들여쓰기하면 파일이 커져 앱 쪽 읽기 한도에 먼저 닿는다).
async function mergeSave(file, changes, message) {
  if (!Object.keys(changes).length) return;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const { data, sha } = await loadJson(file);
    const merged = Object.assign({}, data || {}, changes);
    const res = await gh('PUT', `contents/${file}`, {
      message, branch: BRANCH,
      content: Buffer.from(JSON.stringify(merged)).toString('base64'),
      ...(sha ? { sha } : {}),
    });
    if (res.status === 200 || res.status === 201) return;
    if (res.status === 409 || res.status === 422) { log(`${file} 저장 충돌(${res.status}) — 다시 시도 ${attempt}/4`); await sleep(1500 * attempt); continue; }
    throw new Error(`${file} 저장 실패 ${res.status}`);
  }
  throw new Error(`${file} 저장 실패: 충돌 반복`);
}

// ── 모델 묶기 (앱 rebuildIndex·_missModels와 같은 기준) ──
function genderLabel(sex) {
  const g = String(sex || '').trim();
  if (g === '남성' || g === '남' || g.toUpperCase() === 'M') return '남성';
  if (g === '여성' || g === '여' || g.toUpperCase() === 'W') return '여성';
  return '공용';
}
function buildModels(rows) {
  const products = new Map();   // 품번 → 첫 행 기준 정보 + 부산 재고 합
  for (const r of rows) {
    const code = r['품번']; if (!code) continue;
    let p = products.get(code);
    if (!p) {
      p = { 품번: code, 품명: r['품명'], 브랜드: r['브랜드'], 카테고리: r['카테고리2'] || r['카테고리'], gender: genderLabel(r['성별']), busan: 0 };
      products.set(code, p);
    }
    p.busan += Number(r['매장 (부산)'] ?? r['매장(부산)'] ?? 0) || 0;
  }
  const models = new Map();
  for (const p of products.values()) {
    if (p.카테고리 !== '신발') continue;
    const mk = [p.브랜드, p.품명, p.gender].map((v) => String(v || '').trim()).join('|');
    let m = models.get(mk);
    if (!m) { m = { mk, rep: p, codes: [], stock: 0, gender: p.gender }; models.set(mk, m); }
    m.codes.push(p.품번);
    m.stock += p.busan;
    if (p.busan > m.rep.busan) m.rep = p;   // 재고 많은 품번으로 조사
  }
  return [...models.values()];
}

// ── 저장 항목 ──
function modelEntry(m, res, today) {
  const g = res.guide || {};
  return {
    ...g, v: 4, method: 'web', modelKey: m.mk, 브랜드: m.rep.브랜드 || '', 품명: m.rep.품명 || '', gender: m.gender,
    researchedAt: today, query: String(res.query || ''),
    sources: (Array.isArray(res.sources) ? res.sources : []).map(String).slice(0, 5),
  };
}
// 품번별 요약 — 옛 화면(카드 칩·가이드 모달)이 읽는 필드를 그대로 채운다
function skuEntry(code, mm, p) {
  return {
    v: 4, method: 'web', modelKey: mm.modelKey, researchedAt: mm.researchedAt,
    품번: code, 품명: (p && p.품명) || mm.품명, 브랜드: (p && p.브랜드) || mm.브랜드,
    matchedProduct: mm.matchedProduct || '', type: mm.type || '', category: mm.category || '',
    weightG: mm.weightG ?? null, weightBasis: mm.weightBasis || '',
    heelStackMm: mm.heelStackMm ?? null, foreStackMm: mm.foreStackMm ?? null, dropMm: mm.dropMm ?? null,
    foam: mm.foam || '', plate: mm.plate || '', features: mm.features || '', bestUse: mm.bestUse || '',
    fitNotes: mm.fitNotes || '', vsPrev: mm.vsPrev || '', salesPitch: mm.salesPitch || '',
    keywords: Array.isArray(mm.keywords) ? mm.keywords.slice(0, 5) : [],
    sources: mm.sources || [],
  };
}

async function research(m, allowWeb) {
  const p = m.rep;
  const r = await fetch(`${HUB}/api/ai-guide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-cron-secret': CRON_SECRET },
    body: JSON.stringify({ mode: 'research4', allowWeb: !!allowWeb, product: { brand: p.브랜드 || '', name: p.품명 || '', sku: p.품번 || '', gender: m.gender } }),
    signal: AbortSignal.timeout(90_000),
  });
  if (r.status === 401) { const e = new Error('허브 인증 실패 — CRON_SECRET 확인'); e.fatal = true; throw e; }
  if (!r.ok) throw new Error(`허브 응답 ${r.status}`);
  return r.json();
}

async function main() {
  if (!PAT) throw new Error('DATA_REPO_PAT 미설정');
  if (!CRON_SECRET && !DRY_RUN) throw new Error('CRON_SECRET 미설정');
  const today = todayKst();

  const [{ data: inv }, { data: guides0 }, { data: models0 }] = await Promise.all([loadJson('inventory.json'), loadJson(GUIDES), loadJson(MODELS)]);
  if (!inv || !Array.isArray(inv.rows)) throw new Error('inventory.json 형식 오류');
  const guides = guides0 || {}, models = models0 || {};
  const all = buildModels(inv.rows);
  // 잘 팔리는 모델부터: 최근 90일 판매 수량(sales_history.json: 품번 → 날짜 → 사이즈 → 판매처별 수량)
  const { data: sh } = await loadJson('sales_history.json').catch(() => ({ data: null }));
  const since = new Date(Date.now() - 90 * 86400e3).toISOString().slice(0, 10);
  const soldOf = (code) => {
    let n = 0;
    for (const [day, sizes] of Object.entries((sh && sh.items && sh.items[code]) || {})) {
      if (day < since) continue;
      for (const ch of Object.values(sizes || {})) for (const q of Object.values(ch || {})) n += Number(q) || 0;
    }
    return n;
  };
  for (const m of all) m.sold = m.codes.reduce((s, c) => s + soldOf(c), 0);
  const byCode = new Map(); for (const r of inv.rows) if (r['품번'] && !byCode.has(r['품번'])) byCode.set(r['품번'], { 품명: r['품명'], 브랜드: r['브랜드'] });

  const guideChanges = {}, modelChanges = {};

  // 이미 v4로 확인된 모델에 새 색상(품번)이 들어왔으면 조사 없이 요약만 채운다
  let filled = 0;
  for (const m of all) {
    const mm = models[m.mk];
    if (!mm || mm.method !== 'web' || mm.v !== 4) continue;
    for (const c of m.codes) {
      const g = guides[c];
      if (g && (g.method === 'manual' || (g.v === 4 && g.method === 'web'))) continue;
      guideChanges[c] = skuEntry(c, mm, byCode.get(c)); filled++;
    }
  }

  // 러닝화가 아닌 모델은 'skip'으로 한 번만 표시한다(직원 입력·이미 확인된 품번은 그대로)
  let skipped = 0;
  for (const m of all) {
    if (!isNonRunning(m.rep) || (models[m.mk] && models[m.mk].method === 'skip')) continue;
    modelChanges[m.mk] = { v: 4, method: 'skip', modelKey: m.mk, 브랜드: m.rep.브랜드 || '', 품명: m.rep.품명 || '', gender: m.gender, researchedAt: today, reason: '러닝화 아님 — 직원 직접 입력' };
    for (const c of m.codes) {
      const g = guides[c];
      if (g && (g.method === 'manual' || g.method === 'web')) continue;
      const p = byCode.get(c) || {};
      guideChanges[c] = { v: 4, method: 'skip', researchedAt: today, modelKey: m.mk, 품번: c, 품명: p.품명 || '', 브랜드: p.브랜드 || '', reason: '러닝화 아님 — 직원 직접 입력' };
    }
    skipped++;
  }

  const queue = all
    .filter((m) => !isNonRunning(m.rep))
    .filter((m) => !m.codes.some((c) => guides[c] && guides[c].method === 'manual'))
    .filter((m) => { const mm = models[m.mk]; return !(mm && mm.v === 4 && (mm.method === 'web' || freshNotFound(mm))); })
    .sort((a, b) => (b.sold - a.sold) || ((b.stock > 0) - (a.stock > 0)) || (b.stock - a.stock) || String(a.rep.품명).localeCompare(String(b.rep.품명), 'ko'));

  // ONLY: 쉼표로 구분한 품명 일부(예: "클라우드붐,클라우드서퍼") — 그 모델만 먼저 조사 (이미 v4인 모델은 queue에서 빠져 있음)
  const only = String(process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (only.length) queue.splice(0, queue.length, ...queue.filter((m) => only.some((s) => m.mk.includes(s))));
  const hadV3 = queue.filter((m) => m.codes.some((c) => guides[c] && guides[c].method === 'web')).length;
  log(`신발 모델 ${all.length}개 · 조사 대상 ${queue.length}개 (기존 v3 다시 쓰기 ${hadV3}개) · 이번 실행 최대 ${MAX}개 · 새 색상 요약 채움 ${filled}개 · 러닝화 아님 표시 ${skipped}개`);
  if (DRY_RUN) { log('DRY_RUN — 조사·저장 없이 종료'); return; }

  const stats = { done: 0, found: 0, notFound: 0, later: 0, errors: 0, tokens: 0, reused: 0 };
  const results = [];
  let stopped = '', consecutiveErr = 0, pendingModels = 0;
  const flush = async () => {
    await mergeSave(MODELS, modelChanges, `guide v4: 모델 ${Object.keys(modelChanges).length}개`);
    await mergeSave(GUIDES, guideChanges, `guide v4: 품번 ${Object.keys(guideChanges).length}개`);
    for (const k of Object.keys(modelChanges)) { models[k] = modelChanges[k]; delete modelChanges[k]; }
    for (const k of Object.keys(guideChanges)) { guides[k] = guideChanges[k]; delete guideChanges[k]; }
    pendingModels = 0;
  };

  // 같은 신발의 다른 성별(브랜드·품명이 같음)을 이미 v4로 조사했으면 그 결과를 그대로 쓴다 — 리뷰는 한 모델 기준이라 내용이 같다
  const baseOf = (mk) => mk.split('|').slice(0, 2).join('|');
  const sibling = (m) => {
    const b = baseOf(m.mk);
    for (const src of [modelChanges, models]) {
      for (const [k, v] of Object.entries(src)) {
        if (k === m.mk || baseOf(k) !== b || !v || v.v !== 4) continue;
        // 다시 조사할 때는 예전 '리뷰 없음'을 재사용하지 않는다(이번 실행 결과만)
        const nfOk = v.method === 'notfound' && (src === modelChanges || freshNotFound(v));
        if (v.method === 'web' || nfOk) return v;
      }
    }
    return null;
  };

  const todo = queue.slice(0, MAX);
  let calledHub = false, webUsed = 0;
  for (let i = 0; i < todo.length; i++) {
    const m = todo[i];
    const sib = sibling(m);
    if (sib) {
      const copy = { ...sib, modelKey: m.mk, gender: m.gender, 브랜드: m.rep.브랜드 || '', 품명: m.rep.품명 || '', reusedFrom: sib.modelKey };
      modelChanges[m.mk] = copy;
      for (const c of m.codes) {
        const g = guides[c];
        if (g && g.method === 'manual') continue;
        if (copy.method === 'web') guideChanges[c] = skuEntry(c, copy, byCode.get(c));
        else if (!(g && g.method === 'web')) { const p = byCode.get(c) || {}; guideChanges[c] = { v: 4, method: 'notfound', researchedAt: copy.researchedAt, modelKey: m.mk, 품번: c, 품명: p.품명 || '', 브랜드: p.브랜드 || '', reason: copy.reason || '' }; }
      }
      if (copy.method === 'web') stats.found++; else stats.notFound++;
      stats.done++; stats.reused++; pendingModels++;
      results.push({ modelKey: m.mk, result: copy.method === 'web' ? 'found' : 'notfound', reusedFrom: sib.modelKey });
      log(`[${i + 1}/${todo.length}] 다른 성별 결과 재사용 (${copy.method === 'web' ? '확인' : '리뷰 없음'})`);
      if (pendingModels >= SAVE_EVERY) await flush();
      continue;
    }
    if (calledHub) await sleep(GAP_MS);
    calledHub = true;
    let res = null, err = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { res = await research(m, webUsed < WEB_MAX); err = null; } catch (e) { err = e; res = null; if (e.fatal) break; }
      if (err) { await sleep(10_000); continue; }
      if (res && !res.found && res.retryLater && !res.daily && attempt < 2) {
        const wait = Math.min(Math.max(Number(res.retryAfter) || 30, 15), 120);
        log(`[${i + 1}/${todo.length}] 잠시 대기 ${wait}초 (${res.reason || '재시도'})`);
        await sleep(wait * 1000); continue;
      }
      break;
    }
    if (err) {
      if (err.fatal) { stopped = err.message; break; }
      stats.errors++; consecutiveErr++;
      log(`[${i + 1}/${todo.length}] 오류: ${err.message}`);
      results.push({ modelKey: m.mk, result: 'error', reason: err.message });
      if (consecutiveErr >= 3) { stopped = '허브 오류가 3번 연속 — 중단'; break; }
      continue;
    }
    consecutiveErr = 0;
    if (res.via === 'websearch' || res.webSearch) webUsed++;
    if (res.found && res.guide) {
      const mm = modelEntry(m, res, today);
      modelChanges[m.mk] = mm;
      for (const c of m.codes) { if (!(guides[c] && guides[c].method === 'manual')) guideChanges[c] = skuEntry(c, mm, byCode.get(c)); }
      stats.found++; stats.done++; stats.tokens += Number(res.tokens) || 0; pendingModels++;
      results.push({ modelKey: m.mk, result: 'found', query: res.query, matched: mm.matchedProduct, sources: mm.sources.length, ...(mm.editionOf ? { variantOf: mm.editionOf } : {}), ...(mm.basis ? { basis: mm.basis } : {}) });
      log(`[${i + 1}/${todo.length}] 확인 · 출처 ${mm.sources.length}곳 · ${res.tokens || '?'} 토큰`);
    } else if (res.retryLater) {
      stats.later++;
      results.push({ modelKey: m.mk, result: 'later', query: res.query, reason: res.reason });
      if (res.daily) { stopped = '오늘 AI 무료 한도 도달 — 다음 실행에서 이어서'; log(`[${i + 1}/${todo.length}] ${stopped}`); break; }
      log(`[${i + 1}/${todo.length}] 다음에 다시 (${res.reason || ''})`);
    } else {
      // 리뷰 없음: v4 표시만 남기고, 예전 v3 확인 가이드가 있는 품번은 그대로 둔다
      modelChanges[m.mk] = { v: 4, method: 'notfound', modelKey: m.mk, 브랜드: m.rep.브랜드 || '', 품명: m.rep.품명 || '', gender: m.gender, researchedAt: today, searchRev: SEARCH_REV, query: String(res.query || ''), reason: String(res.reason || '') };
      for (const c of m.codes) {
        const g = guides[c];
        if (g && (g.method === 'manual' || g.method === 'web')) continue;
        const p = byCode.get(c) || {};
        guideChanges[c] = { v: 4, method: 'notfound', researchedAt: today, modelKey: m.mk, 품번: c, 품명: p.품명 || '', 브랜드: p.브랜드 || '', reason: String(res.reason || '') };
      }
      stats.notFound++; stats.done++; pendingModels++;
      results.push({ modelKey: m.mk, result: 'notfound', query: res.query, reason: res.reason });
      log(`[${i + 1}/${todo.length}] 리뷰 없음`);
    }
    if (pendingModels >= SAVE_EVERY) await flush();
  }
  await flush();

  const remaining = Math.max(0, queue.length - stats.done);
  const status = { lastRun: new Date().toISOString(), date: today, ...stats, filled, skipped, webUsed, remaining, stopped, results };
  await gh('GET', `contents/${STATUS}?ref=${BRANCH}`).then((meta) => gh('PUT', `contents/${STATUS}`, {
    message: `guide batch status ${today}`, branch: BRANCH,
    content: Buffer.from(JSON.stringify(status)).toString('base64'),
    ...(meta.status === 200 ? { sha: meta.json.sha } : {}),
  }));
  log(`완료 — 확인 ${stats.found} · 리뷰 없음 ${stats.notFound} (다른 성별 재사용 ${stats.reused}) · 다음에 ${stats.later} · 오류 ${stats.errors} · 남은 모델 ${remaining} · 토큰 ${stats.tokens}${stopped ? ' · ' + stopped : ''}`);
  if (stopped && !/한도/.test(stopped)) process.exitCode = 1;
}

main().catch((e) => { console.error('실패:', e.message); process.exit(1); });
