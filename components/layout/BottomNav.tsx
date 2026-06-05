'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab {
  href: string
  icon: string
  label: string
  match: (p: string) => boolean
}

const tabs: Tab[] = [
  { href: '/', icon: 'home', label: '홈', match: p => p === '/' },
  { href: '/manuals', icon: 'menu_book', label: '매뉴얼', match: p => p.startsWith('/manual') },
  { href: '/incidents/ai-search', icon: 'smart_toy', label: 'AI검색', match: p => p === '/incidents/ai-search' },
  { href: '/incidents/by-factory', icon: 'bar_chart', label: '현황', match: p => p === '/incidents/by-factory' },
]

export default function BottomNav() {
  const pathname = usePathname()

  if (pathname === '/login') return null

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-surface border-t border-outline-variant z-50 flex items-stretch">
      {tabs.map(tab => {
        const active = tab.match(pathname)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 no-underline"
          >
            <span className={`flex items-center justify-center px-4 py-0.5 rounded-full transition-colors ${active ? 'bg-primary/10' : ''}`}>
              <span
                className={`material-symbols-outlined text-[24px] ${active ? 'text-primary' : 'text-on-surface-variant'}`}
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {tab.icon}
              </span>
            </span>
            <span className={`text-[11px] leading-none ${active ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
