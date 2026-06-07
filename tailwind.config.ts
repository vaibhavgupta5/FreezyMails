import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#f5f0e8',
          100: '#e8e0d0',
          200: '#d4c9b8',
          400: '#b8a898',
          600: '#8b7a6a',
          900: '#3a2e20'
        },
        ice: {
          50: '#e8f4fd',
          100: '#b8ddf5',
          300: '#6ab8e8',
          500: '#2288cc',
          700: '#155c8a',
          900: '#0a3050'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'skeu-raised': '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
        'skeu-inset': 'inset 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 2px rgba(0,0,0,0.1)',
        'skeu-btn': '0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.25)',
        'skeu-btn-press': 'inset 0 2px 4px rgba(0,0,0,0.2)',
      }
    },
  },
  plugins: [],
} satisfies Config;
