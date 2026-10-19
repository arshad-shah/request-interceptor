import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('pageToast', () => {
  let root: ShadowRoot;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    document.documentElement.innerHTML = '<head></head><body></body>';
    // The toast host uses a closed shadow root; capture it for assertions.
    const original = Element.prototype.attachShadow;
    vi.spyOn(Element.prototype, 'attachShadow').mockImplementation(function (this: Element, init) {
      root = original.call(this, { ...init, mode: 'open' });
      return root;
    });
  });

  it('renders a branded toast with an SVG status icon and no innerHTML', async () => {
    const innerHTML = vi.spyOn(Element.prototype, 'innerHTML', 'set');
    const { pageToast } = await import('../page-toast');
    pageToast('Mocked GET', 'success', { detail: '/api/items', duration: 0 });

    const toast = root.querySelector('.toast')!;
    expect(toast.getAttribute('role')).toBe('status');
    expect(toast.querySelector('.icon svg path')).not.toBeNull();
    expect(toast.querySelector('.brand')?.textContent).toBe('Request Interceptor');
    expect(toast.querySelector('.msg')?.textContent).toBe('Mocked GET');
    expect(toast.querySelector('.detail')?.textContent).toBe('/api/items');
    expect(innerHTML).not.toHaveBeenCalled();
  });

  it('marks errors as alerts and caps the visible stack', async () => {
    const { pageToast } = await import('../page-toast');
    for (let i = 0; i < 8; i++) pageToast(`n${i}`, 'error', { duration: 0 });
    const toasts = root.querySelectorAll('.toast');
    expect(toasts.length).toBe(5);
    expect(toasts[0].getAttribute('role')).toBe('alert');
    expect(toasts[4].querySelector('.msg')?.textContent).toBe('n7');
  });
});
