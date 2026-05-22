'use client'
// components/manual/SlideContext.tsx
import { useState, useEffect } from 'react'
import type { SlideChunk } from '@/lib/types'

interface LectureSnippet {
  text:   string
  source: string
  score:  number
}

interface SlideContextProps {
  chunk: SlideChunk | undefined
}

export default function SlideContext({ chunk }: SlideContextProps) {
  const [snippets, setSnippets] = useState<LectureSnippet[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string>('')

  useEffect(() => {
    if (!chunk) return
    const timer = setTimeout(() => {
      setLoading(true)
      setError('')
      setSnippets([])
      const query = chunk.page_title || chunk.text.slice(0, 100)
      fetch('/api/slide-context', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query, chunkId: chunk.chunk_id }),
      })
        .then(r => r.json())
        .then(j => {
          if (j.success) setSnippets(j.data?.snippets ?? [])
          else setError(j.error?.message ?? '강의 노트 조회 실패')
        })
        .catch(() => setError('네트워크 오류'))
        .finally(() => setLoading(false))
    }, 500)
    return () => clearTimeout(timer)
  }, [chunk?.chunk_id])

  if (!chunk) {
    return (
      <div className="px-4 py-6 text-[12px] text-faint text-center">
        슬라이드를 선택해 주세요.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-6 text-[12px] text-danger text-center">
        ⚠️ {error}
      </div>
    )
  }

  if (snippets.length === 0) {
    return (
      <div className="px-4 py-6 text-[12px] text-faint text-center">
        이 슬라이드와 매칭되는 강의 내용이 없습니다.
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3">
      {snippets.map((s, i) => (
        <div key={i} className="bg-bg border border-border rounded-lg p-3">
          <div className="flex items-center gap-1 mb-2">
            <span className="text-[10px] font-bold text-tip">💡 강사 녹취</span>
            <span className="text-[10px] text-faint font-mono ml-auto">
              {Math.round(s.score * 100)}%
            </span>
          </div>
          <p className="text-[12px] text-body leading-relaxed line-clamp-6">
            {s.text}
          </p>
          {s.source && (
            <p className="text-[10px] text-faint mt-2 font-mono truncate">
              📁 {s.source}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
