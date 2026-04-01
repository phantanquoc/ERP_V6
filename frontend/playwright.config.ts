import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration
 * Docs: https://playwright.dev/docs/test-configuration
 *
 * Chạy: npm run test:e2e (frontend phải đang chạy trên port 5173)
 * Chạy kèm server tự động: npm run test:e2e:ci
 */
export default defineConfig({
  testDir: './e2e',
  /* Timeout cho mỗi test */
  timeout: 30_000,
  /* Timeout cho expect assertions */
  expect: { timeout: 5_000 },
  /* Chạy full isolation — mỗi test dùng context riêng */
  fullyParallel: false,
  /* Fail CI ngay khi có test.only trong code */
  forbidOnly: !!process.env.CI,
  /* Retry trong CI */
  retries: process.env.CI ? 1 : 0,
  /* Số workers song song */
  workers: process.env.CI ? 1 : undefined,
  /* Report */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    /* Base URL — chạy local thì frontend dev server phải đang chạy */
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    /* Chụp screenshot + trace khi fail */
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    /* Timeout cho mỗi action */
    actionTimeout: 10_000,
    /* Viewport chuẩn Desktop */
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    /* Uncomment để test thêm browsers
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */
  ],

  /* Tự khởi động frontend dev server khi chạy test:e2e:ci */
  webServer: process.env.CI
    ? {
        command: 'npm run dev',
        port: 5173,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
