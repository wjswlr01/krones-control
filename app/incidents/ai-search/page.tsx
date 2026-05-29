'use client'
import { useState } from 'react'
import Link from 'next/link'

interface SimilarCase { id: string; title: string; factory: string; equipment: string; downtime_min: number; similarity: number; is_best_practice: boolean }

export default function AiSearchPage() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [similar, setSimilar] = useState<SimilarCase[]>([])
  const [error, setError] = useState('')

  const search = async (q?: string) => {
    const query = (q ?? question).trim()
    if (!query || loading) return
    setLoading(true); setAnswer(''); setSimilar([]); setError('')
    try {
      const res = await fetch('/api/incident-ai-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      })
      const json = await res.json()
      if (json.success) { setAnswer(json.data.answer); setSimilar(json.data.similar) }
      else setError(json.error?.message ?? '검색 실패')
    } catch { setError('네트워크 오류') }
    setLoading(false)
  }

  const examples = ['글루 롤러에 라벨이 자꾸 말려요', '슬리브 라벨러 커터가 잘 안 잘려요', '라벨 끊김 에러 어떻게 조치하나요?', '필름 라벨러 핀트 불량 원인']

  return (
    <div className="flex-1 overflow-y-auto bg-muted">
      <div className="max-w-reading mx-auto px-8 py-8">
        <div className="flex items-center gap-2 text-[12px] text-sub mb-4">
          <Link href="/" className="hover:text-ink no-underline">홈</Link>
          <span className="text-faint">›</span>
          <Link href="/incidents" className="hover:text-ink no-underline">이상발생보고</Link>
          <span className="text-faint">›</span>
          <span className="text-ink font-semibold">AI 사례검색</span>
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">🤖 AI 사례검색</h1>
        <p className="text-[13px] text-sub mb-6">라벨러 관련 트러블 사례 294건에서 AI가 답을 찾아드립니다.</p>

        <div className="bg-bg border border-border rounded-lg p-4 mb-6 shadow-card">
          <textarea value={question} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); search() } }}
            placeholder="예: 라벨러 글루 롤러에 라벨이 말려서 에러나는데 어떻게 해야 하나요?"
            rows={3} disabled={loading}
            className="w-full px-3 py-2 text-[13px] outline-none bg-transparent resize-none disabled:opacity-50" />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
            <span className="text-[11px] text-faint">Enter로 검색 · Shift+Enter로 줄바꿈</span>
            <button onClick={() => search()} disabled={loading || !question.trim()}
              className="px-4 py-1.5 bg-primary text-white text-[12px] font-semibold rounded disabled:opacity-50 hover:bg-accent">
              {loading ? '검색 중...' : '🤖 AI 검색'}
            </button>
          </div>
        </div>

        {!answer && !loading && (
          <div className="bg-bg border border-border rounded-lg p-4 mb-6">
            <div className="text-[11px] uppercase font-semibold text-faint tracking-wider mb-2">예시 질문</div>
            <div className="space-y-1.5">
              {examples.map(ex => (
                <button key={ex} onClick={() => { setQuestion(ex); search(ex) }} className="block text-left text-[12px] text-primary hover:underline">· {ex}</button>
              ))}
            </div>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-[12px] text-red-700">⚠️ {error}</div>}

        {loading && (
          <div className="bg-bg border border-border rounded-lg p-6 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-[13px] text-body">유사 사례 검색 + AI 답변 생성 중...</span>
            </div>
          </div>
        )}

        {answer && (
          <div className="bg-bg border border-tip/40 rounded-lg p-5 mb-6">
            <h2 className="text-[13px] font-bold text-tip mb-3">🤖 AI 답변</h2>
            <div className="text-[13px] text-body leading-relaxed whitespace-pre-wrap doc-prose">{answer}</div>
          </div>
        )}

        {similar.length > 0 && (
          <div>
            <h2 className="text-[13px] font-bold text-ink mb-3">📑 참고한 유사 사례 ({similar.length}건)</h2>
            <div className="space-y-2">
              {similar.map(c => (
                <Link key={c.id} href={`/incidents/${c.id}`} className="block bg-bg border border-border rounded-lg p-4 hover:border-primary transition-all no-underline">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="text-[13px] font-semibold text-ink flex-1">{c.title}</h3>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {c.is_best_practice && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-tip/15 text-tip rounded">⭐</span>}
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary/15 text-primary rounded">유사도 {Math.round(c.similarity * 100)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-sub flex-wrap">
                    <span className="font-mono">{c.id}</span>
                    <span>·</span><span>{c.factory}</span>
                    {c.equipment && <><span>·</span><span className="font-semibold">{c.equipment}</span></>}
                    <span>·</span><span className="font-mono">{c.downtime_min}분</span>
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
