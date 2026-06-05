'use client'
import { useState, useEffect, useRef } from 'react'
import type { ManualChunk } from '@/lib/types'
import AnswerMarkdown from '@/components/AnswerMarkdown'

// 모바일 슬라이드 뷰어용 탭 패널.
// 데스크톱 SlideContext.tsx와 동일한 API(slide-context / slide-ask)·데이터를 재사용하되,
// 슬라이드 정보 / 강의 노트 / AI 질문 3개 탭으로 분리해 보여준다.
interface RawTranscript { file_name: string; text: string; similarity: number; chunk_id: string }
interface Message { role: 'user' | 'assistant'; text: string }
type TabKey = 'info' | 'notes' | 'chat'

export default function SlideContextTabs({ chunk }: { chunk: ManualChunk | undefined }) {
  const [summary, setSummary] = useState('')
  const [rawTranscripts, setRawTranscripts] = useState<RawTranscript[]>([])
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [tab, setTab] = useState<TabKey>('notes')
  const [openRaw, setOpenRaw] = useState<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chunk) return
    setLoading(true)
    setSummary(''); setRawTranscripts([]); setMessages([]); setQuestion(''); setOpenRaw(null)
    fetch('/api/slide-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunkId: chunk.chunk_id }),
    })
      .then(r => r.json())
      .then(j => { setSummary(j.data?.summary ?? ''); setRawTranscripts(j.data?.raw_transcripts ?? []) })
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

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'info', label: '슬라이드 정보' },
    { key: 'notes', label: '강의 노트' },
    { key: 'chat', label: 'AI 질문' },
  ]

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 세그먼트 탭 */}
      <div className="flex gap-1 p-1 mx-3 mt-3 mb-1 bg-surface-container rounded-xl flex-shrink-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 text-[12px] font-semibold py-2 rounded-lg transition-colors ${tab === t.key ? 'bg-surface shadow-sm text-primary' : 'text-on-surface-variant'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-2 min-h-0">
        {loading && (
          <div className="space-y-3 pt-1">
            <div className="h-4 rounded bg-surface-container-high animate-pulse" />
            <div className="h-4 rounded bg-surface-container-high animate-pulse w-5/6" />
          </div>
        )}

        {!loading && tab === 'info' && (
          chunk?.text
            ? <div className="doc-prose whitespace-pre-wrap text-[13px] text-on-surface-variant leading-relaxed">{chunk.text}</div>
            : <div className="text-[12px] text-outline text-center py-8">슬라이드 텍스트가 없습니다.</div>
        )}

        {!loading && tab === 'notes' && (
          <div className="space-y-3">
            {summary && (
              <div className="bg-tertiary-fixed/30 border-l-4 border-tertiary-container rounded-r-lg p-4">
                <div className="text-[12px] font-bold text-on-tertiary-container flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[16px]">lightbulb</span>강사 현장 노하우
                </div>
                <div className="text-[13px] text-on-surface-variant leading-relaxed whitespace-pre-wrap doc-prose">{summary}</div>
              </div>
            )}
            {rawTranscripts.length > 0 ? (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">description</span>강의 원문 ({rawTranscripts.length}건)
                </div>
                {rawTranscripts.map((t, i) => (
                  <button key={i} onClick={() => setOpenRaw(openRaw === i ? null : i)}
                    className="w-full text-left bg-surface-container-low border border-outline-variant rounded-xl p-3 transition-colors hover:bg-surface-container-high">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-secondary truncate">{t.file_name}</span>
                      <span className="text-[11px] text-outline flex-shrink-0">유사도 {Math.round(t.similarity * 100)}%</span>
                    </div>
                    <div className={`text-[12px] text-on-surface-variant whitespace-pre-wrap leading-relaxed mt-2 ${openRaw === i ? '' : 'line-clamp-2'}`}>{t.text}</div>
                  </button>
                ))}
              </div>
            ) : (!summary && <div className="text-[12px] text-outline text-center py-8">매칭되는 강의 내용이 없습니다.</div>)}
          </div>
        )}

        {!loading && tab === 'chat' && (
          <div className="space-y-2">
            {messages.length === 0 && !asking && (
              <div className="text-[12px] text-outline text-center py-8">슬라이드 내용을 자유롭게 질문해 보세요.</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`text-[12px] p-3 max-w-[90%] ${m.role === 'user' ? 'bg-primary text-on-primary rounded-2xl rounded-tr-sm' : 'bg-surface-container-low border border-outline-variant/50 text-on-surface-variant rounded-2xl rounded-tl-sm'}`}>
                  <div className={`text-[10px] font-bold mb-1 flex items-center gap-1 ${m.role === 'user' ? 'text-on-primary/70' : 'text-outline'}`}>
                    <span className="material-symbols-outlined text-[12px]">{m.role === 'user' ? 'person' : 'smart_toy'}</span>
                    {m.role === 'user' ? '질문' : '답변'}
                  </div>
                  {m.role === 'assistant'
                    ? <div className="leading-relaxed"><AnswerMarkdown>{m.text}</AnswerMarkdown></div>
                    : <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>}
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
      </div>

      {/* AI 질문 입력창 (chat 탭에서만) */}
      {tab === 'chat' && (
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
      )}
    </div>
  )
}
