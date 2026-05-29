import Link from 'next/link'
import { getAllManuals } from '@/lib/manuals'

export default function ManualsPage() {
  const manuals = getAllManuals()
  const totalSlides = manuals.reduce((sum, m) => sum + m.totalSlides, 0)

  return (
    <div className="flex-1 overflow-y-auto bg-muted">
      <div className="max-w-reading mx-auto px-8 py-8">
        <div className="flex items-center gap-2 text-[12px] text-sub mb-4">
          <Link href="/" className="hover:text-ink no-underline">홈</Link>
          <span className="text-faint">›</span>
          <span className="text-ink font-semibold">설비매뉴얼</span>
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">설비매뉴얼</h1>
        <p className="text-[13px] text-sub mb-8">설비 종류를 선택하세요.</p>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/manuals/contiroll-hs" className="block bg-bg border border-border rounded-lg p-6 hover:border-primary hover:shadow-card transition-all no-underline">
            <div className="text-4xl mb-3">🏭</div>
            <h2 className="text-lg font-bold text-ink mb-1">Krones Contiroll HS</h2>
            <p className="text-[12px] text-sub mb-4">롤타입 필름 라벨러</p>
            <div className="flex flex-wrap gap-2 text-[11px] text-sub">
              <span className="px-2 py-0.5 bg-surface rounded">📄 매뉴얼 {manuals.length}권</span>
              <span className="px-2 py-0.5 bg-surface rounded">🎬 슬라이드 {totalSlides}장</span>
              <span className="px-2 py-0.5 bg-surface rounded">🎓 강의 9편</span>
            </div>
          </Link>
          <div className="block bg-bg border border-dashed border-border rounded-lg p-6 opacity-40">
            <div className="text-4xl mb-3">📦</div>
            <h2 className="text-lg font-bold text-ink mb-1">추가 예정</h2>
            <p className="text-[12px] text-sub">Variopack, Volumetic 등</p>
          </div>
        </div>
      </div>
    </div>
  )
}
