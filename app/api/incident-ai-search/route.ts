import { NextRequest, NextResponse } from 'next/server'
import incidentsData from '@/data/incidents.json'
import embeddingsData from '@/data/incident-embeddings.json'

export const maxDuration = 60

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ''        // 임베딩(검색) 전용 — 유지
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? ''        // 답변 생성 전용
const EMBED_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent'

const incidents = incidentsData as any[]
const embeddings = embeddingsData as Record<string, number[]>

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
    const res = await fetch(`${EMBED_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] }, taskType: 'RETRIEVAL_QUERY' })
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.embedding?.values ?? null
  } catch { return null }
}

async function generateAnswer(question: string, contexts: any[], lowRelevance: boolean): Promise<string> {
  const contextText = contexts.map((c, i) => `[사례 ${i+1}] (유사도 ${Math.round((c.similarity ?? 0) * 100)}%) ${c.title}\n- 공장/공정: ${c.factory}, ${c.target_process || '미지정'}\n- 설비: ${c.equipment || '미지정'}\n- 발생 원인: ${c.cause}\n- 조치 사항: ${c.action}`).join('\n\n')

  const systemPrompt = `당신은 Krones 라벨러 및 음료 제조 설비 전문가입니다. 아래는 사용자 질문과 임베딩 유사도로 검색된 과거 사례들이며, 유사도가 높아도 실제 설비/공정이 질문과 다를 수 있습니다.

1. 먼저 질문의 증상이 어느 설비/공정에서 발생하는지 판단하세요 (블로워/성형, 필러/주입기, 라벨러, 캡퍼, 컨베이어, 검사기 등).
2. 검색된 사례가 그 설비/공정과 일치하고 충분히 관련될 때만 사례 기반으로 답하세요.
3. 사례가 질문과 무관하거나(설비/공정 불일치) 유사도가 낮으면, 억지로 인용하지 말고 '과거 사례 데이터에서 정확히 일치하는 건을 찾지 못했습니다'라고 명확히 밝힌 뒤, 일반 설비 지식으로 신중히 안내하세요. 이때 해당 증상이 보통 어느 설비/공정에서 발생하는지 함께 설명하세요.
4. 추측을 사실처럼 단정하지 마세요.
- 이 시스템의 사례 데이터는 라벨러 중심이지만, 사용자 질문은 다른 설비(블로워/성형, 필러/주입기, 캡퍼 등)일 수 있습니다. 데이터 맥락에 끌려가 무조건 라벨러로 답하지 마세요. 증상에 맞는 실제 설비/공정을 객관적으로 판단하세요.
- 검색된 사례가 질문과 관련 없으면(lowRelevance), 구체적인 부품명·수치·세부 진단을 단정하지 마세요. 확실하지 않은 내용은 '~일 수 있습니다', '~로 추정됩니다'처럼 불확실성을 명시하고, 모르는 것은 모른다고 하세요.
- 사례 근거 없이 일반 지식으로 답할 때는, 답변 맨 앞에 다음 문구를 반드시 포함하세요: '※ 아래는 과거 사례 근거가 아닌 일반 참고 정보이며, 실제와 다를 수 있습니다. 정확한 진단은 설비 매뉴얼과 담당 엔지니어 확인이 필요합니다.'
- 근거 없는 긴 점검 리스트를 나열하기보다, 어느 설비/공정 문제인지 방향만 신중히 제시하고 전문가·매뉴얼 확인을 권하세요.
${lowRelevance ? '\n[현재 검색 결과 판정] lowRelevance = true (질문과 직접 관련된 사례가 충분치 않음). 위의 lowRelevance 지침을 반드시 적용하세요: 부품명·수치 단정 금지, 불확실성 명시, 일반 참고 정보 disclaimer 문구를 답변 맨 앞에 포함, 방향 제시 후 전문가·매뉴얼 확인 권고.' : '\n[현재 검색 결과 판정] lowRelevance = false (관련 사례 있음). 사례 근거로 구체적으로 답하세요.'}

답변 형식:
- 구체적 조치 방법, 점검 포인트, 주의사항 위주
- 한국어로 친절하고 명확하게
- 400자 이내`

  const userPrompt = `[과거 유사 사례]
${contextText}

[작업자 질문]
${question}`

  return callOpenAI(systemPrompt, userPrompt)
}

async function callOpenAI(systemPrompt: string, userPrompt: string, temperature = 0.3): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
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

export async function POST(req: NextRequest) {
  const { question } = await req.json().catch(() => ({}))
  if (!question?.trim()) return NextResponse.json({ success: false, error: { message: '질문을 입력하세요.' } }, { status: 400 })
  if (!GEMINI_API_KEY) return NextResponse.json({ success: false, error: { message: 'API 키 미설정' } }, { status: 500 })
  if (!OPENAI_API_KEY) return NextResponse.json({ success: false, error: { message: 'API 키 미설정' } }, { status: 500 })

  // 임베딩(Gemini)과 질문 설비분류(GPT)는 독립 — 병렬 처리
  const [qEmb, queryCats] = await Promise.all([
    embedQuery(question),
    classifyQuestionEquipment(question),
  ])
  if (!qEmb) return NextResponse.json({ success: false, error: { message: '임베딩 생성 실패' } }, { status: 500 })

  const scored = Object.entries(embeddings)
    .map(([id, emb]) => ({ id, sim: cosSim(qEmb, emb) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 5)

  const incidentMap = new Map(incidents.map(i => [i.id, i]))
  const similar = scored.map(s => {
    const inc = incidentMap.get(s.id)
    if (!inc) return null
    return { id: inc.id, title: inc.title, factory: inc.factory, equipment: inc.equipment, downtime_min: inc.downtime_min, is_best_practice: inc.is_best_practice, similarity: s.sim }
  }).filter(Boolean)

  const RELEVANCE_THRESHOLD = 0.68
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

  console.log('[ai-search] q=%j topSim=%s queryCats=%j caseCats=%j mismatch=%s lowRelevance=%s',
    question, topSim.toFixed(3), queryCats, caseCats, equipmentMismatch, lowRelevance)
  try {
    const answer = await generateAnswer(question, topContexts, lowRelevance)
    return NextResponse.json({ success: true, data: { answer, similar, lowRelevance } })
  } catch (e) {
    console.error('[incident-ai-search] OpenAI error:', e)
    return NextResponse.json({ success: false, error: { message: '답변 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' } }, { status: 503 })
  }
}
