import Link from 'next/link'
import OnboardingModal from '@/components/OnboardingModal'
import HelpFab from '@/components/HelpFab'

const cards = [
  {
    href: '/manuals',
    icon: 'menu_book',
    iconBox: 'bg-primary-container',
    title: '교육자료',
    desc: 'Krones 라벨러·제병기·팩커·전기 교육자료와 강사 현장 노하우',
  },
  {
    href: '/incidents',
    icon: 'assignment',
    iconBox: 'bg-tertiary-container',
    title: '불가동 사례분석',
    desc: 'MES 기반 불가동 사례 분석 · 공장별 현황 + AI 사례검색',
  },
]

export default function HomePage() {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <OnboardingModal />

      <div className="max-w-[480px] md:max-w-4xl mx-auto px-5 md:px-8 py-12 md:py-16 flex flex-col items-center justify-center min-h-full">
        {/* Hero */}
        <div className="text-center mb-12 md:mb-16 max-w-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6">
            <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>precision_manufacturing</span>
          </div>
          <h1 className="font-headline text-[30px] md:text-[36px] font-bold text-on-background mb-3 tracking-tight">기술혁신팀</h1>
          <p className="text-[16px] md:text-[18px] text-secondary leading-relaxed">Krones 라벨러 매뉴얼 + 설비 이상발생 사례 통합</p>
        </div>

        {/* 서비스 카드: 모바일 세로 스택 / 데스크톱 2열 */}
        <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-6 w-full max-w-4xl">
          {cards.map(c => (
            <Link
              key={c.href}
              href={c.href}
              className="group bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 hover:-translate-y-0.5 hover:shadow-hover transition-all no-underline"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${c.iconBox} text-white mb-5`}>
                <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>{c.icon}</span>
              </div>
              <h2 className="font-headline text-[20px] md:text-[24px] font-bold text-on-background mb-2">{c.title}</h2>
              <p className="text-[14px] text-secondary mb-6 leading-relaxed">{c.desc}</p>
              <div className="flex items-center justify-end gap-1 text-primary text-[14px] font-semibold">
                바로가기 <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 도움말 FAB (홈에서만, 하단 탭바 위) */}
      <HelpFab />
    </div>
  )
}
