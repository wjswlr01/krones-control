import summariesData from '@/data/slide-summaries.json'

interface RawTranscript {
  file_name: string
  text: string
  similarity: number
  chunk_id: string
}

export interface SlideSummary {
  summary: string
  sources: string[]
  raw_transcripts?: RawTranscript[]
}

const SUMMARIES = summariesData as Record<string, SlideSummary>

export function getSummary(chunkId: string): SlideSummary | null {
  return SUMMARIES[chunkId] ?? null
}
