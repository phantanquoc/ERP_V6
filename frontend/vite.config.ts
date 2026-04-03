import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// Determine backend target for Vite proxy:
// - Docker Compose dev: use 'erp_backend_local' (Docker container name)
// - Native/local dev: use 'localhost' (direct backend running)
const BACKEND_HOST = process.env.VITE_BACKEND_HOST || 'localhost';
const BACKEND_PORT = process.env.VITE_BACKEND_PORT || '5001';
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

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
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/uploads': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      // WebSocket proxy — required for real-time notifications in dev
      // Supports both Docker (erp_backend_local) and native (localhost) setups
      '/ws': {
        target: BACKEND_URL,
        ws: true,
        changeOrigin: true,
      },
    }
  }
})
