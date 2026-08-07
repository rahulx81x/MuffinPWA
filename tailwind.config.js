/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        soft: 'var(--radius-soft)',
        xl: '0.875rem',
        '2xl': '1rem',
      },
      boxShadow: {
        warm: 'var(--shadow-warm)',
        'warm-sm': 'var(--shadow-warm-sm)',
        glow: 'var(--shadow-glow)',
        elevate: 'var(--shadow-elevate)',
      },
      transitionDuration: {
        theme: '400ms',
      },
      transitionTimingFunction: {
        cozy: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      colors: {
        canvas: 'var(--color-canvas)',
        'canvas-alt': 'var(--color-canvas-alt)',
        surface: 'var(--color-surface)',
        'surface-strong': 'var(--color-surface-strong)',
        'surface-muted': 'var(--color-surface-muted)',
        text: {
          DEFAULT: 'var(--color-text)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          muted: 'var(--color-primary-muted)',
          foreground: 'var(--color-on-primary)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          muted: 'var(--color-success-muted)',
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',
          muted: 'var(--color-destructive-muted)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          muted: 'var(--color-warning-muted)',
        },
        border: 'var(--color-border)',
        divider: 'var(--color-divider)',
        muffin: {
          cream: '#faf5ef',
          oat: '#f3e8dc',
          crust: '#e5d3b3',
          espresso: '#3d2314',
          cinnamon: '#7c5a43',
          gold: '#d97706',
          amber: '#f59e0b',
          chocolate: '#1c130d',
          cocoa: '#291d15',
          crustDark: '#423024',
          oatmeal: '#f3e8dc',
          latte: '#b89c88',
        },
      },
    },
  },
  plugins: [],
};
