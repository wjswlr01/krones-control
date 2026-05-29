import Link from 'next/link'
import { getAllManuals } from '@/lib/manuals'

export default function ManualsPage() {
  const manuals = getAllManuals()
  const totalSlides = manuals.reduce((s, m) => s + m.totalSlides, 0)

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[1200px] mx-auto px-8 py-8">
        <nav className="flex items-center gap-2 text-[13px] text-secondary mb-6">
          <Link href="/" className="hover:text-primary no-underline transition-colors">홈</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-background font-semibold">설비매뉴얼</span>
        </nav>
        <h1 className="font-headline text-[28px] font-bold text-on-background mb-2">설비매뉴얼</h1>
        <p className="text-[14px] text-secondary mb-8">설비 종류를 선택하세요.</p>
        <div className="grid grid-cols-2 gap-6">
          <Link href="/manuals/contiroll-hs" className="group block bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all no-underline">
            <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>factory</span>
            </div>
            <h2 className="font-headline text-[20px] font-bold text-on-background mb-1">Krones Contiroll HS</h2>
            <p className="text-[13px] text-secondary mb-4">롤타입 필름 라벨러</p>
            <div className="flex flex-wrap gap-2 text-[12px] text-secondary">
              <span className="px-2.5 py-1 bg-surface-container-low rounded-full border border-outline-variant/50">매뉴얼 {manuals.length}권</span>
              <span className="px-2.5 py-1 bg-surface-container-low rounded-full border border-outline-variant/50">슬라이드 {totalSlides}장</span>
              <span className="px-2.5 py-1 bg-surface-container-low rounded-full border border-outline-variant/50">강의 9편</span>
            </div>
          </Link>
          <div className="block bg-surface-container-low border border-dashed border-outline-variant rounded-xl p-6 opacity-50">
            <div className="w-12 h-12 rounded-lg bg-surface-container text-secondary flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[28px]">inventory_2</span>
            </div>
            <h2 className="font-headline text-[20px] font-bold text-on-background mb-1">추가 예정</h2>
            <p className="text-[13px] text-secondary">Variopack, Volumetic 등</p>
          </div>
        </div>
      </div>
    </div>
  )
}
