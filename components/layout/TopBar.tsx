'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

export default function TopBar() {
  const router = useRouter()
  const pathname = usePathname()
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
    <header className="bg-surface border-b border-outline-variant flex items-center h-16 px-6 flex-shrink-0 sticky top-0 z-30">
      <form onSubmit={handleSubmit} className="flex-1 max-w-3xl mx-auto">
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
    </header>
  )
}
