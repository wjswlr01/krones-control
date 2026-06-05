import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasSitePassword: !!process.env.SITE_PASSWORD,
    sitePasswordLength: process.env.SITE_PASSWORD?.length ?? 0,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    authSecretLength: process.env.AUTH_SECRET?.length ?? 0,
    nodeEnv: process.env.NODE_ENV,
  })
}
