// lib/incident-taxonomy.ts
// AI 사례검색 분류·필터의 단일 소스.
// equipment(54% 빈값)에 의존하지 않고 라인(workplace, 98.7%)+공정(target_process)+키워드로 설비 카테고리/라인을 판정.
// route.ts(검색 필터)와 scripts/diagnose-taxonomy.ts(분포 진단)가 함께 import.

export interface CaseLike {
  equipment?: string
  title?: string
  workplace?: string
  workplace_type?: string
  target_process?: string
}

// ── 설비 카테고리 ────────────────────────────────────────────────
// 신규: water(취수), depalletizer(투입), packer(포장), palletizer(적재)
// filler 에 캡퍼/시머/캡/DMC/마킹/코딩 흡수(캡·DMC 불량도 주입·밀봉 맥락 filler)
export const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  water:        /취수|지하수|용수|정수|연수|역삼투|살균수|\bRO\b|\bUF\b/i,
  depalletizer: /투입기|투입|디팔|언로더|벌크|bulk|de-?pal/i,
  blower:       /프리폼|블로우|블로워|브로워|성형|몰드|제병|blow|preform/i,
  filler:       /필러|충전|충진|주입|밀봉|어셉|어셉틱|asept|병목|넥부|액위|밸브|filler|캡퍼|캡핑|뚜껑|토크|씰러|시머|seamer|capper|캡|\bcap|dmc|코딩|마킹|날짜코/i,
  labeler:      /라벨|라벨라|글루|스타휠|슬리브|sleeve|수축라벨|쉬링크라벨|시링크라벨|opp|label|컷팅|커팅|cutting/i,
  packer:       /포장기|포장|번들|랩핑|랩퍼|트레이|tray|팩커|메이팩|packer|wrap|shrink.?pack|박스포장|카톤|carton|컷팅|커팅|cutting/i,
  palletizer:   /적재기|적재|팔레타이|파렛타이|파레트|palletiz/i,
  conveyor:     /컨베이어|conveyor|반송|에어\s?컨베|air.?con/i,
  inspector:    /비전|검사|inspect|vision|x.?ray|엑스레이/i,
}

export const CATEGORY_LABELS: Record<string, string> = {
  water: '취수', depalletizer: '투입', blower: '제병', filler: '주입·캡핑',
  labeler: '라벨링', packer: '포장', palletizer: '적재', conveyor: '이송', inspector: '검사', etc: '기타',
}

// target_process(공정) → 카테고리. equipment 빈값 보완용.
export const PROCESS_TO_CATEGORY: Record<string, string> = {
  취수: 'water', 투입: 'depalletizer', 주입: 'filler', 포장: 'packer', 적재: 'palletizer',
}

export function classifyByKeywords(text: string): string[] {
  const cats = Object.entries(CATEGORY_KEYWORDS).filter(([, re]) => re.test(text || '')).map(([k]) => k)
  return cats.length ? cats : ['etc']
}

// 사례 분류 (보강): ① equipment 키워드 → ② target_process 보완 → ③ title 키워드 → etc
export function classifyCase(c: CaseLike): string[] {
  if (c.equipment) { const e = classifyByKeywords(c.equipment); if (e[0] !== 'etc') return e }
  const p = PROCESS_TO_CATEGORY[(c.target_process || '').trim()]
  if (p) return [p]
  const t = classifyByKeywords(c.title || '')
  if (t[0] !== 'etc') return t
  return ['etc']
}

// ── 라인 8그룹 (호기 통합) ───────────────────────────────────────
export const LINE_GROUPS = ['탄산PET', '탄산캔', '커피캔', '어셉틱', 'BIB', '주스캔', '드링크팩', '병'] as const
export type LineGroup = (typeof LINE_GROUPS)[number]

// workplace(+ workplace_type 폴백) → 8그룹 또는 null(사출/멀티/인플란트 등 기타)
export function normalizeLine(c: CaseLike): LineGroup | null {
  const w = (c.workplace || '').trim()
  const t = (c.workplace_type || '').trim()
  if (/BIB/i.test(w)) return 'BIB'
  if (/드링크팩|프리즈마|prisma/i.test(w)) return '드링크팩'
  if (/커피캔|커피/.test(w)) return '커피캔'
  if (/주스캔/.test(w)) return '주스캔'
  if (/어셉틱|asept/i.test(w)) return '어셉틱'
  if (/사출|인플란트|제성/.test(w)) return null            // 프리폼 사출 라인 → 기타
  if (/멀티|multi/i.test(w)) return null
  if (/병\s*\d*\s*호|^병/.test(w)) return '병'
  if (/캔/.test(w)) return '탄산캔'
  if (/펫|pet/i.test(w)) return '탄산PET'
  // 이름으로 안 잡히면 용기타입 폴백 (산청·백학 등 OEM PET/캔 라인)
  if (t === 'PET') return '탄산PET'
  if (t === '캔') return '탄산캔'
  if (t === '병') return '병'
  if (t === '드링크') return '드링크팩'
  if (t === 'BIB') return 'BIB'
  return null
}

// 질문 텍스트에서 라인 추정 (workplace_type 없음 → 이름 토큰만). 8그룹 칩 라벨도 그대로 매칭.
export function detectLineFromText(text: string): LineGroup | null {
  return normalizeLine({ workplace: text })
}

// 되묻기용 공정/설비 칩 (라벨 → 카테고리)
export const PROCESS_CHIPS: { label: string; category: string }[] = [
  { label: '취수', category: 'water' },
  { label: '투입', category: 'depalletizer' },
  { label: '제병', category: 'blower' },
  { label: '주입·캡핑', category: 'filler' },
  { label: '라벨링', category: 'labeler' },
  { label: '포장', category: 'packer' },
  { label: '적재', category: 'palletizer' },
]
