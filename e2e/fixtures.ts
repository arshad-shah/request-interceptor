import { test as base, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXTENSION_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/chrome');

/** Local fixture site: a blank page plus a JSON API and a WebSocket-free echo. */
function startFixtureServer(): Promise<{ origin: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    if (req.url?.startsWith('/api/')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ real: true, path: req.url, auth: req.headers.authorization ?? null }));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><title>fixture</title><h1>fixture</h1>');
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((r) => {
            server.closeAllConnections();
            server.close(() => r());
          }),
      });
    });
  });
}

type Fixtures = {
  context: BrowserContext;
  serviceWorker: Worker;
  extensionId: string;
  site: string;
  /** An extension page, used to talk to the background like the side panel does. */
  extPage: Page;
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
    });
    await use(context);
    await context.close();
  },
  serviceWorker: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await use(worker);
  },
  extensionId: async ({ serviceWorker }, use) => {
    await use(new URL(serviceWorker.url()).host);
  },
  // eslint-disable-next-line no-empty-pattern
  site: async ({}, use) => {
    const server = await startFixtureServer();
    await use(server.origin);
    await server.close();
  },
  extPage: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/ui/popup/index.html`);
    await use(page);
  },
});

/** Send a typed request from an extension page; returns its data or throws its error. */
export async function request<T = any>(extPage: Page, type: string, payload?: unknown): Promise<T> {
  const response = (await extPage.evaluate(
    ([t, p]) => chrome.runtime.sendMessage({ type: t, payload: p }),
    [type, payload] as const
  )) as { ok: boolean; data?: T; error?: string };
  if (!response?.ok) throw new Error(`${type} failed: ${response?.error ?? 'no response'}`);
  return response.data as T;
}

export { expect } from '@playwright/test';
