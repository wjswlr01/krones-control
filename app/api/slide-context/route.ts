// app/api/slide-context/route.ts
// 슬라이드 제목/텍스트로 Dify Knowledge Base 검색 → 관련 강의 단락 반환
import { NextRequest, NextResponse } from 'next/server'

const DIFY_URL = process.env.NEXT_PUBLIC_DIFY_API_URL ?? 'https://api.dify.ai/v1'
const DIFY_KEY = process.env.DIFY_API_KEY ?? ''
const TIMEOUT  = 8_000

export async function POST(req: NextRequest) {
  const { query } = await req.json().catch(() => ({ query: '' }))
  if (!query?.trim()) {
    return NextResponse.json({ success: true, data: { snippets: [] } })
  }
  if (!DIFY_KEY) {
    return NextResponse.json({ success: false, error: { code: 'NO_KEY', message: 'Dify API 키 미설정', retryable: false } }, { status: 500 })
  }

  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const difyRes = await fetch(`${DIFY_URL}/chat-messages`, {
      method:  'POST',
      signal:  controller.signal,
      headers: { 'Authorization': `Bearer ${DIFY_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs:        {},
        query:         `다음 슬라이드 내용과 관련된 강의 설명을 알려주세요: ${query}`,
        response_mode: 'blocking',
        user:          'krones-control',
      }),
    })
    clearTimeout(tid)

    if (!difyRes.ok) {
      return NextResponse.json({ success: false, error: { code: String(difyRes.status), message: 'Dify 오류', retryable: difyRes.status >= 500 } }, { status: difyRes.status })
    }

    const data = await difyRes.json()
    const docs = (data?.metadata?.retrieval_model_dict ?? []) as Array<{ score: number; content: string; document: { name: string } }>

    const snippets = docs
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(d => ({
        text:   d.content,
        source: d.document?.name ?? '',
        score:  d.score,
      }))

    return NextResponse.json({
      success: true,
      data: { snippets, answer: data.answer ?? '' },
      meta: { requestId: data.message_id ?? '' },
    })
  } catch (err) {
    clearTimeout(tid)
    const isTimeout = (err as Error).name === 'AbortError'
    return NextResponse.json({
      success: false,
      error: { code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR', message: isTimeout ? '응답 시간 초과' : '네트워크 오류', retryable: true },
    }, { status: 504 })
  }
}
