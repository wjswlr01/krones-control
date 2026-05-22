import chunksData from '@/data/chunks.json'
import type { SlideChunk, ManualChunk, TranscriptChunk } from './types'

const ALL_CHUNKS = chunksData as SlideChunk[]

export const isManual     = (c: SlideChunk): c is ManualChunk     => c.source_type === 'pptx'
export const isTranscript = (c: SlideChunk): c is TranscriptChunk => c.source_type === 'transcript'

export const getChunksByFile = (fileId: string): ManualChunk[] =>
  ALL_CHUNKS.filter(isManual).filter(c => c.file_id === fileId).sort((a, b) => a.slide_number - b.slide_number)

export const getChunk = (fileId: string, slideNumber: number): ManualChunk | undefined =>
  ALL_CHUNKS.filter(isManual).find(c => c.file_id === fileId && c.slide_number === slideNumber)

export const getChunkById = (chunkId: string): SlideChunk | undefined =>
  ALL_CHUNKS.find(c => c.chunk_id === chunkId)

// 단순 키워드 점수 (각 키워드 매칭당 +1)
function scoreText(text: string, keywords: string[]) {
  const lower = text.toLowerCase()
  return keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0)
}

export const searchChunksLocal = (query: string, limit = 30): SlideChunk[] => {
  if (!query.trim()) return []
  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (keywords.length === 0) return []
  const scored = ALL_CHUNKS
    .map(c => ({ chunk: c, score: scoreText(c.text + ' ' + c.page_title, keywords) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(s => s.chunk)
}

// 슬라이드 컨텍스트용: 매뉴얼 청크의 텍스트로 녹취록 청크 검색
export const findTranscriptForSlide = (slideText: string, slideTitle: string, limit = 4): TranscriptChunk[] => {
  const text = (slideTitle + ' ' + slideText).toLowerCase()
  // 슬라이드 텍스트에서 의미있는 한글 키워드 추출 (2글자 이상)
  const words = Array.from(new Set(
    text.match(/[가-힣]{2,}|[a-zA-Z]{3,}/g) ?? []
  )).filter(w => !['그리고','하지만','그러나','때문에','그래서','이것은','이렇게'].includes(w))

  if (words.length === 0) return []

  const transcripts = ALL_CHUNKS.filter(isTranscript)
  const scored = transcripts.map(c => {
    const t = c.text.toLowerCase()
    const score = words.reduce((acc, w) => acc + (t.includes(w) ? w.length : 0), 0)
    return { chunk: c, score }
  }).filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map(s => s.chunk)
}

export const allChunks = () => ALL_CHUNKS
