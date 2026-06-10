'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import AnswerMarkdown from '@/components/AnswerMarkdown'

interface SimilarCase { id: string; title: string; factory: string; equipment: string; downtime_min: number; similarity: number; is_best_practice: boolean }
interface ManualSource { chunk_id: string; file_id: string; slide: number; equipmentName: string; volumeTitle: string; slideTitle: string; summaryPreview: string; similarity: number }
interface Turn { question: string; answer: string; similar: SimilarCase[]; manualSources: ManualSource[]; lowRelevance: boolean; needsClarification?: boolean; clarifyingQuestion?: string; clarifyOptions?: string[]; modelLabel?: string; embedModel?: string }

const STORAGE_KEY = 'ai-search-thread'

function ManualList({ sources }: { sources: ManualSource[] }) {
  if (!sources || sources.length === 0) return null
  return (
    <details className="mt-3 group/manuals">
      <summary className="cursor-pointer list-none flex items-center gap-1.5 text-[12px] font-semibold text-secondary hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-[16px] transition-transform group-open/manuals:rotate-90">chevron_right</span>
        📘 관련 교육자료 {sources.length}건
      </summary>
      <div className="mt-2 space-y-2">
        {sources.map(m => (
          <Link key={m.chunk_id} href={`/manual/${m.file_id}/${m.slide}`}
            className="block bg-surface-container-lowest border border-outline-variant rounded-lg p-4 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all no-underline">
            <div className="flex items-start justify-between mb-1.5 gap-3">
              <h3 className="text-[13px] font-bold text-on-background flex-1">{m.slideTitle || m.volumeTitle || '교육자료'}</h3>
              <span className="bg-primary-container/15 text-primary text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0">유사도 {Math.round(m.similarity * 100)}%</span>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-secondary mb-2">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">precision_manufacturing</span>{m.equipmentName}</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">menu_book</span>{m.volumeTitle}</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">tag</span>슬라이드 {m.slide}</span>
            </div>
            {m.summaryPreview && <p className="text-[11.5px] text-on-surface-variant leading-snug line-clamp-2">{m.summaryPreview}…</p>}
            <span className="mt-2 inline-flex items-center gap-0.5 text-[11px] text-primary font-medium">슬라이드 보기<span className="material-symbols-outlined text-[14px]">arrow_forward</span></span>
          </Link>
        ))}
      </div>
    </details>
  )
}

function CaseList({ similar, lowRelevance }: { similar: SimilarCase[]; lowRelevance: boolean }) {
  if (!similar || similar.length === 0) return null
  return (
    <details className="mt-3 group/cases">
      <summary className="cursor-pointer list-none flex items-center gap-1.5 text-[12px] font-semibold text-secondary hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-[16px] transition-transform group-open/cases:rotate-90">chevron_right</span>
        📑 참고한 사례 {similar.length}건
      </summary>
      <div className="mt-2 space-y-2">
        {lowRelevance && (
          <div className="bg-tertiary-fixed/40 border border-tertiary-container/40 rounded-lg p-2.5 text-[11px] text-on-tertiary-container flex items-start gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-tertiary-container flex-shrink-0">warning</span>
            <span>질문과 직접 관련된 사례가 충분치 않을 수 있습니다. 아래는 참고용입니다.</span>
          </div>
        )}
        {similar.map(c => (
          <Link key={c.id} href={`/incidents/${c.id}`}
            className="block bg-surface-container-lowest border border-outline-variant rounded-lg p-4 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all no-underline">
            <div className="flex items-start justify-between mb-2 gap-3">
              <h3 className="text-[13px] font-bold text-on-background flex-1">{c.title}</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.is_best_practice && <span className="bg-tertiary-container/15 text-tertiary-container text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1"><span className="material-symbols-outlined text-[11px]">star</span>모범사례</span>}
                <span className="bg-primary-container/15 text-primary text-[10px] font-semibold px-2 py-0.5 rounded">유사도 {Math.round(c.similarity * 100)}%</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-secondary">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">tag</span>{c.id}</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">factory</span>{c.factory}</span>
              {c.equipment && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">precision_manufacturing</span>{c.equipment}</span>}
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">timer</span>{c.downtime_min}분</span>
            </div>
          </Link>
        ))}
      </div>
    </details>
  )
}

export default function AiSearchClient({ count }: { count: number }) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState<string | null>(null)   // 답변 대기 중인 내 질문
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY)
      if (cached) { const data = JSON.parse(cached); if (Array.isArray(data)) setTurns(data) }
    } catch {}
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [turns, pending])

  const ask = async (q?: string) => {
    const query = (q ?? question).trim()
    if (!query || loading) return
    setLoading(true); setPending(query); setQuestion(''); setError('')
    // 되묻기 turn은 answer 대신 clarifyingQuestion을 컨텍스트로 전달 + clarify 플래그(루프 방지)
    const history = turns.map(t => t.needsClarification
      ? { question: t.question, answer: t.clarifyingQuestion ?? '', clarify: true }
      : { question: t.question, answer: t.answer })
    try {
      const res = await fetch('/api/incident-ai-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query, history }),
      })
      const json = await res.json()
      if (json.success) {
        const d = json.data
        const turn: Turn = d.needsClarification
          ? { question: query, answer: '', similar: [], manualSources: [], lowRelevance: false,
              needsClarification: true, clarifyingQuestion: d.clarifyingQuestion ?? '', clarifyOptions: d.clarifyOptions ?? [] }
          : { question: query, answer: d.answer, similar: d.similar ?? [], manualSources: d.manualSources ?? [], lowRelevance: !!d.lowRelevance, modelLabel: d.modelLabel, embedModel: d.embedModel }
        setTurns(prev => {
          const next = [...prev, turn]
          try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
          return next
        })
      } else {
        setError(json.error?.message ?? '검색 실패'); setQuestion(query)
      }
    } catch { setError('네트워크 오류'); setQuestion(query) }
    setPending(null); setLoading(false)
  }

  const reset = () => {
    setTurns([]); setQuestion(''); setError(''); setPending(null)
    try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
  }

  const examples = [
    '글루 롤러에 라벨이 자꾸 말려요',
    '어셉틱 충전부 넥 찍힘/성형 불량 원인',
    '블로워 프리폼 성형 불량 점검 포인트',
    'E-Stop 발생 후 초기화 시 센서 오작동 대처 방안',
  ]
  const empty = turns.length === 0 && !pending

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[900px] mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* 브레드크럼 */}
        <nav className="hidden md:flex items-center gap-2 text-[13px] text-secondary mb-6">
          <Link href="/" className="hover:text-primary no-underline">홈</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <Link href="/incidents" className="hover:text-primary no-underline">이상발생보고</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-background font-semibold">AI 사례검색</span>
        </nav>

        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 mb-6 md:mb-8">
          <div className="text-center md:text-left flex-1">
            <div className="text-[44px] leading-none mb-2 md:hidden">🤖</div>
            <h1 className="font-headline text-[24px] md:text-[28px] font-bold text-on-background mb-2 flex items-center gap-3 justify-center md:justify-start">
              <span className="hidden md:inline">🤖</span>AI 사례검색
            </h1>
            <p className="text-[14px] text-secondary">설비 이상발생 사례 {count.toLocaleString()}건에서 AI가 답을 찾아드립니다. 이어서 후속 질문도 가능합니다.</p>
          </div>
          {!empty && (
            <button onClick={reset}
              className="flex-shrink-0 text-[12px] text-secondary hover:text-primary transition-colors flex items-center gap-1 border border-outline-variant rounded-full px-3 py-1.5 hover:border-primary/40">
              <span className="material-symbols-outlined text-[16px]">add_comment</span>새 대화
            </button>
          )}
        </div>

        {/* 추천 질문: 빈 대화에서만 */}
        {empty && (
          <div className="mb-6">
            <h3 className="text-[12px] font-semibold text-secondary mb-3 uppercase tracking-wider">추천 질문</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {examples.map(ex => (
                <button key={ex} onClick={() => ask(ex)}
                  className="flex items-center gap-3 text-left bg-surface-container-lowest border border-outline-variant rounded-lg p-4 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all group">
                  <span className="material-symbols-outlined text-[20px] text-primary flex-shrink-0">chat_bubble</span>
                  <p className="text-[13px] text-on-background group-hover:text-primary transition-colors">{ex}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 대화 스레드 */}
        <div className="space-y-6">
          {turns.map((t, i) => (
            <div key={i} className="space-y-3">
              {/* 내 질문 */}
              <div className="flex justify-end">
                <div className="bg-primary text-on-primary rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] text-[14px] whitespace-pre-wrap leading-relaxed shadow-sm">{t.question}</div>
              </div>
              {t.needsClarification ? (
                /* 진단형 되묻기: 답변/사례카드 대신 추가 정보 요청 */
                <div className="bg-primary-container/15 border-l-4 border-primary rounded-r-xl p-5 shadow-sm">
                  <h2 className="font-headline text-[15px] font-bold text-primary flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[18px]">help</span>좀 더 정확히 찾을게요
                  </h2>
                  <div className="text-[14px] text-on-background leading-relaxed mb-3">{t.clarifyingQuestion}</div>
                  {t.clarifyOptions && t.clarifyOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {t.clarifyOptions.map(opt => {
                        const isLast = i === turns.length - 1
                        return (
                          <button key={opt} onClick={() => ask(opt)} disabled={loading || !isLast}
                            className="text-[13px] px-3.5 py-1.5 rounded-full border border-primary/40 text-primary bg-surface-container-lowest hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <p className="text-[11.5px] text-secondary mt-3 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    직접 입력해도 됩니다. 바로 답을 원하면 “그냥 답해줘”라고 보내세요.
                  </p>
                </div>
              ) : (
                /* AI 답변 */
                <div className="bg-tertiary-fixed/40 border-l-4 border-tertiary-container rounded-r-xl p-5 shadow-sm">
                  <h2 className="font-headline text-[15px] font-bold text-on-tertiary-container flex items-center gap-2 flex-wrap mb-2">
                    🤖 AI 답변
                    {t.lowRelevance && (
                      <span className="text-[11px] font-semibold text-tertiary bg-tertiary-fixed/70 border border-tertiary-container/40 px-2 py-0.5 rounded-full flex items-center gap-1">💡 일반 참고 · 사례 근거 아님</span>
                    )}
                  </h2>
                  <div className="text-[14px] text-on-surface-variant leading-relaxed">
                    <AnswerMarkdown>{t.answer}</AnswerMarkdown>
                  </div>
                  <ManualList sources={t.manualSources} />
                  <CaseList similar={t.similar} lowRelevance={t.lowRelevance} />
                  {t.modelLabel && (
                    <div className="mt-3 pt-2 border-t border-outline-variant/40 text-[10.5px] text-secondary/60 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">bolt</span>
                      {t.modelLabel}으로 생성{t.embedModel && <span className="text-secondary/40"> · 검색 {t.embedModel}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* 대기 중 turn */}
          {pending && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <div className="bg-primary text-on-primary rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] text-[14px] whitespace-pre-wrap leading-relaxed shadow-sm">{pending}</div>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-[13px] text-secondary">질문 분석 중... (필요 시 추가 정보를 여쭤볼 수 있어요)</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-error-container border border-error/20 rounded-lg p-4 mt-4 text-[13px] text-on-error-container flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>{error}
          </div>
        )}

        <div ref={endRef} />

        {/* 하단 고정 입력창 */}
        <div className="sticky bottom-0 mt-6 pt-2 pb-1 bg-gradient-to-t from-background via-background to-transparent">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
            <textarea value={question} onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
              placeholder={turns.length ? '이어서 후속 질문... (예: 그럼 조치 방법은?)' : '예: 어셉틱 충전부 넥 찍힘 현상 원인과 조치는?'}
              disabled={loading}
              rows={1}
              className="w-full bg-transparent border-none focus:ring-0 text-[14px] text-on-background placeholder:text-outline resize-none max-h-[140px] min-h-[24px] outline-none" />
            <div className="flex items-center justify-between border-t border-outline-variant pt-2 mt-2">
              <span className="text-[12px] text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">keyboard_return</span>
                Enter 전송<span className="hidden sm:inline"> · Shift+Enter 줄바꿈</span>
              </span>
              <button onClick={() => ask()} disabled={loading || !question.trim()}
                className="bg-primary text-on-primary px-5 py-2 rounded-full text-[13px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm">
                {loading ? '생성 중...' : <><span className="material-symbols-outlined text-[18px]">send</span>전송</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
