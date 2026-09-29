import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Steampunk Brass & Mahogany Palette
        steampunk: {
          brass: '#d4af37',
          amber: '#f59e0b',
          glow: '#fbbf24',
          darkbrass: '#78350f',
          mahogany: '#2d1810',
          metal: '#1c1917',
          vignette: '#0c0a09',
        },
        // K.O.C.H. lab palette
        lab: {
          bg:       '#000000',
          surface:  '#0c0c0c',
          card:     '#141414',
          border:   '#222222',
          accent:   '#ffffff',
          accent2:  '#909090',
          warn:     '#f59e0b',
          danger:   '#ef4444',
          success:  '#10b981',
          muted:    '#444444',
          text:     '#f0f0f0',
          subtext:  '#707070',
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
        'flicker': 'flicker 4s infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 5px rgba(245,158,11,0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(245,158,11,0.6), 0 0 45px rgba(212,175,55,0.3)' },
        },
        flicker: {
          '0%, 100%': { opacity: '0.96' },
          '20%': { opacity: '0.85' },
          '40%': { opacity: '0.98' },
          '60%': { opacity: '0.88' },
          '80%': { opacity: '1' },
          '90%': { opacity: '0.92' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-12px) rotate(2deg)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

