import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getIncidentById } from '@/lib/incidents'

export default function IncidentDetailPage({ params }: { params: { id: string } }) {
  const incident = getIncidentById(params.id)
  if (!incident) return notFound()

  return (
    <div className="flex h-full overflow-hidden">
      <section className="flex-1 overflow-y-auto bg-muted">
        <div className="max-w-reading mx-auto px-8 py-8">
          <div className="flex items-center gap-2 text-[12px] text-sub mb-4">
            <Link href="/incidents" className="hover:text-ink no-underline">← 보고서 목록</Link>
          </div>

          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-2xl font-bold text-ink flex-1">{incident.title}</h1>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {incident.is_best_practice && <span className="text-[11px] font-bold px-2 py-1 bg-tip/15 text-tip rounded">⭐ 모범사례</span>}
              {incident.is_long_downtime && <span className="text-[11px] font-bold px-2 py-1 bg-primary/15 text-primary rounded">긴 다운타임</span>}
            </div>
          </div>
          <p className="text-[12px] text-sub mb-6 font-mono">{incident.id}</p>

          <div className="bg-bg border border-border rounded-lg p-4 mb-6 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
            <div><span className="text-faint text-[11px]">공장</span><div className="text-body">{incident.factory || '-'}</div></div>
            <div><span className="text-faint text-[11px]">라인</span><div className="text-body">{incident.workplace || '-'} {incident.workplace_type && <span className="text-faint">({incident.workplace_type})</span>}</div></div>
            <div><span className="text-faint text-[11px]">설비</span><div className="text-body font-semibold">{incident.equipment || '미지정'}</div></div>
            <div><span className="text-faint text-[11px]">품목</span><div className="text-body">{incident.product || '-'}</div></div>
            <div><span className="text-faint text-[11px]">발생일</span><div className="text-body font-mono">{incident.incident_date}</div></div>
            <div><span className="text-faint text-[11px]">다운타임</span><div className="text-body font-mono">{incident.downtime_min}분</div></div>
            <div><span className="text-faint text-[11px]">대상 공정</span><div className="text-body">{incident.target_process || '-'}</div></div>
            <div><span className="text-faint text-[11px]">작성자</span><div className="text-body">{incident.author || '-'} {incident.department && <span className="text-faint text-[11px]">({incident.department})</span>}</div></div>
          </div>

          <div className="bg-bg border border-border rounded-lg p-5 mb-4">
            <h2 className="text-[13px] font-bold text-ink mb-3 flex items-center gap-2">
              <span className="text-base">🔍</span> 발생 원인
            </h2>
            <div className="text-[13px] text-body leading-relaxed whitespace-pre-wrap font-mono bg-muted p-3 rounded">
              {incident.cause || '(원인 미기재)'}
            </div>
          </div>

          <div className="bg-bg border border-border rounded-lg p-5">
            <h2 className="text-[13px] font-bold text-ink mb-3 flex items-center gap-2">
              <span className="text-base">🔧</span> 조치 사항
              {incident.is_best_practice && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-tip/15 text-tip rounded">모범사례</span>}
            </h2>
            <div className="text-[13px] text-body leading-relaxed whitespace-pre-wrap font-mono bg-muted p-3 rounded">
              {incident.action || '(조치 미기재)'}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
