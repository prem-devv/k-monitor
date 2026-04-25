module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: { primary: '#F8FAFC', secondary: '#F1F5F9', tertiary: '#E2E8F0' },
        surface: { DEFAULT: '#FFFFFF', border: '#E2E8F0' },
        text: { primary: '#0F172A', secondary: '#64748B', muted: '#94A3B8' },
        brand: { DEFAULT: '#2563EB', hover: '#3B82F6' },
        status: { green: '#10B981', red: '#EF4444', yellow: '#F59E0B', cyan: '#0EA5E9' },
      },
      fontFamily: { mono: ['JetBrains Mono', 'monospace'], sans: ['Inter', 'sans-serif'] },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};