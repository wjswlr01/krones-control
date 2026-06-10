// scripts/build-packer.mjs
// 팩커(Krones Variopac) chunks + 임베딩 매칭 + GPT 강사노하우 요약 생성.
// 라벨러/제병기 데이터는 절대 수정하지 않고 packer-* 만 추가.
//
// 사전조건: data/manuals-raw/_pdf/*.pdf (LibreOffice 변환본, pptx-to-webp.mjs가 생성),
//          public/slides/packer-*/ webp 존재, data/manuals-raw/bariopac/*.txt 녹취록
// 실행: OPENAI_API_KEY=... node scripts/build-packer.mjs
// 의존성: pdfjs-dist (텍스트 추출), OpenAI(임베딩+요약)
// ════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

const PDF_DIR = "data/manuals-raw/_pdf";
const TXT_DIR = "data/manuals-raw/bariopac";   // 팩커 녹취록만 (제병기·라벨러와 분리)
const CACHE = "data/manuals-raw/_summaries-cache-packer.json";
const KEY = process.env.OPENAI_API_KEY;
const EMBED_MODEL = "text-embedding-3-small", DIM = 1536;
const CHAT_MODEL = "gpt-5.4-mini";
const TOPK = 4;
const CHUNK_SIZE = 500;
const CONC = 5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// pdf 파일명 = pptx basename(확장자만 .pdf). pptx-to-webp.mjs JOBS와 권 구성 일치.
const MANUALS = [
  { pdf: "1.Variopac 설비 이론.pdf",          fileName: "1.Variopac 설비 이론.pptx",          fid: "packer-01", content_type: "설비이론" },
  { pdf: "2.Variopac 설비세팅 Zenon.pdf",     fileName: "2.Variopac 설비세팅 Zenon.pptx",     fid: "packer-02", content_type: "설비세팅" },
  { pdf: "3.Variopac sensors.pdf",            fileName: "3.Variopac sensors.pptx",            fid: "packer-03", content_type: "센서" },
  { pdf: "4.Variopac 설비 관리.pdf",          fileName: "4.Variopac 설비 관리.pptx",          fid: "packer-04", content_type: "설비관리" },
  { pdf: "5.Variopac Parameter.pdf",          fileName: "5.Variopac Parameter.pptx",          fid: "packer-05", content_type: "파라미터" },
  { pdf: "6.Variopac 설비 Trouble shoot.pdf", fileName: "6.Variopac 설비 Trouble shoot.pptx", fid: "packer-06", content_type: "트러블슈팅" },
  { pdf: "7.Variopac maintenance.pdf",        fileName: "7.Variopac maintenance.pptx",        fid: "packer-07", content_type: "정비" },
];
// 녹취록: bariopac 폴더의 모든 .txt (variopac 강의)
const TRANSCRIPTS = readdirSync(TXT_DIR).filter((f) => /\.txt$/i.test(f)).sort();

const cos = (a, b) => { let s = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { s += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; } return s / Math.sqrt(na*nb); };

function pageTitle(items) {
  let best = null;
  for (const it of items) {
    const s = Math.abs(it.transform[3]); const str = it.str.trim();
    if (!str || /^\d{1,3}$/.test(str) || /^\d{4}\/\d/.test(str)) continue;
    if (!best || s > best.size + 0.5) best = { size: s, y: it.transform[5], parts: [str] };
    else if (Math.abs(s - best.size) <= 0.5 && Math.abs(it.transform[5] - best.y) < s) best.parts.push(str);
  }
  return best ? best.parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 50) : "";
}

async function extractSlides(m) {
  const data = new Uint8Array(readFileSync(resolve(PDF_DIR, m.pdf)));
  const doc = await getDocument({ data, isEvalSupported: false }).promise;
  const out = [];
  for (let pn = 1; pn <= doc.numPages; pn++) {
    const page = await doc.getPage(pn);
    const items = (await page.getTextContent()).items.filter((i) => i.str !== undefined && i.transform);
    const text = items.map((i) => i.str).join(" ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
    const num = String(pn).padStart(3, "0");
    out.push({
      chunk_id: `${m.fid}_slide_${num}`, source_type: "pptx", file_name: m.fileName, file_id: m.fid,
      slide_number: pn, content_type: m.content_type, page_title: pageTitle(items),
      text, slide_image_url: `/slides/${m.fid}/slide_${num}.webp`,
    });
  }
  return out;
}

function chunkTranscripts() {
  const out = []; let gi = 0;
  for (const fn of TRANSCRIPTS) {
    let raw = readFileSync(resolve(TXT_DIR, fn), "utf8").replace(/^﻿/, "");
    const title = fn.replace(/\.txt$/i, "");
    const norm = raw.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
    let ci = 0;
    for (let i = 0; i < norm.length;) {
      let end = Math.min(i + CHUNK_SIZE, norm.length);
      if (end < norm.length) { const sp = norm.lastIndexOf(" ", end); if (sp > i + CHUNK_SIZE * 0.6) end = sp; }
      const text = norm.slice(i, end).trim();
      if (text) {
        gi++; ci++;
        out.push({
          chunk_id: `packer_chunk_${String(gi).padStart(3, "0")}`, source_type: "transcript",
          file_name: fn, file_id: "packer-transcripts", chunk_index: ci,
          content_type: "강의", page_title: title, text,
        });
      }
      i = end;
    }
  }
  return out;
}

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

async function summarize(slide, tops) {
  const ctx = tops.map((t) => `[${t.file_name}]\n${t.text}`).join("\n---\n");
  const sys = `당신은 Krones 팩커(Variopac) 설비 전문가입니다. 아래 강의 녹취록에서 현재 슬라이드 주제와 관련된 '현장 노하우'를 추출해 요약하세요.
규칙:
- 반드시 "핵심 노하우:" 로 시작하고, 그 아래 핵심 노하우를 "*   " 불릿으로 2~4개 정리
- 녹취에 실제로 있는 실무 팁/수치/주의사항만. 없으면 일반론 말고 슬라이드 주제 관련 핵심만 간결히
- 한국어, 300자 이내`;
  const usr = `[현재 슬라이드: ${slide.page_title || slide.slide_number}]\n${slide.text.slice(0, 1200)}\n\n[관련 강의 녹취]\n${ctx}`;
  for (let a = 0; a < 5; a++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ model: CHAT_MODEL, temperature: 0.3, messages: [{ role: "system", content: sys }, { role: "user", content: usr }] }),
    });
    if (res.ok) return (await res.json()).choices?.[0]?.message?.content ?? "";
    if (res.status === 429 || res.status >= 500) { await sleep(2 ** a * 1000); continue; }
    throw new Error(`chat ${res.status}: ${(await res.text()).slice(0, 150)}`);
  }
  throw new Error("chat 재시도 초과");
}

async function main() {
  if (!KEY) throw new Error("OPENAI_API_KEY 미설정");
  console.log(`녹취록 ${TRANSCRIPTS.length}개:`, TRANSCRIPTS.join(", "));
  // 1) 슬라이드 텍스트 + 녹취 청킹
  let slides = [];
  for (const m of MANUALS) {
    if (!existsSync(resolve(PDF_DIR, m.pdf))) throw new Error(`PDF 없음: ${m.pdf} (pptx-to-webp.mjs 먼저 실행)`);
    const s = await extractSlides(m); console.log(`${m.fid}: ${s.length} slides`); slides = slides.concat(s);
  }
  const trans = chunkTranscripts();
  console.log(`pptx 청크 ${slides.length} / transcript 청크 ${trans.length}`);

  // 2) 임베딩 (슬라이드 + 녹취)
  console.log("임베딩...");
  const slideVecs = await embedAll(slides.map((s) => `${s.page_title}\n${s.text}`.slice(0, 6000)));
  const transVecs = await embedAll(trans.map((t) => t.text));

  // 3) 슬라이드별 top-K 녹취 (팩커 녹취 풀 안에서만)
  const matches = slides.map((s, si) => {
    const scored = trans.map((t, ti) => ({ t, sim: cos(slideVecs[si], transVecs[ti]) })).sort((a, b) => b.sim - a.sim).slice(0, TOPK);
    return scored.map((x) => ({ file_name: x.t.file_name, text: x.t.text, similarity: x.sim, chunk_id: x.t.chunk_id }));
  });

  // 4) GPT 요약 (캐시 재개)
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  let done = 0;
  for (let i = 0; i < slides.length; i += CONC) {
    const batch = slides.slice(i, i + CONC);
    await Promise.all(batch.map(async (s, j) => {
      const idx = i + j;
      if (cache[s.chunk_id]) return;
      cache[s.chunk_id] = await summarize(s, matches[idx]);
    }));
    writeFileSync(CACHE, JSON.stringify(cache));
    done = Math.min(i + CONC, slides.length);
    console.log(`  요약 ${done}/${slides.length}`);
  }

  // 5) chunks.json 추가 (라벨러·제병기 보존, packer-* 만 교체)
  const chunks = JSON.parse(readFileSync("data/chunks.json", "utf8"));
  const keptChunks = chunks.filter((c) => !(String(c.file_id).startsWith("packer")));
  const newChunks = keptChunks.concat(slides, trans);
  writeFileSync("data/chunks.json", JSON.stringify(newChunks, null, 2));

  // 6) slide-summaries.json 추가
  const summ = JSON.parse(readFileSync("data/slide-summaries.json", "utf8"));
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i]; const tops = matches[i];
    summ[s.chunk_id] = {
      summary: cache[s.chunk_id] || "",
      sources: [...new Set(tops.map((t) => t.file_name))],
      raw_transcripts: tops,
    };
  }
  writeFileSync("data/slide-summaries.json", JSON.stringify(summ, null, 2));

  console.log(`\n✅ 완료: pptx +${slides.length}, transcript +${trans.length}, summaries +${slides.length}`);
  console.log(`chunks.json: ${chunks.length} → ${newChunks.length}`);
}
main().catch((e) => { console.error("실패:", e.message); process.exit(1); });
