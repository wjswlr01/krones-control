import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (!process.env.SITE_PASSWORD || !process.env.AUTH_SECRET) {
      return NextResponse.json({ error: '서버 설정 오류 (환경변수 누락)' }, { status: 500 })
    }

    if (typeof password !== 'string' || password !== process.env.SITE_PASSWORD) {
      return NextResponse.json({ error: '비밀번호가 올바르지 않습니다' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set('site-auth', process.env.AUTH_SECRET, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30일
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }
}
