import incidentsData from '@/data/incidents.json'
import AiSearchClient from './AiSearchClient'

// 인덱스(=원본 전건)와 동일 건수. 서버에서 주입 → 클라이언트 번들에 데이터 미포함.
export default function AiSearchPage() {
  return <AiSearchClient count={(incidentsData as unknown[]).length} />
}
