import Link from 'next/link'
import { EQUIPMENT_GROUPS, getManualsByGroup } from '@/lib/manuals'

export default function ManualsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <nav className="hidden md:flex items-center gap-2 text-[13px] text-secondary mb-6">
          <Link href="/" className="hover:text-primary no-underline transition-colors">홈</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-background font-semibold">설비매뉴얼</span>
        </nav>
        <h1 className="font-headline text-[24px] md:text-[28px] font-bold text-on-background mb-2">설비매뉴얼</h1>
        <p className="text-[14px] text-secondary mb-6 md:mb-8">설비 종류를 선택하세요.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {EQUIPMENT_GROUPS.map(g => {
            const manuals = getManualsByGroup(g.key)
            if (manuals.length === 0) return null
            const totalSlides = manuals.reduce((s, m) => s + m.totalSlides, 0)
            return (
              <Link key={g.key} href={`/manuals/${g.key}`}
                className="group block bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-7 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all no-underline">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-[30px] leading-none">{g.icon}</div>
                  <span className="material-symbols-outlined text-secondary group-hover:text-primary group-hover:translate-x-0.5 transition-all">arrow_forward</span>
                </div>
                <h2 className="font-headline text-[20px] md:text-[22px] font-bold text-on-background mb-1 group-hover:text-primary transition-colors">{g.name}</h2>
                <p className="text-[13px] text-secondary mb-4">{g.model}</p>
                <div className="flex flex-wrap gap-2 text-[12px] text-secondary">
                  <span className="px-2.5 py-1 bg-surface-container-low rounded-full border border-outline-variant/50">매뉴얼 {manuals.length}권</span>
                  <span className="px-2.5 py-1 bg-surface-container-low rounded-full border border-outline-variant/50">슬라이드 {totalSlides}장</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
