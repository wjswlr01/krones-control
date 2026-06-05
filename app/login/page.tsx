'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams?.get('next') || '/'
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push(next)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || '비밀번호가 올바르지 않습니다')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-container rounded-2xl mb-4">
            <span className="material-symbols-outlined text-white text-[32px]">lock</span>
          </div>
          <h1 className="font-headline text-[24px] font-bold text-on-background mb-2">기술혁신팀</h1>
          <p className="text-[14px] text-on-surface-variant">접근하려면 비밀번호를 입력하세요</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <label className="block text-[13px] font-medium text-on-surface-variant mb-2">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            disabled={loading}
            className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg text-[14px] text-on-background outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
            placeholder="비밀번호 입력"
          />
          {error && (
            <p className="mt-3 text-[13px] text-error flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">error</span>{error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full mt-5 bg-primary hover:bg-primary/90 disabled:bg-outline-variant disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>확인 중...</>
            ) : (
              <>접속하기<span className="material-symbols-outlined text-[18px]">arrow_forward</span></>
            )}
          </button>
        </form>
        <p className="text-center mt-6 text-[12px] text-outline">롯데칠성 · 기술혁신팀 · 시범 운영</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background"/>}>
      <LoginForm />
    </Suspense>
  )
}
