/**
 * E2E helpers dùng chung giữa các spec file
 */
import { Page } from '@playwright/test';

/** Thông tin đăng nhập mặc định cho E2E */
export const TEST_CREDENTIALS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@anbinhfoods.net',
    password: process.env.E2E_ADMIN_PASSWORD || 'password123',
  },
  employee: {
    email: process.env.E2E_EMPLOYEE_EMAIL || 'employee@anbinhfoods.net',
    password: process.env.E2E_EMPLOYEE_PASSWORD || 'password123',
  },
};

/**
 * Helper: thực hiện đăng nhập và đợi redirect về dashboard
 */
export async function loginAs(page: Page, role: 'admin' | 'employee' = 'admin') {
  const creds = TEST_CREDENTIALS[role];
  await page.goto('/login');
  await page.fill('[data-testid="email-input"], input[type="email"]', creds.email);
  await page.fill('[data-testid="password-input"], input[type="password"]', creds.password);
  await page.click('[data-testid="login-button"], button[type="submit"]');
  // Đợi redirect khỏi trang login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
}

/**
 * Helper: đợi network idle (hữu ích sau khi navigate)
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}
