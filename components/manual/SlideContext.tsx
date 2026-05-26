'use client'
import { useState, useEffect } from 'react'
import type { ManualChunk } from '@/lib/types'

interface Props { chunk: ManualChunk | undefined }

export default function SlideContext({ chunk }: Props) {
  const [summary, setSummary] = useState('')
  const [sources, setSources] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!chunk) return
    setLoading(true)
    setSummary('')
    setSources([])
    fetch('/api/slide-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunkId: chunk.chunk_id }),
    })
      .then(r => r.json())
      .then(j => {
        setSummary(j.data?.summary ?? '')
        setSources(j.data?.sources ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [chunk?.chunk_id])

  if (!chunk) {
    return <div className="px-4 py-6 text-[12px] text-faint text-center">슬라이드를 선택해 주세요.</div>
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-4 rounded bg-muted animate-pulse" />
        <div className="h-4 rounded bg-muted animate-pulse w-5/6" />
        <div className="h-4 rounded bg-muted animate-pulse w-4/6" />
      </div>
    )
  }

  if (!summary) {
    return <div className="px-4 py-6 text-[12px] text-faint text-center">매칭되는 강의 내용이 없습니다.</div>
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-bg border border-tip/30 rounded-lg p-4">
        <div className="flex items-center gap-1 mb-2">
          <span className="text-[11px] font-bold text-tip">💡 강사 현장 노하우</span>
        </div>
        <div className="text-[13px] text-body leading-relaxed whitespace-pre-wrap doc-prose">
          {summary}
        </div>
      </div>
      {sources.length > 0 && (
        <div>
          <div className="text-[10px] uppercase font-semibold text-faint tracking-wider mb-2">출처</div>
          <div className="space-y-1">
            {sources.map((s, i) => (
              <div key={i} className="text-[11px] text-sub font-mono truncate">📁 {s}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
