'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { Step, CallBackProps } from 'react-joyride'

// react-joyride는 window/document에 접근하므로 SSR 비활성화하여 클라이언트에서만 로드
const Joyride = dynamic(() => import('react-joyride'), { ssr: false })

const STORAGE_KEY = 'onboarding-done'

const steps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    content: '🤖 기술혁신팀에 오신 걸 환영합니다\n\nKrones 라벨러 매뉴얼과 설비 이상발생 사례를 한 곳에서 찾아보세요.',
  },
  {
    target: '[data-tour="manuals"]',
    content: '📚 설비매뉴얼\n\nKrones 라벨러 정비·운영 매뉴얼 152장과 강사 현장 노하우를 슬라이드로 보고, 궁금한 건 AI에게 바로 물어볼 수 있어요.',
  },
  {
    target: '[data-tour="ai-search"]',
    content: '🤖 AI 사례검색\n\n"글루 롤러에 라벨이 말려요" 처럼 평소 말투로 질문하면, 과거 트러블 사례 294건에서 AI가 답을 찾아드립니다.',
  },
  {
    target: '[data-tour="by-factory"]',
    content: '📊 공장별 현황\n\n어느 공장·어느 설비에서 이상이 자주 발생하는지 통계와 차트로 한눈에 파악하세요.',
  },
  {
    target: 'body',
    placement: 'center',
    content: '🚀 이제 시작해볼까요?\n\n언제든 상단 검색창이나 AI 사례검색을 이용하세요. 이 안내는 우측 하단 ? 버튼으로 다시 볼 수 있어요.',
  },
]

export default function OnboardingTour() {
  const [mounted, setMounted] = useState(false)
  const [run, setRun] = useState(false)
  const [tourKey, setTourKey] = useState(0)

  // 사이드바 메뉴(투어 타겟)가 렌더된 뒤 시작하도록 마운트 후 처리
  useEffect(() => {
    setMounted(true)
    let done = false
    try { done = localStorage.getItem(STORAGE_KEY) === 'true' } catch {}
    if (!done) {
      const t = setTimeout(() => setRun(true), 600)
      return () => clearTimeout(t)
    }
  }, [])

  // 우측 하단 "다시보기" 버튼 또는 외부에서 투어 재시작
  useEffect(() => {
    const restart = () => {
      setTourKey(k => k + 1) // 0번 스텝부터 다시 시작하도록 리마운트
      setRun(true)
    }
    window.addEventListener('restart-onboarding', restart)
    return () => window.removeEventListener('restart-onboarding', restart)
  }, [])

  const handleCallback = (data: CallBackProps) => {
    const { status } = data
    if (status === 'finished' || status === 'skipped') {
      try { localStorage.setItem(STORAGE_KEY, 'true') } catch {}
      setRun(false)
    }
  }

  if (!mounted) return null

  return (
    <>
      <Joyride
        key={tourKey}
        steps={steps}
        run={run}
        continuous
        showSkipButton
        showProgress
        scrollToFirstStep
        disableScrollParentFix
        callback={handleCallback}
        locale={{ back: '이전', close: '닫기', last: '시작하기', next: '다음', skip: '건너뛰기' }}
        styles={{
          options: { primaryColor: '#006591', zIndex: 10000, width: 360 },
          tooltipContent: { whiteSpace: 'pre-line', textAlign: 'left', lineHeight: 1.6 },
        }}
      />

      {/* 홈 우측 하단 "사용 안내 다시 보기" 버튼 */}
      <button
        onClick={() => window.dispatchEvent(new Event('restart-onboarding'))}
        aria-label="사용 안내 다시 보기"
        className="group fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 hover:scale-105 transition-all flex items-center justify-center"
      >
        <span className="material-symbols-outlined text-[24px]">help</span>
        <span className="absolute right-full mr-3 px-2.5 py-1.5 rounded-lg bg-on-background text-surface text-[12px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          사용 안내 다시 보기
        </span>
      </button>
    </>
  )
}
