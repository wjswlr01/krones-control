// lib/types.ts
export type SourceType = 'pptx' | 'transcript'
export type ContentType = '설비관리' | '설비이론' | '설비세팅' | '트러블슈팅' | '강의' | '현장꿀팁'

export interface SlideChunk {
  chunk_id:        string
  source_type:     'pptx'
  file_name:       string
  file_id:         string          // manual-01 ~ manual-04
  slide_number:    number
  content_type:    ContentType
  page_title:      string
  text:            string
  slide_image_url: string          // /slides/manual-01/slide_001.webp
}

export interface ManualMeta {
  id:          string
  title:       string
  subtitle:    string
  icon:        string
  totalSlides: number
  fileName:    string
}

export interface SearchHit {
  source:      'manual' | 'lecture'
  title:       string
  snippet:     string
  score:       number
  href?:       string              // 매뉴얼이면 슬라이드 링크
  imageUrl?:   string              // 매뉴얼이면 슬라이드 썸네일
  file_name?:  string
  page_title?: string
}

export interface SearchResponse {
  answer:  string                  // AI 요약 답변
  hits:    SearchHit[]
  latency: number
}
