import { test, expect, request } from './fixtures';

async function openSiteTab(context: import('@playwright/test').BrowserContext, extPage: import('@playwright/test').Page, site: string) {
  const page = await context.newPage();
  await page.goto(site);
  const tabId: number = await extPage.evaluate(async (url) => (await chrome.tabs.query({ url: `${url}/*` }))[0].id!, site);
  return { page, tabId };
}

test('storage inspector reads and edits page web storage', async ({ context, extPage, site }) => {
  const { page, tabId } = await openSiteTab(context, extPage, site);
  await page.evaluate(() => localStorage.setItem('flag', 'true'));

  const before = await request(extPage, 'GET_WEB_STORAGE', { tabId });
  expect(before.localStorage).toEqual({ flag: 'true' });

  await request(extPage, 'STORAGE_ACTION', { tabId, action: { type: 'SET_SESSION', key: 'token', value: 'abc' } });
  expect(await page.evaluate(() => sessionStorage.getItem('token'))).toBe('abc');

  await request(extPage, 'STORAGE_ACTION', { tabId, action: { type: 'CLEAR_LOCAL' } });
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('storage errors on restricted pages are reported, not swallowed', async ({ context, extPage }) => {
  const page = await context.newPage();
  await page.goto('chrome://version');
  const tabId: number = await extPage.evaluate(async () => (await chrome.tabs.query({ url: 'chrome://version/*' }))[0].id!);
  await expect(request(extPage, 'GET_WEB_STORAGE', { tabId })).rejects.toThrow(/does not allow extensions/);
});

test('event monitor records page CustomEvents for that tab only', async ({ context, extPage, site }) => {
  await request(extPage, 'SET_ENABLED', { enabled: true });
  await request(extPage, 'SET_EVENT_MONITOR', { enabled: true });
  const { page, tabId } = await openSiteTab(context, extPage, site);

  await expect
    .poll(async () => {
      await page.evaluate(() => document.dispatchEvent(new CustomEvent('cart:add', { detail: { sku: 42 } })));
      const events = await request(extPage, 'GET_EVENTS', { tabId });
      return events.some((e) => e.eventType === 'cart:add');
    })
    .toBe(true);

  // Turning interception off also turns the monitor off
  await request(extPage, 'SET_ENABLED', { enabled: false });
  expect((await request(extPage, 'GET_STATE')).eventMonitorEnabled).toBe(false);
});
