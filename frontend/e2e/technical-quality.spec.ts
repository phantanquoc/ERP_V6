import { test, expect } from '@playwright/test';
import { setupApiRouting, login } from './helpers';

test.describe.serial('TechnicalQuality — /technical/quality', () => {
  test('login first', async ({ page }) => {
    await setupApiRouting(page);
    await login(page);
  });

  test('page loads with all 5 tabs', async ({ page }) => {
    await page.goto('/technical/quality');
    await page.waitForSelector('text=Phòng QLHTM', { timeout: 15000 });

    await expect(page.locator('text=Danh sách hệ thống máy')).toBeVisible();
    await expect(page.locator('text=Báo cáo hoạt động của máy')).toBeVisible();
    await expect(page.locator('text=Danh sách đơn hàng')).toBeVisible();
    await expect(page.locator('text=Danh sách yêu cầu sửa chữa')).toBeVisible();
    await expect(page.locator('text=Danh sách nghiệm thu bàn giao')).toBeVisible();
  });

  test('repair requests tab shows "Thêm mới" button', async ({ page }) => {
    await page.goto('/technical/quality?tab=repairRequests');
    await page.waitForSelector('text=Phòng QLHTM', { timeout: 15000 });
    await page.waitForTimeout(1000);

    await expect(page.locator('button:has-text("Thêm mới")')).toBeVisible();
  });

  test('repair requests tab shows "Xuất Excel" button', async ({ page }) => {
    await page.goto('/technical/quality?tab=repairRequests');
    await page.waitForSelector('text=Phòng QLHTM', { timeout: 15000 });
    await page.waitForTimeout(1000);

    await expect(page.locator('button:has-text("Xuất Excel")')).toBeVisible();
  });

  test('repair requests "Thêm mới" opens create modal', async ({ page }) => {
    await page.goto('/technical/quality?tab=repairRequests');
    await page.waitForSelector('text=Phòng QLHTM', { timeout: 15000 });
    await page.waitForTimeout(1000);

    await page.locator('button:has-text("Thêm mới")').click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=Thêm yêu cầu mới')).toBeVisible();

    // Close modal
    await page.locator('button:has-text("Hủy")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Thêm yêu cầu mới')).not.toBeVisible();
  });

  test('machine activity tab shows "Thêm báo cáo" button', async ({ page }) => {
    await page.goto('/technical/quality?tab=machineActivity');
    await page.waitForSelector('text=Phòng QLHTM', { timeout: 15000 });
    await page.waitForTimeout(1000);

    await expect(page.locator('button:has-text("Thêm báo cáo")')).toBeVisible();
    await expect(page.locator('button:has-text("Xuất Excel")')).toBeVisible();
  });

  test('acceptance tab shows search input', async ({ page }) => {
    await page.goto('/technical/quality?tab=acceptance');
    await page.waitForSelector('text=Phòng QLHTM', { timeout: 15000 });
    await page.waitForTimeout(1000);

    await expect(page.locator('input[placeholder="Tìm kiếm nghiệm thu..."]')).toBeVisible();
    await expect(page.locator('button:has-text("Xuất Excel")')).toBeVisible();
  });

  test('acceptance tab search input is interactive', async ({ page }) => {
    await page.goto('/technical/quality?tab=acceptance');
    await page.waitForSelector('text=Phòng QLHTM', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const searchInput = page.locator('input[placeholder="Tìm kiếm nghiệm thu..."]');
    await searchInput.fill('NT-2026');
    await page.waitForTimeout(300);
    await expect(searchInput).toHaveValue('NT-2026');

    // Clear and verify empty
    await searchInput.fill('');
    await expect(searchInput).toHaveValue('');
  });

  test('tab switching via URL query param works', async ({ page }) => {
    await page.goto('/technical/quality?tab=machineSystems');
    await page.waitForSelector('text=Phòng QLHTM', { timeout: 15000 });
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Danh sách hệ thống máy').first()).toBeVisible();

    // Navigate to repair requests tab
    await page.goto('/technical/quality?tab=repairRequests');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Danh sách yêu cầu sửa chữa').first()).toBeVisible();

    // Navigate to acceptance tab
    await page.goto('/technical/quality?tab=acceptance');
    await page.waitForTimeout(1000);
    await expect(page.locator('input[placeholder="Tìm kiếm nghiệm thu..."]')).toBeVisible();
  });
});
