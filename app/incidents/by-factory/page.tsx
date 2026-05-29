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

  const groupBy = (key: (i: any) => string | null) => {
    const acc = new Map<string, number>()
    incidents.forEach(i => { const k = key(i); if (k) acc.set(k, (acc.get(k) || 0) + 1) })
    return Array.from(acc.entries()).sort((a, b) => b[1] - a[1])
  }
  const factories = groupBy(i => i.factory || '미지정')
  const equipments = groupBy(i => i.equipment || null).slice(0, 5)
  const types = groupBy(i => i.workplace_type || '미지정')
  const ranges = [{ label: '~15분', min: 0, max: 15 }, { label: '15-30분', min: 15, max: 30 }, { label: '30-60분', min: 30, max: 60 }, { label: '60-120분', min: 60, max: 120 }, { label: '120분+', min: 120, max: Infinity }]
  const downtimes: [string, number][] = ranges.map(r => [r.label, incidents.filter(i => i.downtime_min >= r.min && i.downtime_min < r.max).length])

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[1200px] mx-auto px-8 py-8">
        <nav className="flex items-center gap-2 text-[13px] text-secondary mb-6">
          <Link href="/" className="hover:text-primary no-underline">홈</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <Link href="/incidents" className="hover:text-primary no-underline">이상발생보고</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-background font-semibold">공장별 현황</span>
        </nav>
        <h1 className="font-headline text-[28px] font-bold text-on-background mb-8 flex items-center gap-3">📊 공장별 현황</h1>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="전체 보고서" value={total.toLocaleString()} />
          <StatCard label="모범사례" value={bestPractice.toString()} badge={`${Math.round(bestPractice*100/total)}%`} badgeColor="tertiary" />
          <StatCard label="긴 다운타임" value={longDowntime.toString()} badge="60분+" badgeColor="primary" />
          <StatCard label="평균 다운타임" value={avgDowntime.toString()} unit="분" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <ChartCard title="🏭 공장별 발생 건수">
            {factories.slice(0, 5).map(([label, count], i) => (
              <BarRow key={label} label={label} count={count} max={factories[0][1]} href={`/incidents/list?factory=${encodeURIComponent(label)}`} dim={i / 5} />
            ))}
          </ChartCard>

          <ChartCard title="🔧 설비별 Top 5 이슈">
            <div className="space-y-3">
              {equipments.map(([label, count], i) => (
                <Link key={label} href={`/incidents/list?equipment=${encodeURIComponent(label)}`}
                  className={`flex items-center justify-between pb-3 ${i < 4 ? 'border-b border-surface-variant' : ''} no-underline hover:bg-surface-container-low rounded px-2 -mx-2 py-1 transition-colors`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${i < 3 ? 'bg-surface-container-high text-secondary' : 'bg-surface-container text-secondary/70'}`}>{i+1}</div>
                    <span className="text-[14px] text-on-background truncate">{label}</span>
                  </div>
                  <span className={`text-[14px] font-semibold flex-shrink-0 ${i === 0 ? 'text-primary' : 'text-on-surface-variant'}`}>{count}건</span>
                </Link>
              ))}
            </div>
          </ChartCard>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ChartCard title="🏷 작업장 유형">
            {types.slice(0, 4).map(([label, count], i) => {
              const pct = Math.round(count * 100 / total)
              return (
                <div key={label} className="mb-4">
                  <div className="flex justify-between text-[14px] mb-1.5">
                    <span className="text-on-surface-variant">{label}</span>
                    <span className="text-on-background font-semibold">{pct}%</span>
                  </div>
                  <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%`, opacity: 1 - i * 0.15 }} />
                  </div>
                </div>
              )
            })}
          </ChartCard>

          <ChartCard title="⏱ 다운타임 분포">
            {downtimes.map(([label, count]) => (
              <BarRow key={label} label={label} count={count} max={Math.max(...downtimes.map(d => d[1]))} href="/incidents/list" />
            ))}
          </ChartCard>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, unit, badge, badgeColor }: { label: string; value: string; unit?: string; badge?: string; badgeColor?: 'primary' | 'tertiary' }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all">
      <p className="text-[11px] font-semibold text-secondary mb-2 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="font-headline text-[28px] font-bold text-on-background">{value}</span>
        {unit && <span className="text-[14px] text-secondary">{unit}</span>}
        {badge && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${badgeColor === 'tertiary' ? 'bg-tertiary-container/10 text-tertiary-container' : 'bg-primary/10 text-primary'}`}>{badge}</span>
        )}
      </div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-shadow">
      <h3 className="font-headline text-[16px] font-bold text-on-background mb-5">{title}</h3>
      <div>{children}</div>
    </div>
  )
}

function BarRow({ label, count, max, href, dim = 0 }: { label: string; count: number; max: number; href: string; dim?: number }) {
  return (
    <Link href={href} className="flex items-center gap-3 mb-3 no-underline group">
      <div className="w-20 text-[13px] text-on-surface-variant truncate flex-shrink-0 group-hover:text-primary transition-colors">{label}</div>
      <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${(count / max) * 100}%`, opacity: Math.max(0.3, 1 - dim * 0.7) }} />
      </div>
      <div className="w-12 text-right text-[13px] font-semibold text-on-background group-hover:text-primary transition-colors">{count}</div>
    </Link>
  )
}
