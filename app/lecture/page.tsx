// app/lecture/page.tsx
export default function LecturePage() {
  return (
    <div className="max-w-doc mx-auto px-8 py-10">
      <h1 className="text-3xl font-bold text-ink mb-2">🎓 강의 노트</h1>
      <p className="text-sub mb-8">현장 강사 녹취록 9건이 Dify Knowledge Base에 인덱싱되어 있습니다.</p>

      <div className="bg-bg border border-border rounded-xl p-6 shadow-card mb-6">
        <h2 className="text-lg font-bold text-ink mb-3">📚 사용 방법</h2>
        <ul className="doc-prose">
          <li>상단 검색창에 키워드를 입력하면 강의 녹취 내용을 RAG로 조회할 수 있습니다.</li>
          <li>매뉴얼 슬라이드 우측 패널에서는 해당 슬라이드와 매칭되는 강의 단락을 자동으로 보여줍니다.</li>
          <li>검색 결과에서 노란색 카드로 표시되는 항목이 강사 녹취입니다.</li>
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          ['녹취록_라벨러기초1.txt', '라벨러 기본 구조 및 핵심 부품'],
          ['녹취록_라벨러기초2.txt', '글루 시스템 세팅 노하우'],
          ['녹취록_라벨러기초3.txt', '센터링 및 핀트 조정'],
          ['녹취록_라벨러기초4.txt', '트러블슈팅 실전 사례'],
        ].map(([name, sub]) => (
          <div key={name} className="bg-bg border border-border rounded-lg p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="text-xl">📄</span>
              <div>
                <div className="text-[14px] font-bold text-ink">{sub}</div>
                <div className="text-[11px] text-faint font-mono mt-0.5">{name}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
