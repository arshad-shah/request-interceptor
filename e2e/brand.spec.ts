import { test, expect, request } from './fixtures';

test('branded toast appears on the page when a mock fires', async ({ context, extPage, site }, testInfo) => {
  await request(extPage, 'ADD_ROUTE', {
    route: `GET:${site}/api/toast`,
    config: { enabled: true, status: 200, delay: 0, interceptionMode: 'mock', response: '{"ok":true}' },
  });
  await request(extPage, 'SET_ENABLED', { enabled: true });

  const page = await context.newPage();
  await page.goto(site);
  await expect.poll(() => page.evaluate(async (u) => (await fetch(u)).json(), `${site}/api/toast`)).toEqual({ ok: true });

  // The toast host is a closed shadow root; assert it exists and capture it visually.
  await expect(page.locator('#__request-interceptor-toast-host__')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('toast.png') });
});

test('side panel opens on a slim control bar without the product name', async ({ context, extensionId }, testInfo) => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 400, height: 700 });
  await page.goto(`chrome-extension://${extensionId}/ui/sidepanel/index.html`);
  const bar = page.locator('header').first();
  await expect(bar.getByRole('button', { name: 'Settings' })).toBeVisible();
  await expect(bar.getByRole('switch', { name: 'Toggle request interception' })).toBeAttached();
  await expect(bar.getByText('Request Interceptor')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('sidepanel.png'), clip: { x: 0, y: 0, width: 400, height: 120 } });
});
