import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@components': path.resolve('./src/components'),
      '@pages': path.resolve('./src/pages'),
      '@services': path.resolve('./src/services'),
      '@utils': path.resolve('./src/utils'),
      '@types': path.resolve('./src/types'),
      '@contexts': path.resolve('./src/contexts'),
      '@hooks': path.resolve('./src/hooks'),
      '@schemas': path.resolve('./src/schemas'),
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'src/__tests__/**',
        'src/vite-env.d.ts',
        '*.config.*',
      ],
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy /api requests to backend container (không dùng localhost vì đang chạy trong Docker)
      '/api': {
        target: 'http://erp_backend_local:5001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://erp_backend_local:5001',
        changeOrigin: true,
      },
    }
  }
})
