// scripts/test-search-precision.ts
// 필터 전(전역 임베딩) vs 후(라인/카테고리 필터) 정확도 비교. 컷팅/캡/DMC 혼입 확인.
// 실행: NODE_TLS_REJECT_UNAUTHORIZED=0 OPENAI_API_KEY=... node --experimental-strip-types scripts/test-search-precision.ts
import { readFileSync } from 'node:fs'
import { classifyByKeywords, classifyCase, detectLineFromText, CATEGORY_LABELS } from '../lib/incident-taxonomy.ts'

const inc = JSON.parse(readFileSync('data/incidents.json', 'utf8')) as any[]
const emb = JSON.parse(readFileSync('data/incident-embeddings.json', 'utf8')) as Record<string, number[]>
const byId = new Map(inc.map(i => [i.id, i]))
const cats = new Map(inc.map(i => [i.id, classifyCase(i)]))
const KEY = process.env.OPENAI_API_KEY!
const cos = (a: number[], b: number[]) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] } return d / Math.sqrt(na * nb) }
async function embed(q: string) { const r = await fetch('https://api.openai.com/v1/embeddings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY }, body: JSON.stringify({ model: 'text-embedding-3-small', input: q, dimensions: 1536 }) }); return (await r.json()).data[0].embedding }
const tag = (c: any) => { const t = (c.title || '') + (c.cause || ''); return /dmc|마킹|코딩/i.test(t) ? ' ⚠DMC' : /캡|\bcap/i.test(t) ? ' ⚠CAP' : '' }

async function run(q: string) {
  const e = await embed(q)
  const qLine = detectLineFromText(q)
  const qCats = [...new Set([...classifyByKeywords(q).filter(c => c !== 'etc')])]
  console.log('\n■■■ "' + q + '"  (감지 라인=' + (qLine || '없음') + ', 카테고리=' + (qCats.map(c => CATEGORY_LABELS[c]).join(',') || '없음') + ')')
  // BEFORE: 전역
  const before = Object.entries(emb).map(([id, v]) => ({ id, s: cos(e, v) })).sort((a, b) => b.s - a.s).slice(0, 5)
  // AFTER: 카테고리 필터 (이 테스트 질문들은 라인 미지정 → 카테고리만)
  let p2 = inc
  if (qCats.length) { const f = p2.filter(i => cats.get(i.id)!.some(c => qCats.includes(c))); if (f.length >= 8) p2 = f }
  const ids = new Set(p2.map(i => i.id))
  const after = Object.entries(emb).filter(([id]) => ids.has(id)).map(([id, v]) => ({ id, s: cos(e, v) })).sort((a, b) => b.s - a.s).slice(0, 5)
  const fmt = (arr: any[]) => arr.map(t => { const c = byId.get(t.id); return '   ' + t.s.toFixed(3) + ' | ' + (CATEGORY_LABELS[cats.get(t.id)![0]] || '?').padEnd(6) + ' | ' + (c.equipment || '(빈)') + ' | ' + c.title + tag(c) }).join('\n')
  console.log(' [BEFORE 전역]\n' + fmt(before))
  console.log(' [AFTER 필터]\n' + fmt(after))
}
;(async () => { for (const q of ['컷팅불량', '캡 컷팅 불량', '마킹 불량']) await run(q) })()
