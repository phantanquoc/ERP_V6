import { test, expect } from '@playwright/test';
import { setupApiRouting } from './helpers';

test.describe('Forgot Password', () => {
  test('navigates from login, submits forgot password request', async ({ page }) => {
    await setupApiRouting(page);

    await page.goto('/login');
    await page.locator('h2:has-text("Đăng nhập")').waitFor({ state: 'visible', timeout: 15000 });

    await page.getByRole('link', { name: 'Quên mật khẩu?' }).click();
    await page.waitForURL('**/forgot-password');

    await expect(page.locator('text=Quên mật khẩu')).toBeVisible();

    await page.locator('input[type="text"]').fill('admin@example.com');
    await page.getByRole('button').filter({ hasText: 'Gửi yêu cầu' }).click();
    await page.waitForTimeout(3000);

    await expect(page.locator('text=Yêu cầu đã được gửi')).toBeVisible();
    await expect(page.locator('a:has-text("Quay lại đăng nhập")')).toBeVisible();
  });
});
