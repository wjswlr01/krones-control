import { NextRequest, NextResponse } from 'next/server'
import incidentsData from '@/data/incidents.json'
import embeddingsData from '@/data/incident-embeddings.json'
import manualEmbeddingsData from '@/data/manual-embeddings.json'
import slideSummariesData from '@/data/slide-summaries.json'
import chunksData from '@/data/chunks.json'
import { getManual, getEquipmentGroup } from '@/lib/manuals'

export const maxDuration = 60

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? ''        // 임베딩(검색) + 답변 생성 공용
const EMBED_URL = 'https://api.openai.com/v1/embeddings'
const EMBED_MODEL = 'text-embedding-3-small'                   // 문서 인덱스와 동일 모델
const EMBED_DIM = 1536
const CHAT_MODEL = 'gpt-5.4-mini'                              // 답변·분류·되묻기 생성 공용 (단일 소스)
// 표시용 라벨 매핑 (모델 교체 시 여기만 수정하면 UI 자동 반영). 미등록 모델은 raw 문자열 그대로 노출.
const MODEL_LABELS: Record<string, string> = { 'gpt-5.4-mini': 'GPT-5.4 Mini' }
const modelLabel = (m: string) => MODEL_LABELS[m] ?? m

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

// ── 설비 카테고리 분류 (음료 생산라인) ──────────────────────────────
// 주의: filler 의 '넥'은 labeler('넥라벨')와 겹치므로 bare '넥' 대신 병목/넥부만 사용
const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  blower:    /프리폼|블로우|블로워|브로워|성형|몰드|blow|preform/i,
  filler:    /필러|충전|충진|주입|어셉|어셉틱|asept|병목|넥부|액위|밸브|filler/i,
  capper:    /캡퍼|캡핑|토크|뚜껑|capper|\bcap\b|씰러|시머|seamer/i,
  labeler:   /라벨|라벨라|글루|롤러|스타휠|슬리브|sleeve|수축라벨|쉬링크|시링크|opp|label/i,
  conveyor:  /컨베이어|conveyor|반송/i,
  inspector: /비전|검사|inspect|vision|x.?ray|엑스레이/i,
}

function classifyByKeywords(text: string): string[] {
  const cats = Object.entries(CATEGORY_KEYWORDS).filter(([, re]) => re.test(text || '')).map(([k]) => k)
  return cats.length ? cats : ['etc']
}

// 사례 분류: 설비 필드가 더 신뢰도 높음 → 우선 사용, 미지정/불명확일 때만 제목으로 폴백
// (제목의 '몰드' 등 단어가 라벨러 사례를 blower로 오분류하는 것을 방지)
function classifyCase(c: { equipment?: string; title?: string }): string[] {
  const byEq = c.equipment ? classifyByKeywords(c.equipment) : ['etc']
  if (byEq[0] !== 'etc') return byEq
  return classifyByKeywords(c.title || '')
}

// 질문의 설비 카테고리를 GPT로 분류 (모호어는 문맥 판단). 실패 시 키워드 폴백.
async function classifyQuestionEquipment(question: string): Promise<string[]> {
  if (!OPENAI_API_KEY) return classifyByKeywords(question)
  const sys = `당신은 음료 생산라인 설비 분류기입니다. 작업자 질문이 어느 설비 카테고리의 문제인지 판단하세요.
카테고리: blower(프리폼/블로우몰드/성형/몰드), filler(필러/충전/어셉틱/병목 넥/액위), capper(캡/뚜껑/토크), labeler(라벨/글루/롤러/스타휠/슬리브/수축라벨), conveyor(컨베이어), inspector(비전/검사), etc(그외/불명확)
규칙:
- 1개 이상 선택, 가장 가능성 높은 카테고리 위주.
- 모호어 주의: '넥'은 넥라벨(labeler)일 수도, 병목 넥/넥찍힘(filler·blower 성형불량)일 수도 있으니 문맥으로 판단하세요.
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
  const sys = `당신은 음료 생산라인(롯데칠성) 설비 트러블슈팅 상담의 1차 분류기입니다. 작업자 질문이 "과거 이상발생 사례 + 설비 교육자료" 검색으로 정확히 답하기에 정보가 충분한지 판단합니다.

[충분(sufficient=true) 기준] 아래 2가지가 분명하면 충분:
- 어떤 설비/부위인지 (라벨러/제병기(블로우몰더)/팩커/충전기/캡퍼/컨베이어/검사기 등) — 증상에서 명백히 유추되면 명시 안 돼도 OK
- 구체적 증상·현상을 가리키는 단어가 하나라도 있는지 (불량/끊김/밀림/안 붙음/걸림/누수/정지/터짐/알람/소음/진동/마모 등)
정황(타입체인지 후/특정 속도·제품)·알람코드는 있으면 좋지만 위 2개가 분명하면 없어도 충분. 증상이 다소 넓어도(예: "불량") 검색은 가능하므로 굳이 세부 유형까지 되묻지 마세요.

[판단 예시]
- 충분(true): "제병 불량 원인", "팩커 필름 끊김 대처", "글루 롤러에 라벨이 말려요", "캡 토크 부족", "어셉틱 충전부 액위 불안정" → 설비/부위 + 증상 단어가 있음 → 바로 답변
- 부족(false): "라벨러가 이상해요", "설비가 안 돼요", "문제가 생겼어요", "팩커 좀 봐줘" → 증상 단어 없이 막연함 → 되묻기

[되묻기(sufficient=false)는 꼭 필요할 때만 — 남발 금지]
- 위 '부족' 예시처럼 증상 단어가 전혀 없어 막연하거나, 설비·증상이 둘 다 불명확할 때만.
- 부족한 핵심 항목 1~2개만 자연스러운 한 문장으로 되물으세요.
- 가능하면 선택지(options) 3~5개 제시. 설비가 불명확하면 ["라벨러","제병기(블로우몰더)","팩커","충전기","기타"]; 증상이 막연하면 대표 증상 보기. 자유응답이 자연스러우면 options는 빈 배열.
- 이전 대화에서 이미 설비/증상을 줬으면 sufficient=true.
- 사용자가 '그냥 답해줘/모르겠다/아무거나' 취지면 sufficient=true.

반드시 JSON만 출력(설명 금지):
{"sufficient": true}
또는 {"sufficient": false, "question": "되물을 한국어 질문", "options": ["보기1","보기2","보기3"]}`
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

async function generateAnswer(question: string, contexts: any[], manualCtx: ManualSource[], lowRelevance: boolean, history: Turn[] = []): Promise<string> {
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

  const userPrompt = `[현재 질문 기준 과거 유사 사례]
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

  // 정보 부족 → 검색/단정 답변 보류하고 핵심 1~2개만 되물음
  if (triage.needsClarification) {
    console.log('[ai-search] q=%j → CLARIFY %j opts=%j', question, triage.clarifyingQuestion, triage.clarifyOptions)
    return NextResponse.json({ success: true, data: {
      needsClarification: true,
      clarifyingQuestion: triage.clarifyingQuestion,
      clarifyOptions: triage.clarifyOptions,
      answer: '', similar: [], manualSources: [], lowRelevance: false,
    } })
  }

  const scored = Object.entries(embeddings)
    .map(([id, emb]) => ({ id, sim: cosSim(qEmb, emb) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 5)

  // 매뉴얼/교육자료 인덱스도 같은 질문 임베딩으로 검색 (사례와 동일 모델·공간)
  const manualScored = Object.entries(manualEmbeddings)
    .map(([id, emb]) => ({ id, sim: cosSim(qEmb, emb) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, MANUAL_TOPK)
  const manualSources = manualScored
    .filter(s => s.sim >= MANUAL_RELEVANCE_THRESHOLD)
    .map(s => buildManualSource(s.id, s.sim))
    .filter((x): x is ManualSource => x !== null)

  const incidentMap = new Map(incidents.map(i => [i.id, i]))
  const similar = scored.map(s => {
    const inc = incidentMap.get(s.id)
    if (!inc) return null
    return { id: inc.id, title: inc.title, factory: inc.factory, equipment: inc.equipment, downtime_min: inc.downtime_min, is_best_practice: inc.is_best_practice, similarity: s.sim }
  }).filter(Boolean)

  const RELEVANCE_THRESHOLD = 0.35   // OpenAI text-embedding-3-small 스케일 보정 (관련 0.42+, 무관 ~0.30)
  const topSim = scored[0]?.sim ?? 0
  const cosineLow = topSim < RELEVANCE_THRESHOLD

  const topContexts = scored.slice(0, 3)
    .map(s => { const inc = incidentMap.get(s.id); return inc ? { ...inc, similarity: s.sim } : null })
    .filter(Boolean) as any[]

  // 설비 불일치 감지: top 사례 설비 카테고리 ∩ 질문 카테고리 = ∅ 이면 cosine 높아도 lowRelevance 강제
  const caseCats = [...new Set(topContexts.flatMap(c => classifyCase(c)))]
  const qSpecific = queryCats.filter(c => c !== 'etc')
  const cSpecific = caseCats.filter(c => c !== 'etc')
  const equipmentMismatch = qSpecific.length > 0 && cSpecific.length > 0 && !qSpecific.some(c => cSpecific.includes(c))
  const lowRelevance = cosineLow || equipmentMismatch

  console.log('[ai-search] q=%j topSim=%s queryCats=%j caseCats=%j mismatch=%s lowRelevance=%s manual=%d(top=%s)',
    question, topSim.toFixed(3), queryCats, caseCats, equipmentMismatch, lowRelevance,
    manualSources.length, (manualScored[0]?.sim ?? 0).toFixed(3))
  try {
    const answer = await generateAnswer(question, topContexts, manualSources, lowRelevance, history)
    return NextResponse.json({ success: true, data: { answer, similar, manualSources, lowRelevance, needsClarification: false, model: CHAT_MODEL, modelLabel: modelLabel(CHAT_MODEL), embedModel: EMBED_MODEL } })
  } catch (e) {
    console.error('[incident-ai-search] OpenAI error:', e)
    return NextResponse.json({ success: false, error: { message: '답변 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' } }, { status: 503 })
  }
}
