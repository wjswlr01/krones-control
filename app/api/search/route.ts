export const maxDuration = 60
// app/api/search/route.ts
// 통합 검색: 로컬 PPTX 청크 + Dify 강의 RAG 동시 조회
import { NextRequest, NextResponse } from 'next/server'
import { searchChunksLocal } from '@/lib/chunks'

const DIFY_URL = process.env.NEXT_PUBLIC_DIFY_API_URL ?? 'https://api.dify.ai/v1'
const DIFY_KEY = process.env.DIFY_API_KEY ?? ''
const TIMEOUT  = 50_000

async function difySearch(query: string) {
  if (!DIFY_KEY) return { answer: '', docs: [] }
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    const res = await fetch(`${DIFY_URL}/chat-messages`, {
      method: 'POST', signal: controller.signal,
      headers: { 'Authorization': `Bearer ${DIFY_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: {}, query, response_mode: 'blocking', user: 'krones-control' }),
    })
    clearTimeout(tid)
    if (!res.ok) return { answer: '', docs: [] }
    const data = await res.json()
    return {
      answer: String(data.answer ?? ''),
      docs:   (data?.metadata?.retrieval_model_dict ?? []) as Array<{ score: number; content: string; document: { name: string } }>,
    }
  } catch {
    clearTimeout(tid)
    return { answer: '', docs: [] }
  }
}

export async function POST(req: NextRequest) {
  const { q } = await req.json().catch(() => ({ q: '' }))
  if (!q?.trim()) {
    return NextResponse.json({
      success: false,
      error: { code: 'EMPTY', message: '검색어를 입력해 주세요.', retryable: false }
    }, { status: 400 })
  }

  const t0 = Date.now()

  // 병렬 실행
  const [difyResult, localChunks] = await Promise.all([
    difySearch(q),
    Promise.resolve(searchChunksLocal(q, 30)),
  ])

  // 매뉴얼 슬라이드 hit 변환
  const manualHits = localChunks.map(c => ({
    source:     'manual' as const,
    title:      c.page_title || `슬라이드 ${c.slide_number}`,
    snippet:    c.text.slice(0, 200) + (c.text.length > 200 ? '…' : ''),
    score:      1.0,
    href:       `/manual/${c.file_id}/${c.slide_number}`,
    imageUrl:   c.slide_image_url,
    file_name:  c.file_name,
    page_title: c.page_title,
  }))

  // 강의 노트 hit 변환
  const lectureHits = difyResult.docs.map(d => ({
    source:    'lecture' as const,
    title:     d.document?.name ?? '강의 녹취',
    snippet:   d.content.slice(0, 250) + (d.content.length > 250 ? '…' : ''),
    score:     d.score,
    file_name: d.document?.name ?? '',
  }))

  return NextResponse.json({
    success: true,
    data: {
      answer:  difyResult.answer,
      hits:    [...manualHits, ...lectureHits],
      manualCount:  manualHits.length,
      lectureCount: lectureHits.length,
      latency: Date.now() - t0,
    },
  })
}
