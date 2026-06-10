// lib/ai-model.ts
// AI 사례검색이 쓰는 모델 식별자/표시명의 단일 소스.
// 서버(route.ts: 답변 생성·응답 필드)와 클라이언트(헤더 pill 뱃지·답변 하단 캡션)가 모두 여기서 참조.
// 모델 교체 시 이 파일만 수정하면 헤더 뱃지·캡션·API 응답이 함께 바뀜.

export const CHAT_MODEL = 'gpt-5.4-mini'                 // 답변·분류·되묻기 생성 공용
export const EMBED_MODEL = 'text-embedding-3-small'      // 사례/매뉴얼 인덱스 검색 임베딩

// 표시용 라벨 매핑. 미등록 모델은 raw 문자열 그대로 노출.
export const MODEL_LABELS: Record<string, string> = { 'gpt-5.4-mini': 'GPT-5.4 Mini' }
export const modelLabel = (m: string) => MODEL_LABELS[m] ?? m

export const CHAT_MODEL_LABEL = modelLabel(CHAT_MODEL)   // 헤더 뱃지/캡션 기본 표시명
