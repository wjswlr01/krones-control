'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { EQUIPMENT_GROUPS, getManualsByGroup } from '@/lib/manuals'
import { useSidebar } from '@/contexts/SidebarContext'

interface MenuItem {
  label: string
  sublabel?: string  // 보조 라벨 (예: 영문 모델명) — 그룹 노드용
  icon: string  // Material Symbol name
  href?: string
  children?: MenuItem[]
  tourId?: string  // 온보딩 투어 타겟용 data-tour 값
  defaultOpen?: boolean  // 펼침 기본값 (미지정 시 상위에서 전달된 값)
}

function TreeItem({ item, level = 0, pathname, defaultOpen = true }: { item: MenuItem; level?: number; pathname: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(item.defaultOpen ?? defaultOpen)
  const hasChildren = item.children && item.children.length > 0
  const isActive = item.href ? pathname === item.href : false

  if (hasChildren) {
    const labelBlock = (
      <>
        <span className="material-symbols-outlined text-[20px] flex-shrink-0">{item.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="text-[14px] block truncate">{item.label}</span>
          {item.sublabel && <span className="text-[11px] text-secondary/70 block truncate font-normal">{item.sublabel}</span>}
        </span>
      </>
    )
    const rowClass = `${level === 0 ? 'font-bold text-on-background' : 'text-secondary'}`
    return (
      <div>
        {item.href ? (
          // href + children: 셰브론은 접기/펼치기, 라벨은 페이지 이동
          <div className={`flex items-center rounded-lg hover:bg-surface-container-high transition-colors ${rowClass}`} style={{ paddingLeft: `${0.75 + level * 0.5}rem` }}>
            <button onClick={() => setOpen(!open)} aria-label="펼치기/접기" className="py-2.5 pr-1 flex-shrink-0">
              <span className="material-symbols-outlined text-[18px] text-secondary" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>expand_more</span>
            </button>
            <Link href={item.href} data-tour={item.tourId} className={`flex items-center gap-3 py-2.5 pr-3 flex-1 min-w-0 no-underline ${rowClass}`}>
              {labelBlock}
            </Link>
          </div>
        ) : (
          <button onClick={() => setOpen(!open)} data-tour={item.tourId}
            className={`w-full flex items-center gap-3 py-2.5 pr-3 text-left hover:bg-surface-container-high rounded-lg transition-colors ${rowClass}`}
            style={{ paddingLeft: `${0.75 + level * 0.5}rem` }}>
            <span className="material-symbols-outlined text-[18px] text-secondary flex-shrink-0" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>expand_more</span>
            {labelBlock}
          </button>
        )}
        {open && item.children!.map((c, i) => <TreeItem key={i} item={c} level={level + 1} pathname={pathname} />)}
      </div>
    )
  }

  return (
    <Link href={item.href!} data-tour={item.tourId}
      className={`flex items-center gap-3 py-2.5 pr-3 no-underline rounded-lg transition-colors ${isActive ? 'bg-primary-container/15 text-primary font-bold border-l-4 border-primary' : 'text-secondary hover:bg-surface-container-high border-l-4 border-transparent'}`}
      style={{ paddingLeft: `${isActive ? 0.75 + level * 0.5 - 0.25 : 0.75 + level * 0.5}rem` }}>
      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
      <span className="text-[14px] flex-1 truncate">{item.label}</span>
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const { isOpen, close } = useSidebar()

  if (pathname === '/login') return null

  // 현재 보고 있는 매뉴얼 id (자동 펼침용)
  const activeManualId = pathname.startsWith('/manual/') ? pathname.split('/')[2] : null

  const menu: MenuItem[] = [
    { label: '홈', icon: 'home', href: '/' },
    {
      label: '설비매뉴얼', icon: 'menu_book', tourId: 'manuals', href: '/manuals', defaultOpen: true,
      children: EQUIPMENT_GROUPS.map(g => {
        const groupManuals = getManualsByGroup(g.key)
        return {
          label: g.name,
          sublabel: g.model,
          icon: 'factory',
          defaultOpen: groupManuals.some(m => m.id === activeManualId),  // 활성 매뉴얼 그룹만 펼침
          children: groupManuals.map(m => ({ label: m.title, icon: 'description', href: `/manual/${m.id}/1` })),
        }
      }),
    },
    {
      label: '이상발생보고', icon: 'report_problem',
      children: [
        { label: '공장별 현황', icon: 'bar_chart', href: '/incidents/by-factory', tourId: 'by-factory' },
        { label: 'AI 사례검색', icon: 'smart_toy', href: '/incidents/ai-search', tourId: 'ai-search' },
        { label: '전체 목록', icon: 'list_alt', href: '/incidents/list' },
      ]
    }
  ]

  return (
    <>
      {/* 모바일 백드롭 */}
      {isOpen && <div onClick={close} className="md:hidden fixed inset-0 z-40 bg-black/40" aria-hidden />}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 w-[260px] border-r border-outline-variant bg-surface-container-low flex flex-col flex-shrink-0 overflow-hidden transform transition-transform duration-200 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <Link href="/" className="px-4 py-5 border-b border-outline-variant/50 flex items-center gap-3 no-underline hover:bg-surface-container-high/50 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>precision_manufacturing</span>
        </div>
        <div className="min-w-0">
          <div className="font-headline text-[20px] font-bold text-primary leading-tight">기술혁신팀</div>
          <div className="text-[11px] text-secondary mt-0.5 tracking-wider">설비 운영 지원</div>
        </div>
      </Link>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {menu.map((item, i) => <TreeItem key={i} item={item} pathname={pathname} />)}
      </nav>
      <div className="px-4 py-3 border-t border-outline-variant/50 flex items-center gap-2 text-secondary/70">
        <span className="material-symbols-outlined text-[14px]">info</span>
        <span className="text-[10px] tracking-wider">롯데칠성 · 기술혁신팀 / v0.2.0</span>
      </div>
    </aside>
    </>
  )
}
