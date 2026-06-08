// scripts/reindex-equipment.mjs
// 3단계: filler / blower 사례를 임베딩 인덱스(data/incident-embeddings.json)에 추가
//
// 인덱스 형식: { "incidentId": number[3072], ... }  (id → 벡터 평면 맵)
// 모델: gemini-embedding-001 (3072d) / 질문측과 동일, taskType만 DOCUMENT
//
// 실행:
//   GEMINI_API_KEY=... node scripts/reindex-equipment.mjs --dry-run   # 건수만 확인
//   GEMINI_API_KEY=... node scripts/reindex-equipment.mjs             # 임베딩 + 파일 갱신
//
// 의존성 없음 (Node 18+ 내장 fetch / fs)
// ════════════════════════════════════════════════════════════════
const CONFIG = {
  EMBED_MODEL: "models/gemini-embedding-001", // ★ 질문측과 동일 모델
  EMBED_DIM: 3072,                            // ★ 저장 벡터 차원과 일치 (다르면 즉시 중단)
  TASK_TYPE: "RETRIEVAL_DOCUMENT",            // 문서측 (질문측은 route가 RETRIEVAL_QUERY)

  INDEX_FILE: "./data/incident-embeddings.json", // id → 벡터 맵
  SOURCE_FILE: "./data/incidents.json",          // 원본 2,145건 배열

  TARGET_CATEGORIES: ["filler", "blower"],
  CONCURRENCY: 1,    // 동시 임베딩 요청 수 (429 회피 — 1건씩)
  DELAY_MS: 1100,    // 요청 간 간격 (~54 RPM, 분당 한도 보호)
  MAX_RETRY: 5,
};

// ★★ incident-ai-search/route.ts 의 CATEGORY_KEYWORDS 와 동기화 (정규식 그대로 복사).
//     filler 의 '넥'은 넥라벨(labeler)과 겹치므로 bare '넥' 대신 병목/넥부/어셉틱만 사용.
const CATEGORY_KEYWORDS = {
  blower:    /프리폼|블로우|블로워|브로워|성형|몰드|blow|preform/i,
  filler:    /필러|충전|충진|주입|어셉|어셉틱|asept|병목|넥부|액위|밸브|filler/i,
  capper:    /캡퍼|캡핑|토크|뚜껑|capper|\bcap\b|씰러|시머|seamer/i,
  labeler:   /라벨|라벨라|글루|롤러|스타휠|슬리브|sleeve|수축라벨|쉬링크|시링크|opp|label/i,
  conveyor:  /컨베이어|conveyor|반송/i,
  inspector: /비전|검사|inspect|vision|x.?ray|엑스레이/i,
};

// ════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const DRY = process.argv.includes("--dry-run");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// route.ts 와 동일: 매칭되는 모든 카테고리 반환, 없으면 ['etc']
function classifyByKeywords(text = "") {
  const cats = Object.entries(CATEGORY_KEYWORDS)
    .filter(([, re]) => re.test(text || ""))
    .map(([k]) => k);
  return cats.length ? cats : ["etc"];
}

// route.ts classifyCase 와 동일: 설비 필드 우선, 미지정/불명확일 때만 제목 폴백
function classifyCase(r) {
  const byEq = r.equipment ? classifyByKeywords(r.equipment) : ["etc"];
  if (byEq[0] !== "etc") return byEq;
  return classifyByKeywords(r.title || "");
}

// ★ 원본 인덱서 부재 → 저장 벡터와 cosine 0.987로 복원한 문서측 텍스트 조합 (Claude Code 실측)
function buildEmbeddingText(r) {
  const header = [r.factory, r.workplace, r.workplace_type, r.equipment]
    .filter(Boolean).join(" / ");
  return [
    header ? `[${header}] ${r.title || ""}` : (r.title || ""),
    r.cause  ? `발생 원인: ${r.cause}`  : "",
    r.action ? `조치 사항: ${r.action}` : "",
  ].filter(Boolean).join("\n");
}

// 질문측 embedQuery 와 동일하게 단건 embedContent 사용 (taskType만 DOCUMENT)
async function embedDoc(text) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/${CONFIG.EMBED_MODEL}` +
    `:embedContent?key=${process.env.GEMINI_API_KEY}`;
  const body = { content: { parts: [{ text }] }, taskType: CONFIG.TASK_TYPE };
  for (let attempt = 0; attempt < CONFIG.MAX_RETRY; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const v = data?.embedding?.values;
      if (!v) throw new Error("응답에 embedding.values 없음");
      if (v.length !== CONFIG.EMBED_DIM)
        throw new Error(`차원 불일치: ${v.length} != ${CONFIG.EMBED_DIM} — EMBED_MODEL 확인`);
      return v;
    }
    if (res.status === 429 || res.status >= 500) {
      const wait = 2 ** attempt * 1000;
      console.warn(`  ${res.status} — ${wait}ms 후 재시도 (${attempt + 1}/${CONFIG.MAX_RETRY})`);
      await sleep(wait);
      continue;
    }
    throw new Error(`임베딩 실패 ${res.status}: ${await res.text()}`);
  }
  throw new Error("재시도 횟수 초과");
}

const loadJson = (p, fb) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fb);

// id 기준 카테고리 분포 출력 (검증용)
function reportDistribution(index, incidentMap, label) {
  const dist = {};
  for (const id of Object.keys(index)) {
    const r = incidentMap[id];
    const cats = r ? classifyCase(r) : ["unknown"];
    for (const c of cats) dist[c] = (dist[c] || 0) + 1;
  }
  console.log(`${label} (총 ${Object.keys(index).length}건):`, dist);
}

async function main() {
  console.log(`[3단계] 대상: ${CONFIG.TARGET_CATEGORIES.join(", ")}${DRY ? "  (DRY-RUN)" : ""}`);

  const rows = loadJson(CONFIG.SOURCE_FILE, null);
  if (!rows) throw new Error(`원본 없음: ${CONFIG.SOURCE_FILE}`);
  const incidentMap = Object.fromEntries(rows.map((r) => [r.id, r]));

  const targets = rows.filter((r) =>
    classifyCase(r).some((c) => CONFIG.TARGET_CATEGORIES.includes(c))
  );

  const counts = {};
  for (const r of targets) {
    for (const c of classifyCase(r)) {
      if (CONFIG.TARGET_CATEGORIES.includes(c)) counts[c] = (counts[c] || 0) + 1;
    }
  }
  console.log("추가 대상 분류:", counts, "→ 총", targets.length, "건");

  if (DRY) {
    console.log("DRY-RUN 종료. 위 건수가 filler 375 / blower 112 와 맞는지 확인.");
    return;
  }

  const index = loadJson(CONFIG.INDEX_FILE, {});
  console.log(`기존 인덱스: ${Object.keys(index).length}건`);

  // 동시성 제한 임베딩 → index[id] = 벡터 (멱등 upsert)
  let done = 0;
  for (let i = 0; i < targets.length; i += CONFIG.CONCURRENCY) {
    const chunk = targets.slice(i, i + CONFIG.CONCURRENCY);
    const vecs = await Promise.all(chunk.map((r) => embedDoc(buildEmbeddingText(r))));
    chunk.forEach((r, j) => { index[r.id] = vecs[j]; });
    done += chunk.length;
    if (done % 25 === 0 || done === targets.length) console.log(`  임베딩 ${done}/${targets.length}`);
    if (i + CONFIG.CONCURRENCY < targets.length) await sleep(CONFIG.DELAY_MS);
  }

  writeFileSync(CONFIG.INDEX_FILE, JSON.stringify(index));
  console.log(`✅ 인덱스 갱신: ${Object.keys(index).length}건 → ${CONFIG.INDEX_FILE}`);
  reportDistribution(index, incidentMap, "✅ 갱신 후 분포");
  console.log("[3단계] 완료 — git add/commit/push 후 Vercel 재배포 필요");
}

main().catch((e) => { console.error("실패:", e.message); process.exit(1); });
