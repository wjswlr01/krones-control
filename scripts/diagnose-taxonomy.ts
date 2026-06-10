// scripts/diagnose-taxonomy.ts
// 보강된 분류기(lib/incident-taxonomy)로 재분류 분포 + 라인 8그룹 매핑 + 컷팅/캡/DMC 재분류 검증.
// 실행: node --experimental-strip-types scripts/diagnose-taxonomy.ts
import { readFileSync } from 'node:fs'
import { classifyCase, normalizeLine, CATEGORY_LABELS, LINE_GROUPS } from '../lib/incident-taxonomy.ts'

const inc = JSON.parse(readFileSync('data/incidents.json', 'utf8')) as any[]
const N = inc.length

// 1) 재분류 분포 (대표 카테고리 = 첫 번째)
const catCnt: Record<string, number> = {}
for (const x of inc) { const c = classifyCase(x)[0]; catCnt[c] = (catCnt[c] || 0) + 1 }
console.log('=== 보강 후 재분류 분포 (대표 카테고리) ===')
for (const [k, v] of Object.entries(catCnt).sort((a, b) => b[1] - a[1]))
  console.log('  ' + (CATEGORY_LABELS[k] || k).padEnd(8) + '(' + k.padEnd(12) + ') : ' + String(v).padStart(4) + ' (' + (100 * v / N).toFixed(1) + '%)')
const etc = catCnt['etc'] || 0
console.log('  → etc(미분류): ' + etc + ' (' + (100 * etc / N).toFixed(1) + '%)  [기존 61.1% → ?]')

// 2) 라인 8그룹 정규화 결과
console.log('\n=== 라인 정규화 (workplace 39종 → 8그룹) 건수 ===')
const lineCnt: Record<string, number> = {}
for (const x of inc) { const l = normalizeLine(x) || '(기타/미분류)'; lineCnt[l] = (lineCnt[l] || 0) + 1 }
for (const g of [...LINE_GROUPS, '(기타/미분류)'])
  console.log('  ' + String(g).padEnd(12) + ' : ' + String(lineCnt[g] || 0).padStart(4))

// 3) workplace 원본 → 그룹 매핑표
console.log('\n=== workplace 원본 → 8그룹 매핑 ===')
const mapSeen = new Map<string, string>()
const wpCnt: Record<string, number> = {}
for (const x of inc) { const w = (x.workplace || '(빈값)').trim() || '(빈값)'; wpCnt[w] = (wpCnt[w] || 0) + 1; if (!mapSeen.has(w)) mapSeen.set(w, normalizeLine(x) || '기타') }
for (const [w, n] of Object.entries(wpCnt).sort((a, b) => b[1] - a[1]))
  console.log('  ' + String(n).padStart(4) + ' | ' + (mapSeen.get(w) || '기타').padEnd(10) + ' ← ' + w)

// 4) 컷팅/캡/DMC 재분류 검증
console.log('\n=== 컷팅/캡/DMC 키워드 사례 → 보강 분류 분포 ===')
for (const [label, re] of [['컷팅', /컷팅|커팅|cutting/i], ['캡', /캡|\bcap/i], ['DMC/마킹', /dmc|마킹|코딩/i]] as [string, RegExp][]) {
  const hits = inc.filter(x => re.test((x.title || '') + ' ' + (x.cause || '') + ' ' + (x.equipment || '')))
  const d: Record<string, number> = {}
  for (const h of hits) { const c = classifyCase(h)[0]; d[c] = (d[c] || 0) + 1 }
  console.log('  "' + label + '" ' + hits.length + '건 → ' + Object.entries(d).sort((a, b) => b[1] - a[1]).map(([k, v]) => (CATEGORY_LABELS[k] || k) + '(' + v + ')').join(', '))
}
