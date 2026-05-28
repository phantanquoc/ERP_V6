import { test, expect } from '@playwright/test';
import { setupApiRouting, login } from './helpers';

test.describe.serial('Employee Management', () => {
  test('login first', async ({ page }) => {
    await setupApiRouting(page);
    await login(page);
  });

  test('navigates to employee list and shows tabs', async ({ page }) => {
    await page.goto('/quality/personnel');
    await page.locator('text=Phòng chất lượng nhân sự').waitFor({ state: 'visible', timeout: 15000 });

    await expect(page.locator('text=Danh sách nhân viên')).toBeVisible();
    await expect(page.locator('text=Quản lý vị trí')).toBeVisible();
    await expect(page.locator('text=Đánh giá nhân viên')).toBeVisible();
  });

  test('employee tab shows overview cards', async ({ page }) => {
    await page.goto('/quality/personnel');
    await page.locator('text=Phòng chất lượng nhân sự').waitFor({ state: 'visible', timeout: 15000 });

    await expect(page.locator('text=Tổng quan nhân viên')).toBeVisible();
    await expect(page.locator('text=Tổng quan đánh giá')).toBeVisible();
    await expect(page.locator('text=Tổng quan điểm danh')).toBeVisible();
  });

  test('switches between employee tabs', async ({ page }) => {
    await page.goto('/quality/personnel');
    await page.locator('text=Phòng chất lượng nhân sự').waitFor({ state: 'visible', timeout: 15000 });

    await page.getByRole('tab', { name: 'Quản lý vị trí' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('tab', { name: 'Đánh giá nhân viên' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('tab', { name: 'Bảng tính lương' }).click();
    await page.waitForTimeout(1000);
  });
});
