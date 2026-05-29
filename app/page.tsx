import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex-1 overflow-y-auto bg-muted">
      <div className="max-w-5xl mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-ink mb-3">Krones Control</h1>
          <p className="text-[15px] text-sub">설비 매뉴얼 + 이상발생 사례 통합 플랫폼</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Link href="/manuals" className="block bg-bg border border-border rounded-xl p-8 hover:border-primary hover:shadow-lg transition-all no-underline group">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-xl font-bold text-ink mb-2 group-hover:text-primary">설비매뉴얼</h2>
            <p className="text-[13px] text-sub leading-relaxed">Krones 라벨러 정비·운영 매뉴얼과 강사 강의 노트</p>
            <div className="mt-4 text-[12px] text-primary font-semibold">바로가기 →</div>
          </Link>
          <Link href="/incidents" className="block bg-bg border border-border rounded-xl p-8 hover:border-primary hover:shadow-lg transition-all no-underline group">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-bold text-ink mb-2 group-hover:text-primary">이상발생보고</h2>
            <p className="text-[13px] text-sub leading-relaxed">MES 기반 트러블 사례 2,145건 · 공장별 현황 + AI 검색</p>
            <div className="mt-4 text-[12px] text-primary font-semibold">바로가기 →</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
