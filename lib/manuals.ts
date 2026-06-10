// lib/manuals.ts
import type { ManualMeta } from './types'

// 설비종류 그룹 (UI 묶음 표시용)
export interface EquipmentGroup { key: string; name: string; model: string; icon: string }
export const EQUIPMENT_GROUPS: EquipmentGroup[] = [
  { key: 'labeler',     name: '라벨러',  model: 'Krones Contiroll HS',  icon: '🏷️' },
  { key: 'blowmoulder', name: '제병기',  model: 'Blow Moulder C3 Pro',  icon: '🫙' },
  { key: 'packer',      name: '팩커',    model: 'Krones Variopac',      icon: '📦' },
  { key: 'electric',    name: '전기',    model: '전기·제어 (전장/PLC/서보)', icon: '⚡' },
]

export const MANUALS: ManualMeta[] = [
  // ── 라벨러 (Krones Contiroll HS) ──
  {
    id:       'manual-01',
    title:    '설비관리',
    subtitle: '일일·주간·월간 점검 및 유지보수 절차',
    icon:     '🛠️',
    totalSlides: 61,
    fileName: '라벨러_01 설비관리.pptx',
    group:    'labeler',
  },
  {
    id:       'manual-02',
    title:    '설비이론',
    subtitle: '라벨러 구조 및 작동 원리',
    icon:     '📐',
    totalSlides: 35,
    fileName: '라벨러_02 설비이론.pptx',
    group:    'labeler',
  },
  {
    id:       'manual-03',
    title:    '설비세팅',
    subtitle: '파라미터 조정 및 정렬 가이드',
    icon:     '🎯',
    totalSlides: 43,
    fileName: '라벨러_03 설비세팅.pptx',
    group:    'labeler',
  },
  {
    id:       'manual-04',
    title:    '트러블 TOP 10',
    subtitle: '자주 발생하는 알람·고장 해결법',
    icon:     '⚡',
    totalSlides: 13,
    fileName: '라벨러_설비 트러블 TOP 10.pptx',
    group:    'labeler',
  },
  // ── 제병기 (Blow Moulder C3 Pro) ──
  {
    id:       'blowmoulder-01',
    title:    '설비관리',
    subtitle: '일일·주간·월간 점검 및 유지보수 절차',
    icon:     '🛠️',
    totalSlides: 56,
    fileName: 'Blow Moulder_01 설비관리_C3 Pro.pptx',
    group:    'blowmoulder',
  },
  {
    id:       'blowmoulder-02',
    title:    '설비이론',
    subtitle: '제병기 구조 및 작동 원리',
    icon:     '📐',
    totalSlides: 28,
    fileName: 'Blow Moulder_02 설비이론_C3 Pro.pptx',
    group:    'blowmoulder',
  },
  {
    id:       'blowmoulder-03',
    title:    '설비세팅',
    subtitle: '파라미터 조정 및 정렬 가이드',
    icon:     '🎯',
    totalSlides: 66,
    fileName: 'Blow Moulder_03 설비세팅_C3 Pro.pptx',
    group:    'blowmoulder',
  },
  {
    id:       'blowmoulder-04',
    title:    '설비 트러블',
    subtitle: '자주 발생하는 알람·고장 해결법',
    icon:     '⚡',
    totalSlides: 13,
    fileName: 'Blow Moulder_04 설비트러블_C3 Pro.pptx',
    group:    'blowmoulder',
  },
  // ── 팩커 (Krones Variopac) ──
  {
    id:       'packer-01',
    title:    '설비이론',
    subtitle: '팩커 구조 및 작동 원리',
    icon:     '📐',
    totalSlides: 26,
    fileName: '1.Variopac 설비 이론.pptx',
    group:    'packer',
  },
  {
    id:       'packer-02',
    title:    '설비세팅',
    subtitle: 'Zenon HMI 파라미터 조정 및 정렬 가이드',
    icon:     '🎯',
    totalSlides: 46,
    fileName: '2.Variopac 설비세팅 Zenon.pptx',
    group:    'packer',
  },
  {
    id:       'packer-03',
    title:    '센서',
    subtitle: '센서 종류·위치 및 점검 방법',
    icon:     '📡',
    totalSlides: 14,
    fileName: '3.Variopac sensors.pptx',
    group:    'packer',
  },
  {
    id:       'packer-04',
    title:    '설비관리',
    subtitle: '일일·주간·월간 점검 및 유지보수 절차',
    icon:     '🛠️',
    totalSlides: 44,
    fileName: '4.Variopac 설비 관리.pptx',
    group:    'packer',
  },
  {
    id:       'packer-05',
    title:    '파라미터',
    subtitle: '주요 파라미터 설명 및 설정값',
    icon:     '🔧',
    totalSlides: 65,
    fileName: '5.Variopac Parameter.pptx',
    group:    'packer',
  },
  {
    id:       'packer-06',
    title:    '트러블슈팅',
    subtitle: '자주 발생하는 알람·고장 해결법',
    icon:     '⚡',
    totalSlides: 15,
    fileName: '6.Variopac 설비 Trouble shoot.pptx',
    group:    'packer',
  },
  {
    id:       'packer-07',
    title:    '정비',
    subtitle: '소모품 교체 및 정비 절차',
    icon:     '🔩',
    totalSlides: 14,
    fileName: '7.Variopac maintenance.pptx',
    group:    'packer',
  },
  // ── 전기 (전기·제어 / 전장·PLC·서보) ──
  {
    id:       'electric-01',
    title:    '설비관리',
    subtitle: '전장·제어 점검 및 유지보수 절차',
    icon:     '🛠️',
    totalSlides: 60,
    fileName: '전기일반_01_설비관리 3.pptx',
    group:    'electric',
  },
  {
    id:       'electric-02',
    title:    '설비이론',
    subtitle: '전기·제어 구성 및 동작 원리',
    icon:     '📐',
    totalSlides: 121,
    fileName: '전기일반_02 설비이론 3.pptx',
    group:    'electric',
  },
  {
    id:       'electric-03',
    title:    '설비세팅',
    subtitle: '파라미터·드라이브 설정 가이드',
    icon:     '🎯',
    totalSlides: 76,
    fileName: '전기일반_03_설비셋팅 3.pptx',
    group:    'electric',
  },
  {
    id:       'electric-04',
    title:    '트러블 TOP 13',
    subtitle: '자주 발생하는 전기·제어 알람·고장 해결법',
    icon:     '⚡',
    totalSlides: 13,
    fileName: '전기일반_04_설비 트러블 TOP 13.pptx',
    group:    'electric',
  },
]

export const getManual = (id: string) => MANUALS.find(m => m.id === id)
export const getAllManuals = () => MANUALS
export const getManualsByGroup = (key: string) => MANUALS.filter(m => m.group === key)
export const getEquipmentGroup = (key: string) => EQUIPMENT_GROUPS.find(g => g.key === key)
