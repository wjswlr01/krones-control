import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const auth = request.cookies.get('site-auth')
  const isAuthenticated = auth?.value === process.env.AUTH_SECRET

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    const next = request.nextUrl.pathname + request.nextUrl.search
    if (next !== '/') loginUrl.searchParams.set('next', next)
    return NextResponse.redirect(loginUrl)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!login|api/login|_next/static|_next/image|favicon|icon-|manifest|robots|sw\\.js).*)',
  ],
}
