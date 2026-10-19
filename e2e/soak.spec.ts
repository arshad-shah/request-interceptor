/**
 * Memory soak: heavy captured traffic must not grow the service worker heap
 * without bound. Run with `pnpm test:soak` (excluded from `pnpm test:e2e`).
 *
 * Heap is read over CDP from the extension's service-worker target: a
 * browser-level session attaches to it (non-flattened, since Playwright's
 * CDPSession cannot address flattened child sessions) and relays
 * `HeapProfiler.collectGarbage` + `Runtime.getHeapUsage` through
 * `Target.sendMessageToTarget`.
 */
import type { BrowserContext, CDPSession } from '@playwright/test';
import { test, expect, request } from './fixtures';

const TRAFFIC_MS = Number(process.env.SOAK_MS) || 25_000;
const CONCURRENCY = 8;
const HEAP_BUDGET_MB = 80;
const MAX_REQUESTS = 500; // DEFAULT_SETTINGS.network.maxRequests

const MB = 1024 * 1024;

interface HeapUsage {
  usedSize: number;
  totalSize: number;
}

/** Collect garbage in the extension service worker and return its heap usage. */
async function workerHeap(context: BrowserContext, extensionId: string): Promise<HeapUsage> {
  const browser = context.browser();
  if (!browser) throw new Error('No browser handle for the persistent context');
  const cdp: CDPSession = await browser.newBrowserCDPSession();
  try {
    const { targetInfos } = await cdp.send('Target.getTargets');
    const worker = targetInfos.find(
      (t) => t.type === 'service_worker' && t.url.startsWith(`chrome-extension://${extensionId}/`)
    );
    if (!worker) throw new Error('Extension service worker target not found');
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: worker.targetId, flatten: false });

    let nextId = 0;
    const pending = new Map<number, (msg: { result?: unknown; error?: { message: string } }) => void>();
    cdp.on('Target.receivedMessageFromTarget', (event) => {
      if (event.sessionId !== sessionId) return;
      const msg = JSON.parse(event.message) as { id?: number; result?: unknown; error?: { message: string } };
      if (msg.id !== undefined) pending.get(msg.id)?.(msg);
    });
    const call = <T>(method: string, params: object = {}): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, (msg) => {
          pending.delete(id);
          if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
          else resolve(msg.result as T);
        });
        cdp.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method, params }) }).catch(reject);
      });

    // Twice: the first pass can leave objects only freed by finalizers
    await call('HeapProfiler.collectGarbage');
    await call('HeapProfiler.collectGarbage');
    const usage = await call<HeapUsage>('Runtime.getHeapUsage');
    await cdp.send('Target.detachFromTarget', { sessionId });
    return usage;
  } finally {
    await cdp.detach();
  }
}

const fmt = (bytes: number) => `${(bytes / MB).toFixed(1)} MB`;

test('service worker heap stays bounded under heavy captured traffic', async ({ context, extensionId, extPage, site }) => {
  test.setTimeout(TRAFFIC_MS + 120_000);

  const page = await context.newPage();
  await page.goto(site);
  const tabId: number = await extPage.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url: `${url}/*` });
    return tab.id!;
  }, site);

  expect(await request(extPage, 'NETWORK_ATTACH_DEBUGGER', { tabId })).toBe(true);
  const baseline = await workerHeap(context, extensionId);

  const traffic = await page.evaluate(
    async ({ durationMs, concurrency }) => {
      const deadline = performance.now() + durationMs;
      let fetches = 0;
      let bytes = 0;
      let failures = 0;

      const fetchLoop = async (worker: number) => {
        while (performance.now() < deadline) {
          const kb = 50 + Math.floor(Math.random() * 151); // 50–200 KB
          try {
            const res = await fetch(`/api/blob?kb=${kb}&w=${worker}&n=${fetches}`);
            bytes += (await res.text()).length;
            fetches++;
          } catch {
            failures++;
          }
        }
      };

      // One busy socket alongside: bounded frame history must cap its memory too
      const socketLoop = () =>
        new Promise<{ sent: number; echoed: number }>((resolve) => {
          const ws = new WebSocket(`ws://${location.host}/ws/echo`);
          let sent = 0;
          let echoed = 0;
          ws.onmessage = () => {
            echoed++;
          };
          ws.onopen = async () => {
            while (performance.now() < deadline) {
              ws.send('x'.repeat(1024 + Math.floor(Math.random() * 7 * 1024))); // 1–8 KB
              sent++;
              await new Promise((r) => setTimeout(r, 5));
            }
            ws.close();
          };
          ws.onclose = () => resolve({ sent, echoed });
          ws.onerror = () => resolve({ sent, echoed });
        });

      const [socket] = await Promise.all([socketLoop(), ...Array.from({ length: concurrency }, (_, i) => fetchLoop(i))]);
      return { fetches, bytes, failures, socket };
    },
    { durationMs: TRAFFIC_MS, concurrency: CONCURRENCY }
  );

  // Let in-flight body prefetches and the debounced broadcast settle
  await page.waitForTimeout(1_000);
  const after = await workerHeap(context, extensionId);

  const { requests, attached } = await request<{ requests: { type: string }[]; attached: boolean }>(
    extPage,
    'NETWORK_GET_REQUESTS',
    { tabId }
  );

  console.log(
    [
      `soak: ${traffic.fetches} fetches (${fmt(traffic.bytes)}, ${traffic.failures} failed) + ` +
        `${traffic.socket.sent} WS frames sent / ${traffic.socket.echoed} echoed in ${TRAFFIC_MS / 1000}s`,
      `soak: SW heap after GC — baseline ${fmt(baseline.usedSize)} used / ${fmt(baseline.totalSize)} total; ` +
        `after ${fmt(after.usedSize)} used / ${fmt(after.totalSize)} total (budget ${HEAP_BUDGET_MB} MB)`,
      `soak: NETWORK_GET_REQUESTS returned ${requests.length} requests (limit ${MAX_REQUESTS})`,
    ].join('\n')
  );

  // The traffic really happened and was really captured (not a restarted, empty worker)
  expect(traffic.fetches).toBeGreaterThan(1_000);
  expect(attached).toBe(true);
  expect(requests.length).toBeGreaterThan(MAX_REQUESTS / 2);

  expect(requests.length).toBeLessThanOrEqual(MAX_REQUESTS);
  expect(after.usedSize).toBeLessThan(HEAP_BUDGET_MB * MB);

  await request(extPage, 'NETWORK_DETACH_DEBUGGER', { tabId });
});
