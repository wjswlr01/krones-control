import { NextRequest, NextResponse } from 'next/server'
import { getChunkById } from '@/lib/chunks'
import { getSummary } from '@/lib/summaries'

export const maxDuration = 60

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ''

export async function POST(req: NextRequest) {
  const { chunkId, question } = await req.json().catch(() => ({}))
  if (!chunkId || !question?.trim()) {
    return NextResponse.json({ success: false, error: { message: '입력 오류' } }, { status: 400 })
  }
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ success: false, error: { message: 'API 키 미설정' } }, { status: 500 })
  }
  const chunk = getChunkById(chunkId)
  const summary = getSummary(chunkId)
  if (!chunk || chunk.source_type !== 'pptx') {
    return NextResponse.json({ success: false, error: { message: '슬라이드 정보 없음' } }, { status: 404 })
  }
  const transcripts = summary?.raw_transcripts ?? []
  const transcriptText = transcripts.map(t => `[${t.file_name}]\n${t.text}`).join('\n---\n')

  const prompt = `당신은 Krones 라벨러 설비 전문가입니다. 강의 녹취록을 바탕으로 작업자의 질문에 친절하고 구체적으로 답변하세요.

[현재 슬라이드: ${chunk.page_title}]
${chunk.text}

[관련 강의 녹취]
${transcriptText}

[작업자 질문]
${question}

답변 규칙:
- 강의 녹취에 있는 내용 기반으로만 답변
- 녹취에 없는 내용은 "강의 녹취에는 해당 내용이 없습니다"라고 솔직히 답변
- 구체적 수치, 절차, 주의사항 위주
- 한국어로 친절하고 명확하게
- 200자 이내 간결하게

답변:`

  const MODELS = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash-lite']
  let lastError = 'AI 답변 생성 실패'
  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      })
      if (res.ok) {
        const data = await res.json()
        const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        return NextResponse.json({ success: true, data: { answer, model } })
      }
      if (res.status === 429) {
        lastError = '오늘 무료 AI 사용량을 초과했습니다. 약 1분 후 다시 시도해 주세요.'
        continue
      }
      if (res.status === 404) {
        // 모델명 변경된 경우 다음 모델로
        continue
      }
      lastError = `AI 응답 오류 (${res.status})`
      break
    } catch (e) {
      lastError = '네트워크 오류'
      continue
    }
  }
  return NextResponse.json({ success: false, error: { message: lastError } }, { status: 429 })
}
