// lib/incident-taxonomy.ts
// AI 사례검색 분류·필터의 단일 소스.
// equipment(54% 빈값)에 의존하지 않고 라인(workplace, 98.7%)+공정(target_process)+키워드로 설비 카테고리/라인을 판정.
// route.ts(검색 필터)와 scripts/diagnose-taxonomy.ts(분포 진단)가 함께 import.

export interface CaseLike {
  equipment?: string
  title?: string
  cause?: string
  workplace?: string
  workplace_type?: string
  target_process?: string
}

// ── 설비 카테고리 ────────────────────────────────────────────────
// 신규: water(취수), depalletizer(투입), packer(포장), palletizer(적재)
// filler 에 캡퍼/시머/캡 흡수(캡핑은 주입기와 한 설비). 단 DMC/마킹/코딩은 코드 마킹 공정이라 coding 으로 분리.
export const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  water:        /취수|지하수|용수|정수|연수|역삼투|살균수|\bRO\b|\bUF\b/i,
  depalletizer: /투입기|투입|디팔|언로더|벌크|bulk|de-?pal/i,
  blower:       /프리폼|블로우|블로워|브로워|성형|몰드|제병|blow|preform|인플란트|implant/i,
  coding:       /dmc|데이터매트릭스|마킹|마커|코딩|코더|coder|coding|잉크젯|inkjet|데이트코드|날짜코|레이저각인|레이저마킹|laser.?mark|코드인쇄/i,
  filler:       /필러|충전|충진|주입|밀봉|어셉|어셉틱|asept|병목|넥부|액위|밸브|filler|캡퍼|캡핑|뚜껑|토크|씰러|시머|seamer|capper|캡|\bcap/i,
  labeler:      /라벨|라벨라|글루|스타휠|슬리브|sleeve|수축라벨|쉬링크라벨|시링크라벨|opp|label|컷팅|커팅|cutting/i,
  packer:       /포장기|포장|번들|랩핑|랩퍼|트레이|tray|팩커|메이팩|packer|wrap|shrink.?pack|박스포장|카톤|carton|컷팅|커팅|cutting/i,
  palletizer:   /적재기|적재|팔레타이|파렛타이|파레트|palletiz/i,
  conveyor:     /컨베이어|conveyor|반송|에어\s?컨베|air.?con/i,
  inspector:    /비전|검사|inspect|vision|x.?ray|엑스레이/i,
}

export const CATEGORY_LABELS: Record<string, string> = {
  water: '취수', depalletizer: '투입', blower: '제병', coding: '코딩', filler: '주입·캡핑',
  labeler: '라벨링', packer: '포장', palletizer: '적재', conveyor: '이송', inspector: '검사', etc: '기타',
}

// 되묻기 칩용 카테고리 표시명 (사람이 알아보는 설비명). 칩 선택 시 그대로 다음 질문이 되며,
// classifyByKeywords로 다시 단일 카테고리에 정확히 매핑되도록 키워드를 포함해 둠.
export const CANDIDATE_LABELS: Record<string, string> = {
  packer: '번들포장기·포장',
  labeler: 'OPP라벨러·라벨링',
  filler: '주입·캡핑',
  coding: '잉크젯코더·마킹',
  blower: '제병기',
  palletizer: '적재기',
  depalletizer: '투입기',
  water: '취수',
  conveyor: '이송 컨베이어',
  inspector: '검사기',
}

// target_process(공정) → 카테고리. equipment 빈값 보완용.
export const PROCESS_TO_CATEGORY: Record<string, string> = {
  취수: 'water', 투입: 'depalletizer', 주입: 'filler', 포장: 'packer', 적재: 'palletizer',
}

export function classifyByKeywords(text: string): string[] {
  const cats = Object.entries(CATEGORY_KEYWORDS).filter(([, re]) => re.test(text || '')).map(([k]) => k)
  return cats.length ? cats : ['etc']
}

// 사례 분류 (보강): ⓪인플란트(제병) 우선 → ① equipment 키워드 → ② target_process 보완 → ③ title 키워드 → etc
export function classifyCase(c: CaseLike): string[] {
  // 인플란트(implant) = PET라인의 제병 설비 → equipment(투입기/주입기 등)보다 우선해 제병(blower)으로 분류
  if (/인플란트|implant/i.test(`${c.equipment || ''} ${c.title || ''} ${c.cause || ''}`)) return ['blower']
  if (c.equipment) { const e = classifyByKeywords(c.equipment); if (e[0] !== 'etc') return e }
  const p = PROCESS_TO_CATEGORY[(c.target_process || '').trim()]
  if (p) return [p]
  const t = classifyByKeywords(c.title || '')
  if (t[0] !== 'etc') return t
  return ['etc']
}

// ── 라인 11그룹 (호기 통합) ──────────────────────────────────────
// 'PET라인'은 용기 기준 통합: 탄산펫·소주펫·주스펫·생수펫·펫1/2호 등 일반 PET 라인 전부.
// (어셉틱펫은 무균라인이라 별도 '어셉틱' 그룹으로 유지 — PET라인에 넣지 않음)
export const LINE_GROUPS = ['PET라인', '탄산캔', '어셉틱', 'BIB', '커피캔', '드링크팩', '병', '주스캔', '멀티', '사출'] as const
export type LineGroup = (typeof LINE_GROUPS)[number]

// workplace(+ workplace_type 폴백) → 11그룹 또는 null(기타)
export function normalizeLine(c: CaseLike): LineGroup | null {
  const w = (c.workplace || '').trim()
  const t = (c.workplace_type || '').trim()
  if (/BIB/i.test(w)) return 'BIB'
  if (/드링크팩|프리즈마|prisma/i.test(w)) return '드링크팩'
  if (/커피캔|커피/.test(w)) return '커피캔'
  if (/주스캔/.test(w)) return '주스캔'
  if (/어셉틱|asept/i.test(w)) return '어셉틱'        // 어셉틱펫 포함 — PET라인보다 먼저 매칭
  if (/사출/.test(w) || t === '사출') return '사출'
  if (/인플란트|implant/i.test(w) || t === '인플란트') return 'PET라인'   // 인플란트 = PET라인 제병 설비(독립 라인 아님)
  if (/멀티|multi/i.test(w) || t === '멀티') return '멀티'
  if (/병\s*\d*\s*호|^병/.test(w)) return '병'
  if (/캔/.test(w)) return '탄산캔'
  if (/펫|pet/i.test(w)) return 'PET라인'           // 탄산펫·소주펫·주스펫·생수펫·펫N호 등
  // 이름으로 안 잡히면 용기타입 폴백 (산청·백학 등 OEM 라인)
  if (t === 'PET') return 'PET라인'
  if (t === '캔') return '탄산캔'
  if (t === '병') return '병'
  if (t === '드링크') return '드링크팩'
  if (t === 'BIB') return 'BIB'
  return null
}

// 질문 텍스트에서 라인 추정 (workplace_type 없음 → 이름 토큰만). 라인 칩 라벨도 그대로 매칭.
export function detectLineFromText(text: string): LineGroup | null {
  return normalizeLine({ workplace: text })
}

// 되묻기용 공정/설비 칩 (라벨 → 카테고리)
export const PROCESS_CHIPS: { label: string; category: string }[] = [
  { label: '취수', category: 'water' },
  { label: '투입', category: 'depalletizer' },
  { label: '제병', category: 'blower' },
  { label: '주입·캡핑', category: 'filler' },
  { label: '코딩', category: 'coding' },
  { label: '라벨링', category: 'labeler' },
  { label: '포장', category: 'packer' },
  { label: '적재', category: 'palletizer' },
]
