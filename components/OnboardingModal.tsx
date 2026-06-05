'use client'
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'onboarding-done'

interface Slide { emoji: string; title: string; desc: string }

const slides: Slide[] = [
  {
    emoji: '🤖',
    title: '기술혁신팀에 오신 걸 환영합니다',
    desc: 'Krones 라벨러 매뉴얼과 설비 이상발생 사례를 한 곳에서 찾아보세요.',
  },
  {
    emoji: '📚',
    title: '설비매뉴얼',
    desc: 'Krones 라벨러 정비·운영 매뉴얼 152장과 강사 현장 노하우를 슬라이드로 보고, 궁금한 건 AI에게 바로 물어볼 수 있어요.',
  },
  {
    emoji: '🤖',
    title: 'AI 사례검색',
    desc: '"글루 롤러에 라벨이 말려요" 처럼 평소 말투로 질문하면, 과거 트러블 사례 294건에서 AI가 답을 찾아드립니다.',
  },
  {
    emoji: '📊',
    title: '공장별 현황',
    desc: '어느 공장·어느 설비에서 이상이 자주 발생하는지 통계와 차트로 한눈에 파악하세요.',
  },
  {
    emoji: '🚀',
    title: '이제 시작해볼까요?',
    desc: '언제든 상단 검색창이나 AI 사례검색을 이용하세요. 이 안내는 우측 하단 ? 버튼으로 다시 볼 수 있어요.',
  },
]

export default function OnboardingModal() {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  // SSR 회피: 마운트 후에만 localStorage 확인 → 첫 방문이면 자동 표시
  useEffect(() => {
    setMounted(true)
    let done = false
    try { done = localStorage.getItem(STORAGE_KEY) === 'true' } catch {}
    if (!done) setOpen(true)
  }, [])

  // 우측 하단 ? 버튼 / 외부에서 다시 열기
  useEffect(() => {
    const restart = () => { setStep(0); setOpen(true) }
    window.addEventListener('restart-onboarding', restart)
    return () => window.removeEventListener('restart-onboarding', restart)
  }, [])

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true') } catch {}
    setOpen(false)
  }

  const isLast = step === slides.length - 1
  const next = () => { if (isLast) finish(); else setStep(s => s + 1) }
  const prev = () => setStep(s => Math.max(0, s - 1))

  if (!mounted) return null

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4"
          onClick={finish}
        >
          <div
            className="relative w-[90%] max-w-[420px] bg-surface-container-lowest rounded-2xl shadow-2xl p-8 pt-10"
            onClick={e => e.stopPropagation()}
          >
            {/* 닫기(건너뛰기) */}
            <button
              onClick={finish}
              aria-label="건너뛰기"
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-secondary hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            {/* 카드 내용 */}
            <div className="text-center">
              <div className="text-[64px] leading-none mb-5">{slides[step].emoji}</div>
              <h2 className="font-headline text-[20px] font-bold text-on-background mb-3">{slides[step].title}</h2>
              <p className="text-[14px] text-on-surface-variant leading-relaxed min-h-[66px]">{slides[step].desc}</p>
            </div>

            {/* 진행 점 */}
            <div className="flex items-center justify-center gap-2 my-6">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  aria-label={`${i + 1}단계로 이동`}
                  className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-2 bg-outline-variant hover:bg-outline'}`}
                />
              ))}
            </div>

            {/* 이전 / 다음 */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={prev}
                disabled={step === 0}
                className="px-4 py-2.5 rounded-lg text-[14px] font-medium text-secondary hover:bg-surface-container-high transition-colors disabled:opacity-0 disabled:pointer-events-none"
              >
                이전
              </button>
              <button
                onClick={next}
                className="px-6 py-2.5 rounded-lg bg-primary text-white text-[14px] font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5"
              >
                {isLast ? '시작하기' : '다음'}
                {!isLast && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
              </button>
            </div>
          </div>
        </div>
      )}

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
