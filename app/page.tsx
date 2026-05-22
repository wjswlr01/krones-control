// app/page.tsx
import Link from 'next/link'
import { MANUALS } from '@/lib/manuals'

export default function HomePage() {
  return (
    <div className="max-w-doc mx-auto px-8 py-10">

      {/* 히어로 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-ink mb-2">Krones 라벨러 매뉴얼 시스템</h1>
        <p className="text-sub text-base">
          공식 매뉴얼 152장 + 강의 녹취 9개 파일을 AI 통합 검색으로 조회합니다.
        </p>
        <div className="mt-3 flex items-center gap-2 text-[12px] text-faint">
          <kbd className="px-1.5 py-0.5 font-mono bg-muted border border-border rounded">Ctrl K</kbd>
          <span>를 누르면 빠르게 검색할 수 있습니다.</span>
        </div>
      </div>

      {/* 매뉴얼 카드 */}
      <section className="mb-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-bold text-ink">📚 매뉴얼</h2>
          <span className="text-[12px] text-sub">4종 · 총 152 슬라이드</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {MANUALS.map(m => (
            <Link key={m.id} href={`/manual/${m.id}/1`}
              className="bg-bg border border-border rounded-xl p-5 shadow-card hover:shadow-hover hover:border-primary transition-all no-underline group"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[16px] font-bold text-ink group-hover:text-primary transition-colors">
                      {m.title}
                    </h3>
                    <span className="text-[11px] font-mono text-sub bg-muted px-1.5 py-0.5 rounded">
                      {m.totalSlides}장
                    </span>
                  </div>
                  <p className="text-[13px] text-sub">{m.subtitle}</p>
                  <p className="text-[11px] text-faint mt-2 font-mono">{m.fileName}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 빠른 진입 */}
      <section>
        <h2 className="text-xl font-bold text-ink mb-4">⚡ 빠른 진입</h2>
        <div className="grid grid-cols-3 gap-4">
          <Link href="/lecture"
            className="bg-bg border border-border rounded-xl p-5 shadow-card hover:shadow-hover hover:border-primary transition-all no-underline">
            <div className="text-2xl mb-2">🎓</div>
            <div className="text-[15px] font-bold text-ink mb-1">강의 노트</div>
            <div className="text-[12px] text-sub">현장 강의 녹취 9건</div>
          </Link>
          <Link href="/maintenance"
            className="bg-bg border border-border rounded-xl p-5 shadow-card hover:shadow-hover hover:border-primary transition-all no-underline">
            <div className="text-2xl mb-2">🔧</div>
            <div className="text-[15px] font-bold text-ink mb-1">설비 관리 기준</div>
            <div className="text-[12px] text-sub">일일·주간·월간 점검</div>
          </Link>
          <Link href="/manual/manual-04/1"
            className="bg-bg border border-border rounded-xl p-5 shadow-card hover:shadow-hover hover:border-primary transition-all no-underline">
            <div className="text-2xl mb-2">⚡</div>
            <div className="text-[15px] font-bold text-ink mb-1">트러블 TOP 10</div>
            <div className="text-[12px] text-sub">자주 발생하는 알람</div>
          </Link>
        </div>
      </section>
    </div>
  )
}
