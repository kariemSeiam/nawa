import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '380px',
      },
      fontFamily: {
        display: ['Tajawal', 'Noto Sans Arabic', 'system-ui', 'sans-serif'],
        sans: ['Noto Sans Arabic', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        hero: 'clamp(1.9rem, 4.8vw + 0.55rem, 3.2rem)',
        h2: 'clamp(1.45rem, 2.8vw + 0.45rem, 2.4rem)',
        display: 'clamp(2rem, 5.2vw + 0.45rem, 3.35rem)',
        lead: 'clamp(0.98rem, 1.35vw + 0.82rem, 1.125rem)',
      },
      spacing: {
        section: 'clamp(2.75rem, 7vw, 5.5rem)',
        gutter: 'clamp(1rem, 4.2vw, 1.85rem)',
        'safe-b': 'env(safe-area-inset-bottom, 0px)',
        'safe-t': 'env(safe-area-inset-top, 0px)',
      },
      minHeight: {
        touch: '48px',
        'screen-safe': '100dvh',
      },
      maxWidth: {
        measure: '65ch',
        content: '72rem',
      },
      boxShadow: {
        lift: '0 22px 60px -28px rgba(15, 23, 42, 0.28)',
        card: '0 4px 24px -8px rgba(15, 23, 42, 0.12)',
        'card-hover': '0 28px 70px -32px rgba(15, 23, 42, 0.22)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '0.85' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.65s var(--ease-out, cubic-bezier(0.22,1,0.36,1)) forwards',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
