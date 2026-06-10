// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import { SidebarProvider } from '@/contexts/SidebarContext'

export const metadata: Metadata = {
  title:       'Krones Control · 교육자료 · 불가동 사례분석',
  description: '롯데칠성 기술혁신팀 · 설비 교육자료 및 불가동 사례분석',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="bg-background h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-on-background font-body antialiased min-h-screen">
        <SidebarProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 w-full">
              <TopBar />
              <main className="flex-1 overflow-y-auto bg-background pb-16 md:pb-0 min-w-0">
                {children}
              </main>
            </div>
          </div>
          <BottomNav />
        </SidebarProvider>
      </body>
    </html>
  )
}
