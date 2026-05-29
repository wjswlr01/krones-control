'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { notFound, useParams, useRouter, useSearchParams } from 'next/navigation'
import { getManual } from '@/lib/manuals'
import { getChunk, getChunksByFile } from '@/lib/chunks'
import SlideContext from '@/components/manual/SlideContext'

export default function SlideViewerPage() {
  const router = useRouter()
  const params = useParams<{ fileId: string; slideNum: string }>()
  const searchParams = useSearchParams()
  const [isFullscreen, setFullscreen] = useState(() => searchParams?.get('fs') === '1')

  const manual = getManual(params.fileId)
  const slideNum = parseInt(params.slideNum, 10)

  // URL ↔ fullscreen 상태 동기화
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const has = url.searchParams.get('fs') === '1'
    if (isFullscreen && !has) {
      url.searchParams.set('fs', '1')
      window.history.replaceState({}, '', url.toString())
    } else if (!isFullscreen && has) {
      url.searchParams.delete('fs')
      window.history.replaceState({}, '', url.toString())
    }
  }, [isFullscreen])

  // 키보드 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') setFullscreen(false)
      if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey) setFullscreen(prev => !prev)
      if (!manual) return
      const suffix = isFullscreen ? '?fs=1' : ''
      if (e.key === 'ArrowLeft' && slideNum > 1) router.push(`/manual/${manual.id}/${slideNum - 1}${suffix}`)
      if (e.key === 'ArrowRight' && slideNum < manual.totalSlides) router.push(`/manual/${manual.id}/${slideNum + 1}${suffix}`)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [manual, slideNum, router, isFullscreen])

  if (!manual || isNaN(slideNum)) { notFound(); return null }

  const chunk = getChunk(params.fileId, slideNum)
  const allSlides = getChunksByFile(params.fileId)
  const prevSlide = slideNum > 1 ? slideNum - 1 : null
  const nextSlide = slideNum < manual.totalSlides ? slideNum + 1 : null
  const imgSrc = `/slides/${params.fileId}/slide_${String(slideNum).padStart(3, '0')}.webp`
  const suffix = isFullscreen ? '?fs=1' : ''
  const buildHref = (n: number) => `/manual/${manual.id}/${n}${suffix}`

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-[280px] border-r border-outline-variant bg-surface-container-low overflow-y-auto flex-shrink-0">
        <div className="px-4 py-3 border-b border-outline-variant sticky top-0 bg-surface-container-low z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{manual.icon}</span>
            <Link href={`/manual/${manual.id}/1`} className="font-headline text-[14px] font-bold text-on-background no-underline hover:text-primary">
              {manual.title}
            </Link>
          </div>
          <p className="text-[11px] text-secondary">{manual.totalSlides} 슬라이드</p>
        </div>
        <nav className="py-2">
          {allSlides.map(s => (
            <Link key={s.slide_number} href={buildHref(s.slide_number)}
              className={`block px-4 py-2 text-[12px] no-underline border-l-4 transition-colors
                ${s.slide_number === slideNum
                  ? 'bg-primary-container/15 border-l-primary text-primary font-bold'
                  : 'border-l-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-background'
                }`}
            >
              <div className="flex gap-2 items-start">
                <span className="font-mono text-[10px] text-outline flex-shrink-0 w-7">
                  {String(s.slide_number).padStart(3, '0')}
                </span>
                <span className="line-clamp-2">{s.page_title || `슬라이드 ${s.slide_number}`}</span>
              </div>
            </Link>
          ))}
        </nav>
      </aside>

      <section className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-[900px] mx-auto px-8 py-8">
          <nav className="flex items-center gap-2 text-[13px] text-secondary mb-4">
            <Link href="/" className="hover:text-primary no-underline">홈</Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <Link href="/manuals" className="hover:text-primary no-underline">매뉴얼</Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-on-background font-semibold">{manual.title}</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="font-mono text-outline">#{String(slideNum).padStart(3, '0')}</span>
          </nav>

          {chunk?.page_title && <h1 className="font-headline text-[26px] font-bold text-on-background mb-1">{chunk.page_title}</h1>}
          <p className="text-[12px] text-secondary mb-4">슬라이드 {slideNum} / {manual.totalSlides}</p>

          <div className="relative bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all overflow-hidden mb-6 group">
            <img src={imgSrc} alt={`${manual.title} 슬라이드 ${slideNum}`} className="w-full h-auto block" />
            <button onClick={() => setFullscreen(true)}
              className="absolute top-3 right-3 px-4 py-2 bg-inverse-surface/80 backdrop-blur-sm text-inverse-on-surface text-[12px] font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 shadow-lg"
              aria-label="최대화">
              <span className="material-symbols-outlined text-[18px]">fullscreen</span> 최대화
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-inverse-on-surface/20 rounded">F</kbd>
            </button>
          </div>

          {chunk?.text && (
            <details className="bg-surface-container-low border border-outline-variant rounded-xl mb-6">
              <summary className="cursor-pointer px-4 py-3 text-[13px] font-semibold text-on-background hover:bg-surface-container-high rounded-xl transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">description</span>슬라이드 텍스트 보기
              </summary>
              <div className="px-4 pb-4 pt-2 doc-prose whitespace-pre-wrap text-[13px]">{chunk.text}</div>
            </details>
          )}

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-outline-variant">
            {prevSlide ? (
              <Link href={buildHref(prevSlide)} className="flex items-center gap-2 px-6 py-2.5 border border-outline text-secondary rounded-lg hover:bg-surface-container-low hover:text-on-background no-underline text-[13px] transition-colors">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>이전 ({prevSlide})
              </Link>
            ) : <span />}
            {nextSlide && (
              <Link href={buildHref(nextSlide)} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary/90 no-underline text-[13px] font-semibold shadow-sm transition-colors">
                다음 ({nextSlide})<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <aside className="w-[320px] border-l border-outline-variant bg-surface-container-low flex flex-col flex-shrink-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-lowest flex-shrink-0">
          <h3 className="font-headline text-[14px] font-bold text-on-background flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-primary">forum</span>관련 강의 노트
          </h3>
          <p className="text-[11px] text-secondary mt-0.5">강사 녹취록 기반</p>
        </div>
        <SlideContext chunk={chunk} />
      </aside>

      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-inverse-surface/95 flex flex-col backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-3 text-inverse-on-surface bg-inverse-surface/50 backdrop-blur-sm border-b border-surface-variant/20">
            <div className="flex items-baseline gap-3">
              <span className="text-base">{manual.icon}</span>
              <span className="text-[14px] font-semibold">{manual.title}</span>
              {chunk?.page_title && <span className="text-[12px] text-inverse-on-surface/70">· {chunk.page_title}</span>}
              <span className="text-[12px] text-inverse-on-surface/50 font-mono">슬라이드 {slideNum} / {manual.totalSlides}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:flex items-center gap-1.5 text-[11px] text-inverse-on-surface/50">
                <kbd className="px-1.5 py-0.5 font-mono bg-surface-variant/15 rounded">←</kbd>
                <kbd className="px-1.5 py-0.5 font-mono bg-surface-variant/15 rounded">→</kbd>
                <span>이전/다음</span>
                <kbd className="ml-2 px-1.5 py-0.5 font-mono bg-surface-variant/15 rounded">ESC</kbd>
                <span>닫기</span>
              </span>
              <button onClick={() => setFullscreen(false)} className="px-3 py-1.5 bg-surface-variant/10 hover:bg-surface-variant/20 text-inverse-on-surface text-[12px] rounded-md flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">close</span>닫기
              </button>
            </div>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              <div className="flex-1 flex items-center justify-center overflow-hidden mb-4">
                <img src={imgSrc} alt={`${manual.title} 슬라이드 ${slideNum}`}
                  className="max-w-[80%] max-h-full object-contain bg-background rounded-xl border border-surface-variant/30"
                  style={{ boxShadow: '0 0 40px rgba(255,255,255,0.1)' }} />
              </div>
              {chunk?.text && (
                <details className="bg-surface-container-lowest border border-outline-variant rounded-xl mb-3 max-h-[200px] overflow-y-auto">
                  <summary className="cursor-pointer px-4 py-2 text-[13px] font-semibold text-on-background hover:bg-surface-container-low sticky top-0 bg-surface-container-lowest flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">description</span>슬라이드 텍스트 보기
                  </summary>
                  <div className="px-4 pb-4 pt-2 text-[12px] text-on-surface-variant whitespace-pre-wrap leading-relaxed">{chunk.text}</div>
                </details>
              )}
              <div className="flex items-center justify-between gap-3">
                {prevSlide ? (
                  <Link href={buildHref(prevSlide)} className="flex items-center gap-2 px-6 py-3 bg-surface-variant/10 hover:bg-surface-variant/20 border border-surface-variant/30 text-surface-container-lowest backdrop-blur-md rounded-full text-[13px] no-underline transition-colors">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>이전 ({prevSlide})
                  </Link>
                ) : <span />}
                {nextSlide && (
                  <Link href={buildHref(nextSlide)} className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary-fixed-dim text-on-primary rounded-full text-[13px] font-bold shadow-lg shadow-primary/20 no-underline transition-colors">
                    다음 ({nextSlide})<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                )}
              </div>
            </div>
            <aside className="w-[360px] bg-surface-container-lowest border-l border-outline-variant text-on-surface flex flex-col flex-shrink-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-lowest flex-shrink-0">
                <h3 className="font-headline text-[14px] font-bold text-on-background flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">forum</span>관련 강의 노트
                </h3>
                <p className="text-[11px] text-secondary mt-0.5">강사 녹취록 기반</p>
              </div>
              <SlideContext chunk={chunk} />
            </aside>
          </div>
        </div>
      )}
    </div>
  )
}
