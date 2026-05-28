import { test, expect } from '@playwright/test';
import { setupApiRouting, login } from './helpers';

test.describe.serial('Dashboard', () => {
  test('login first', async ({ page }) => {
    await setupApiRouting(page);
    await login(page);
  });

  test('shows welcome message and user info', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Chào mừng')).toBeVisible();
    await expect(page.locator('text=Admin')).toBeVisible();
  });

  test('shows quick stats cards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Mua hàng')).toBeVisible();
    await expect(page.locator('text=Nhiệm vụ')).toBeVisible();
    await expect(page.locator('text=Kế hoạch')).toBeVisible();
    await expect(page.locator('text=Góp ý & KK')).toBeVisible();
    await expect(page.locator('text=Báo cáo')).toBeVisible();
  });

  test('shows department overview section', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Tổng quan các phòng ban')).toBeVisible();
    await expect(page.locator('text=Bộ phận tổng hợp')).toBeVisible();
    await expect(page.locator('text=Bộ phận chất lượng')).toBeVisible();
  });

  test('period filter buttons are present and clickable', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    await expect(page.getByRole('button', { name: 'Tuần này' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tháng này' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Quý này' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Năm này' })).toBeVisible();

    await page.getByRole('button', { name: 'Tuần này' }).click();
    await page.waitForTimeout(1000);
  });
});
