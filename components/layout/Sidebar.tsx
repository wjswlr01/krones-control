'use client'
// components/layout/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MANUALS } from '@/lib/manuals'

interface NavItem { href: string; label: string; icon: string }
const PRIMARY: NavItem[] = [
  { href: '/',            label: '홈',         icon: '🏠' },
  { href: '/lecture',     label: '강의 노트',  icon: '🎓' },
  { href: '/maintenance', label: '설비 관리',  icon: '🔧' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="w-[260px] bg-surface border-r border-border flex flex-col flex-shrink-0 overflow-y-auto">
      {/* 로고 */}
      <div className="px-5 py-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm">K</div>
          <div>
            <div className="text-[15px] font-bold text-ink leading-tight">Krones Control</div>
            <div className="text-[10px] text-sub">기술혁신팀 · 라벨러</div>
          </div>
        </Link>
      </div>

      {/* 주 메뉴 */}
      <nav className="px-3 py-3">
        <div className="px-2 mb-1 text-[10px] uppercase font-semibold text-faint tracking-wider">메뉴</div>
        {PRIMARY.map(item => (
          <Link key={item.href} href={item.href}
            className={`flex items-center gap-2 px-2 py-2 rounded-md text-[14px] no-underline transition-colors mb-0.5
              ${isActive(item.href) ? 'bg-white text-ink font-semibold shadow-card' : 'text-body hover:bg-white hover:text-ink'}`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* 매뉴얼 목록 */}
      <nav className="px-3 py-3 border-t border-border">
        <div className="px-2 mb-1 text-[10px] uppercase font-semibold text-faint tracking-wider">매뉴얼</div>
        {MANUALS.map(m => (
          <Link key={m.id} href={`/manual/${m.id}/1`}
            className={`flex items-center gap-2 px-2 py-2 rounded-md text-[13px] no-underline transition-colors mb-0.5
              ${pathname.startsWith(`/manual/${m.id}`) ? 'bg-white text-ink font-semibold shadow-card' : 'text-body hover:bg-white hover:text-ink'}`}
          >
            <span>{m.icon}</span>
            <span className="flex-1 truncate">{m.title}</span>
            <span className="text-[10px] text-faint font-mono">{m.totalSlides}</span>
          </Link>
        ))}
      </nav>

      <div className="flex-1" />

      {/* 푸터 */}
      <div className="px-5 py-3 border-t border-border text-[10px] text-faint">
        <div>롯데칠성 · 기술혁신팀</div>
        <div className="font-mono mt-0.5">v0.1.0</div>
      </div>
    </aside>
  )
}
