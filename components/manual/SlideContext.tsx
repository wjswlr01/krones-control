'use client'
import { useState, useEffect, useRef } from 'react'
import type { ManualChunk } from '@/lib/types'

interface RawTranscript { file_name: string; text: string; similarity: number; chunk_id: string }
interface Message { role: 'user' | 'assistant'; text: string }
interface Props { chunk: ManualChunk | undefined }

export default function SlideContext({ chunk }: Props) {
  const [summary, setSummary] = useState('')
  const [sources, setSources] = useState<string[]>([])
  const [rawTranscripts, setRawTranscripts] = useState<RawTranscript[]>([])
  const [loading, setLoading] = useState(false)
  const [showSummary, setShowSummary] = useState(true)
  const [showRaw, setShowRaw] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chunk) return
    setLoading(true)
    setSummary(''); setSources([]); setRawTranscripts([])
    setMessages([]); setShowRaw(false); setQuestion(''); setShowSummary(true)
    fetch('/api/slide-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunkId: chunk.chunk_id }),
    })
      .then(r => r.json())
      .then(j => {
        setSummary(j.data?.summary ?? '')
        setSources(j.data?.sources ?? [])
        setRawTranscripts(j.data?.raw_transcripts ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [chunk?.chunk_id])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendQuestion = async () => {
    if (!question.trim() || asking || !chunk) return
    const userMsg: Message = { role: 'user', text: question.trim() }
    setMessages(prev => [...prev, userMsg])
    setQuestion(''); setAsking(true)
    try {
      const res = await fetch('/api/slide-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunkId: chunk.chunk_id, question: userMsg.text }),
      })
      const json = await res.json()
      if (json.success) setMessages(prev => [...prev, { role: 'assistant', text: json.data.answer }])
      else setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ ' + (json.error?.message ?? '오류') }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ 네트워크 오류' }])
    }
    setAsking(false)
  }

  if (!chunk) return <div className="px-4 py-6 text-[12px] text-faint text-center">슬라이드를 선택해 주세요.</div>
  if (loading) return (
    <div className="p-4 space-y-3 flex-1">
      <div className="h-4 rounded bg-muted animate-pulse" />
      <div className="h-4 rounded bg-muted animate-pulse w-5/6" />
    </div>
  )

  const hasContent = summary || rawTranscripts.length > 0

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 스크롤 가능한 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {summary && (
          <div className="bg-bg border border-tip/30 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-tip/5 transition-colors"
            >
              <span className="text-[11px] font-bold text-tip">💡 강사 현장 노하우</span>
              <span className="text-faint text-[11px]">{showSummary ? '▲' : '▼'}</span>
            </button>
            {showSummary && (
              <div className="px-4 pb-4 pt-1 text-[13px] text-body leading-relaxed whitespace-pre-wrap doc-prose border-t border-tip/20">
                {summary}
              </div>
            )}
          </div>
        )}

        {!hasContent && (
          <div className="text-[12px] text-faint text-center py-4">매칭되는 강의 내용이 없습니다.</div>
        )}

        {rawTranscripts.length > 0 && (
          <div>
            <button onClick={() => setShowRaw(!showRaw)}
              className="w-full text-left px-3 py-2 bg-surface hover:bg-muted border border-border rounded-lg text-[12px] font-semibold text-ink transition-colors flex items-center justify-between">
              <span>📄 강의 원문 ({rawTranscripts.length}건)</span>
              <span className="text-faint">{showRaw ? '▲' : '▼'}</span>
            </button>
            {showRaw && (
              <div className="mt-2 space-y-2">
                {rawTranscripts.map((t, i) => (
                  <details key={i} className="bg-bg border border-border rounded-lg">
                    <summary className="cursor-pointer px-3 py-2 text-[11px] font-mono text-sub hover:bg-surface flex items-center justify-between">
                      <span className="truncate">{t.file_name}</span>
                      <span className="text-faint ml-2 flex-shrink-0">유사도 {Math.round(t.similarity * 100)}%</span>
                    </summary>
                    <div className="px-3 pb-3 pt-1 text-[12px] text-body whitespace-pre-wrap leading-relaxed">{t.text}</div>
                  </details>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-semibold text-faint tracking-wider">대화</div>
            {messages.map((m, i) => (
              <div key={i} className={`text-[12px] p-2.5 rounded-lg ${m.role === 'user' ? 'bg-primary/10 text-ink' : 'bg-surface text-body'}`}>
                <div className="text-[10px] font-bold mb-1 text-faint">{m.role === 'user' ? '👤 질문' : '🤖 답변'}</div>
                <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
              </div>
            ))}
            {asking && (
              <div className="text-[12px] p-2.5 rounded-lg bg-surface text-body">
                <div className="text-[10px] font-bold mb-1 text-faint">🤖 답변</div>
                <div className="text-faint italic">답변 생성 중...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {sources.length > 0 && (
          <div className="pt-1">
            <div className="text-[10px] uppercase font-semibold text-faint tracking-wider mb-1">출처</div>
            <div className="space-y-1">
              {sources.map((s, i) => <div key={i} className="text-[11px] text-sub font-mono truncate">📁 {s}</div>)}
            </div>
          </div>
        )}
      </div>

      {/* 하단 고정 입력창 */}
      <div className="border-t border-border bg-bg p-3 flex-shrink-0">
        <div className="flex gap-2">
          <input type="text" value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !asking && sendQuestion()}
            placeholder={rawTranscripts.length > 0 ? "더 자세히 물어보세요..." : "강의 매칭 없음"}
            disabled={asking || rawTranscripts.length === 0}
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-[12px] outline-none focus:border-primary disabled:opacity-50" />
          <button onClick={sendQuestion} disabled={asking || !question.trim() || rawTranscripts.length === 0}
            className="px-3 py-2 bg-primary text-white text-[12px] font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent">
            {asking ? '...' : '전송'}
          </button>
        </div>
      </div>
    </div>
  )
}
