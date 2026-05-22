'use client'
// components/search/SearchBar.tsx
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  // Cmd/Ctrl + K 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const submit = () => {
    if (!query.trim()) return
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className={`
      flex items-center gap-2 bg-surface border rounded-lg px-3 h-10
      transition-colors
      ${focused ? 'border-primary bg-bg shadow-card' : 'border-border'}
    `}>
      <span className="text-sub text-base">🔍</span>
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="매뉴얼 · 강의 내용 검색"
        className="flex-1 bg-transparent border-none outline-none text-[14px] text-ink placeholder:text-faint"
      />
      <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono text-faint bg-muted border border-border rounded">
        Ctrl K
      </kbd>
    </div>
  )
}
