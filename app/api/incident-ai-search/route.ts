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

async function generateAnswer(question: string, contexts: any[]): Promise<string> {
  const contextText = contexts.map((c, i) => `[사례 ${i+1}] (유사도 ${Math.round((c.similarity ?? 0) * 100)}%) ${c.title}\n- 공장/공정: ${c.factory}, ${c.target_process || '미지정'}\n- 설비: ${c.equipment || '미지정'}\n- 발생 원인: ${c.cause}\n- 조치 사항: ${c.action}`).join('\n\n')

  const systemPrompt = `당신은 Krones 라벨러 및 음료 제조 설비 전문가입니다. 아래는 사용자 질문과 임베딩 유사도로 검색된 과거 사례들이며, 유사도가 높아도 실제 설비/공정이 질문과 다를 수 있습니다.

1. 먼저 질문의 증상이 어느 설비/공정에서 발생하는지 판단하세요 (블로워/성형, 필러/주입기, 라벨러, 캡퍼, 컨베이어, 검사기 등).
2. 검색된 사례가 그 설비/공정과 일치하고 충분히 관련될 때만 사례 기반으로 답하세요.
3. 사례가 질문과 무관하거나(설비/공정 불일치) 유사도가 낮으면, 억지로 인용하지 말고 '과거 사례 데이터에서 정확히 일치하는 건을 찾지 못했습니다'라고 명확히 밝힌 뒤, 일반 설비 지식으로 신중히 안내하세요. 이때 해당 증상이 보통 어느 설비/공정에서 발생하는지 함께 설명하세요.
4. 추측을 사실처럼 단정하지 마세요.

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

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
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
      temperature: 0.3,
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

  const qEmb = await embedQuery(question)
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
  const lowRelevance = topSim < RELEVANCE_THRESHOLD

  const topContexts = scored.slice(0, 3)
    .map(s => { const inc = incidentMap.get(s.id); return inc ? { ...inc, similarity: s.sim } : null })
    .filter(Boolean)
  try {
    const answer = await generateAnswer(question, topContexts)
    return NextResponse.json({ success: true, data: { answer, similar, lowRelevance } })
  } catch (e) {
    console.error('[incident-ai-search] OpenAI error:', e)
    return NextResponse.json({ success: false, error: { message: '답변 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' } }, { status: 503 })
  }
}
