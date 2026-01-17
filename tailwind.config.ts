import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./popup.html",
    "./sidepanel.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System Background Hierarchy
        ds: {
          bg: {
            base: '#09090b',
            elevated: '#18181b',
            surface: '#27272a',
            hover: '#3f3f46',
          },
          // Border colors
          border: {
            subtle: '#27272a',
            DEFAULT: '#3f3f46',
            focus: '#6366f1',
          },
          // Text colors
          text: {
            primary: '#fafafa',
            secondary: '#a1a1aa',
            tertiary: '#71717a',
          },
          // Accent colors
          accent: {
            indigo: '#6366f1',
            'indigo-hover': '#818cf8',
            cyan: '#06b6d4',
            emerald: '#10b981',
            amber: '#f59e0b',
            rose: '#f43f5e',
            violet: '#8b5cf6',
          },
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['IBM Plex Mono', 'SF Mono', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '1.2' }],
      },
      borderRadius: {
        'ds-sm': '6px',
        'ds-md': '8px',
        'ds-lg': '12px',
      },
      boxShadow: {
        'ds-sm': '0 1px 2px rgba(0, 0, 0, 0.4)',
        'ds-md': '0 4px 12px rgba(0, 0, 0, 0.5)',
        'ds-lg': '0 8px 24px rgba(0, 0, 0, 0.6)',
      },
      transitionDuration: {
        'fast': '120ms',
        'normal': '200ms',
      },
      animation: {
        'ds-pulse': 'ds-pulse 2s ease-in-out infinite',
        'ds-spin': 'ds-spin 0.8s linear infinite',
      },
      keyframes: {
        'ds-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.9)' },
        },
        'ds-spin': {
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
