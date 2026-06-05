'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface SidebarCtx {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const Ctx = createContext<SidebarCtx | null>(null)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // 라우트 변경 시 모바일 사이드바 자동 닫힘
  useEffect(() => { setIsOpen(false) }, [pathname])

  const value: SidebarCtx = {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(v => !v),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSidebar(): SidebarCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
