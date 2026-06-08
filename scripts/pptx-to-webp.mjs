// scripts/pptx-to-webp.mjs
// PPTX → PDF(LibreOffice) → 페이지 PNG(pdf-to-img) → webp(sharp) → public/slides/{file_id}/slide_NNN.webp
//
// ※ 이 사내 PC는 Fasoo DRM이 PowerPoint(Office) 출력 파일을 자동 암호화하므로
//    PowerPoint COM Export 는 사용 불가(암호화된 PNG가 나옴). LibreOffice 는 후킹되지 않아 우회됨.
//
// 실행: node scripts/pptx-to-webp.mjs
// 의존성: LibreOffice(soffice), sharp, pdf-to-img
// ════════════════════════════════════════════════════════════════
import { execFileSync } from "node:child_process";
import { readdirSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import sharp from "sharp";
import { pdf } from "pdf-to-img";

const SOFFICE = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
const RAW = "data/manuals-raw";
const TMP = "data/manuals-raw/_pdf";
const OUTROOT = "public/slides";
const TARGET_W = 1890;   // 기존 라벨러 슬라이드와 동일 가로 px
const WEBP_Q = 82;
const RENDER_SCALE = 2;  // pdfjs 렌더 배율(원본 크게 뽑고 리사이즈 → 선명)

const JOBS = [
  ["Blow Moulder_01 설비관리_C3 Pro.pptx", "blowmoulder-01"],
  ["Blow Moulder_02 설비이론_C3 Pro.pptx", "blowmoulder-02"],
  ["Blow Moulder_03 설비세팅_C3 Pro.pptx", "blowmoulder-03"],
  ["Blow Moulder_04 설비트러블_C3 Pro.pptx", "blowmoulder-04"],
];

function pptxToPdf(pptxAbs) {
  mkdirSync(TMP, { recursive: true });
  execFileSync(SOFFICE, ["--headless", "--convert-to", "pdf", "--outdir", resolve(TMP), pptxAbs], { stdio: "ignore" });
  const pdfPath = join(resolve(TMP), basename(pptxAbs).replace(/\.pptx$/i, ".pdf"));
  if (!existsSync(pdfPath)) throw new Error("PDF 생성 실패: " + pdfPath);
  return pdfPath;
}

async function main() {
  if (!existsSync(SOFFICE)) throw new Error("LibreOffice 없음: " + SOFFICE);
  const report = [];
  let totalBytes = 0;

  for (const [pptx, fid] of JOBS) {
    const pptxAbs = resolve(RAW, pptx);
    if (!existsSync(pptxAbs)) throw new Error("PPTX 없음: " + pptxAbs);
    console.log(`[${fid}] PDF 변환 중...`);
    const pdfPath = pptxToPdf(pptxAbs);

    const outDir = resolve(OUTROOT, fid);
    mkdirSync(outDir, { recursive: true });
    const doc = await pdf(pdfPath, { scale: RENDER_SCALE });

    let n = 0, bytes = 0, dim = "";
    for await (const pageBuf of doc) {
      n++;
      const name = `slide_${String(n).padStart(3, "0")}.webp`;
      const outPath = join(outDir, name);
      const img = sharp(pageBuf).resize({ width: TARGET_W, withoutEnlargement: true });
      if (n === 1) { const m = await img.clone().metadata(); dim = `${Math.min(m.width, TARGET_W)}x?`; }
      await img.webp({ quality: WEBP_Q }).toFile(outPath);
      bytes += statSync(outPath).size;
    }
    totalBytes += bytes;
    const m1 = await sharp(join(outDir, "slide_001.webp")).metadata();
    report.push({ fid, webp: n, dim: `${m1.width}x${m1.height}`, MB: (bytes / 1024 / 1024).toFixed(1) });
    console.log(`  → ${n}장 (${m1.width}x${m1.height})`);
  }

  console.log("\n=== 변환 결과 ===");
  for (const r of report) console.log(`  ${r.fid}: ${r.webp}장, ${r.dim}, ${r.MB}MB`);
  console.log(`총 용량: ${(totalBytes / 1024 / 1024).toFixed(1)}MB`);
  console.log("\n임시 PDF: data/manuals-raw/_pdf (정리 가능)");
}

main().catch((e) => { console.error("실패:", e.message); process.exit(1); });
