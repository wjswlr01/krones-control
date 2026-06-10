// scripts/build-manual-index.mjs
// 매뉴얼/교육자료 강사노하우 요약을 임베딩하여 AI 사례검색에서 함께 검색 가능하게 인덱스 생성.
// 입력: data/slide-summaries.json (슬라이드별 강사노하우 summary) + data/chunks.json (슬라이드 제목/권)
// 출력: data/manual-embeddings.json  →  { "<chunk_id>": number[1536] }  (사례 인덱스와 동일 포맷·동일 모델)
//
// 임베딩 입력 텍스트: "[설비명 / 권제목] 슬라이드제목\n<요약>"
// 실행: NODE_TLS_REJECT_UNAUTHORIZED=0 OPENAI_API_KEY=... node scripts/build-manual-index.mjs
// ════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const KEY = process.env.OPENAI_API_KEY;
const EMBED_MODEL = "text-embedding-3-small", DIM = 1536;   // 사례 인덱스와 동일
const OUT = "data/manual-embeddings.json";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// file_id 접두사 → 설비명 (임베딩 입력 텍스트용. 표시는 route.ts가 lib/manuals.ts로 처리)
const EQUIP = { manual: "라벨러", blowmoulder: "제병기", packer: "팩커" };

async function embedAll(texts) {
  const vecs = []; const B = 256;
  for (let i = 0; i < texts.length; i += B) {
    const batch = texts.slice(i, i + B);
    let ok = false;
    for (let a = 0; a < 6 && !ok; a++) {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ model: EMBED_MODEL, input: batch, dimensions: DIM }),
      });
      if (res.ok) { const d = await res.json(); d.data.sort((x, y) => x.index - y.index).forEach((e) => vecs.push(e.embedding)); ok = true; }
      else if (res.status === 429 || res.status >= 500) { await sleep(2 ** a * 1000); }
      else throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 150)}`);
    }
    if (!ok) throw new Error("embed 재시도 초과");
    console.log(`  임베딩 ${Math.min(i + B, texts.length)}/${texts.length}`);
  }
  return vecs;
}

async function main() {
  if (!KEY) throw new Error("OPENAI_API_KEY 미설정");
  const summaries = JSON.parse(readFileSync("data/slide-summaries.json", "utf8"));
  const chunks = JSON.parse(readFileSync("data/chunks.json", "utf8"));
  const byId = new Map(chunks.map((c) => [c.chunk_id, c]));

  const ids = [], inputs = [];
  for (const [chunkId, entry] of Object.entries(summaries)) {
    const summary = (entry?.summary || "").trim();
    if (!summary) continue;                       // 요약 없으면 인덱싱 제외
    const ch = byId.get(chunkId);
    const fid = chunkId.replace(/_slide_\d+$/, "");
    const equip = EQUIP[fid.split("-")[0]] || fid;
    const volume = ch?.content_type || "";        // 권 개념(설비이론/설비관리/트러블슈팅 등)
    const slideTitle = ch?.page_title || "";
    const head = `[${equip}${volume ? ` / ${volume}` : ""}]${slideTitle ? ` ${slideTitle}` : ""}`;
    ids.push(chunkId);
    inputs.push(`${head}\n${summary}`.slice(0, 4000));
  }
  console.log(`인덱싱 대상 슬라이드 ${ids.length}개`);
  if (existsSync(OUT)) console.log(`기존 ${OUT} 덮어씀`);

  const vecs = await embedAll(inputs);
  const map = {};
  for (let i = 0; i < ids.length; i++) map[ids[i]] = vecs[i];
  writeFileSync(OUT, JSON.stringify(map));

  const bytes = Buffer.byteLength(JSON.stringify(map));
  console.log(`\n✅ ${OUT} 생성: ${ids.length}개 항목, ${(bytes / 1024 / 1024).toFixed(1)}MB`);
  console.log(`샘플 입력:\n${inputs[0].slice(0, 200)}`);
}
main().catch((e) => { console.error("실패:", e.message); process.exit(1); });
