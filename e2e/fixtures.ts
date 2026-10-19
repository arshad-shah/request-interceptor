import { test as base, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import { createHash } from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXTENSION_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/chrome');

const blobCache = new Map<number, string>();

/** A JSON document of roughly `kb` kilobytes (cached: generation is not what's being measured). */
function jsonBlob(kb: number): string {
  let body = blobCache.get(kb);
  if (!body) {
    const row = { id: 0, name: 'synthetic row', tags: ['alpha', 'beta', 'gamma'], value: 0.5, active: true };
    const rowChars = JSON.stringify(row).length + 1;
    const items = Array.from({ length: Math.max(1, Math.round((kb * 1024) / rowChars)) }, (_, id) => ({ ...row, id }));
    body = JSON.stringify({ kb, items });
    blobCache.set(kb, body);
  }
  return body;
}

/** Encode an unmasked server → client WebSocket frame. */
function wsFrame(opcode: number, payload: Buffer): Buffer {
  const len = payload.length;
  const header = len < 126 ? Buffer.from([0x80 | opcode, len]) : len < 65536 ? Buffer.alloc(4) : Buffer.alloc(10);
  if (len >= 126) {
    header[0] = 0x80 | opcode;
    if (len < 65536) {
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
  }
  return Buffer.concat([header, payload]);
}

/**
 * Minimal RFC 6455 echo for `/ws/echo`: unfragmented client frames are echoed
 * back; close frames are answered and end the socket.
 */
function handleWebSocketEcho(req: http.IncomingMessage, socket: Duplex): void {
  const key = req.headers['sec-websocket-key'];
  if (req.url !== '/ws/echo' || typeof key !== 'string') {
    socket.destroy();
    return;
  }
  const accept = createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
  socket.write(
    `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`
  );

  let buffered = Buffer.alloc(0);
  socket.on('data', (chunk: Buffer) => {
    buffered = Buffer.concat([buffered, chunk]);
    for (;;) {
      if (buffered.length < 2) return;
      const opcode = buffered[0] & 0x0f;
      let len = buffered[1] & 0x7f;
      let offset = 2;
      if (len === 126) {
        if (buffered.length < 4) return;
        len = buffered.readUInt16BE(2);
        offset = 4;
      } else if (len === 127) {
        if (buffered.length < 10) return;
        len = Number(buffered.readBigUInt64BE(2));
        offset = 10;
      }
      const masked = (buffered[1] & 0x80) !== 0;
      const end = offset + (masked ? 4 : 0) + len;
      if (buffered.length < end) return;
      const payload = Buffer.from(buffered.subarray(end - len, end));
      if (masked) {
        const mask = buffered.subarray(offset, offset + 4);
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
      }
      buffered = buffered.subarray(end);
      if (opcode === 0x8) {
        socket.end(wsFrame(0x8, payload));
        return;
      }
      if (opcode === 0x9) socket.write(wsFrame(0xa, payload));
      else if (opcode === 0x1 || opcode === 0x2) socket.write(wsFrame(opcode, payload));
    }
  });
  socket.on('error', () => socket.destroy());
}

/**
 * Local fixture site: a blank page, a JSON API, `/api/blob?kb=N` (≈N KB of
 * JSON, uncacheable) and a WebSocket echo at `/ws/echo`.
 */
function startFixtureServer(): Promise<{ origin: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    if (req.url?.startsWith('/api/blob')) {
      const kb = Number(new URL(req.url, 'http://fixture').searchParams.get('kb')) || 1;
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(jsonBlob(Math.min(Math.max(Math.round(kb), 1), 4096)));
      return;
    }
    if (req.url?.startsWith('/api/')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ real: true, path: req.url, auth: req.headers.authorization ?? null }));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><title>fixture</title><h1>fixture</h1>');
  });
  // Upgraded sockets leave the server's connection tracking: close them ourselves
  const sockets = new Set<Duplex>();
  server.on('upgrade', (req, socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    handleWebSocketEcho(req, socket);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((r) => {
            for (const socket of sockets) socket.destroy();
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
