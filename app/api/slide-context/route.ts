import { NextRequest, NextResponse } from 'next/server'
import { getSummary } from '@/lib/summaries'

export async function POST(req: NextRequest) {
  const { chunkId } = await req.json().catch(() => ({ chunkId: '' }))
  if (!chunkId) {
    return NextResponse.json({ success: true, data: { summary: '', sources: [] } })
  }
  const result = getSummary(chunkId)
  return NextResponse.json({
    success: true,
    data: {
      summary: result?.summary ?? '',
      sources: result?.sources ?? [],
    },
  })
}
