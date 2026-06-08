'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AnswerMarkdown from '@/components/AnswerMarkdown'

interface SimilarCase { id: string; title: string; factory: string; equipment: string; downtime_min: number; similarity: number; is_best_practice: boolean }

export default function AiSearchPage() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [similar, setSimilar] = useState<SimilarCase[]>([])
  const [lowRelevance, setLowRelevance] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('ai-search-result')
      if (cached) {
        const data = JSON.parse(cached)
        if (data.question) setQuestion(data.question)
        if (data.answer) setAnswer(data.answer)
        if (data.similar) setSimilar(data.similar)
        if (data.lowRelevance) setLowRelevance(data.lowRelevance)
      }
    } catch {}
  }, [])

  const search = async (q?: string) => {
    const query = (q ?? question).trim()
    if (!query || loading) return
    setLoading(true); setAnswer(''); setSimilar([]); setLowRelevance(false); setError('')
    try {
      const res = await fetch('/api/incident-ai-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      })
      const json = await res.json()
      if (json.success) {
        setAnswer(json.data.answer)
        setSimilar(json.data.similar)
        setLowRelevance(!!json.data.lowRelevance)
        try {
          sessionStorage.setItem('ai-search-result', JSON.stringify({
            question: query,
            answer: json.data.answer,
            similar: json.data.similar,
            lowRelevance: !!json.data.lowRelevance,
          }))
        } catch {}
      }
      else setError(json.error?.message ?? '검색 실패')
    } catch { setError('네트워크 오류') }
    setLoading(false)
  }

  const examples = [
    '글루 롤러에 라벨이 자꾸 말려요',
    'Krones 라벨러 커터 나이프 교체 주기와 마모 확인 방법',
    'E-Stop 발생 후 초기화 시 센서 오작동 대처 방안',
    '특정 롯트의 페트병에서만 라벨 찌그러짐 현상',
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* 브레드크럼: 데스크톱만 */}
        <nav className="hidden md:flex items-center gap-2 text-[13px] text-secondary mb-6">
          <Link href="/" className="hover:text-primary no-underline">홈</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <Link href="/incidents" className="hover:text-primary no-underline">이상발생보고</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-background font-semibold">AI 사례검색</span>
        </nav>

        {/* 헤더: 모바일 중앙 / 데스크톱 좌측 */}
        <div className="text-center md:text-left mb-6 md:mb-8">
          <div className="text-[44px] leading-none mb-2 md:hidden">🤖</div>
          <h1 className="font-headline text-[24px] md:text-[28px] font-bold text-on-background mb-2 flex items-center gap-3 justify-center md:justify-start">
            <span className="hidden md:inline">🤖</span>AI 사례검색
          </h1>
          <p className="text-[14px] text-secondary">라벨러 관련 트러블 사례 294건에서 AI가 답을 찾아드립니다.</p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm mb-8 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
          <textarea value={question} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); search() } }}
            placeholder="예: 라벨러 글루 롤러에 라벨이 말려서 에러나는데 어떻게 해야 하나요?"
            disabled={loading}
            className="w-full bg-transparent border-none focus:ring-0 text-[14px] text-on-background placeholder:text-outline resize-none min-h-[120px] outline-none" />
          <div className="flex items-center justify-between border-t border-outline-variant pt-3 mt-2">
            <div className="flex items-center gap-2 text-secondary">
              <span className="material-symbols-outlined text-[18px]">keyboard_return</span>
              <span className="text-[12px]">Enter로 검색<span className="hidden sm:inline"> · Shift+Enter로 줄바꿈</span></span>
            </div>
            <button onClick={() => search()} disabled={loading || !question.trim()}
              className="bg-primary text-on-primary px-5 py-2 rounded-full text-[13px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm">
              {loading ? '검색 중...' : <><span className="material-symbols-outlined text-[18px]">smart_toy</span>AI 검색</>}
            </button>
          </div>
        </div>

        {!answer && !loading && (
          <div className="mb-8">
            <h3 className="text-[12px] font-semibold text-secondary mb-3 uppercase tracking-wider">추천 질문</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {examples.map(ex => (
                <button key={ex} onClick={() => { setQuestion(ex); search(ex) }}
                  className="flex items-center gap-3 text-left bg-surface-container-lowest border border-outline-variant rounded-lg p-4 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all group">
                  <span className="material-symbols-outlined text-[20px] text-primary flex-shrink-0">chat_bubble</span>
                  <p className="text-[13px] text-on-background group-hover:text-primary transition-colors">{ex}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-error-container border border-error/20 rounded-lg p-4 mb-6 text-[13px] text-on-error-container flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>{error}
          </div>
        )}

        {loading && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 mb-6 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-secondary">유사 사례 검색 + AI 답변 생성 중...</span>
          </div>
        )}

        {answer && (
          <div className="bg-tertiary-fixed/40 border-l-4 border-tertiary-container rounded-r-xl p-6 mb-8 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-headline text-[18px] font-bold text-on-tertiary-container flex items-center gap-2 flex-wrap">
                🤖 AI 답변
                {lowRelevance && (
                  <span className="text-[11px] font-semibold text-tertiary bg-tertiary-fixed/70 border border-tertiary-container/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                    💡 일반 참고 · 사례 근거 아님
                  </span>
                )}
              </h2>
              <button
                onClick={() => {
                  setQuestion(''); setAnswer(''); setSimilar([]); setLowRelevance(false)
                  try { sessionStorage.removeItem('ai-search-result') } catch {}
                }}
                className="text-[12px] text-secondary hover:text-primary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">refresh</span>새 검색
              </button>
            </div>
            <div className="text-[14px] text-on-surface-variant leading-relaxed">
              <AnswerMarkdown>{answer}</AnswerMarkdown>
            </div>
          </div>
        )}

        {lowRelevance && similar.length > 0 && (
          <div className="bg-tertiary-fixed/40 border border-tertiary-container/40 rounded-lg p-3 mb-4 text-[12px] text-on-tertiary-container flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-tertiary-container flex-shrink-0">warning</span>
            <span>질문과 직접 관련된 사례가 충분치 않을 수 있습니다. 아래는 참고용입니다.</span>
          </div>
        )}

        {similar.length > 0 && (
          <div>
            <h2 className="font-headline text-[18px] font-bold text-on-background mb-4 flex items-center gap-2">
              📑 참고한 유사 사례
              <span className="text-[12px] font-semibold text-secondary bg-surface-container px-2 py-0.5 rounded-full">{similar.length}건</span>
            </h2>
            <div className="space-y-3">
              {similar.map(c => (
                <Link key={c.id} href={`/incidents/${c.id}`}
                  className="block bg-surface-container-lowest border border-outline-variant rounded-lg p-5 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all no-underline">
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <h3 className="text-[14px] font-bold text-on-background flex-1">{c.title}</h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.is_best_practice && <span className="bg-tertiary-container/15 text-tertiary-container text-[11px] font-semibold px-2 py-0.5 rounded flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">star</span>모범사례</span>}
                      <span className="bg-primary-container/15 text-primary text-[11px] font-semibold px-2 py-0.5 rounded">유사도 {Math.round(c.similarity * 100)}%</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[12px] text-secondary">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">tag</span>{c.id}</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">factory</span>{c.factory}</span>
                    {c.equipment && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">precision_manufacturing</span>{c.equipment}</span>}
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">timer</span>{c.downtime_min}분</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
