'use client'

// 홈 도움말 FAB — 클릭 시 온보딩 모달 재오픈 (OnboardingModal이 이벤트 수신)
// 모바일에선 하단 탭바(h-16) 위에, 데스크톱에선 우하단에 배치
export default function HelpFab() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event('restart-onboarding'))}
      aria-label="사용 안내 다시 보기"
      className="group fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 w-12 h-12 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 hover:scale-105 transition-all flex items-center justify-center"
    >
      <span className="material-symbols-outlined text-[24px]">help</span>
      <span className="absolute right-full mr-3 px-2.5 py-1.5 rounded-lg bg-on-background text-surface text-[12px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        사용 안내 다시 보기
      </span>
    </button>
  )
}
