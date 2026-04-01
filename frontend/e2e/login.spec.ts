import { test, expect } from '@playwright/test';

/**
 * E2E Smoke Tests — Login Flow
 *
 * Kiểm tra luồng đăng nhập từ UI thực sự, bao gồm:
 * - Form render đúng
 * - Validation khi bỏ trống
 * - Sai mật khẩu → thông báo lỗi
 * - Đúng thông tin → redirect về dashboard
 * - Reload khi đang bị block → vẫn hiện countdown
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@anbinhfoods.net';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'password123';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form with email and password fields', async ({ page }) => {
    await expect(page.locator('input[type="email"], [data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('input[type="password"], [data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error when submitting empty form', async ({ page }) => {
    await page.click('button[type="submit"]');
    // HTML5 validation hoặc custom error message phải xuất hiện
    const emailInput = page.locator('input[type="email"], [data-testid="email-input"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    // Có thể browser validation hoặc custom error message
    expect(isInvalid || await page.locator('.error, [role="alert"]').isVisible()).toBeTruthy();
  });

  test('should show error message on wrong credentials', async ({ page }) => {
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', 'wrong-password-xyz');
    await page.click('button[type="submit"]');

    // Đợi error message xuất hiện (từ API response)
    await expect(
      page.locator('.error, [role="alert"], [data-testid="error-message"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Sau login thành công → không còn ở /login nữa
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
    expect(page.url()).not.toContain('/login');
  });

  test('should block login after 3 consecutive failed attempts', async ({ page }) => {
    const wrongPassword = 'definitely-wrong-password-123';

    // 3 lần sai
    for (let i = 0; i < 3; i++) {
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', wrongPassword);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1_000); // đợi response
    }

    // Sau 3 lần sai → submit button phải bị disabled
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled({ timeout: 5_000 });
  });

  test('should persist block state after page reload', async ({ page }) => {
    const wrongPassword = 'wrong-password-reload-test';

    // Trigger 3 lần sai để bị block
    for (let i = 0; i < 3; i++) {
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', wrongPassword);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1_500);
    }

    // Reload trang
    await page.reload();

    // Sau reload vẫn phải bị block (sessionStorage persistence)
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled({ timeout: 5_000 });
  });

  test('should navigate to home/login when accessing protected route without auth', async ({ page }) => {
    // Truy cập route protected mà không có token
    await page.goto('/dashboard');
    // Phải bị redirect về login
    await page.waitForURL((url) => url.pathname.includes('/login') || url.pathname === '/', { timeout: 5_000 });
    expect(page.url()).toMatch(/\/(login|$)/);
  });
});
