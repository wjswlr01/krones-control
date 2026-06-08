// scripts/reindex-all.mjs  — 4단계: 전체 재인덱싱
//
// incidents.json 전건을 동일 buildEmbeddingText 로 새로 임베딩 → 단일 기준 인덱스 재구축.
// 기존 294건의 0.987 오프셋 제거. 전 카테고리(etc 포함) 색인 → 재병류 질문도 검색 가능.
//
// 안전장치: 라이브 파일 안 건드리고 .rebuild.json 에 쌓음 → 완료 후 수동 swap.
//           재개 가능 — 중간에 끊겨도 다시 실행하면 이어서 진행.
//
// 실행: GEMINI_API_KEY=... node scripts/reindex-all.mjs
// 의존성 없음 (Node 18+)
// ════════════════════════════════════════════════════════════════
const CONFIG = {
  EMBED_MODEL: "models/gemini-embedding-001",
  EMBED_DIM: 3072,
  TASK_TYPE: "RETRIEVAL_DOCUMENT",

  SOURCE_FILE: "./data/incidents.json",
  OUTPUT_FILE: "./data/incident-embeddings.rebuild.json", // 완료 후 라이브 파일과 swap

  CONCURRENCY: 3,        // 429 잦으면 1로 낮출 것 (백오프가 받쳐줌)
  MAX_RETRY: 5,
  CHECKPOINT_EVERY: 100, // N건마다 디스크 저장 (재개 지점)
};

// ════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 분포 리포트용 (route.ts 와 동일 정규식)
const PATTERNS = {
  blower:    /프리폼|블로우|블로워|브로워|성형|몰드|blow|preform/i,
  filler:    /필러|충전|충진|주입|어셉|어셉틱|asept|병목|넥부|액위|밸브|filler/i,
  capper:    /캡퍼|캡핑|토크|뚜껑|capper|\bcap\b|씰러|시머|seamer/i,
  labeler:   /라벨|라벨라|글루|롤러|스타휠|슬리브|sleeve|수축라벨|쉬링크|시링크|opp|label/i,
  conveyor:  /컨베이어|conveyor|반송/i,
  inspector: /비전|검사|inspect|vision|x.?ray|엑스레이/i,
};
const matchCats = (t = "") => Object.entries(PATTERNS).filter(([, re]) => re.test(t)).map(([c]) => c);
function classify(r) {
  if (r.equipment && matchCats(r.equipment).length) return matchCats(r.equipment)[0];
  const t = matchCats(r.title);
  return t.length ? t[0] : "etc";
}

// ★ 저장 벡터 복원 함수와 동일 (cosine 0.987). 전건 동일 적용 → 단일 기준
function buildEmbeddingText(r) {
  const header = [r.factory, r.workplace, r.workplace_type, r.equipment]
    .filter(Boolean).join(" / ");
  return [
    header ? `[${header}] ${r.title || ""}` : (r.title || ""),
    r.cause  ? `발생 원인: ${r.cause}`  : "",
    r.action ? `조치 사항: ${r.action}` : "",
  ].filter(Boolean).join("\n");
}

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
      const v = (await res.json())?.embedding?.values;
      if (!v) throw new Error("응답에 embedding.values 없음");
      if (v.length !== CONFIG.EMBED_DIM)
        throw new Error(`차원 불일치 ${v.length} != ${CONFIG.EMBED_DIM}`);
      return v;
    }
    if (res.status === 429 || res.status >= 500) {
      await sleep(2 ** attempt * 1000);
      continue;
    }
    throw new Error(`임베딩 실패 ${res.status}: ${await res.text()}`);
  }
  throw new Error("재시도 초과");
}

const loadJson = (p, fb) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fb);
const save = (idx) => writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(idx));

async function main() {
  const rows = loadJson(CONFIG.SOURCE_FILE, null);
  if (!rows) throw new Error(`원본 없음: ${CONFIG.SOURCE_FILE}`);

  const index = loadJson(CONFIG.OUTPUT_FILE, {}); // 재개: 이미 한 건 건너뜀
  const todo = rows.filter((r) => !(r.id in index));
  console.log(`전체 ${rows.length}건 / 완료 ${Object.keys(index).length} / 남은 ${todo.length}`);

  let sinceCk = 0;
  for (let i = 0; i < todo.length; i += CONFIG.CONCURRENCY) {
    const chunk = todo.slice(i, i + CONFIG.CONCURRENCY);
    const vecs = await Promise.all(chunk.map((r) => embedDoc(buildEmbeddingText(r))));
    chunk.forEach((r, j) => { index[r.id] = vecs[j]; });
    sinceCk += chunk.length;
    if (sinceCk >= CONFIG.CHECKPOINT_EVERY) {
      save(index);
      sinceCk = 0;
      console.log(`  체크포인트 ${Object.keys(index).length}/${rows.length} 저장`);
    }
  }
  save(index);

  // 검증: 총 건수 + 카테고리 분포
  const dist = {};
  for (const r of rows) { const c = classify(r); dist[c] = (dist[c] || 0) + 1; }
  console.log(`✅ 재구축 완료: ${Object.keys(index).length}건 → ${CONFIG.OUTPUT_FILE}`);
  console.log("카테고리 분포:", dist);
  console.log("다음: 라이브 파일과 swap → git push → 배포");
}

main().catch((e) => { console.error("실패:", e.message); process.exit(1); });
