import Link from 'next/link'
import OnboardingTour from '@/components/OnboardingTour'

export default function HomePage() {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <OnboardingTour />
      <div className="max-w-5xl mx-auto px-8 py-16 flex flex-col items-center justify-center min-h-full">
        <div className="text-center mb-16 max-w-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6">
            <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>precision_manufacturing</span>
          </div>
          <h1 className="font-headline text-[36px] font-bold text-on-background mb-3 tracking-tight">기술혁신팀</h1>
          <p className="text-[18px] text-secondary leading-relaxed">Krones 라벨러 매뉴얼 + 설비 이상발생 사례 통합</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          <Link href="/manuals" className="group relative block bg-surface-container-lowest border border-outline-variant rounded-xl p-8 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all no-underline overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
            <div className="text-[64px] leading-none mb-6 relative">📚</div>
            <h2 className="font-headline text-[24px] font-bold text-on-background mb-2 relative">설비매뉴얼</h2>
            <p className="text-[14px] text-secondary mb-8 leading-relaxed relative">Krones 라벨러 정비·운영 매뉴얼과 강사 강의 노트</p>
            <div className="flex items-center justify-end gap-1 text-primary text-[14px] font-semibold relative">
              바로가기 <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </Link>

          <Link href="/incidents" className="group relative block bg-surface-container-lowest border border-outline-variant rounded-xl p-8 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all no-underline overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary-fixed/30 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
            <div className="text-[64px] leading-none mb-6 relative">📋</div>
            <h2 className="font-headline text-[24px] font-bold text-on-background mb-2 relative">이상발생보고</h2>
            <p className="text-[14px] text-secondary mb-8 leading-relaxed relative">MES 기반 트러블 사례 2,145건 · 공장별 현황 + AI 검색</p>
            <div className="flex items-center justify-end gap-1 text-primary text-[14px] font-semibold relative">
              바로가기 <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
