import { test, expect } from '@playwright/test';
import { setupApiRouting } from './helpers';

test.describe('Login', () => {
  test('should login with admin credentials and redirect to dashboard', async ({ page }) => {
    await setupApiRouting(page);

    await page.goto('/');
    await page.waitForLoadState('load');

    // Should see login form (redirected to /login)
    await expect(page.locator('h2:has-text("Đăng nhập")')).toBeVisible();

    // Fill credentials and submit
    await page.locator('input').first().fill('admin@example.com');
    await page.locator('input[type=password]').fill('admin123');
    await page.getByRole('button').filter({ hasText: 'Đăng nhập' }).click();

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify dashboard loaded
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });
});
