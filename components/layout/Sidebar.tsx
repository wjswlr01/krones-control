'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { getAllManuals } from '@/lib/manuals'

interface MenuItem {
  label: string
  icon: string
  href?: string
  children?: MenuItem[]
}

function TreeItem({ item, level = 0, pathname, defaultOpen = true }: { item: MenuItem; level?: number; pathname: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const hasChildren = item.children && item.children.length > 0
  const isActive = item.href ? pathname === item.href : false

  if (hasChildren) {
    return (
      <div>
        <button onClick={() => setOpen(!open)}
          className={`w-full flex items-center gap-2 py-1.5 pr-3 text-[13px] text-left hover:bg-muted rounded transition-colors ${level === 0 ? 'font-semibold text-ink' : 'text-body'}`}
          style={{ paddingLeft: `${0.75 + level * 0.75}rem` }}>
          <span className="text-[10px] text-faint w-3">{open ? '▼' : '▶'}</span>
          <span className="text-sm">{item.icon}</span>
          <span className="flex-1">{item.label}</span>
        </button>
        {open && item.children!.map((c, i) => <TreeItem key={i} item={c} level={level + 1} pathname={pathname} />)}
      </div>
    )
  }

  return (
    <Link href={item.href!}
      className={`flex items-center gap-2 py-1.5 pr-3 text-[13px] no-underline rounded transition-colors ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-body hover:bg-muted'}`}
      style={{ paddingLeft: `${0.75 + level * 0.75 + (level > 0 ? 0.7 : 0)}rem` }}>
      <span className="text-sm">{item.icon}</span>
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const manuals = getAllManuals()

  const menu: MenuItem[] = [
    { label: '홈', icon: '🏠', href: '/' },
    {
      label: '설비매뉴얼', icon: '📚',
      children: [
        {
          label: 'Krones Contiroll HS', icon: '🏭',
          children: manuals.map(m => ({
            label: m.title, icon: '📄', href: `/manual/${m.id}/1`,
          }))
        }
      ]
    },
    {
      label: '이상발생보고', icon: '📋',
      children: [
        { label: '공장별 현황', icon: '📊', href: '/incidents/by-factory' },
        { label: 'AI 사례검색', icon: '🤖', href: '/incidents/ai-search' },
        { label: '전체 목록', icon: '📑', href: '/incidents/list' },
      ]
    }
  ]

  return (
    <aside className="w-[260px] border-r border-border bg-surface flex flex-col flex-shrink-0 overflow-hidden">
      <div className="px-4 py-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center font-bold text-sm">K</div>
          <div>
            <div className="text-[14px] font-bold text-ink">Krones Control</div>
            <div className="text-[10px] text-sub">기술혁신팀 · 라벨러</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {menu.map((item, i) => <TreeItem key={i} item={item} pathname={pathname} />)}
      </nav>
      <div className="px-4 py-3 border-t border-border text-[10px] text-faint">롯데칠성 · 기술혁신팀<br />v0.2.0</div>
    </aside>
  )
}
