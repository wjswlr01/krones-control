import { NextRequest, NextResponse } from 'next/server'
import { getChunkById, findTranscriptForSlide } from '@/lib/chunks'

export async function POST(req: NextRequest) {
  const { chunkId, query } = await req.json().catch(() => ({ chunkId: '', query: '' }))

  let slideText = ''
  let slideTitle = ''

  if (chunkId) {
    const chunk = getChunkById(chunkId)
    if (chunk && chunk.source_type === 'pptx') {
      slideText = chunk.text
      slideTitle = chunk.page_title
    }
  }
  if (!slideText && query) {
    slideTitle = query
  }

  const matches = findTranscriptForSlide(slideText, slideTitle, 4)

  const snippets = matches.map(m => ({
    text:   m.text,
    source: m.file_name,
    score:  1.0,
  }))

  return NextResponse.json({
    success: true,
    data: { snippets, answer: '' },
  })
}
