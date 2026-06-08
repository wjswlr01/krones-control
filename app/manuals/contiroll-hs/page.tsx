import Link from 'next/link'
import { getManualsByGroup } from '@/lib/manuals'

export default function ContirollHsPage() {
  const manuals = getManualsByGroup('labeler')
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[1200px] mx-auto px-8 py-8">
        <nav className="flex items-center gap-2 text-[13px] text-secondary mb-6">
          <Link href="/" className="hover:text-primary no-underline">홈</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <Link href="/manuals" className="hover:text-primary no-underline">설비매뉴얼</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-background font-semibold">Krones Contiroll HS</span>
        </nav>
        <h1 className="font-headline text-[28px] font-bold text-on-background mb-2">Krones Contiroll HS</h1>
        <p className="text-[14px] text-secondary mb-8">롤타입 필름 라벨러 · 매뉴얼 {manuals.length}종</p>
        <div className="grid grid-cols-2 gap-4">
          {manuals.map(m => (
            <Link key={m.id} href={`/manual/${m.id}/1`} className="group block bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all no-underline">
              <div className="w-10 h-10 rounded-lg bg-primary-container/15 text-primary flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[22px]">description</span>
              </div>
              <h2 className="font-headline text-[17px] font-bold text-on-background mb-1">{m.title}</h2>
              <p className="text-[12px] text-secondary">{m.totalSlides} 슬라이드</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
