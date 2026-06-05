import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET
  const auth = request.cookies.get('site-auth')
  // Fail closed: a missing/empty AUTH_SECRET must never authenticate anyone
  // (otherwise `undefined === undefined` would let no-cookie visitors through).
  const isAuthenticated = Boolean(secret) && auth?.value === secret

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
    '/((?!login|api/login|api/debug-env|_next/static|_next/image|favicon|icon-|manifest|robots|sw\\.js).*)',
  ],
}
