'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/contexts/SidebarContext'

// 사이드바는 대분류 단일 버튼 구조 (펼침/아코디언 없음).
// 하위 진입점은 각 랜딩 페이지가 제공: 교육자료=/manuals(설비 선택 블럭), 불가동 사례분석=/incidents(허브 카드).
interface NavItem {
  label: string
  icon: string                 // Material Symbol
  href?: string                // 없으면 비활성(준비중)
  match?: (p: string) => boolean
  disabled?: boolean
  tourId?: string
}

const NAV: NavItem[] = [
  { label: '홈',            icon: 'home',          href: '/',          match: p => p === '/' },
  { label: '교육자료',       icon: 'menu_book',     href: '/manuals',   match: p => p.startsWith('/manuals') || p.startsWith('/manual'), tourId: 'manuals' },
  // 설비 매뉴얼(PDF)은 자료 업로드 예정 → 업로드되면 disabled 제거하고 href 지정해 활성화할 것.
  { label: '매뉴얼',         icon: 'engineering',   disabled: true },
  { label: '불가동 사례분석', icon: 'report_problem', href: '/incidents', match: p => p.startsWith('/incidents'), tourId: 'incidents' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { isOpen, close } = useSidebar()

  if (pathname === '/login') return null

  return (
    <>
      {/* 모바일 백드롭 */}
      {isOpen && <div onClick={close} className="md:hidden fixed inset-0 z-40 bg-black/40" aria-hidden />}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 w-[260px] border-r border-outline-variant bg-surface-container-low flex flex-col flex-shrink-0 overflow-hidden transform transition-transform duration-200 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Link href="/" onClick={close} className="px-4 py-5 border-b border-outline-variant/50 flex items-center gap-3 no-underline hover:bg-surface-container-high/50 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>precision_manufacturing</span>
          </div>
          <div className="min-w-0">
            <div className="font-headline text-[20px] font-bold text-primary leading-tight">기술혁신팀</div>
            <div className="text-[11px] text-secondary mt-0.5 tracking-wider">설비 운영 지원</div>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {NAV.map(item => {
            if (item.disabled) {
              // 준비중: 흐리게 + 클릭 비활성 + '준비중' pill
              return (
                <div key={item.label} title="설비 매뉴얼은 준비 중입니다 (PDF 업로드 예정)"
                  className="flex items-center gap-3 py-2.5 pl-3 pr-2.5 rounded-lg opacity-50 cursor-not-allowed text-on-background select-none">
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className="text-[14px] flex-1 truncate font-medium">{item.label}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-container-high text-secondary border border-outline-variant flex-shrink-0">준비중</span>
                </div>
              )
            }
            const active = item.match!(pathname)
            return (
              <Link key={item.label} href={item.href!} data-tour={item.tourId} onClick={close}
                className={`flex items-center gap-3 py-2.5 pr-3 no-underline rounded-lg transition-colors border-l-4 ${active ? 'bg-primary-container/15 text-primary font-bold border-primary pl-2' : 'text-on-background font-medium hover:bg-surface-container-high border-transparent pl-3'}`}>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                <span className="text-[14px] flex-1 truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-3 border-t border-outline-variant/50 flex items-center gap-2 text-secondary/70">
          <span className="material-symbols-outlined text-[14px]">info</span>
          <span className="text-[10px] tracking-wider">롯데칠성 · 기술혁신팀 / v0.2.0</span>
        </div>
      </aside>
    </>
  )
}
