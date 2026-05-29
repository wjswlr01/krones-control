'use client'
import { useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { searchIncidents, getFactoryList, getStats, type IncidentFilters } from '@/lib/incidents'

function IncidentsListContent() {
  const searchParams = useSearchParams()
  const initFactory = searchParams?.get('factory') || undefined
  const initType = searchParams?.get('type') || undefined
  const initEquipment = searchParams?.get('equipment') || undefined

  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<IncidentFilters>({
    labeler_only: !initFactory && !initType && !initEquipment,
    factory: initFactory,
    workplace_type: initType,
    equipment: initEquipment,
  })
  const factories = useMemo(() => getFactoryList(), [])
  const stats = useMemo(() => getStats(), [])
  const results = useMemo(() => searchIncidents(query, filters, 200), [query, filters])

  const toggleFilter = (key: keyof IncidentFilters, value?: any) => {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? undefined : value }))
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-[260px] border-r border-border bg-surface overflow-y-auto flex-shrink-0">
        <div className="px-4 py-3 border-b border-border bg-surface">
          <h2 className="text-[14px] font-bold text-ink">📋 이상발생보고서</h2>
          <p className="text-[11px] text-sub mt-0.5">MES 기반 트러블 사례</p>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="text-[10px] uppercase font-semibold text-faint tracking-wider mb-2">통계</div>
            <div className="space-y-1 text-[12px]">
              <div className="flex justify-between"><span className="text-sub">전체</span><span className="font-mono text-ink">{stats.total.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-sub">모범사례</span><span className="font-mono text-tip">{stats.bestPractice}</span></div>
              <div className="flex justify-between"><span className="text-sub">긴 다운타임</span><span className="font-mono text-primary">{stats.longDowntime}</span></div>
              <div className="flex justify-between font-semibold pt-1 border-t border-border"><span className="text-ink">검색 결과</span><span className="font-mono text-primary">{results.length}</span></div>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold text-faint tracking-wider mb-2">필터</div>
            <label className="flex items-center gap-2 text-[12px] text-body py-1 cursor-pointer">
              <input type="checkbox" checked={filters.labeler_only ?? false} onChange={() => toggleFilter('labeler_only', true)} className="rounded" />
              라벨러 관련만
            </label>
            <label className="flex items-center gap-2 text-[12px] text-body py-1 cursor-pointer">
              <input type="checkbox" checked={filters.is_best_practice ?? false} onChange={() => toggleFilter('is_best_practice', true)} className="rounded" />
              모범사례 (조치 80자+)
            </label>
            <label className="flex items-center gap-2 text-[12px] text-body py-1 cursor-pointer">
              <input type="checkbox" checked={filters.is_long_downtime ?? false} onChange={() => toggleFilter('is_long_downtime', true)} className="rounded" />
              긴 다운타임 (60분+)
            </label>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold text-faint tracking-wider mb-2">공장</div>
            <select value={filters.factory ?? ''} onChange={e => setFilters(prev => ({ ...prev, factory: e.target.value || undefined }))}
              className="w-full px-2 py-1.5 bg-bg border border-border rounded text-[12px] outline-none focus:border-primary">
              <option value="">전체</option>
              {factories.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </aside>

      <section className="flex-1 overflow-y-auto bg-muted">
        <div className="max-w-reading mx-auto px-8 py-6">
          <div className="flex items-center gap-2 text-[12px] text-sub mb-4">
            <Link href="/" className="hover:text-ink no-underline">홈</Link>
            <span className="text-faint">›</span>
            <Link href="/incidents" className="hover:text-ink no-underline">이상발생보고</Link>
            <span className="text-faint">›</span>
            <span className="text-ink font-semibold">전체 목록</span>
          </div>
          <div className="mb-4">
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="이상발생보고서 검색 (제목/원인/조치/설비)"
              className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-[13px] outline-none focus:border-primary shadow-card" />
          </div>

          {(filters.equipment || filters.workplace_type) && (
            <div className="flex items-center gap-2 mb-3 text-[11px]">
              <span className="text-faint">적용된 필터:</span>
              {filters.workplace_type && (
                <button onClick={() => setFilters(prev => ({ ...prev, workplace_type: undefined }))}
                  className="px-2 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20">
                  유형: {filters.workplace_type} ✕
                </button>
              )}
              {filters.equipment && (
                <button onClick={() => setFilters(prev => ({ ...prev, equipment: undefined }))}
                  className="px-2 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20">
                  설비: {filters.equipment} ✕
                </button>
              )}
            </div>
          )}

          <div className="space-y-2">
            {results.length === 0 ? (
              <div className="text-center py-12 text-faint text-[13px]">검색 결과가 없습니다.</div>
            ) : results.map(inc => (
              <Link key={inc.id} href={`/incidents/${inc.id}`}
                className="block bg-bg border border-border rounded-lg p-4 hover:border-primary transition-colors no-underline shadow-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-[14px] font-semibold text-ink flex-1">{inc.title}</h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {inc.is_best_practice && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-tip/15 text-tip rounded">⭐ 모범사례</span>}
                    {inc.is_long_downtime && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary/15 text-primary rounded">{inc.downtime_min}분</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-sub">
                  <span className="font-mono">{inc.id}</span>
                  <span>·</span>
                  <span>{inc.factory}</span>
                  {inc.workplace && <><span>·</span><span>{inc.workplace}</span></>}
                  {inc.equipment && <><span>·</span><span className="font-semibold">{inc.equipment}</span></>}
                  <span>·</span>
                  <span className="font-mono">{inc.incident_date}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default function IncidentsListPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-muted" />}>
      <IncidentsListContent />
    </Suspense>
  )
}
