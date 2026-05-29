import Link from 'next/link'
import { getAllManuals } from '@/lib/manuals'

export default function ContirollHsPage() {
  const manuals = getAllManuals()

  return (
    <div className="flex-1 overflow-y-auto bg-muted">
      <div className="max-w-reading mx-auto px-8 py-8">
        <div className="flex items-center gap-2 text-[12px] text-sub mb-4">
          <Link href="/" className="hover:text-ink no-underline">홈</Link>
          <span className="text-faint">›</span>
          <Link href="/manuals" className="hover:text-ink no-underline">설비매뉴얼</Link>
          <span className="text-faint">›</span>
          <span className="text-ink font-semibold">Krones Contiroll HS</span>
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">Krones Contiroll HS</h1>
        <p className="text-[13px] text-sub mb-8">롤타입 필름 라벨러 · 매뉴얼 {manuals.length}종</p>
        <div className="grid grid-cols-2 gap-4">
          {manuals.map(m => (
            <Link key={m.id} href={`/manual/${m.id}/1`}
              className="block bg-bg border border-border rounded-lg p-6 hover:border-primary hover:shadow-card transition-all no-underline">
              <div className="text-3xl mb-3">{m.icon}</div>
              <h2 className="text-base font-bold text-ink mb-1">{m.title}</h2>
              <p className="text-[12px] text-sub">{m.totalSlides} 슬라이드</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
