// scripts/reindex-openai.mjs
// 4단계(OpenAI 전환): 전건(2,145)을 OpenAI 임베딩으로 재인덱싱.
//
// 배경: Gemini 무료 일일 쿼터(1,000/일) 소진 → OpenAI로 전면 전환.
//   질문측(route.ts embedQuery)도 같은 모델로 바꿔야 검색 공간 일치.
//
// 인덱스 형식: { "incidentId": number[1536], ... }  (id → 벡터 평면 맵, 기존과 동일)
// 모델: text-embedding-3-small (1536d). 질문·문서 동일 모델(taskType 개념 없음, 대칭).
//
// 실행: OPENAI_API_KEY=... node scripts/reindex-openai.mjs
//       node scripts/reindex-openai.mjs --dry-run   # 건수/예상크기/분포만
// 의존성 없음 (Node 18+)
// ════════════════════════════════════════════════════════════════
const CONFIG = {
  EMBED_MODEL: "text-embedding-3-small",
  EMBED_DIM: 1536,
  SOURCE_FILE: "./data/incidents.json",
  OUTPUT_FILE: "./data/incident-embeddings.openai.json", // 검증 후 라이브와 swap
  BATCH_SIZE: 256,   // OpenAI 한 콜당 입력 수 (최대 2048)
  MAX_RETRY: 6,
};

// route.ts 의 CATEGORY_KEYWORDS 와 동기화 (분포 출력용)
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

// ★ Gemini 인덱서와 동일한 문서측 텍스트 조합 (품질 일관성)
function buildEmbeddingText(r) {
  const header = [r.factory, r.workplace, r.workplace_type, r.equipment]
    .filter(Boolean).join(" / ");
  return [
    header ? `[${header}] ${r.title || ""}` : (r.title || ""),
    r.cause  ? `발생 원인: ${r.cause}`  : "",
    r.action ? `조치 사항: ${r.action}` : "",
  ].filter(Boolean).join("\n");
}

import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function embedBatch(texts) {
  for (let attempt = 0; attempt < CONFIG.MAX_RETRY; attempt++) {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: CONFIG.EMBED_MODEL, input: texts, dimensions: CONFIG.EMBED_DIM }),
    });
    if (res.ok) {
      const data = await res.json();
      // data.data 는 입력 순서 보장 (index 필드로 재정렬해 안전하게)
      const vecs = data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
      for (const v of vecs)
        if (v.length !== CONFIG.EMBED_DIM) throw new Error(`차원 불일치 ${v.length} != ${CONFIG.EMBED_DIM}`);
      return vecs;
    }
    if (res.status === 429 || res.status >= 500) {
      const wait = Math.min(2 ** attempt * 1000, 30000);
      console.warn(`  ${res.status} — ${wait}ms 후 재시도 (${attempt + 1}/${CONFIG.MAX_RETRY})`);
      await sleep(wait);
      continue;
    }
    throw new Error(`임베딩 실패 ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  throw new Error("재시도 초과");
}

const loadJson = (p, fb) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fb);

async function main() {
  const DRY = process.argv.includes("--dry-run");
  console.log(`[4단계/OpenAI] ${CONFIG.EMBED_MODEL} (${CONFIG.EMBED_DIM}d)${DRY ? "  (DRY-RUN)" : ""}`);
  const rows = loadJson(CONFIG.SOURCE_FILE, null);
  if (!rows) throw new Error(`원본 없음: ${CONFIG.SOURCE_FILE}`);
  console.log(`원본: ${rows.length}건`);

  const dist = {};
  for (const r of rows) { const c = classify(r); dist[c] = (dist[c] || 0) + 1; }

  if (DRY) {
    const perKB = CONFIG.EMBED_DIM * 8 / 1024; // float 텍스트 표현 대략치
    console.log(`예상 크기: 약 ${(rows.length * perKB / 1024).toFixed(0)}MB`);
    console.log("카테고리 분포:", dist);
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY 미설정");

  // 재개: 기존 OUTPUT 있으면 이어받기
  const index = loadJson(CONFIG.OUTPUT_FILE, {});
  const todo = rows.filter((r) => !index[r.id]);
  console.log(`완료 ${Object.keys(index).length} / 남은 ${todo.length}`);

  for (let i = 0; i < todo.length; i += CONFIG.BATCH_SIZE) {
    const chunk = todo.slice(i, i + CONFIG.BATCH_SIZE);
    const vecs = await embedBatch(chunk.map(buildEmbeddingText));
    chunk.forEach((r, j) => { index[r.id] = vecs[j]; });
    writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(index));
    console.log(`  ${Object.keys(index).length}/${rows.length} 저장`);
  }

  const sizeMB = statSync(CONFIG.OUTPUT_FILE).size / 1024 / 1024;
  console.log(`✅ 완료: ${Object.keys(index).length}건, ${sizeMB.toFixed(1)}MB → ${CONFIG.OUTPUT_FILE}`);
  console.log("카테고리 분포:", dist);
  console.log("다음: route.ts 질문측 OpenAI 전환 + 임계값 보정 → swap → 빌드 → 배포");
}

main().catch((e) => { console.error("실패:", e.message); process.exit(1); });
