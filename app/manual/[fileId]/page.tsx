// app/manual/[fileId]/page.tsx
// 파일 ID만 들어왔을 때 1번 슬라이드로 자동 이동
import { redirect } from 'next/navigation'

export default function ManualIndex({ params }: { params: { fileId: string } }) {
  redirect(`/manual/${params.fileId}/1`)
}
