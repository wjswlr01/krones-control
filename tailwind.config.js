/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surface
        bg:      '#FFFFFF',
        surface: '#F8F9FA',
        muted:   '#F3F4F6',
        border:  '#E5E7EB',
        // Text
        ink:     '#111827',
        body:    '#374151',
        sub:     '#6B7280',
        faint:   '#9CA3AF',
        // Brand
        primary: '#0EA5E9',  // Sky blue
        accent:  '#2563EB',
        // Semantic
        tip:     '#F59E0B',  // Amber - 강사 꿀팁
        success: '#10B981',
        danger:  '#EF4444',
        info:    '#3B82F6',
      },
      fontFamily: {
        sans: [
          'Pretendard Variable', 'Pretendard',
          'Apple SD Gothic Neo', 'Noto Sans KR',
          '-apple-system', 'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Menlo', 'Courier New', 'monospace'],
      },
      maxWidth: {
        'reading': '780px',  // GitBook 본문 폭
        'doc':     '1280px',
      },
      boxShadow: {
        'card':  '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'hover': '0 4px 12px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
