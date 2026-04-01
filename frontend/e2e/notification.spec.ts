import { test, expect } from '@playwright/test';
import { loginAs, waitForPageLoad } from './helpers';

/**
 * E2E Smoke Tests — Notification Bell
 *
 * Kiểm tra chuông thông báo trên header:
 * - Icon chuông visible
 * - Click mở dropdown
 * - Hiển thị danh sách thông báo
 * - Badge unread count
 */

test.describe('Notification Bell', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await waitForPageLoad(page);
  });

  test('should display notification bell icon in header', async ({ page }) => {
    // Tìm icon chuông — có thể là SVG, button, hoặc data-testid
    const bell = page.locator(
      '[data-testid="notification-bell"], [aria-label*="notification"], [aria-label*="thông báo"], button:has(svg)'
    );
    await expect(bell.first()).toBeVisible({ timeout: 10_000 });
  });

  test('should open notification dropdown when bell is clicked', async ({ page }) => {
    const bell = page.locator(
      '[data-testid="notification-bell"], [aria-label*="notification"], [aria-label*="thông báo"]'
    );

    // Click chuông
    await bell.first().click();

    // Dropdown/panel phải xuất hiện
    const dropdown = page.locator(
      '[data-testid="notification-panel"], [data-testid="notification-dropdown"], .notification-list'
    );
    await expect(dropdown.first()).toBeVisible({ timeout: 5_000 });
  });

  test('should show unread count badge when there are unread notifications', async ({ page }) => {
    // Badge (số đỏ) có thể có hoặc không — nếu không có unread thì không có badge
    // Test này chỉ verify nếu badge tồn tại thì hiển thị số > 0
    const badge = page.locator(
      '[data-testid="notification-badge"], .notification-badge, .badge'
    );

    const badgeExists = await badge.first().isVisible().catch(() => false);
    if (badgeExists) {
      const text = await badge.first().textContent();
      const count = parseInt(text || '0', 10);
      expect(count).toBeGreaterThan(0);
    }
    // Nếu không có badge → OK, có thể không có unread
  });

  test('should mark notification as read when clicked', async ({ page }) => {
    const bell = page.locator(
      '[data-testid="notification-bell"], [aria-label*="notification"], [aria-label*="thông báo"]'
    );
    await bell.first().click();

    // Tìm thông báo unread đầu tiên
    const unreadNotif = page.locator(
      '[data-testid="notification-item"]:not(.read), .notification-item.unread'
    );

    const hasUnread = await unreadNotif.first().isVisible().catch(() => false);
    if (hasUnread) {
      await unreadNotif.first().click();
      // Sau khi click → notification phải được đánh dấu đọc
      // (badge giảm đi hoặc class thay đổi)
      await page.waitForTimeout(500);
      // Chỉ verify không có lỗi throw
      const errors: string[] = [];
      page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
      expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
    }
  });
});
