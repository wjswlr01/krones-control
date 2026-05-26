import summariesData from '@/data/slide-summaries.json'

interface SlideSummary { summary: string; sources: string[] }
const SUMMARIES = summariesData as Record<string, SlideSummary>

export function getSummary(chunkId: string): SlideSummary | null {
  return SUMMARIES[chunkId] ?? null
}
