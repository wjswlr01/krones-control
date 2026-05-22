'use client'
// components/layout/TopBar.tsx
import SearchBar from '@/components/search/SearchBar'

export default function TopBar() {
  return (
    <header className="bg-bg border-b border-border h-14 flex items-center px-6 gap-4 sticky top-0 z-30">
      <div className="flex-1 max-w-2xl">
        <SearchBar />
      </div>
      <div className="flex-1" />
      <button className="text-sub hover:text-ink text-xl">🔔</button>
      <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-sm">
        👤
      </div>
    </header>
  )
}
