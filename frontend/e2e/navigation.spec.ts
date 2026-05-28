import { test, expect } from '@playwright/test';
import { setupApiRouting, login } from './helpers';

test.describe.serial('Sidebar Navigation & Notifications', () => {
  test('login first', async ({ page }) => {
    await setupApiRouting(page);
    await login(page);
  });

  test('sidebar shows main navigation items', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Bộ phận tổng hợp')).toBeVisible();
    await expect(page.locator('text=Bộ phận chất lượng')).toBeVisible();
    await expect(page.locator('text=Bộ phận kinh doanh')).toBeVisible();
  });

  test('navigates via sidebar to quality page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    await page.locator('text=Bộ phận chất lượng').click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/quality/);
  });

  test('navigates via sidebar to general page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    await page.locator('text=Bộ phận tổng hợp').click();
    await page.waitForTimeout(1000);
    await page.locator('text=Phòng giá thành').click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/general\/pricing/);
  });

  test('notification bell is visible and clickable', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    const bellBtn = page.locator('button[title="Thông báo"]');
    await expect(bellBtn).toBeVisible();
    await bellBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Thông báo').first()).toBeVisible();
  });
});
