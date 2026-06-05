import Link from 'next/link'
import { getStats } from '@/lib/incidents'

export default function IncidentsHubPage() {
  const stats = getStats()
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <nav className="hidden md:flex items-center gap-2 text-[13px] text-secondary mb-6">
          <Link href="/" className="hover:text-primary no-underline">홈</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-background font-semibold">이상발생보고</span>
        </nav>
        <h1 className="font-headline text-[24px] md:text-[28px] font-bold text-on-background mb-4">이상발생보고</h1>

        {/* 모바일: 세로 통계 그리드 (글자별 줄바꿈 방지) */}
        <div className="grid grid-cols-3 gap-2 md:hidden bg-surface-container-low rounded-xl border border-outline-variant/50 p-3 mb-6">
          <div className="flex flex-col items-center text-center gap-0.5">
            <span className="material-symbols-outlined text-[18px] text-primary">data_usage</span>
            <span className="text-[18px] font-bold text-on-background leading-none">{stats.total.toLocaleString()}<span className="text-[11px] font-normal text-secondary ml-0.5">건</span></span>
            <span className="text-[11px] text-secondary whitespace-nowrap">전체</span>
          </div>
          <div className="flex flex-col items-center text-center gap-0.5">
            <span className="material-symbols-outlined text-[18px] text-tertiary-container">verified</span>
            <span className="text-[18px] font-bold text-on-background leading-none">{stats.bestPractice}<span className="text-[11px] font-normal text-secondary ml-0.5">건</span></span>
            <span className="text-[11px] text-secondary whitespace-nowrap">모범사례</span>
          </div>
          <div className="flex flex-col items-center text-center gap-0.5">
            <span className="material-symbols-outlined text-[18px] text-error">timer</span>
            <span className="text-[18px] font-bold text-on-background leading-none">{stats.longDowntime}<span className="text-[11px] font-normal text-secondary ml-0.5">건</span></span>
            <span className="text-[11px] text-secondary whitespace-nowrap">긴 다운타임</span>
          </div>
        </div>

        {/* 데스크톱: 가로 pill 바 (기존 유지) */}
        <div className="hidden md:inline-flex items-center gap-3 text-[13px] text-secondary bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/50 mb-8">
          <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-primary">data_usage</span>전체 <b className="text-on-background">{stats.total.toLocaleString()}</b>건</span>
          <span className="w-1 h-1 rounded-full bg-outline-variant"/>
          <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-tertiary-container">verified</span>모범사례 <b className="text-on-background">{stats.bestPractice}</b>건</span>
          <span className="w-1 h-1 rounded-full bg-outline-variant"/>
          <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-error">timer</span>긴 다운타임 <b className="text-on-background">{stats.longDowntime}</b>건</span>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-4">
          <Link href="/incidents/by-factory" className="group block bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all no-underline">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary-container/15 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">bar_chart</span>
              </div>
              <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors text-[20px]">arrow_forward</span>
            </div>
            <h2 className="font-headline text-[20px] font-bold text-on-background mb-1">공장별 현황</h2>
            <p className="text-[13px] text-secondary">공장·설비별 통계 및 다운타임 분포</p>
          </Link>
          <Link href="/incidents/ai-search" className="group block bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all no-underline">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-tertiary-fixed text-tertiary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">smart_toy</span>
              </div>
              <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors text-[20px]">arrow_forward</span>
            </div>
            <h2 className="font-headline text-[20px] font-bold text-on-background mb-1">AI 사례검색</h2>
            <p className="text-[13px] text-secondary">자연어 질문 → AI 답변 + 유사 사례</p>
          </Link>
        </div>
        <Link href="/incidents/list" className="group block bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:border-primary transition-all no-underline">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-secondary group-hover:bg-primary-container/15 group-hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[24px]">list_alt</span>
              </div>
              <div>
                <h3 className="font-headline text-[17px] font-bold text-on-background group-hover:text-primary transition-colors">전체 목록 보기</h3>
                <p className="text-[13px] text-secondary mt-0.5">키워드와 다중 필터(공장·설비·기간)로 직접 검색</p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center border border-outline-variant text-secondary group-hover:border-primary group-hover:text-primary group-hover:bg-primary-container/10 transition-all">
              <span className="material-symbols-outlined">arrow_forward</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
