import Link from 'next/link'
export default function ByFactoryPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-muted">
      <div className="text-center">
        <div className="text-6xl mb-4">📊</div>
        <h1 className="text-xl font-bold text-ink mb-2">공장별 현황</h1>
        <p className="text-[13px] text-sub mb-4">Phase 2에서 구현 예정</p>
        <Link href="/incidents" className="text-primary no-underline text-[13px]">← 돌아가기</Link>
      </div>
    </div>
  )
}
