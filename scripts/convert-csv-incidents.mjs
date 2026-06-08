// scripts/convert-csv-incidents.mjs
// 5~6월 이상발생 CSV → incidents.json 병합 (1단계 보고 승인 계획대로).
//
// 실행:
//   node scripts/convert-csv-incidents.mjs --dry-run   # 변환 결과 미리보기 (파일 변경 X)
//   node scripts/convert-csv-incidents.mjs             # incidents.json 병합 저장
//
// 규칙(승인):
//  - 매핑: 상세_ 우선, 목록 폴백
//  - 정제: placeholder 공장(선택해주세요)/빈 공장·제목·일자 제외
//  - id: IR20260608 + 0001~ (기존에 IR20260608* 없어 충돌 0), created_at = 2026-06-08
//  - is_best_practice=false, department="", is_long_downtime = downtime_min>=60
//  - dedup: 복합키(공장|작업장|일자|제목|시작시각) + 완화키(공장|일자|제목)로 기존과 중복 제외
// 의존성 없음 (Node 18+)
// ════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from "node:fs";

const CSV_FILE = "data/이상발생보고서_2026-05-01_2026-06-08_크롤링데이터.csv";
const JSON_FILE = "data/incidents.json";
const IMPORT_DATE = "2026-06-08";
const ID_PREFIX = "IR20260608";

const DRY = process.argv.includes("--dry-run");

// --- RFC4180 CSV 파서 (1단계에서 검증한 것 재사용) ---
function parseCSV(text) {
  const rows = []; let f = "", row = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else { if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; } else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; } else if (c === "\r") {} else f += c; }
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  return rows;
}

// --- 설비 카테고리 (route.ts 동기화, 분포 출력용) ---
const PATTERNS = {
  blower:/프리폼|블로우|블로워|브로워|성형|몰드|blow|preform/i, filler:/필러|충전|충진|주입|어셉|어셉틱|asept|병목|넥부|액위|밸브|filler/i,
  capper:/캡퍼|캡핑|토크|뚜껑|capper|\bcap\b|씰러|시머|seamer/i, labeler:/라벨|라벨라|글루|롤러|스타휠|슬리브|sleeve|수축라벨|쉬링크|시링크|opp|label/i,
  conveyor:/컨베이어|conveyor|반송/i, inspector:/비전|검사|inspect|vision|x.?ray|엑스레이/i,
};
const matchCats = (t = "") => Object.entries(PATTERNS).filter(([, re]) => re.test(t)).map(([c]) => c);
function classify(r) {
  if (r.equipment && matchCats(r.equipment).length) return matchCats(r.equipment)[0];
  const t = matchCats(r.title);
  return t.length ? t[0] : "etc";
}

const clean = (s) => { const v = (s || "").trim(); return v.includes("선택해주세요") ? "" : v; };
const padSec = (s) => { const v = (s || "").trim(); return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v) ? v + ":00" : v; };
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

function main() {
  let txt = readFileSync(CSV_FILE, "utf8");
  if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1);
  const rows = parseCSV(txt);
  const H = rows[0];
  const ci = (n) => H.indexOf(n);
  const data = rows.slice(1).filter((r) => r.length > 1 && r.some((c) => c.trim()));
  const cv = (r, n) => (r[ci(n)] || "").trim();
  const pick = (r, detail, list) => clean(cv(r, detail)) || clean(cv(r, list));

  const existing = JSON.parse(readFileSync(JSON_FILE, "utf8"));
  const strictKeys = new Set(existing.map((i) => [i.factory, i.workplace, (i.incident_date || "").slice(0, 10), norm(i.title), (padSec(i.start_time) || "")].join("|")));
  const relaxedKeys = new Set(existing.map((i) => [i.factory, (i.incident_date || "").slice(0, 10), norm(i.title)].join("|")));

  const dropped = { factory: 0, title: 0, date: 0 };
  let dupStrict = 0, dupRelaxed = 0, dupIntra = 0;
  const seenInBatch = new Set();   // CSV 내부 중복(페이지 반복 크롤링) 제거용
  const out = [];
  let seq = 0;

  for (const r of data) {
    const factory = pick(r, "상세_공장", "공장");
    const title = clean(cv(r, "상세_제목")) || clean(cv(r, "제목"));
    const date = (clean(cv(r, "상세_일자")) || clean(cv(r, "이상발생일시"))).slice(0, 10);
    // 정제
    if (!factory) { dropped.factory++; continue; }
    if (!title) { dropped.title++; continue; }
    if (!date) { dropped.date++; continue; }
    // dedup (기존 json과)
    const start = padSec(cv(r, "상세_불가동시작"));
    const sKey = [factory, pick(r, "상세_작업장명", "작업장"), date, norm(title), start].join("|");
    const rKey = [factory, date, norm(title)].join("|");
    if (strictKeys.has(sKey)) { dupStrict++; continue; }
    if (relaxedKeys.has(rKey)) { dupRelaxed++; continue; }
    if (seenInBatch.has(sKey)) { dupIntra++; continue; }  // CSV 내부 중복 제거
    seenInBatch.add(sKey);

    const downtime = Number(cv(r, "상세_불가동분") || cv(r, "불가동시간(분)")) || 0;
    seq++;
    out.push({
      id: ID_PREFIX + String(seq).padStart(4, "0"),
      factory,
      workplace: pick(r, "상세_작업장명", "작업장"),
      workplace_type: cv(r, "작업장유형"),
      equipment: pick(r, "상세_설비명", "설비명(목록)"),
      product: pick(r, "상세_제품명", "품목명"),
      incident_type: pick(r, "상세_이상발생유형", "이상발생유형(목록)"),
      incident_date: date,
      start_time: start,
      end_time: padSec(cv(r, "상세_불가동종료")),
      downtime_min: downtime,
      target_process: pick(r, "상세_대상공정", "대상공정(목록)"),
      title,
      cause: cv(r, "발생원인"),
      action: cv(r, "조치사항"),
      author: cv(r, "작성자"),
      department: "",
      created_at: IMPORT_DATE,
      is_best_practice: false,
      is_long_downtime: downtime >= 60,
    });
  }

  // 분포
  const dist = {}; for (const o of out) { const c = classify(o); dist[c] = (dist[c] || 0) + 1; }
  const bym = {}; for (const o of out) { const m = o.incident_date.slice(0, 7); bym[m] = (bym[m] || 0) + 1; }

  console.log(`[CSV 병합] 원본 레코드 ${data.length}`);
  console.log(`정제 제외: 공장 ${dropped.factory} / 제목 ${dropped.title} / 일자 ${dropped.date}`);
  console.log(`기존 중복 제외: 복합키 ${dupStrict} / 완화키 ${dupRelaxed}`);
  console.log(`CSV 내부 중복 제외: ${dupIntra}`);
  console.log(`→ 신규 유효: ${out.length}건  월별: ${JSON.stringify(bym)}`);
  console.log(`카테고리 분포: ${JSON.stringify(dist)}`);
  console.log(`id 범위: ${out[0]?.id} ~ ${out[out.length - 1]?.id}`);

  if (DRY) {
    console.log("\n--- 변환 샘플 5건 ---");
    for (const o of out.slice(0, 5)) console.log(JSON.stringify(o, null, 1));
    console.log("\nDRY-RUN 종료 (파일 변경 없음).");
    return;
  }

  // 병합 저장 — 기존 파일 포맷(들여쓰기 여부) 보존
  const raw = readFileSync(JSON_FILE, "utf8");
  const pretty = /^\[\s*\n\s+\{/.test(raw); // 첫 객체 앞 들여쓰기 있으면 pretty
  const merged = existing.concat(out);
  writeFileSync(JSON_FILE, pretty ? JSON.stringify(merged, null, 2) : JSON.stringify(merged));
  console.log(`\n✅ 병합 저장: ${existing.length} → ${merged.length}건 (+${out.length}) → ${JSON_FILE}`);
  console.log(`신규 id: ${out[0].id} ~ ${out[out.length - 1].id}`);
}

main();
