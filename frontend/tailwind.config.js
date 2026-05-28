/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            code: {
              backgroundColor: '#f3f4f6',
              padding: '0.125rem 0.25rem',
              borderRadius: '0.25rem',
              fontWeight: '400',
              fontSize: '0.875em',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            pre: {
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
              borderRadius: '0',
            },
            table: {
              borderCollapse: 'collapse',
              width: '100%',
            },
            'th, td': {
              border: '1px solid #d1d5db',
              padding: '0.5rem 0.75rem',
            },
            th: {
              backgroundColor: '#f9fafb',
              fontWeight: '600',
            },
            'ul > li::marker': {
              color: '#6b7280',
            },
            'ol > li::marker': {
              color: '#6b7280',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
