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

  if (!chunk) return <div className="px-4 py-6 text-[12px] text-outline text-center">슬라이드를 선택해 주세요.</div>
  if (loading) return (
    <div className="p-4 space-y-3 flex-1">
      <div className="h-4 rounded bg-surface-container-high animate-pulse" />
      <div className="h-4 rounded bg-surface-container-high animate-pulse w-5/6" />
    </div>
  )

  const hasContent = summary || rawTranscripts.length > 0

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 스크롤 가능한 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {summary && (
          <div className="bg-tertiary-fixed/30 border-l-4 border-tertiary-container rounded-r-lg overflow-hidden">
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-tertiary-fixed/40 transition-colors"
            >
              <span className="text-[12px] font-bold text-on-tertiary-container flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">lightbulb</span>강사 현장 노하우
              </span>
              <span className="material-symbols-outlined text-on-tertiary-container text-[18px]">{showSummary ? 'expand_less' : 'expand_more'}</span>
            </button>
            {showSummary && (
              <div className="px-4 pb-4 pt-1 text-[13px] text-on-surface-variant leading-relaxed whitespace-pre-wrap doc-prose border-t border-tertiary-container/20">
                {summary}
              </div>
            )}
          </div>
        )}

        {!hasContent && (
          <div className="text-[12px] text-outline text-center py-4">매칭되는 강의 내용이 없습니다.</div>
        )}

        {rawTranscripts.length > 0 && (
          <div>
            <button onClick={() => setShowRaw(!showRaw)}
              className="w-full text-left px-3 py-2.5 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant rounded-xl text-[12px] font-semibold text-on-background transition-colors flex items-center justify-between">
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">description</span>강의 원문 ({rawTranscripts.length}건)</span>
              <span className="material-symbols-outlined text-secondary text-[18px]">{showRaw ? 'expand_less' : 'expand_more'}</span>
            </button>
            {showRaw && (
              <div className="mt-2 space-y-2">
                {rawTranscripts.map((t, i) => (
                  <details key={i} className="bg-surface-container-low border border-outline-variant rounded-xl">
                    <summary className="cursor-pointer px-3 py-2 text-[11px] font-mono text-secondary hover:bg-surface-container-high rounded-xl flex items-center justify-between transition-colors">
                      <span className="truncate">{t.file_name}</span>
                      <span className="text-outline ml-2 flex-shrink-0">유사도 {Math.round(t.similarity * 100)}%</span>
                    </summary>
                    <div className="px-3 pb-3 pt-1 text-[12px] text-on-surface-variant whitespace-pre-wrap leading-relaxed">{t.text}</div>
                  </details>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-semibold text-outline tracking-wider">대화</div>
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`text-[12px] p-3 max-w-[90%] ${m.role === 'user' ? 'bg-primary text-on-primary rounded-2xl rounded-tr-sm' : 'bg-surface-container-low border border-outline-variant/50 text-on-surface-variant rounded-2xl rounded-tl-sm'}`}>
                  <div className={`text-[10px] font-bold mb-1 flex items-center gap-1 ${m.role === 'user' ? 'text-on-primary/70' : 'text-outline'}`}>
                    <span className="material-symbols-outlined text-[12px]">{m.role === 'user' ? 'person' : 'smart_toy'}</span>
                    {m.role === 'user' ? '질문' : '답변'}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                </div>
              </div>
            ))}
            {asking && (
              <div className="flex justify-start">
                <div className="text-[12px] p-3 rounded-2xl rounded-tl-sm bg-surface-container-low border border-outline-variant/50 text-on-surface-variant">
                  <div className="text-[10px] font-bold mb-1 text-outline flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">smart_toy</span>답변</div>
                  <div className="text-outline italic">답변 생성 중...</div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {sources.length > 0 && (
          <div className="pt-1">
            <div className="text-[10px] uppercase font-semibold text-outline tracking-wider mb-1">출처</div>
            <div className="space-y-1">
              {sources.map((s, i) => <div key={i} className="text-[11px] text-secondary font-mono truncate flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">folder</span>{s}</div>)}
            </div>
          </div>
        )}
      </div>

      {/* 하단 고정 입력창 */}
      <div className="border-t border-outline-variant bg-surface-container-lowest p-3 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!asking) sendQuestion() } }}
            placeholder={rawTranscripts.length > 0 ? "더 자세히 물어보세요..." : "강의 매칭 없음"}
            rows={1}
            disabled={asking || rawTranscripts.length === 0}
            className="flex-1 px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-[12px] text-on-background outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none disabled:opacity-50 transition-all" />
          <button onClick={sendQuestion} disabled={asking || !question.trim() || rawTranscripts.length === 0}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-primary text-on-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors">
            <span className="material-symbols-outlined text-[18px]">{asking ? 'hourglass_empty' : 'send'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
