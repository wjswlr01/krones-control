import { NextRequest, NextResponse } from 'next/server'
import { searchChunksLocal, isManual, isTranscript } from '@/lib/chunks'

export async function POST(req: NextRequest) {
  const { q } = await req.json().catch(() => ({ q: '' }))
  if (!q?.trim()) {
    return NextResponse.json({
      success: false,
      error: { code: 'EMPTY', message: '검색어를 입력해 주세요.', retryable: false }
    }, { status: 400 })
  }

  const t0 = Date.now()
  const results = searchChunksLocal(q, 40)

  const manualHits = results.filter(isManual).map(c => ({
    source:     'manual' as const,
    title:      c.page_title || `슬라이드 ${c.slide_number}`,
    snippet:    c.text.slice(0, 200) + (c.text.length > 200 ? '…' : ''),
    score:      1.0,
    href:       `/manual/${c.file_id}/${c.slide_number}`,
    imageUrl:   c.slide_image_url,
    file_name:  c.file_name,
    page_title: c.page_title,
  }))

  const lectureHits = results.filter(isTranscript).map(c => ({
    source:    'lecture' as const,
    title:     c.page_title,
    snippet:   c.text.slice(0, 250) + (c.text.length > 250 ? '…' : ''),
    score:     1.0,
    file_name: c.file_name,
  }))

  return NextResponse.json({
    success: true,
    data: {
      answer:       '',
      hits:         [...manualHits, ...lectureHits],
      manualCount:  manualHits.length,
      lectureCount: lectureHits.length,
      latency:      Date.now() - t0,
    },
  })
}
