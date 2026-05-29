import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getIncidentById } from '@/lib/incidents'

export default function IncidentDetailPage({ params }: { params: { id: string } }) {
  const incident = getIncidentById(params.id)
  if (!incident) return notFound()

  return (
    <div className="flex h-full overflow-hidden">
      <section className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-[1200px] mx-auto px-8 py-8">
          <nav className="flex items-center gap-2 text-[13px] text-secondary mb-6">
            <Link href="/" className="hover:text-primary no-underline">홈</Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <Link href="/incidents" className="hover:text-primary no-underline">이상발생보고</Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <Link href="/incidents/list" className="hover:text-primary no-underline">전체 목록</Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="font-mono text-outline">{incident.id}</span>
          </nav>

          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="font-headline text-[28px] font-bold text-on-background flex-1">{incident.title}</h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              {incident.is_best_practice && <span className="text-[11px] font-semibold px-2 py-1 bg-tertiary-container/15 text-tertiary-container rounded flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">star</span>모범사례</span>}
              {incident.is_long_downtime && <span className="text-[11px] font-semibold px-2 py-1 bg-primary/15 text-primary rounded flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">timer</span>긴 다운타임</span>}
            </div>
          </div>
          <p className="text-[12px] text-secondary mb-6 font-mono flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">tag</span>{incident.id}</p>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6 grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] shadow-sm">
            <Field icon="factory" label="공장" value={incident.factory || '-'} />
            <Field icon="conveyor_belt" label="라인" value={`${incident.workplace || '-'}${incident.workplace_type ? ` (${incident.workplace_type})` : ''}`} />
            <Field icon="precision_manufacturing" label="설비" value={incident.equipment || '미지정'} strong />
            <Field icon="inventory_2" label="품목" value={incident.product || '-'} />
            <Field icon="calendar_today" label="발생일" value={incident.incident_date} mono />
            <Field icon="timer" label="다운타임" value={`${incident.downtime_min}분`} mono />
            <Field icon="account_tree" label="대상 공정" value={incident.target_process || '-'} />
            <Field icon="person" label="작성자" value={`${incident.author || '-'}${incident.department ? ` (${incident.department})` : ''}`} />
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-4 shadow-sm">
            <h2 className="font-headline text-[15px] font-bold text-on-background mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-secondary">search</span> 발생 원인
            </h2>
            <div className="text-[13px] text-on-surface-variant leading-relaxed whitespace-pre-wrap font-mono bg-background p-3 rounded-lg border border-outline-variant/50">
              {incident.cause || '(원인 미기재)'}
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
            <h2 className="font-headline text-[15px] font-bold text-on-background mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-secondary">build</span> 조치 사항
              {incident.is_best_practice && <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-tertiary-container/15 text-tertiary-container rounded">모범사례</span>}
            </h2>
            <div className="text-[13px] text-on-surface-variant leading-relaxed whitespace-pre-wrap font-mono bg-background p-3 rounded-lg border border-outline-variant/50">
              {incident.action || '(조치 미기재)'}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function Field({ icon, label, value, strong, mono }: { icon: string; label: string; value: string; strong?: boolean; mono?: boolean }) {
  return (
    <div>
      <span className="text-outline text-[11px] flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">{icon}</span>{label}</span>
      <div className={`text-on-surface-variant mt-0.5 ${strong ? 'font-semibold' : ''} ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}
