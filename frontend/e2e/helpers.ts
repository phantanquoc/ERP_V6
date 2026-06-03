import { Page } from '@playwright/test';

export async function setupApiRouting(page: Page) {
  const backendUrl = process.env.BACKEND_URL || 'http://backend:5000';

  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (!url.includes('localhost:5003')) {
      await route.continue();
      return;
    }

    const newUrl = url.replace('http://localhost:5003', backendUrl);
    const method = route.request().method();
    const body = route.request().postData();
    const hasBody = method !== 'GET' && method !== 'HEAD' && !!body;

    try {
      const fetchHeaders = new Headers();
      if (hasBody) {
        fetchHeaders.set('Content-Type', 'application/json');
      }

      const res = await fetch(newUrl, {
        method,
        headers: fetchHeaders,
        body: hasBody ? body : undefined,
      });

      const resBody = await res.arrayBuffer();

      const responseHeaders = new Headers();
      responseHeaders.set('content-type', res.headers.get('content-type') || 'application/json');
      responseHeaders.set('access-control-allow-origin', '*');

      await route.fulfill({
        status: res.status,
        headers: Object.fromEntries(responseHeaders.entries()),
        body: Buffer.from(resBody),
      });
    } catch (err) {
      console.error(`[Proxy Failed] ${url}: ${err}`);
      await route.continue();
    }
  });
}

export async function login(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.locator('input').first().fill('admin@example.com');
  await page.locator('input[type=password]').fill('admin123');
  await page.getByRole('button').filter({ hasText: 'Đăng nhập' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}
