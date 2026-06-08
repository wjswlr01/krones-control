import Link from 'next/link'
import { EQUIPMENT_GROUPS, getManualsByGroup } from '@/lib/manuals'

export default function ManualsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <nav className="hidden md:flex items-center gap-2 text-[13px] text-secondary mb-6">
          <Link href="/" className="hover:text-primary no-underline transition-colors">홈</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-background font-semibold">설비매뉴얼</span>
        </nav>
        <h1 className="font-headline text-[24px] md:text-[28px] font-bold text-on-background mb-2">설비매뉴얼</h1>
        <p className="text-[14px] text-secondary mb-6 md:mb-8">설비 종류별 교육 매뉴얼입니다.</p>

        <div className="space-y-8 md:space-y-10">
          {EQUIPMENT_GROUPS.map(g => {
            const manuals = getManualsByGroup(g.key)
            if (manuals.length === 0) return null
            const totalSlides = manuals.reduce((s, m) => s + m.totalSlides, 0)
            return (
              <section key={g.key}>
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="text-[24px] leading-none">{g.icon}</span>
                  <div>
                    <h2 className="font-headline text-[18px] md:text-[20px] font-bold text-on-background leading-tight">{g.name}</h2>
                    <p className="text-[12px] text-secondary">{g.model} · 매뉴얼 {manuals.length}권 · 슬라이드 {totalSlides}장</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  {manuals.map(m => (
                    <Link key={m.id} href={`/manual/${m.id}/1`}
                      className="group block bg-surface-container-lowest border border-outline-variant rounded-xl p-5 md:p-6 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-primary/40 transition-all no-underline">
                      <div className="w-10 h-10 rounded-lg bg-primary-container/15 text-primary flex items-center justify-center mb-3 text-[20px]">
                        {m.icon}
                      </div>
                      <h3 className="font-headline text-[16px] md:text-[17px] font-bold text-on-background mb-1 group-hover:text-primary transition-colors">{m.title}</h3>
                      <p className="text-[12px] text-secondary mb-3 line-clamp-1">{m.subtitle}</p>
                      <span className="text-[11px] text-secondary px-2.5 py-1 bg-surface-container-low rounded-full border border-outline-variant/50">{m.totalSlides} 슬라이드</span>
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
