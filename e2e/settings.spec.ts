import { test, expect, request } from './fixtures';

const mockRoute = (site: string, path: string) => ({
  route: `GET:${site}${path}`,
  config: { enabled: true, status: 200, delay: 0, interceptionMode: 'mock', response: '{"mocked":true}' },
});

const fetchJson = (page: import('@playwright/test').Page, url: string) =>
  page.evaluate(async (u) => (await fetch(u)).json(), url);

test('deny-listed sites are not intercepted', async ({ context, extPage, site }) => {
  await request(extPage, 'ADD_ROUTE', mockRoute(site, '/api/deny'));
  await request(extPage, 'SET_ENABLED', { enabled: true });
  await request(extPage, 'UPDATE_SETTINGS', { patch: { sites: { denylist: ['127.0.0.1'] } } });

  const page = await context.newPage();
  await page.goto(site);
  await page.waitForTimeout(300);
  expect((await fetchJson(page, `${site}/api/deny`)).real).toBe(true);

  // Removing it re-enables interception live, without a reload
  await request(extPage, 'UPDATE_SETTINGS', { patch: { sites: { denylist: [] } } });
  await expect.poll(() => fetchJson(page, `${site}/api/deny`)).toEqual({ mocked: true });
});

test('turning off page notifications suppresses toasts', async ({ context, extPage, site }) => {
  await request(extPage, 'ADD_ROUTE', mockRoute(site, '/api/quiet'));
  await request(extPage, 'SET_ENABLED', { enabled: true });
  await request(extPage, 'UPDATE_SETTINGS', { patch: { notifications: { pageToasts: false } } });

  const page = await context.newPage();
  await page.goto(site);
  await expect.poll(() => fetchJson(page, `${site}/api/quiet`)).toEqual({ mocked: true });
  await expect(page.locator('#__request-interceptor-toast-host__')).toHaveCount(0);
});

test('toast position follows settings', async ({ context, extPage, site }) => {
  await request(extPage, 'ADD_ROUTE', mockRoute(site, '/api/pos'));
  await request(extPage, 'SET_ENABLED', { enabled: true });
  await request(extPage, 'UPDATE_SETTINGS', { patch: { notifications: { position: 'bottom-left' } } });

  const page = await context.newPage();
  await page.goto(site);
  await expect.poll(() => fetchJson(page, `${site}/api/pos`)).toEqual({ mocked: true });
  await expect(page.locator('#__request-interceptor-toast-host__')).toHaveAttribute('data-position', 'bottom-left');
});

test('settings persist, validate and reset', async ({ extPage }) => {
  const saved = await request(extPage, 'UPDATE_SETTINGS', { patch: { network: { maxRequests: 999999 } } });
  expect(saved.network.maxRequests).toBe(5000);
  expect((await request(extPage, 'GET_SETTINGS')).network.maxRequests).toBe(5000);
  const reset = await request(extPage, 'RESET_SETTINGS');
  expect(reset.network.maxRequests).toBe(500);
});

test('a cross-origin iframe cannot inject routes into the page', async ({ context, extPage, site }) => {
  await request(extPage, 'SET_ENABLED', { enabled: true });
  const page = await context.newPage();
  await page.goto(site);
  // A frame on another origin (localhost vs 127.0.0.1) posts a forged command to its parent
  const otherOrigin = site.replace('127.0.0.1', 'localhost');
  await page.evaluate((src) => {
    const frame = document.createElement('iframe');
    frame.src = src;
    document.body.appendChild(frame);
    return new Promise((r) => (frame.onload = r));
  }, otherOrigin);
  await page.frames()[1].evaluate((target) => {
    window.parent.postMessage(
      { type: 'REQUEST_INTERCEPTOR_COMMAND', command: 'updateRoutes', routes: { [`GET:${target}/api/hijack`]: { enabled: true, interceptionMode: 'mock', response: '{"hijacked":true}' } } },
      '*'
    );
  }, site);
  await page.waitForTimeout(200);
  expect((await fetchJson(page, `${site}/api/hijack`)).real).toBe(true);
});

test('settings panel opens from the header and toggles a setting', async ({ context, extensionId, extPage }) => {
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`chrome-extension://${extensionId}/ui/sidepanel/index.html`);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  await page.getByRole('switch', { name: 'Notify: Redirects' }).click({ force: true });
  await expect.poll(async () => (await request(extPage, 'GET_SETTINGS')).notifications.events.redirect).toBe(false);
  expect(errors).toEqual([]);
});
