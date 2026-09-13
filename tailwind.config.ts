import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // K.O.C.H. lab palette — Black & White edition
        lab: {
          bg:       '#000000',   // pure black
          surface:  '#0c0c0c',   // near-black surface
          card:     '#141414',   // elevated card
          border:   '#222222',   // subtle border
          accent:   '#ffffff',   // pure white — primary interactive
          accent2:  '#909090',   // medium gray — secondary
          warn:     '#cccccc',   // light gray — warnings
          danger:   '#aaaaaa',   // medium-light gray — errors
          success:  '#d4d4d4',   // near-white — positive states
          muted:    '#444444',   // dark-medium gray
          text:     '#f0f0f0',   // near-white text
          subtext:  '#707070',   // mid gray subtext
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
          '0%':   { boxShadow: '0 0 5px rgba(255,255,255,0.15)' },
          '100%': { boxShadow: '0 0 20px rgba(255,255,255,0.45), 0 0 40px rgba(255,255,255,0.1)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

