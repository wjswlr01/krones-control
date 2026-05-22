// lib/manuals.ts
import type { ManualMeta } from './types'

export const MANUALS: ManualMeta[] = [
  {
    id:       'manual-01',
    title:    '설비관리',
    subtitle: '일일·주간·월간 점검 및 유지보수 절차',
    icon:     '🛠️',
    totalSlides: 61,
    fileName: '라벨러_01 설비관리.pptx',
  },
  {
    id:       'manual-02',
    title:    '설비이론',
    subtitle: '라벨러 구조 및 작동 원리',
    icon:     '📐',
    totalSlides: 35,
    fileName: '라벨러_02 설비이론.pptx',
  },
  {
    id:       'manual-03',
    title:    '설비세팅',
    subtitle: '파라미터 조정 및 정렬 가이드',
    icon:     '🎯',
    totalSlides: 43,
    fileName: '라벨러_03 설비세팅.pptx',
  },
  {
    id:       'manual-04',
    title:    '트러블 TOP 10',
    subtitle: '자주 발생하는 알람·고장 해결법',
    icon:     '⚡',
    totalSlides: 13,
    fileName: '라벨러_설비 트러블 TOP 10.pptx',
  },
]

export const getManual = (id: string) => MANUALS.find(m => m.id === id)
