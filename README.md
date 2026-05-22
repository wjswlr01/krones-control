# Krones Control · 매뉴얼 시스템

롯데칠성 기술혁신팀 · 라벨러 매뉴얼 + 강의 노트 통합 조회 SaaS

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 (Dify RAG)
cp .env.example .env.local
# .env.local 에 DIFY_API_KEY 입력

# 3. 데이터 준비 (필수!)
# (A) PPTX 텍스트 청크 복사
#   D:\2026\기술혁신팀\기타\설비운영 saas\output\chunks.json
#   → krones-control\data\chunks.json

# (B) 슬라이드 이미지 복사
#   D:\2026\기술혁신팀\기타\설비운영 saas\output\slides\*
#   → krones-control\public\slides\*

# 4. 개발 서버
npm run dev
# → http://localhost:3000
```

## 폴더 구조

```
krones-control/
├── app/
│   ├── page.tsx                            # 홈
│   ├── manual/[fileId]/[slideNum]/        # 슬라이드 뷰어 (3분할)
│   ├── search/                             # 통합 검색 결과
│   ├── lecture/                            # 강의 노트 안내
│   ├── maintenance/                        # 설비 관리 기준
│   └── api/
│       ├── search/                         # 통합 검색 (PPTX 로컬 + Dify)
│       └── slide-context/                  # 슬라이드별 강의 매칭
├── components/
│   ├── layout/      Sidebar · TopBar
│   ├── manual/      SlideContext
│   └── search/      SearchBar
├── lib/
│   ├── types.ts
│   ├── manuals.ts                          # 4개 매뉴얼 메타데이터
│   └── chunks.ts                           # chunks.json 접근자
├── data/
│   └── chunks.json                         # 152개 슬라이드 텍스트 청크
└── public/
    └── slides/
        ├── manual-01/  (61장 webp)
        ├── manual-02/  (35장 webp)
        ├── manual-03/  (43장 webp)
        └── manual-04/  (13장 webp)
```

## 디자인

- 라이트 테마 (GitBook · Confluence 스타일)
- Pretendard Variable + JetBrains Mono
- 1280px 최대 폭, 780px 본문 폭
- Ctrl+K 검색 단축키

## 데이터 흐름

```
사용자 검색
  ↓
[/api/search]
  ├─ 로컬 chunks.json 키워드 매칭 (PPTX 152장)
  └─ Dify Chat API (강의 녹취 RAG)
  ↓
통합 결과 → 매뉴얼 카드 + 강의 단락
```

```
슬라이드 조회
  ↓
[/manual/manual-01/12]
  ├─ chunks.json 에서 슬라이드 12 메타 로드
  ├─ public/slides/manual-01/slide_012.webp 표시
  └─ /api/slide-context (Dify RAG) → 우측 강의 패널
```

## 배포

```bash
git init
git add .
git commit -m "init: krones-control"
git remote add origin https://github.com/YOUR_ACCOUNT/krones-control.git
git push -u origin main

vercel --prod
vercel env add DIFY_API_KEY production
vercel env add NEXT_PUBLIC_DIFY_API_URL production
```
