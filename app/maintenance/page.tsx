// app/maintenance/page.tsx
import Link from 'next/link'

const TASKS = [
  { period: '일일',  hours: '8h',   color: 'danger',  items: [
    { title: '센서 면 청소',     module: '라벨 공급부', mins: '10분', supplies: ['이소프로필 알코올', '무진 와이퍼'] },
    { title: '글루 온도 확인',    module: '글루 시스템', mins: '5분',  supplies: [] },
    { title: '벨트 장력 점검',    module: '인피드',     mins: '5분',  supplies: [] },
  ]},
  { period: '주간',  hours: '120h', color: 'tip', items: [
    { title: '커터 드럼 진공 점검', module: '커터 드럼',  mins: '30분', supplies: ['압축 공기 건'] },
    { title: '트랜스퍼 압력 확인',  module: '트랜스퍼',   mins: '15분', supplies: [] },
  ]},
  { period: '월간',  hours: '500h', color: 'info', items: [
    { title: '글루 롤러 정렬 점검', module: '글루 시스템', mins: '60분', supplies: ['다이얼 게이지'] },
    { title: '스타휠 윤활',         module: '스타휠',     mins: '45분', supplies: ['Klüber NBU 15'] },
  ]},
]

const COLOR_MAP: Record<string, string> = {
  danger: 'text-danger border-danger/30 bg-danger/5',
  tip:    'text-tip border-tip/30 bg-tip/5',
  info:   'text-info border-info/30 bg-info/5',
}

export default function MaintenancePage() {
  return (
    <div className="max-w-doc mx-auto px-8 py-10">
      <h1 className="text-3xl font-bold text-ink mb-2">🔧 설비 관리 기준</h1>
      <p className="text-sub mb-8">청소·윤활·점검 표준 절차 (일일·주간·월간)</p>

      <div className="space-y-8">
        {TASKS.map(group => (
          <section key={group.period}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] font-bold border ${COLOR_MAP[group.color]}`}>
                {group.period} · {group.hours}
              </span>
              <span className="text-[12px] text-sub">{group.items.length}개 항목</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {group.items.map(task => (
                <div key={task.title} className="bg-bg border border-border rounded-lg p-4 shadow-card hover:shadow-hover transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-[15px] font-bold text-ink">{task.title}</h3>
                    <span className="text-[11px] text-faint font-mono">⏱ {task.mins}</span>
                  </div>
                  <p className="text-[12px] text-sub mb-3">{task.module}</p>
                  {task.supplies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {task.supplies.map(s => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-body border border-border">
                          🧪 {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 p-4 bg-surface border border-border rounded-lg text-[12px] text-sub">
        💡 자세한 점검 방법은 <Link href="/manual/manual-01/1" className="text-primary font-semibold hover:underline">설비관리 매뉴얼</Link>을 참고하거나 상단 검색창에 항목명을 입력해 강사 녹취를 조회하세요.
      </div>
    </div>
  )
}
