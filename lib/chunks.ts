// lib/chunks.ts
// chunks.json (152개 PPTX 슬라이드 청크)에 대한 접근자
import chunksData from '@/data/chunks.json'
import type { SlideChunk } from './types'

const ALL_CHUNKS = chunksData as SlideChunk[]

export const getChunksByFile = (fileId: string): SlideChunk[] =>
  ALL_CHUNKS.filter(c => c.file_id === fileId).sort((a, b) => a.slide_number - b.slide_number)

export const getChunk = (fileId: string, slideNumber: number): SlideChunk | undefined =>
  ALL_CHUNKS.find(c => c.file_id === fileId && c.slide_number === slideNumber)

export const getChunkById = (chunkId: string): SlideChunk | undefined =>
  ALL_CHUNKS.find(c => c.chunk_id === chunkId)

export const searchChunksLocal = (query: string, limit = 20): SlideChunk[] => {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return ALL_CHUNKS
    .filter(c =>
      c.text.toLowerCase().includes(q) ||
      c.page_title.toLowerCase().includes(q)
    )
    .slice(0, limit)
}

export const allChunks = () => ALL_CHUNKS
