import { describe, it, expect, vi, afterEach } from 'vitest';
import { setupWebSocketInterceptor, processMessage } from '../interceptors/ws-interceptor';

const noopLog = () => {};

/** Minimal stand-in for the native WebSocket. */
class FakeWebSocket extends EventTarget {
  static instances: FakeWebSocket[] = [];
  readyState = 1;
  binaryType: BinaryType = 'blob';
  sent: any[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  constructor(public url: string) {
    super();
    FakeWebSocket.instances.push(this);
    this.addEventListener('message', (e) => this.onmessage?.(e as MessageEvent));
  }
  send(data: any) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
    this.dispatchEvent(new Event('close'));
  }
}

const routes = {
  'WS:wss://feed.test/socket': {
    enabled: true,
    incomingRules: [
      { id: '1', enabled: true, type: 'replace', matchType: 'contains', match: 'foo', replacement: 'bar' },
    ],
    outgoingRules: [
      { id: '2', enabled: true, type: 'replace', matchType: 'contains', match: 'foo', replacement: 'bar' },
    ],
  },
};

describe('processMessage', () => {
  const config = routes['WS:wss://feed.test/socket'];

  it('passes binary data through untouched when no rule changes it', () => {
    const buffer = new Uint8Array([0, 159, 146, 150]).buffer;
    expect(processMessage(buffer, config, 'outgoing', noopLog).result).toBe(buffer);
    const view = new Uint8Array([1, 2, 3]);
    expect(processMessage(view, config, 'outgoing', noopLog).result).toBe(view);
  });

  it('still rewrites text frames', () => {
    expect(processMessage('a foo b', config, 'outgoing', noopLog).result).toBe('a bar b');
  });
});

describe('setupWebSocketInterceptor', () => {
  const nativeWebSocket = window.WebSocket;
  afterEach(() => {
    window.WebSocket = nativeWebSocket;
    FakeWebSocket.instances = [];
  });

  function install() {
    const active = new Map<WebSocket, any>();
    setupWebSocketInterceptor(
      { getWebSocketRoutes: () => routes },
      noopLog,
      FakeWebSocket as unknown as typeof WebSocket,
      active
    );
    return active;
  }

  it('keeps instanceof working for intercepted sockets', () => {
    install();
    const ws = new window.WebSocket('wss://feed.test/socket');
    expect(ws instanceof window.WebSocket).toBe(true);
  });

  it('proxies binaryType to the real socket', () => {
    install();
    const ws = new window.WebSocket('wss://feed.test/socket');
    ws.binaryType = 'arraybuffer';
    expect(ws.binaryType).toBe('arraybuffer');
    expect(FakeWebSocket.instances[0].binaryType).toBe('arraybuffer');
  });

  it('removeEventListener removes a message listener', () => {
    install();
    const ws = new window.WebSocket('wss://feed.test/socket');
    const listener = vi.fn();
    ws.addEventListener('message', listener);
    ws.removeEventListener('message', listener);
    FakeWebSocket.instances[0].dispatchEvent(new MessageEvent('message', { data: 'x' }));
    expect(listener).not.toHaveBeenCalled();
  });

  it('forgets sockets closed by the server', () => {
    const active = install();
    new window.WebSocket('wss://feed.test/socket');
    expect(active.size).toBe(1);
    FakeWebSocket.instances[0].close();
    expect(active.size).toBe(0);
  });
});
