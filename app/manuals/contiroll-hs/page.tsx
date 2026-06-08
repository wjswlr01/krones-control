// 구 경로 호환: /manuals/contiroll-hs → /manuals/labeler
import { redirect } from 'next/navigation'

export default function ContirollHsRedirect() {
  redirect('/manuals/labeler')
}
