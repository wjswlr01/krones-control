'use client'
import ReactMarkdown from 'react-markdown'

// AI 답변(사례검색·슬라이드 채팅) 공용 마크다운 렌더러.
// 색상 톤은 밝은 카드 배경(tertiary-fixed / surface-container) 위에 맞춰져 있음.
export default function AnswerMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-bold text-on-background">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        h1: ({ children }) => <h3 className="font-bold text-[15px] text-on-background mt-3 mb-1">{children}</h3>,
        h2: ({ children }) => <h3 className="font-bold text-[15px] text-on-background mt-3 mb-1">{children}</h3>,
        h3: ({ children }) => <h3 className="font-bold text-[14px] text-on-background mt-2 mb-1">{children}</h3>,
        code: ({ children }) => <code className="px-1 py-0.5 bg-surface-container-high rounded text-[13px]">{children}</code>,
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
