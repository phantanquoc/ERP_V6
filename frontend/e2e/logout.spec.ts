import { test, expect } from '@playwright/test';
import { setupApiRouting, login } from './helpers';

test.describe.serial('Logout', () => {
  test('login first', async ({ page }) => {
    await setupApiRouting(page);
    await login(page);
  });

  test('logs out and redirects to login page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Open user dropdown
    await page.locator('button:has-text("Admin")').first().click();
    await page.waitForTimeout(500);

    // Handle confirm dialog
    const dialogPromise = page.waitForEvent('dialog');
    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('Bạn có chắc chắn');
    await dialog.accept();

    await page.waitForURL('**/login', { timeout: 15000 });
    await expect(page.locator('h2:has-text("Đăng nhập")')).toBeVisible();
  });
});
