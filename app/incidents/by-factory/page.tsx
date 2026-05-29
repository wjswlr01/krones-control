'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { getAllIncidents } from '@/lib/incidents'

export default function ByFactoryPage() {
  const incidents = useMemo(() => getAllIncidents(), [])
  const total = incidents.length
  const bestPractice = incidents.filter(i => i.is_best_practice).length
  const longDowntime = incidents.filter(i => i.is_long_downtime).length
  const avgDowntime = Math.round(incidents.reduce((s, i) => s + i.downtime_min, 0) / total)

  const groupBy = <T extends string>(key: (i: any) => T | null) => {
    const acc = new Map<string, number>()
    incidents.forEach(i => { const k = key(i); if (k) acc.set(k, (acc.get(k) || 0) + 1) })
    return Array.from(acc.entries()).sort((a, b) => b[1] - a[1])
  }

  const factories = groupBy(i => i.factory || '미지정')
  const equipments = groupBy(i => i.equipment || null).slice(0, 10)
  const types = groupBy(i => i.workplace_type || '미지정')

  const ranges = [
    { label: '~15분', min: 0, max: 15 },
    { label: '15-30분', min: 15, max: 30 },
    { label: '30-60분', min: 30, max: 60 },
    { label: '60-120분', min: 60, max: 120 },
    { label: '120분+', min: 120, max: Infinity },
  ]
  const downtimes: [string, number][] = ranges.map(r => [r.label, incidents.filter(i => i.downtime_min >= r.min && i.downtime_min < r.max).length])

  return (
    <div className="flex-1 overflow-y-auto bg-muted">
      <div className="max-w-reading mx-auto px-8 py-8">
        <div className="flex items-center gap-2 text-[12px] text-sub mb-4">
          <Link href="/" className="hover:text-ink no-underline">홈</Link>
          <span className="text-faint">›</span>
          <Link href="/incidents" className="hover:text-ink no-underline">이상발생보고</Link>
          <span className="text-faint">›</span>
          <span className="text-ink font-semibold">공장별 현황</span>
        </div>
        <h1 className="text-2xl font-bold text-ink mb-6">📊 공장별 현황</h1>

        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard label="전체 보고서" value={total.toLocaleString()} color="text-ink" />
          <StatCard label="모범사례" value={bestPractice.toString()} unit={`${Math.round(bestPractice*100/total)}%`} color="text-tip" />
          <StatCard label="긴 다운타임" value={longDowntime.toString()} unit="60분+" color="text-primary" />
          <StatCard label="평균 다운타임" value={`${avgDowntime}`} unit="분" color="text-ink" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <BarChart title="🏭 공장별 발생 건수" items={factories} hrefFn={f => `/incidents/list?factory=${encodeURIComponent(f)}`} />
          <BarChart title="🔧 설비별 Top 10" items={equipments} hrefFn={e => `/incidents/list?equipment=${encodeURIComponent(e)}`} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <BarChart title="🏷 작업장 유형" items={types} hrefFn={t => `/incidents/list?type=${encodeURIComponent(t)}`} />
          <BarChart title="⏱ 다운타임 분포" items={downtimes} hrefFn={() => '/incidents/list'} />
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) {
  return (
    <div className="bg-bg border border-border rounded-lg p-4">
      <div className="text-[11px] text-sub mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}{unit && <span className="text-[12px] font-normal text-sub ml-1">{unit}</span>}</div>
    </div>
  )
}

function BarChart({ title, items, hrefFn }: { title: string; items: [string, number][]; hrefFn: (label: string) => string }) {
  const max = Math.max(...items.map(([, c]) => c), 1)
  return (
    <div className="bg-bg border border-border rounded-lg p-4">
      <h3 className="text-[13px] font-bold text-ink mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map(([label, count]) => (
          <Link key={label} href={hrefFn(label)} className="block group no-underline">
            <div className="flex items-center gap-2 text-[12px] mb-0.5">
              <span className="flex-1 text-body group-hover:text-primary truncate">{label}</span>
              <span className="font-mono text-sub group-hover:text-primary">{count}</span>
            </div>
            <div className="h-2 bg-muted rounded overflow-hidden">
              <div className="h-full bg-primary/70 group-hover:bg-primary transition-all" style={{ width: `${(count / max) * 100}%` }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
