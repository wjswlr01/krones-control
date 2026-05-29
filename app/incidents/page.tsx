import Link from 'next/link'
import { getStats } from '@/lib/incidents'

export default function IncidentsHubPage() {
  const stats = getStats()
  return (
    <div className="flex-1 overflow-y-auto bg-muted">
      <div className="max-w-reading mx-auto px-8 py-8">
        <div className="flex items-center gap-2 text-[12px] text-sub mb-4">
          <Link href="/" className="hover:text-ink no-underline">홈</Link>
          <span className="text-faint">›</span>
          <span className="text-ink font-semibold">이상발생보고</span>
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">이상발생보고</h1>
        <p className="text-[13px] text-sub mb-6">
          전체 {stats.total.toLocaleString()}건 · 모범사례 {stats.bestPractice}건 · 긴 다운타임 {stats.longDowntime}건
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Link href="/incidents/by-factory" className="block bg-bg border border-border rounded-lg p-6 hover:border-primary hover:shadow-card transition-all no-underline group">
            <div className="text-4xl mb-3">📊</div>
            <h2 className="text-lg font-bold text-ink mb-1 group-hover:text-primary">공장별 현황</h2>
            <p className="text-[12px] text-sub leading-relaxed">공장·설비별 통계 + 다운타임 분포 (Phase 2)</p>
          </Link>
          <Link href="/incidents/ai-search" className="block bg-bg border border-border rounded-lg p-6 hover:border-primary hover:shadow-card transition-all no-underline group">
            <div className="text-4xl mb-3">🤖</div>
            <h2 className="text-lg font-bold text-ink mb-1 group-hover:text-primary">AI 사례검색</h2>
            <p className="text-[12px] text-sub leading-relaxed">자연어 질문 → AI 답변 + 유사 사례 (Phase 3)</p>
          </Link>
        </div>
        <Link href="/incidents/list" className="block bg-bg border border-border rounded-lg p-4 hover:border-primary transition-all no-underline">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink mb-0.5">📑 전체 목록 보기</h3>
              <p className="text-[12px] text-sub">키워드 + 필터로 직접 검색</p>
            </div>
            <span className="text-primary text-[14px]">→</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
