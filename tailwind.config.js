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
      },
    },
  },
  plugins: [],
};
