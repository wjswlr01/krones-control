'use client'
// app/search/page.tsx
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface SearchHit {
  source:    'manual' | 'lecture'
  title:     string
  snippet:   string
  score:     number
  href?:     string
  imageUrl?: string
  file_name?: string
}

function SearchContent() {
  const sp    = useSearchParams()
  const query = sp.get('q') ?? ''

  const [status,   setStatus]   = useState<'idle'|'loading'|'ok'|'empty'|'error'>('idle')
  const [answer,   setAnswer]   = useState('')
  const [hits,     setHits]     = useState<SearchHit[]>([])
  const [latency,  setLatency]  = useState(0)
  const [errMsg,   setErrMsg]   = useState('')
  const [activeTab, setActiveTab] = useState<'all'|'manual'|'lecture'>('all')

  const run = useCallback(async () => {
    if (!query.trim()) return
    setStatus('loading')
    try {
      const res  = await fetch('/api/search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ q: query }),
      })
      const json = await res.json()
      if (!json.success) {
        setErrMsg(json.error?.message ?? '검색 실패')
        setStatus('error')
        return
      }
      setAnswer(json.data.answer ?? '')
      setHits(json.data.hits ?? [])
      setLatency(json.data.latency ?? 0)
      setStatus(json.data.hits?.length || json.data.answer ? 'ok' : 'empty')
    } catch {
      setErrMsg('네트워크 오류')
      setStatus('error')
    }
  }, [query])

  useEffect(() => { run() }, [run])

  const manualHits  = hits.filter(h => h.source === 'manual')
  const lectureHits = hits.filter(h => h.source === 'lecture')
  const visibleHits = activeTab === 'all' ? hits : hits.filter(h => h.source === activeTab)

  return (
    <div className="max-w-doc mx-auto px-8 py-8">

      <div className="mb-6">
        <div className="text-[12px] text-sub mb-2">검색 결과</div>
        <h1 className="text-2xl font-bold text-ink">"{query}"</h1>
        {status === 'ok' && (
          <p className="text-[12px] text-sub mt-1">
            매뉴얼 {manualHits.length}건 · 강의 {lectureHits.length}건 · {latency}ms
          </p>
        )}
      </div>

      {status === 'loading' && (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
      )}

      {status === 'error' && (
        <div className="bg-bg border border-danger rounded-lg p-6 text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-[14px] text-body mb-3">{errMsg}</p>
          <button onClick={run} className="px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-semibold hover:bg-accent">
            다시 시도
          </button>
        </div>
      )}

      {status === 'empty' && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-[15px] font-semibold text-ink mb-1">검색 결과 없음</p>
          <p className="text-[13px] text-sub">"{query}"에 대한 데이터가 없습니다.</p>
        </div>
      )}

      {status === 'ok' && (
        <>
          {/* AI 요약 답변 */}
          {answer && (
            <section className="bg-bg border border-primary/30 rounded-xl p-5 mb-6 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🤖</span>
                <span className="text-[13px] font-bold text-primary">AI 요약 답변</span>
              </div>
              <div className="doc-prose whitespace-pre-wrap text-[14px]">{answer}</div>
            </section>
          )}

          {/* 탭 */}
          <div className="flex gap-1 mb-4 border-b border-border">
            {([
              { id: 'all',     label: '전체',  count: hits.length },
              { id: 'manual',  label: '매뉴얼', count: manualHits.length },
              { id: 'lecture', label: '강의',   count: lectureHits.length },
            ] as const).map(t => (
              <button key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-[13px] font-semibold border-b-2 -mb-px transition-colors
                  ${activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-sub hover:text-ink'}`}
              >
                {t.label} <span className="text-faint">({t.count})</span>
              </button>
            ))}
          </div>

          {/* 결과 리스트 */}
          <div className="space-y-3">
            {visibleHits.map((hit, i) => (
              hit.source === 'manual' ? (
                <Link key={i} href={hit.href ?? '#'}
                  className="block bg-bg border border-border rounded-lg p-4 shadow-card hover:shadow-hover hover:border-primary no-underline transition-all"
                >
                  <div className="flex gap-4">
                    {hit.imageUrl && (
                      <img src={hit.imageUrl} alt={hit.title}
                        className="w-32 h-24 object-cover rounded border border-border flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">📚 매뉴얼</span>
                        {hit.file_name && (
                          <span className="text-[11px] text-faint truncate">{hit.file_name}</span>
                        )}
                      </div>
                      <h3 className="text-[15px] font-bold text-ink mb-1">{hit.title}</h3>
                      <p className="text-[13px] text-sub leading-relaxed line-clamp-3">{hit.snippet}</p>
                    </div>
                  </div>
                </Link>
              ) : (
                <div key={i} className="bg-bg border-l-4 border-l-tip border-y border-r border-border rounded-r-lg p-4 shadow-card">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-tip/10 text-tip">🎓 강의 녹취</span>
                    <span className="text-[11px] text-faint">{hit.file_name}</span>
                    <span className="ml-auto text-[10px] font-mono text-faint">{Math.round(hit.score * 100)}%</span>
                  </div>
                  <p className="text-[13px] text-body leading-relaxed whitespace-pre-wrap">{hit.snippet}</p>
                </div>
              )
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sub">로딩 중...</div>}>
      <SearchContent />
    </Suspense>
  )
}
