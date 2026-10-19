import { test, expect, request } from './fixtures';

test('service worker starts and side panel renders every tab without errors', async ({ context, extensionId }) => {
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(`chrome-extension://${extensionId}/ui/sidepanel/index.html`);
  for (const tab of ['Routes', 'Templates', 'Network', 'Events', 'Storage']) {
    await page.getByRole('tab', { name: new RegExp(tab) }).first().click();
    await page.waitForTimeout(150);
  }
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('mock route intercepts a page fetch', async ({ context, extPage, site }) => {
  await request(extPage, 'ADD_ROUTE', {
    route: `GET:${site}/api/items`,
    config: { enabled: true, status: 200, delay: 0, interceptionMode: 'mock', response: '{"mocked":true}', contentType: 'application/json' },
  });
  await request(extPage, 'SET_ENABLED', { enabled: true });

  const page = await context.newPage();
  await page.goto(site);
  await expect
    .poll(() => page.evaluate(async (url) => (await fetch(url)).json(), `${site}/api/items`))
    .toEqual({ mocked: true });

  // Unmatched requests still reach the server
  const other = await page.evaluate(async (url) => (await fetch(url)).json(), `${site}/api/other`);
  expect(other.real).toBe(true);
});

test('passthrough keeps a Request object’s own headers', async ({ context, extPage, site }) => {
  await request(extPage, 'ADD_ROUTE', {
    route: `GET:${site}/api/auth`,
    config: { enabled: true, status: 200, delay: 0, interceptionMode: 'passthrough', response: '', requestHeaders: { 'X-Env': 'e2e' } },
  });
  await request(extPage, 'SET_ENABLED', { enabled: true });

  const page = await context.newPage();
  await page.goto(site);
  await expect
    .poll(() =>
      page.evaluate(async (url) => {
        const res = await fetch(new Request(url, { headers: { Authorization: 'Bearer t' } }));
        return (await res.json()).auth;
      }, `${site}/api/auth`)
    )
    .toBe('Bearer t');
});

test('network capture answers async requests and keeps bodies out of list updates', async ({ context, extPage, site }) => {
  const page = await context.newPage();
  await page.goto(site);
  const tabId: number = await extPage.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url: `${url}/*` });
    return tab.id!;
  }, site);

  expect(await request(extPage, 'NETWORK_ATTACH_DEBUGGER', { tabId })).toBe(true);

  await page.evaluate(async (url) => { await fetch(url); }, `${site}/api/captured`);

  const findCaptured = async () => {
    const { requests } = await request(extPage, 'NETWORK_GET_REQUESTS', { tabId });
    return requests.find((r) => r.url.endsWith('/api/captured'));
  };
  await expect.poll(async () => (await findCaptured())?.status).toBe('complete');
  const captured = await findCaptured();
  // List updates are summaries: bodies are fetched on demand
  expect(captured.responseBody).toBeUndefined();
  const requestId = captured.requestId as string;

  const responseBody = await request(extPage, 'NETWORK_GET_RESPONSE_BODY', { tabId, requestId });
  expect(JSON.parse(responseBody.body).real).toBe(true);

  const har = await request(extPage, 'NETWORK_EXPORT_HAR', { tabId });
  expect(JSON.parse(har).log.entries.length).toBeGreaterThan(0);

  await request(extPage, 'NETWORK_DETACH_DEBUGGER', { tabId });
});
