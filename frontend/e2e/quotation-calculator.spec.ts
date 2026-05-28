import { test, expect } from '@playwright/test';
import { setupApiRouting, login } from './helpers';

test.describe.serial('QuotationCalculator', () => {
  test('login first', async ({ page }) => {
    await setupApiRouting(page);
    await login(page);
  });

  test('opens calculator, selects NVL and process, shows flowchart', async ({ page }) => {
    await page.goto('/general/pricing?tab=requests');
    await page.locator('text=Danh sách yêu cầu báo giá').waitFor({ state: 'visible', timeout: 15000 });

    const createBtns = page.locator('button[title="Tạo báo giá"]');
    await expect(createBtns.first()).toBeVisible({ timeout: 10000 });
    const btnCount = await createBtns.count();
    expect(btnCount).toBeGreaterThan(0);
    await createBtns.nth(btnCount - 1).click();
    await page.waitForTimeout(2000);

    await expect(page.locator('text=BẢNG TÍNH CHI PHÍ')).toBeVisible();
    await expect(page.locator('text=Sản phẩm 1: Mít sấy dẻo')).toBeVisible();
    await expect(page.locator('text=Sản phẩm 2: Mít sấy giòn')).toBeVisible();
    await expect(page.locator('text=Tổng chi phí đơn hàng')).toBeVisible();
    await expect(page.locator('text=Doanh thu & lợi nhuận')).toBeVisible();

    // Select NVL (Định mức mít sấy dẻo)
    const allSelects = page.locator('select');
    const nvlOptions = await allSelects.nth(0).locator('option').all();
    for (const opt of nvlOptions) {
      const text = await opt.textContent();
      if (text?.includes('DM-MIT-DEO')) {
        await allSelects.nth(0).selectOption(await opt.getAttribute('value') || '');
        break;
      }
    }
    await page.waitForTimeout(1000);

    // Select process (Quy trình sấy mít)
    const processOptions = await allSelects.nth(3).locator('option').all();
    for (const opt of processOptions) {
      const text = await opt.textContent();
      if (text?.includes('QT-SAY-MIT')) {
        await allSelects.nth(3).selectOption(await opt.getAttribute('value') || '');
        break;
      }
    }
    await page.waitForTimeout(3000);

    await expect(page.locator('text=Lưu đồ quy trình')).toBeVisible();
    await expect(page.locator('text=PD1')).toBeVisible();
    await expect(page.locator('td:has-text("Nguyên liệu")').first()).toBeVisible();
  });

  test('switches between product tabs and summary tabs', async ({ page }) => {
    await page.goto('/general/pricing?tab=requests');
    await page.locator('text=Danh sách yêu cầu báo giá').waitFor({ state: 'visible', timeout: 15000 });

    const createBtns = page.locator('button[title="Tạo báo giá"]');
    await createBtns.nth(await createBtns.count() - 1).click();
    await page.waitForTimeout(2000);

    const tab2 = page.locator('text=Sản phẩm 2: Mít sấy giòn');
    await tab2.click();
    await page.waitForTimeout(500);
    await expect(tab2).toBeVisible();

    await page.getByRole('button', { name: 'Tổng chi phí đơn hàng' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: 'Chi phí đơn hàng' })).toBeVisible();

    await page.getByRole('button', { name: 'Doanh thu & lợi nhuận' }).click();
    await page.waitForTimeout(500);
  });

  test('Lưu button is enabled and clickable', async ({ page }) => {
    await page.goto('/general/pricing?tab=requests');
    await page.locator('text=Danh sách yêu cầu báo giá').waitFor({ state: 'visible', timeout: 15000 });

    const createBtns = page.locator('button[title="Tạo báo giá"]');
    await createBtns.nth(await createBtns.count() - 1).click();
    await page.waitForTimeout(2000);

    const saveBtn = page.locator('button:has-text("Lưu")').last();
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeEnabled();

    await expect(page.locator('button:has-text("Hủy")')).toBeVisible();
  });
});
