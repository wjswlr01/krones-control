// scripts/embed-new.mjs
// 증분 임베딩: incidents.json 중 incident-embeddings.json 에 없는 id만 OpenAI로 임베딩 후 병합.
// 전건 재임베딩 안 함. 모델/포맷은 reindex-openai.mjs 와 동일 (text-embedding-3-small 1536d).
//
// 실행: OPENAI_API_KEY=... node scripts/embed-new.mjs [--dry-run]
// ════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, statSync } from "node:fs";

const MODEL = "text-embedding-3-small";
const DIM = 1536;
const BATCH = 256;
const INC = "data/incidents.json";
const IDX = "data/incident-embeddings.json";
const DRY = process.argv.includes("--dry-run");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildEmbeddingText(r) {
  const header = [r.factory, r.workplace, r.workplace_type, r.equipment].filter(Boolean).join(" / ");
  return [
    header ? `[${header}] ${r.title || ""}` : (r.title || ""),
    r.cause ? `발생 원인: ${r.cause}` : "",
    r.action ? `조치 사항: ${r.action}` : "",
  ].filter(Boolean).join("\n");
}

async function embedBatch(texts) {
  for (let a = 0; a < 6; a++) {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: MODEL, input: texts, dimensions: DIM }),
    });
    if (res.ok) {
      const d = await res.json();
      const v = d.data.sort((x, y) => x.index - y.index).map((e) => e.embedding);
      for (const e of v) if (e.length !== DIM) throw new Error(`차원 ${e.length}!=${DIM}`);
      return v;
    }
    if (res.status === 429 || res.status >= 500) { const w = Math.min(2 ** a * 1000, 30000); console.warn(`  ${res.status} ${w}ms 재시도(${a + 1})`); await sleep(w); continue; }
    throw new Error(`임베딩 실패 ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  throw new Error("재시도 초과");
}

async function main() {
  const inc = JSON.parse(readFileSync(INC, "utf8"));
  const idx = JSON.parse(readFileSync(IDX, "utf8"));
  const todo = inc.filter((r) => !idx[r.id]);
  console.log(`incidents ${inc.length} / 인덱스 ${Object.keys(idx).length} / 신규 임베딩 대상 ${todo.length}`);
  if (DRY) { console.log("샘플 텍스트:\n---\n" + buildEmbeddingText(todo[0]) + "\n---\nDRY-RUN 종료."); return; }
  if (!todo.length) { console.log("신규 없음. 종료."); return; }
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY 미설정");

  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    const vecs = await embedBatch(chunk.map(buildEmbeddingText));
    chunk.forEach((r, j) => { idx[r.id] = vecs[j]; });
    writeFileSync(IDX, JSON.stringify(idx));
    console.log(`  ${Object.keys(idx).length}건 저장`);
  }
  const mb = statSync(IDX).size / 1024 / 1024;
  console.log(`✅ 인덱스 갱신: ${Object.keys(idx).length}건, ${mb.toFixed(1)}MB`);
}

main().catch((e) => { console.error("실패:", e.message); process.exit(1); });
