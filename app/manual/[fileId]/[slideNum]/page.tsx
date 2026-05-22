// app/manual/[fileId]/[slideNum]/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getManual } from '@/lib/manuals'
import { getChunk, getChunksByFile } from '@/lib/chunks'
import SlideContext from '@/components/manual/SlideContext'

interface PageProps {
  params: { fileId: string; slideNum: string }
}

export default function SlideViewerPage({ params }: PageProps) {
  const manual = getManual(params.fileId)
  const slideNum = parseInt(params.slideNum, 10)
  if (!manual || isNaN(slideNum)) return notFound()

  const chunk = getChunk(params.fileId, slideNum)
  const allSlides = getChunksByFile(params.fileId)
  const prevSlide = slideNum > 1 ? slideNum - 1 : null
  const nextSlide = slideNum < manual.totalSlides ? slideNum + 1 : null

  const imgSrc = `/slides/${params.fileId}/slide_${String(slideNum).padStart(3, '0')}.webp`

  return (
    <div className="flex h-full overflow-hidden">

      {/* 좌측 슬라이드 목차 */}
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
          {allSlides.length === 0 ? (
            <div className="px-4 py-3 text-[12px] text-faint">
              chunks.json 데이터를 추가하세요.
            </div>
          ) : (
            allSlides.map(s => (
              <Link key={s.slide_number} href={`/manual/${manual.id}/${s.slide_number}`}
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
            ))
          )}
        </nav>
      </aside>

      {/* 중앙 슬라이드 뷰어 */}
      <section className="flex-1 overflow-y-auto bg-muted">
        <div className="max-w-reading mx-auto px-8 py-8">

          {/* 브레드크럼 */}
          <div className="flex items-center gap-2 text-[12px] text-sub mb-4">
            <Link href="/" className="hover:text-ink no-underline">홈</Link>
            <span className="text-faint">›</span>
            <Link href="/" className="hover:text-ink no-underline">매뉴얼</Link>
            <span className="text-faint">›</span>
            <span className="text-ink font-semibold">{manual.title}</span>
            <span className="text-faint">›</span>
            <span className="font-mono text-faint">#{String(slideNum).padStart(3, '0')}</span>
          </div>

          {/* 슬라이드 제목 */}
          {chunk?.page_title && (
            <h1 className="text-2xl font-bold text-ink mb-1">{chunk.page_title}</h1>
          )}
          <p className="text-[12px] text-sub mb-4">
            슬라이드 {slideNum} / {manual.totalSlides}
          </p>

          {/* 슬라이드 이미지 */}
          <div className="bg-bg border border-border rounded-lg shadow-card overflow-hidden mb-6">
            <img
              src={imgSrc}
              alt={`${manual.title} 슬라이드 ${slideNum}`}
              className="w-full h-auto block"
            />
          </div>

          {/* 텍스트 (검색·복사용) */}
          {chunk?.text && (
            <details className="bg-bg border border-border rounded-lg mb-6">
              <summary className="cursor-pointer px-4 py-3 text-[13px] font-semibold text-ink hover:bg-surface">
                📄 슬라이드 텍스트 보기
              </summary>
              <div className="px-4 pb-4 pt-2 doc-prose whitespace-pre-wrap text-[13px]">
                {chunk.text}
              </div>
            </details>
          )}

          {/* 페이지 네비게이션 */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
            {prevSlide ? (
              <Link href={`/manual/${manual.id}/${prevSlide}`}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:border-primary hover:text-primary no-underline text-[13px] text-body">
                ← 이전 ({prevSlide})
              </Link>
            ) : <span />}
            {nextSlide && (
              <Link href={`/manual/${manual.id}/${nextSlide}`}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-accent no-underline text-[13px]">
                다음 ({nextSlide}) →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 우측 강의 노트 패널 */}
      <aside className="w-[320px] border-l border-border bg-surface overflow-y-auto flex-shrink-0">
        <div className="px-4 py-3 border-b border-border sticky top-0 bg-surface z-10">
          <h3 className="text-[14px] font-bold text-ink">🎓 관련 강의 노트</h3>
          <p className="text-[11px] text-sub mt-0.5">강사 녹취록 기반 RAG</p>
        </div>
        <SlideContext chunk={chunk} />
      </aside>
    </div>
  )
}
