import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // K.O.C.H. lab palette
        lab: {
          bg:       '#0a0c10',
          surface:  '#111318',
          card:     '#16191f',
          border:   '#1e2330',
          accent:   '#00d4aa',
          accent2:  '#6c63ff',
          warn:     '#f5a623',
          danger:   '#e8445a',
          success:  '#2dd4ac',
          muted:    '#4a5568',
          text:     '#e2e8f0',
          subtext:  '#718096',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 5px #00d4aa40' },
          '100%': { boxShadow: '0 0 20px #00d4aa80, 0 0 40px #00d4aa30' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
