import { NextRequest, NextResponse } from 'next/server'
import { getChunkById } from '@/lib/chunks'
import { getSummary } from '@/lib/summaries'

export const maxDuration = 60

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? ''

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
  const { chunkId, question } = await req.json().catch(() => ({}))
  if (!chunkId || !question?.trim()) {
    return NextResponse.json({ success: false, error: { message: '입력 오류' } }, { status: 400 })
  }
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ success: false, error: { message: 'API 키 미설정' } }, { status: 500 })
  }
  const chunk = getChunkById(chunkId)
  const summary = getSummary(chunkId)
  if (!chunk || chunk.source_type !== 'pptx') {
    return NextResponse.json({ success: false, error: { message: '슬라이드 정보 없음' } }, { status: 404 })
  }
  const transcripts = summary?.raw_transcripts ?? []
  const transcriptText = transcripts.map(t => `[${t.file_name}]\n${t.text}`).join('\n---\n')

  const systemPrompt = `당신은 Krones 라벨러 설비 전문가입니다. 강의 녹취록을 바탕으로 작업자의 질문에 친절하고 구체적으로 답변하세요.

답변 규칙:
- 강의 녹취에 있는 내용 기반으로만 답변
- 녹취에 없는 내용은 "강의 녹취에는 해당 내용이 없습니다"라고 솔직히 답변
- 구체적 수치, 절차, 주의사항 위주
- 한국어로 친절하고 명확하게
- 200자 이내 간결하게`

  const userPrompt = `[현재 슬라이드: ${chunk.page_title}]
${chunk.text}

[관련 강의 녹취]
${transcriptText}

[작업자 질문]
${question}`

  try {
    const answer = await callOpenAI(systemPrompt, userPrompt)
    return NextResponse.json({ success: true, data: { answer, model: 'gpt-5.4-mini' } })
  } catch (e) {
    console.error('[slide-ask] OpenAI error:', e)
    return NextResponse.json({ success: false, error: { message: '답변 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' } }, { status: 503 })
  }
}
