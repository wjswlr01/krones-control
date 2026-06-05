'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'

export default function TopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { toggle } = useSidebar()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const getContext = () => {
    if (pathname.startsWith('/incidents')) {
      return { placeholder: '이상발생 사례 검색', route: '/incidents/list' }
    }
    if (pathname.startsWith('/manual') || pathname.startsWith('/manuals')) {
      return { placeholder: '매뉴얼·강의 검색', route: '/search' }
    }
    return { placeholder: '전체 검색 (매뉴얼·강의·이상발생)', route: '/search' }
  }

  const { placeholder, route } = getContext()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`${route}?q=${encodeURIComponent(query.trim())}`)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (pathname === '/login') return null

  return (
    <header className="bg-surface border-b border-outline-variant flex items-center h-16 px-4 md:px-6 flex-shrink-0 sticky top-0 z-30 gap-2">
      {/* 모바일: 햄버거 */}
      <button onClick={toggle} aria-label="메뉴 열기"
        className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-background flex-shrink-0">
        <span className="material-symbols-outlined text-[24px]">menu</span>
      </button>
      {/* 모바일: 타이틀 */}
      <span className="md:hidden font-headline text-[16px] font-bold text-primary truncate flex-1">기술혁신팀</span>

      {/* 데스크톱: 와이드 검색바 */}
      <form onSubmit={handleSubmit} className="hidden md:block flex-1 max-w-3xl mx-auto">
        <div className="relative" data-tour="search">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px] pointer-events-none">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-11 pr-16 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-[14px] text-on-background placeholder:text-outline outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[11px] font-mono bg-surface-container-high text-secondary rounded pointer-events-none">Ctrl K</kbd>
        </div>
      </form>

      {/* 모바일: 검색 아이콘 */}
      <button onClick={() => router.push(route)} aria-label="검색"
        className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-background flex-shrink-0">
        <span className="material-symbols-outlined text-[24px]">search</span>
      </button>
    </header>
  )
}
