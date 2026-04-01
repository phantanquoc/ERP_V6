import { test, expect } from '@playwright/test';
import { loginAs, waitForPageLoad } from './helpers';

/**
 * E2E Smoke Tests — Attendance (Chấm công)
 *
 * Kiểm tra luồng chấm công cơ bản:
 * - Trang chấm công accessible
 * - Hiển thị bảng/danh sách attendance
 * - Nút Check In visible (nếu chưa check in)
 */

test.describe('Attendance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await waitForPageLoad(page);
  });

  test('should navigate to attendance page', async ({ page }) => {
    // Tìm link chấm công trong sidebar
    const attendanceLink = page.getByRole('link', { name: /chấm công|attendance/i });
    const hasLink = await attendanceLink.first().isVisible().catch(() => false);

    if (hasLink) {
      await attendanceLink.first().click();
      await waitForPageLoad(page);
      expect(page.url()).toContain('attendance');
    } else {
      // Navigate trực tiếp nếu không tìm thấy link
      await page.goto('/attendance');
      await waitForPageLoad(page);
    }
  });

  test('should display attendance list or table', async ({ page }) => {
    await page.goto('/attendance');
    await waitForPageLoad(page);

    // Table hoặc list phải visible
    const table = page.locator('table, [data-testid="attendance-list"], [data-testid="attendance-table"]');
    const hasTable = await table.first().isVisible({ timeout: 10_000 }).catch(() => false);

    // Hoặc có loading state → data
    const noData = page.getByText(/không có dữ liệu|no data|trống/i);
    const hasNoData = await noData.isVisible().catch(() => false);

    expect(hasTable || hasNoData).toBeTruthy();
  });

  test('should show attendance controls (check-in/check-out or date filter)', async ({ page }) => {
    await page.goto('/attendance');
    await waitForPageLoad(page);

    // Có thể là filter ngày tháng, hoặc nút check in
    const controls = page.locator(
      'input[type="date"], [data-testid="date-filter"], [data-testid="check-in-btn"], button:has-text("Check In"), button:has-text("Chấm công vào")'
    );
    const hasControls = await controls.first().isVisible({ timeout: 10_000 }).catch(() => false);
    expect(hasControls).toBeTruthy();
  });

  test('should not show unhandled errors on attendance page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/attendance');
    await waitForPageLoad(page);

    // Không có unhandled JS errors
    expect(errors).toHaveLength(0);
  });
});
