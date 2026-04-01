/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:        'var(--color-primary)',
        'primary-dark': 'var(--color-primary-dark)',
        'primary-light':'var(--color-primary-light)',
        secondary:      'var(--color-secondary)',
        accent:         'var(--color-accent)',
        'app-bg':       'var(--color-bg)',
        sidebar:        'var(--color-sidebar)',
        'sidebar-text': 'var(--color-sidebar-text)',
        header:         'var(--color-header)',
        'header-text':  'var(--color-header-text)',
      },
    },
  },
  plugins: [],
}
