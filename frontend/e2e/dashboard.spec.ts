import { test, expect } from '@playwright/test';
import { loginAs, waitForPageLoad } from './helpers';

/**
 * E2E Smoke Tests — Dashboard
 *
 * Kiểm tra dashboard load đúng sau khi đăng nhập.
 * Các test này phụ thuộc vào backend đang chạy.
 */

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Đăng nhập trước mỗi test
    await loginAs(page, 'admin');
    await waitForPageLoad(page);
  });

  test('should display dashboard after successful login', async ({ page }) => {
    // Phải có nội dung dashboard — không còn ở login
    expect(page.url()).not.toContain('/login');
    // Tiêu đề trang phải load
    await expect(page).toHaveTitle(/.+/);
  });

  test('should display navigation sidebar or menu', async ({ page }) => {
    // Sidebar/nav phải hiển thị (chứa menu items)
    const nav = page.locator('nav, aside, [data-testid="sidebar"], [role="navigation"]');
    await expect(nav.first()).toBeVisible({ timeout: 10_000 });
  });

  test('should display user info or logout option', async ({ page }) => {
    // Header phải có user info hoặc nút logout
    const userArea = page.locator(
      '[data-testid="user-menu"], [data-testid="user-info"], .user-menu, .avatar'
    );
    // Nếu không có data-testid, tìm text "Đăng xuất" hoặc "Logout"
    const logoutText = page.getByText(/đăng xuất|logout/i);
    const hasUserArea = await userArea.first().isVisible().catch(() => false);
    const hasLogout = await logoutText.isVisible().catch(() => false);

    // Ít nhất một trong hai phải visible
    expect(hasUserArea || hasLogout).toBeTruthy();
  });

  test('should load dashboard widgets or stats without errors', async ({ page }) => {
    // Không có unhandled console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Đợi network idle
    await page.waitForLoadState('networkidle');
    // Lọc ra các lỗi nghiêm trọng (không phải 404 favicon)
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('404')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
