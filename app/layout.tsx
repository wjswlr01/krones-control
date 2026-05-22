// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

export const metadata: Metadata = {
  title:       'Krones Control · 라벨러 매뉴얼 시스템',
  description: '롯데칠성 기술혁신팀 · 라벨러 매뉴얼 및 강의 노트 조회',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto bg-bg">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
