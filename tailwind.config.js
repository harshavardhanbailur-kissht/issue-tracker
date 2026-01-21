/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors (keeping existing brand colors)
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Surface colors (Linear-style elevation) - Optional enhancement
        surface: {
          DEFAULT: 'oklch(14% 0.02 270)',
          1: 'oklch(14% 0.02 270)',
          2: 'oklch(18% 0.02 270)',
          3: 'oklch(22% 0.02 270)',
          elevated: 'oklch(25% 0.03 270)',
        },
        // Accent colors (coral/orange) - Optional enhancement
        accent: {
          50: 'oklch(95% 0.05 25)',
          100: 'oklch(90% 0.08 25)',
          200: 'oklch(85% 0.12 25)',
          300: 'oklch(80% 0.15 25)',
          400: 'oklch(75% 0.18 25)',
          500: 'oklch(70% 0.2 25)',
          600: 'oklch(65% 0.22 25)',
          700: 'oklch(60% 0.22 25)',
          800: 'oklch(55% 0.2 25)',
          900: 'oklch(50% 0.18 25)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'glow': '0 0 20px oklch(55% 0.25 270 / 0.3), 0 0 40px oklch(55% 0.25 270 / 0.2)',
        'glow-accent': '0 0 20px oklch(70% 0.2 25 / 0.3), 0 0 40px oklch(70% 0.2 25 / 0.2)',
        'inner-glow': 'inset 0 1px 0 oklch(100% 0 0 / 0.1)',
      },
      animation: {
        'gradient-rotate': 'gradient-rotate 20s linear infinite',
        'reveal-up': 'reveal-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'gradient-rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'reveal-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px oklch(55% 0.25 270 / 0.3)' },
          '50%': { boxShadow: '0 0 40px oklch(55% 0.25 270 / 0.5)' },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
