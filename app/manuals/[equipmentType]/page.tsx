import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EQUIPMENT_GROUPS, getEquipmentGroup, getManualsByGroup } from '@/lib/manuals'

export function generateStaticParams() {
  return EQUIPMENT_GROUPS.map(g => ({ equipmentType: g.key }))
}

export default function EquipmentManualsPage({ params }: { params: { equipmentType: string } }) {
  const group = getEquipmentGroup(params.equipmentType)
  if (!group) { notFound(); return null }
  const manuals = getManualsByGroup(group.key)

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* 브레드크럼: 데스크톱 */}
        <nav className="hidden md:flex items-center gap-2 text-[13px] text-secondary mb-6">
          <Link href="/" className="hover:text-primary no-underline">홈</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <Link href="/manuals" className="hover:text-primary no-underline">설비매뉴얼</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-background font-semibold">{group.name}</span>
        </nav>

        {/* 뒤로가기: 모바일 */}
        <Link href="/manuals" className="md:hidden inline-flex items-center gap-1 text-[13px] text-secondary hover:text-primary no-underline mb-4">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>설비매뉴얼
        </Link>

        <div className="flex items-center gap-3 mb-1">
          <span className="text-[28px] leading-none">{group.icon}</span>
          <h1 className="font-headline text-[24px] md:text-[28px] font-bold text-on-background">{group.name}</h1>
        </div>
        <p className="text-[14px] text-secondary mb-6 md:mb-8">{group.model} · 매뉴얼 {manuals.length}종</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {manuals.map(m => (
            <Link key={m.id} href={`/manual/${m.id}/1`}
              className="group block bg-surface-container-lowest border border-outline-variant rounded-xl p-5 md:p-6 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all no-underline">
              <div className="w-10 h-10 rounded-lg bg-primary-container/15 text-primary flex items-center justify-center mb-3 text-[20px]">{m.icon}</div>
              <h2 className="font-headline text-[16px] md:text-[17px] font-bold text-on-background mb-1 group-hover:text-primary transition-colors">{m.title}</h2>
              <p className="text-[12px] text-secondary mb-3 line-clamp-1">{m.subtitle}</p>
              <span className="text-[11px] text-secondary px-2.5 py-1 bg-surface-container-low rounded-full border border-outline-variant/50">{m.totalSlides} 슬라이드</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
