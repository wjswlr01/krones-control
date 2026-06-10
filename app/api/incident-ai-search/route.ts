import { NextRequest, NextResponse } from 'next/server'
import incidentsData from '@/data/incidents.json'
import embeddingsData from '@/data/incident-embeddings.json'
import manualEmbeddingsData from '@/data/manual-embeddings.json'
import slideSummariesData from '@/data/slide-summaries.json'
import chunksData from '@/data/chunks.json'
import { getManual, getEquipmentGroup } from '@/lib/manuals'
import { CHAT_MODEL, EMBED_MODEL, modelLabel } from '@/lib/ai-model'
import {
  classifyByKeywords, classifyCase, normalizeLine, detectLineFromText,
  CATEGORY_KEYWORDS, CATEGORY_LABELS, CANDIDATE_LABELS, LINE_GROUPS, PROCESS_CHIPS,
} from '@/lib/incident-taxonomy'

export const maxDuration = 60

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? ''        // 임베딩(검색) + 답변 생성 공용
const EMBED_URL = 'https://api.openai.com/v1/embeddings'
const EMBED_DIM = 1536

const incidents = incidentsData as any[]
const embeddings = embeddingsData as Record<string, number[]>
const manualEmbeddings = manualEmbeddingsData as Record<string, number[]>
const slideSummaries = slideSummariesData as Record<string, { summary?: string }>

// chunk_id → 슬라이드 제목(page_title) 룩업 (매뉴얼 카드/컨텍스트용)
const slideTitleById = new Map<string, string>(
  (chunksData as any[]).filter(c => c?.source_type === 'pptx').map(c => [c.chunk_id, c.page_title || ''])
)

const MANUAL_RELEVANCE_THRESHOLD = 0.30   // 매뉴얼 노하우 관련성 하한 (사례 0.35보다 약간 낮게 — 짧은 요약 보정)
const MANUAL_TOPK = 3

export interface ManualSource {
  chunk_id: string; file_id: string; slide: number
  equipmentName: string; volumeTitle: string; slideTitle: string
  summaryPreview: string; similarity: number
}

// chunk_id(예 "packer-06_slide_005") → 표시 메타 + 요약 미리보기
function buildManualSource(chunkId: string, similarity: number): ManualSource | null {
  const m = chunkId.match(/^(.+)_slide_(\d+)$/)
  if (!m) return null
  const fileId = m[1]; const slide = parseInt(m[2], 10)
  const manual = getManual(fileId)
  const group = manual ? getEquipmentGroup(manual.group) : undefined
  const summary = (slideSummaries[chunkId]?.summary || '').trim()
  return {
    chunk_id: chunkId, file_id: fileId, slide,
    equipmentName: group?.name || fileId,
    volumeTitle: manual?.title || '',
    slideTitle: slideTitleById.get(chunkId) || '',
    summaryPreview: summary.replace(/\s+/g, ' ').slice(0, 160),
    similarity,
  }
}

function cosSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i]*a[i]; nb += b[i]*b[i] }
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

// 설비 카테고리/라인 분류·정규화는 lib/incident-taxonomy 단일 소스 사용.
// 사례별 (line, cats) 메타를 모듈 로드 시 1회 사전계산 (검색 필터용).
const incidentLine = new Map<string, string | null>(incidents.map(i => [i.id, normalizeLine(i)]))
const incidentCats = new Map<string, string[]>(incidents.map(i => [i.id, classifyCase(i)]))

// 질문의 설비 카테고리를 GPT로 분류 (모호어는 문맥 판단). 실패 시 키워드 폴백.
async function classifyQuestionEquipment(question: string): Promise<string[]> {
  if (!OPENAI_API_KEY) return classifyByKeywords(question)
  const sys = `당신은 음료 생산라인 설비 분류기입니다. 작업자 질문이 어느 설비 카테고리(공정)의 문제인지 판단하세요.
카테고리:
- water(취수/지하수/용수/정수)
- depalletizer(투입/디팔/공병·공캔 투입)
- blower(제병/프리폼/블로우/성형/몰드)
- filler(주입/충전/어셉틱/밀봉/캡퍼·캡핑·캡/시머/토크/DMC·코딩·마킹/액위/병목 넥)
- labeler(라벨/글루/스타휠/슬리브/수축·OPP라벨/라벨 컷팅)
- packer(포장/번들/랩핑/트레이/팩커/필름 컷팅)
- palletizer(적재/파레트)
- conveyor(컨베이어/반송/이송)
- inspector(비전/검사/X-ray)
- etc(그외/불명확)
규칙:
- ★증상이 여러 설비에 걸쳐 후보가 갈리면 해당 카테고리를 모두 나열하세요. 한 곳으로 단정하지 마세요.
  · 단독 '컷팅/컷팅 불량'(수식어 없음) → ["packer","labeler"] (필름 컷팅 vs 라벨 컷팅 둘 다 가능)
  · '필름 컷팅/번들 컷팅' → ["packer"], '라벨 컷팅' → ["labeler"] (수식어로 한정되면 1개)
- 후보가 하나로 분명하면 1개만: '마킹·DMC·캡 불량'→["filler"], '서보 알람'→["filler"]나 전기성이면 그대로, '필름 끊김'→["packer"], '라벨 밀림'→["labeler"]
- 모호어 주의: '넥'은 넥라벨(labeler)일 수도, 병목 넥(filler)일 수도 → 둘 다 나열.
- 반드시 JSON만 출력: {"categories":["..."]}`
  try {
    const raw = await callOpenAI(sys, question, 0)
    const m = raw.match(/\{[\s\S]*\}/)
    const parsed = m ? JSON.parse(m[0]) : null
    const cats: string[] = Array.isArray(parsed?.categories) ? parsed.categories : []
    const valid = cats.map(c => String(c).toLowerCase().trim()).filter(c => c === 'etc' || c in CATEGORY_KEYWORDS)
    return valid.length ? [...new Set(valid)] : classifyByKeywords(question)
  } catch {
    return classifyByKeywords(question)
  }
}

async function embedQuery(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: text, dimensions: EMBED_DIM })
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.data?.[0]?.embedding ?? null
  } catch { return null }
}

type Turn = { question: string; answer: string }

// history → OpenAI 메시지 변환 (멀티턴 컨텍스트)
function historyToMessages(history: Turn[]): { role: 'user' | 'assistant'; content: string }[] {
  const msgs: { role: 'user' | 'assistant'; content: string }[] = []
  for (const h of history.slice(-8)) {
    if (h?.question) msgs.push({ role: 'user', content: h.question })
    if (h?.answer) msgs.push({ role: 'assistant', content: h.answer })
  }
  return msgs
}

// ── 진단형 되묻기(triage) ────────────────────────────────────────────
// 질문 정보가 충분한지 GPT가 판단. 부족하면 핵심 1~2개만 되물음(선택지 포함). 실패 시 fail-open(바로 답변).
type Triage = { needsClarification: boolean; clarifyingQuestion: string; clarifyOptions: string[] }
const NO_CLARIFY: Triage = { needsClarification: false, clarifyingQuestion: '', clarifyOptions: [] }

async function triageQuestion(question: string, history: Turn[]): Promise<Triage> {
  if (!OPENAI_API_KEY) return NO_CLARIFY
  const LINE_OPTS = LINE_GROUPS.join(' / ')                          // 8개 라인
  const PROC_OPTS = PROCESS_CHIPS.map(p => p.label).join(' / ')      // 공정/설비
  const sys = `당신은 음료 생산라인(롯데칠성) 설비 트러블슈팅 상담의 1차 분류기입니다. 사례 데이터는 라인(workplace)과 공정으로 검색을 좁힐수록 정확합니다. 작업자 질문이 정확한 검색에 충분한지 판단하세요.

검색 정확도를 높이는 핵심 정보 3가지: ①라인(${LINE_OPTS}) ②공정/설비(${PROC_OPTS}) ③증상.

[충분(sufficient=true)] 다음을 모두 만족하면 충분 → 바로 답변:
- ②공정/설비를 추정할 수 있음 (명시되거나 증상에서 유추됨. 예: '필름 컷팅·컷팅 불량'=포장/라벨링, '라벨 밀림'=라벨링, '캡·DMC·마킹 불량'=주입·캡핑, '서보 알람'=전기). 카테고리 1~2개로 좁혀지면 충분.
- ③구체적 증상 단어가 있음 (불량/끊김/밀림/안붙음/걸림/누수/정지/알람/소음 등)
- ①라인은 없어도 됨(있으면 더 정확). 공정·설비가 추정되면 라인은 굳이 되묻지 말 것.

[되묻기(sufficient=false) — 꼭 필요할 때만, 남발 금지]
- 공정·설비를 전혀 추정할 수 없고 증상도 막연할 때만(예: "설비가 안 돼요", "라인에 문제 있어요", "라벨러가 이상해요"):
  → 우선 "어떤 라인에서 발생했나요?" 로 되묻고 options 는 라인 8종으로: ${JSON.stringify(LINE_GROUPS)}
- 라인은 알지만 공정/설비가 모호하면: "어떤 공정/설비인가요?" options 는 ${JSON.stringify(PROCESS_CHIPS.map(p => p.label))}
- 한 번에 1가지만 자연스러운 문장으로. 이전 대화에서 이미 준 정보는 다시 묻지 말 것.
- 사용자가 '그냥 답해줘/모르겠다/아무거나' 취지면 sufficient=true.

[판단 예시]
- 충분: "팩커 필름 끊김", "컷팅 불량 원인"(=포장/라벨링), "마킹 불량"(=주입·캡핑), "캡 토크 부족", "서보 알람", "탄산캔라인 포장기 컷팅 불량"
- 되묻기: "설비가 안 돼요"(라인 되묻기), "라벨러가 이상해요"(증상 막연 → 라인/증상 되묻기)

반드시 JSON만 출력(설명 금지):
{"sufficient": true}
또는 {"sufficient": false, "question": "되물을 한국어 질문", "options": ["보기1","보기2"]}`
  try {
    const messages = [{ role: 'system' as const, content: sys }, ...historyToMessages(history), { role: 'user' as const, content: question }]
    const raw = await callOpenAIMessages(messages, 0)
    const m = raw.match(/\{[\s\S]*\}/)
    const p = m ? JSON.parse(m[0]) : null
    if (!p || p.sufficient === true) return NO_CLARIFY
    const q = String(p.question ?? '').trim()
    if (!q) return NO_CLARIFY                                   // 질문 문장 없으면 그냥 답변
    const opts = Array.isArray(p.options) ? p.options.map((o: any) => String(o).trim()).filter(Boolean).slice(0, 6) : []
    return { needsClarification: true, clarifyingQuestion: q, clarifyOptions: opts }
  } catch {
    return NO_CLARIFY                                            // fail-open: 막히면 답변 진행
  }
}

async function generateAnswer(question: string, contexts: any[], manualCtx: ManualSource[], lowRelevance: boolean, history: Turn[] = [], scopeNote = ''): Promise<string> {
  const contextText = contexts.length
    ? contexts.map((c, i) => `[사례 ${i+1}] (유사도 ${Math.round((c.similarity ?? 0) * 100)}%) ${c.title}\n- 공장/공정: ${c.factory}, ${c.target_process || '미지정'}\n- 설비: ${c.equipment || '미지정'}\n- 발생 원인: ${c.cause}\n- 조치 사항: ${c.action}`).join('\n\n')
    : '(질문과 충분히 일치하는 과거 사례 없음)'

  const manualText = manualCtx.length
    ? manualCtx.map((mctx, i) => `[교육자료 ${i+1}] (유사도 ${Math.round(mctx.similarity * 100)}%) ${mctx.equipmentName} · ${mctx.volumeTitle}${mctx.slideTitle ? ` · ${mctx.slideTitle}` : ''} (슬라이드 ${mctx.slide})\n${slideSummaries[mctx.chunk_id]?.summary || mctx.summaryPreview}`).join('\n\n')
    : '(질문과 관련된 교육자료 노하우 없음)'

  const systemPrompt = `당신은 Krones 라벨러·제병기·팩커 및 음료 제조 설비 전문가입니다. 아래에는 (A) 임베딩 유사도로 검색된 과거 이상발생 사례와 (B) 라벨러/제병기/팩커 교육자료에서 추출된 강사 현장노하우가 제공됩니다. 둘 다 유사도가 높아도 실제 설비/공정이 질문과 다를 수 있습니다.

1. 먼저 질문의 증상이 어느 설비/공정에서 발생하는지 판단하세요 (블로워/성형·제병, 필러/주입기, 라벨러, 캡퍼, 팩커/포장, 컨베이어, 검사기 등).
2. 검색된 사례·교육자료가 그 설비/공정과 일치하고 충분히 관련될 때만 근거로 사용하세요. 무관하면 억지로 인용하지 마세요.
3. 추측을 사실처럼 단정하지 마세요.

[답변 구성] 가능하면 아래 두 부분으로 구분해 작성하세요(해당 근거가 있을 때만):
- **과거 사례 근거**: 유사 사례에서 확인된 원인·조치. 사례가 질문 설비/공정과 맞을 때만.
- **매뉴얼·교육 기반 대처법**: 교육자료 강사노하우 기반의 구체적 대처·점검·예방법. 대처법과 예방법은 교육자료 노하우를 우선 활용하세요.
둘 중 한쪽 근거만 있으면 그 부분만 쓰고, 없는 부분은 만들어내지 마세요.

- 이 시스템의 사례 데이터는 라벨러 중심이지만 질문은 다른 설비일 수 있습니다. 데이터 맥락에 끌려가 무조건 라벨러로 답하지 마세요.
- 사례·교육자료 근거가 모두 부족하면(lowRelevance), 구체적 부품명·수치·세부 진단을 단정하지 말고 '~일 수 있습니다'처럼 불확실성을 명시하고, 답변 맨 앞에 다음 문구를 반드시 포함하세요: '※ 아래는 과거 사례 근거가 아닌 일반 참고 정보이며, 실제와 다를 수 있습니다. 정확한 진단은 설비 매뉴얼과 담당 엔지니어 확인이 필요합니다.' (단, 교육자료 노하우가 질문과 관련되면 그것을 근거로 활용하고 이 문구는 생략 가능)
- 근거 없는 긴 점검 리스트를 나열하기보다 방향을 신중히 제시하고 전문가·매뉴얼 확인을 권하세요.
${lowRelevance ? '\n[현재 검색 결과 판정] lowRelevance = true (질문과 직접 관련된 과거 사례가 충분치 않음). 사례 기반 단정은 피하되, 위 (B) 교육자료 노하우가 질문과 관련되면 적극 활용해 대처법을 안내하세요. 사례·교육자료 모두 무관하면 disclaimer 문구를 답변 맨 앞에 포함.' : '\n[현재 검색 결과 판정] lowRelevance = false (관련 사례 있음). 사례 근거로 구체적으로 답하세요.'}

답변 형식:
- 구체적 조치 방법, 점검 포인트, 주의사항 위주
- 한국어로 친절하고 명확하게
- 500자 이내`

  const userPrompt = `${scopeNote ? `[검색 범위] ${scopeNote}\n\n` : ''}[현재 질문 기준 과거 유사 사례]
${contextText}

[현재 질문 기준 관련 교육자료 강사노하우]
${manualText}

[작업자 질문]
${question}`

  // 멀티턴: system → 이전 turn(user/assistant) → 현재 질문(+이번 검색 사례)
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [{ role: 'system', content: systemPrompt }]
  for (const h of history.slice(-8)) {
    if (h?.question) messages.push({ role: 'user', content: h.question })
    if (h?.answer) messages.push({ role: 'assistant', content: h.answer })
  }
  messages.push({ role: 'user', content: userPrompt })
  return callOpenAIMessages(messages)
}

async function callOpenAIMessages(messages: { role: 'system' | 'user' | 'assistant'; content: string }[], temperature = 0.3): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      temperature,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// 단발 system+user 호출 (설비 분류기용)
async function callOpenAI(systemPrompt: string, userPrompt: string, temperature = 0.3): Promise<string> {
  return callOpenAIMessages([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], temperature)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const question: string = body?.question ?? ''
  const rawHistory: any[] = Array.isArray(body?.history) ? body.history.filter((h: any) => h?.question && h?.answer) : []
  const history: Turn[] = rawHistory.map((h: any) => ({ question: String(h.question), answer: String(h.answer) }))
  if (!question?.trim()) return NextResponse.json({ success: false, error: { message: '질문을 입력하세요.' } }, { status: 400 })
  if (!OPENAI_API_KEY) return NextResponse.json({ success: false, error: { message: 'API 키 미설정' } }, { status: 500 })

  // 되묻기 루프 방지: 직전 turn이 이미 되물음이었거나, 사용자가 '바로 답해줘' 취지면 triage 건너뛰고 답변
  const recentlyClarified = rawHistory.length > 0 && rawHistory[rawHistory.length - 1]?.clarify === true
  const wantsDirectAnswer = /그냥\s*답|바로\s*답|빨리\s*답|모르겠|몰라|아무거나|상관없|just answer/i.test(question)
  const skipTriage = recentlyClarified || wantsDirectAnswer

  // 검색용 임베딩 쿼리: 되묻기 누적 대화 보정 위해 최근 질문 2개 + 현재 질문 결합
  const embedInput = [...history.slice(-2).map(h => h.question), question].join(' ').trim()

  // 임베딩 + 설비분류 + 진단형 되묻기 판단을 병렬 처리(충분한 질문일 때 지연 최소화).
  const [qEmb, queryCats, triage] = await Promise.all([
    embedQuery(embedInput),
    classifyQuestionEquipment(question),
    skipTriage ? Promise.resolve(NO_CLARIFY) : triageQuestion(question, history),
  ])
  if (!qEmb) return NextResponse.json({ success: false, error: { message: '임베딩 생성 실패' } }, { status: 500 })

  // ── 후보 카테고리 산출 (GPT 우선, 비면 키워드). 후보가 2개 이상 갈리면 그 후보를 직접 되묻기 ──
  const gptCats = queryCats.filter(c => c !== 'etc')
  const kwNow = classifyByKeywords(question).filter(c => c !== 'etc')
  const candidateCats = [...new Set(gptCats.length ? gptCats : kwNow)]

  let effTriage = triage
  if (!skipTriage && candidateCats.length >= 2) {
    // 같은 증상이 여러 설비 후보로 갈림(예: '컷팅'→포장+라벨링) → 단정 말고 후보를 선택지로 제시
    effTriage = {
      needsClarification: true,
      clarifyingQuestion: '여러 설비에서 발생할 수 있는 증상입니다. 어느 설비/공정인가요?',
      clarifyOptions: candidateCats.map(c => CANDIDATE_LABELS[c] || CATEGORY_LABELS[c] || c),
    }
  }

  // 정보 부족/모호 → 검색·단정 답변 보류하고 되물음
  if (effTriage.needsClarification) {
    console.log('[ai-search] q=%j → CLARIFY %j opts=%j (candidates=%j)', question, effTriage.clarifyingQuestion, effTriage.clarifyOptions, candidateCats)
    return NextResponse.json({ success: true, data: {
      needsClarification: true,
      clarifyingQuestion: effTriage.clarifyingQuestion,
      clarifyOptions: effTriage.clarifyOptions,
      answer: '', similar: [], manualSources: [], lowRelevance: false,
    } })
  }

  // ── 라인/공정(카테고리) 기반 사례 사전 필터 → 부분집합에서 임베딩 top-K ──
  // 누적 대화(되묻기 답 포함)에서 라인·카테고리 추출. equipment 빈값이어도 workplace(라인)로 판정.
  const convText = [...history.map(h => h.question), question].join(' ')
  const qLine = detectLineFromText(convText)
  // 칩으로 막 좁힌 turn(recentlyClarified)이면 현재 질문의 카테고리만 사용(과거 모호 카테고리 무시 → 정확히 필터).
  const qCatsSpecific = recentlyClarified
    ? [...new Set(kwNow.length ? kwNow : gptCats)]
    : [...new Set([...gptCats, ...classifyByKeywords(convText).filter(c => c !== 'etc')])]

  const MIN_POOL = 8
  const incidentMap = new Map(incidents.map(i => [i.id, i]))

  // 라인 = 하드 필터(지정 시 다른 라인 배제). 공정/카테고리 = 소프트(부분집합 너무 작으면 완화).
  let pool = incidents
  let appliedLine: string | null = null
  if (qLine) { pool = incidents.filter(i => incidentLine.get(i.id) === qLine); appliedLine = qLine }
  let appliedCats: string[] = []
  if (qCatsSpecific.length) {
    const f = pool.filter(i => incidentCats.get(i.id)!.some(c => qCatsSpecific.includes(c)))
    if (f.length >= MIN_POOL) { pool = f; appliedCats = qCatsSpecific }
  }
  const poolIds = new Set(pool.map(i => i.id))

  const scored = Object.entries(embeddings)
    .filter(([id]) => poolIds.has(id))
    .map(([id, emb]) => ({ id, sim: cosSim(qEmb, emb) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 5)

  // 매뉴얼/교육자료 인덱스도 같은 임베딩으로 검색. 질문 카테고리에 해당 교본군이 있으면 그쪽으로 편향.
  const CAT_MANUAL_PREFIX: Record<string, string> = { labeler: 'manual-', blower: 'blowmoulder-', packer: 'packer-' }
  const wantPrefixes = [...new Set(qCatsSpecific.map(c => CAT_MANUAL_PREFIX[c]).filter(Boolean))]
  if (/전기|plc|서보|인버터|제어|전장|모터|통신|센서|드라이브/i.test(convText)) wantPrefixes.push('electric-')
  let manualEntries = Object.entries(manualEmbeddings)
  if (wantPrefixes.length) {
    const f = manualEntries.filter(([id]) => wantPrefixes.some(p => id.startsWith(p)))
    if (f.length) manualEntries = f
  }
  const manualScored = manualEntries
    .map(([id, emb]) => ({ id, sim: cosSim(qEmb, emb) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, MANUAL_TOPK)
  const manualSources = manualScored
    .filter(s => s.sim >= MANUAL_RELEVANCE_THRESHOLD)
    .map(s => buildManualSource(s.id, s.sim))
    .filter((x): x is ManualSource => x !== null)

  const similar = scored.map(s => {
    const inc = incidentMap.get(s.id)
    if (!inc) return null
    return { id: inc.id, title: inc.title, factory: inc.factory, equipment: inc.equipment, downtime_min: inc.downtime_min, is_best_practice: inc.is_best_practice, similarity: s.sim }
  }).filter(Boolean)

  const RELEVANCE_THRESHOLD = 0.35   // OpenAI text-embedding-3-small 스케일 보정 (관련 0.42+, 무관 ~0.30)
  const topSim = scored[0]?.sim ?? 0
  const noCasesInScope = scored.length === 0                 // 지정 라인/공정에 사례 없음
  const lowRelevance = noCasesInScope || topSim < RELEVANCE_THRESHOLD

  const topContexts = scored.slice(0, 3)
    .map(s => { const inc = incidentMap.get(s.id); return inc ? { ...inc, similarity: s.sim } : null })
    .filter(Boolean) as any[]

  const scopeLabel = [appliedLine ? `라인=${appliedLine}` : null, appliedCats.length ? `공정=${appliedCats.map(c => CATEGORY_LABELS[c] || c).join('/')}` : null].filter(Boolean).join(', ')
  const scopeNote = scopeLabel
    ? (noCasesInScope ? `검색 범위(${scopeLabel})에 일치하는 과거 사례가 없습니다. 해당 라인/공정에 사례가 없다고 솔직히 밝히세요.` : `검색은 [${scopeLabel}] 범위로 한정되었습니다.`)
    : ''

  console.log('[ai-search] q=%j line=%j cats=%j pool=%d topSim=%s low=%s manual=%d',
    question, appliedLine, qCatsSpecific, pool.length, topSim.toFixed(3), lowRelevance, manualSources.length)
  try {
    const answer = await generateAnswer(question, topContexts, manualSources, lowRelevance, history, scopeNote)
    return NextResponse.json({ success: true, data: {
      answer, similar, manualSources, lowRelevance, needsClarification: false,
      scope: { line: appliedLine, categories: appliedCats.map(c => CATEGORY_LABELS[c] || c) },
      model: CHAT_MODEL, modelLabel: modelLabel(CHAT_MODEL), embedModel: EMBED_MODEL,
    } })
  } catch (e) {
    console.error('[incident-ai-search] OpenAI error:', e)
    return NextResponse.json({ success: false, error: { message: '답변 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' } }, { status: 503 })
  }
}
