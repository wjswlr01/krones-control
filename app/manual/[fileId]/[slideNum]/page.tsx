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
      <aside className="w-[280px] border-r border-border bg-surface overflow-y-auto flex-shrink-0">
        <div className="px-4 py-3 border-b border-border sticky top-0 bg-surface z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{manual.icon}</span>
            <Link href={`/manual/${manual.id}/1`} className="text-[14px] font-bold text-ink no-underline hover:text-primary">
              {manual.title}
            </Link>
          </div>
          <p className="text-[11px] text-sub">{manual.totalSlides} 슬라이드</p>
        </div>
        <nav className="py-2">
          {allSlides.map(s => (
            <Link key={s.slide_number} href={buildHref(s.slide_number)}
              className={`block px-4 py-2 text-[12px] no-underline border-l-2 transition-colors
                ${s.slide_number === slideNum
                  ? 'bg-bg border-l-primary text-ink font-semibold'
                  : 'border-l-transparent text-body hover:bg-bg hover:text-ink'
                }`}
            >
              <div className="flex gap-2 items-start">
                <span className="font-mono text-[10px] text-faint flex-shrink-0 w-7">
                  {String(s.slide_number).padStart(3, '0')}
                </span>
                <span className="line-clamp-2">{s.page_title || `슬라이드 ${s.slide_number}`}</span>
              </div>
            </Link>
          ))}
        </nav>
      </aside>

      <section className="flex-1 overflow-y-auto bg-muted">
        <div className="max-w-reading mx-auto px-8 py-8">
          <div className="flex items-center gap-2 text-[12px] text-sub mb-4">
            <Link href="/" className="hover:text-ink no-underline">홈</Link>
            <span className="text-faint">›</span>
            <Link href="/" className="hover:text-ink no-underline">매뉴얼</Link>
            <span className="text-faint">›</span>
            <span className="text-ink font-semibold">{manual.title}</span>
            <span className="text-faint">›</span>
            <span className="font-mono text-faint">#{String(slideNum).padStart(3, '0')}</span>
          </div>

          {chunk?.page_title && <h1 className="text-2xl font-bold text-ink mb-1">{chunk.page_title}</h1>}
          <p className="text-[12px] text-sub mb-4">슬라이드 {slideNum} / {manual.totalSlides}</p>

          <div className="relative bg-bg border border-border rounded-lg shadow-card overflow-hidden mb-6 group">
            <img src={imgSrc} alt={`${manual.title} 슬라이드 ${slideNum}`} className="w-full h-auto block" />
            <button onClick={() => setFullscreen(true)}
              className="absolute top-3 right-3 px-3 py-2 bg-ink/85 text-white text-[12px] font-semibold rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 shadow-lg"
              aria-label="최대화">
              <span className="text-base leading-none">⛶</span> 최대화
              <kbd className="ml-1 px-1 py-0.5 text-[10px] font-mono bg-white/20 rounded">F</kbd>
            </button>
          </div>

          {chunk?.text && (
            <details className="bg-bg border border-border rounded-lg mb-6">
              <summary className="cursor-pointer px-4 py-3 text-[13px] font-semibold text-ink hover:bg-surface">📄 슬라이드 텍스트 보기</summary>
              <div className="px-4 pb-4 pt-2 doc-prose whitespace-pre-wrap text-[13px]">{chunk.text}</div>
            </details>
          )}

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
            {prevSlide ? (
              <Link href={buildHref(prevSlide)} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:border-primary hover:text-primary no-underline text-[13px] text-body">← 이전 ({prevSlide})</Link>
            ) : <span />}
            {nextSlide && (
              <Link href={buildHref(nextSlide)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-accent no-underline text-[13px]">다음 ({nextSlide}) →</Link>
            )}
          </div>
        </div>
      </section>

      <aside className="w-[320px] border-l border-border bg-surface flex flex-col flex-shrink-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface flex-shrink-0">
          <h3 className="text-[14px] font-bold text-ink">🎓 관련 강의 노트</h3>
          <p className="text-[11px] text-sub mt-0.5">강사 녹취록 기반</p>
        </div>
        <SlideContext chunk={chunk} />
      </aside>

      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-ink/95 flex flex-col backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-3 text-white border-b border-white/10">
            <div className="flex items-baseline gap-3">
              <span className="text-base">{manual.icon}</span>
              <span className="text-[14px] font-semibold">{manual.title}</span>
              {chunk?.page_title && <span className="text-[12px] text-white/70">· {chunk.page_title}</span>}
              <span className="text-[12px] text-white/50 font-mono">슬라이드 {slideNum} / {manual.totalSlides}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:flex items-center gap-1.5 text-[11px] text-white/50">
                <kbd className="px-1.5 py-0.5 font-mono bg-white/10 rounded">←</kbd>
                <kbd className="px-1.5 py-0.5 font-mono bg-white/10 rounded">→</kbd>
                <span>이전/다음</span>
                <kbd className="ml-2 px-1.5 py-0.5 font-mono bg-white/10 rounded">ESC</kbd>
                <span>닫기</span>
              </span>
              <button onClick={() => setFullscreen(false)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[12px] rounded-md flex items-center gap-1">✕ 닫기</button>
            </div>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              <div className="flex-1 flex items-center justify-center overflow-hidden mb-4">
                <img src={imgSrc} alt={`${manual.title} 슬라이드 ${slideNum}`} className="max-w-full max-h-full object-contain rounded shadow-2xl" />
              </div>
              {chunk?.text && (
                <details className="bg-white border border-border rounded-lg mb-3 max-h-[200px] overflow-y-auto">
                  <summary className="cursor-pointer px-4 py-2 text-[13px] font-semibold text-ink hover:bg-surface sticky top-0 bg-white">📄 슬라이드 텍스트 보기</summary>
                  <div className="px-4 pb-4 pt-2 text-[12px] text-body whitespace-pre-wrap leading-relaxed">{chunk.text}</div>
                </details>
              )}
              <div className="flex items-center justify-between gap-3">
                {prevSlide ? (
                  <Link href={buildHref(prevSlide)} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[13px] no-underline">← 이전 ({prevSlide})</Link>
                ) : <span />}
                {nextSlide && (
                  <Link href={buildHref(nextSlide)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-accent text-white rounded-lg text-[13px] font-semibold no-underline">다음 ({nextSlide}) →</Link>
                )}
              </div>
            </div>
            <aside className="w-[360px] bg-white border-l border-border flex flex-col flex-shrink-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-white flex-shrink-0">
                <h3 className="text-[14px] font-bold text-ink">🎓 관련 강의 노트</h3>
                <p className="text-[11px] text-sub mt-0.5">강사 녹취록 기반</p>
              </div>
              <SlideContext chunk={chunk} />
            </aside>
          </div>
        </div>
      )}
    </div>
  )
}
