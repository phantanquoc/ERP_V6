/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    { pattern: /hover:border-.*/ },
    { pattern: /bg-.*-50/ },
    { pattern: /text-.*-(500|600)/ },
    { pattern: /border-.*-(200|300|400|500)/ },
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        primaryHover: '#1D4ED8',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#06B6D4',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)',
        cardHover: '0 4px 12px rgba(0,0,0,0.10)',
        floating: '0 8px 24px rgba(0,0,0,0.12)',
      },
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
