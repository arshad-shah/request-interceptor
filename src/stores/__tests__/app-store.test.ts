import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAppStore } from '../app-store';
import type { RouteConfig, WebSocketConfig, InjectionConfig, Notification } from '@/types';

type AnyConfig = RouteConfig | WebSocketConfig | InjectionConfig;
const cfg = (extra: Record<string, unknown> = {}) => ({ status: 200, response: '{}', ...extra }) as unknown as AnyConfig;

const initial = useAppStore.getState();
const store = () => useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(initial, true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('app-store routes', () => {
  it('setRoutes normalizes a missing enabled flag to true without touching explicit values', () => {
    const off = cfg({ enabled: false });
    store().setRoutes({ 'GET:/a': cfg(), 'GET:/b': off });
    expect(store().routes['GET:/a'].enabled).toBe(true);
    expect(store().routes['GET:/b']).toBe(off);
  });

  it('setRoutes keeps identity for unchanged configs and replaces changed ones', () => {
    const a = cfg({ enabled: true });
    const b = cfg({ enabled: true, status: 404 });
    store().setRoutes({ 'GET:/a': a, 'GET:/b': b });
    const before = store().routes;

    // Fresh but shallow-equal objects (as from a STATE_CHANGED broadcast).
    store().setRoutes({ 'GET:/a': { ...a }, 'GET:/b': { ...b, status: 500 } as AnyConfig });
    const after = store().routes;
    expect(after).not.toBe(before);
    expect(after['GET:/a']).toBe(a);
    expect(after['GET:/b']).not.toBe(b);
    expect((after['GET:/b'] as RouteConfig).status).toBe(500);
  });

  it('setRoutes returns the same state when nothing changed', () => {
    const a = cfg({ enabled: true });
    store().setRoutes({ 'GET:/a': a });
    const before = store().routes;
    store().setRoutes({ 'GET:/a': a });
    store().setRoutes({ 'GET:/a': { ...a } });
    expect(store().routes).toBe(before);
    expect(store().routes['GET:/a']).toBe(a);
  });

  // Regression: configs without `enabled` were reallocated on every identical payload.
  it('setRoutes keeps identity when the same un-normalized payload arrives again', () => {
    const a = cfg();
    store().setRoutes({ 'GET:/a': a });
    const before = store().routes;
    store().setRoutes({ 'GET:/a': { ...a } });
    expect(store().routes).toBe(before);
  });

  it('setRoutes picks up toggled and removed routes', () => {
    const a = cfg({ enabled: true });
    store().setRoutes({ 'GET:/a': a, 'GET:/b': cfg({ enabled: true }) });
    store().setRoutes({ 'GET:/a': { ...a, enabled: false } as AnyConfig });
    expect(Object.keys(store().routes)).toEqual(['GET:/a']);
    expect(store().routes['GET:/a'].enabled).toBe(false);

    store().setRoutes({ 'GET:/c': cfg() });
    expect(Object.keys(store().routes)).toEqual(['GET:/c']);
  });

  it('addRoute defaults enabled to true and respects an explicit false', () => {
    store().addRoute('GET:/a', cfg());
    store().addRoute('GET:/b', cfg({ enabled: false }));
    expect(store().routes['GET:/a'].enabled).toBe(true);
    expect(store().routes['GET:/b'].enabled).toBe(false);
  });

  it('updateRoute replaces, removeRoute deletes and clearRoutes empties', () => {
    store().addRoute('GET:/a', cfg());
    store().addRoute('GET:/b', cfg());
    const replacement = cfg({ enabled: false, status: 418 });
    store().updateRoute('GET:/a', replacement);
    expect(store().routes['GET:/a']).toBe(replacement);

    store().removeRoute('GET:/b');
    expect(Object.keys(store().routes)).toEqual(['GET:/a']);
    store().removeRoute('GET:/missing');
    expect(Object.keys(store().routes)).toEqual(['GET:/a']);

    store().clearRoutes();
    expect(store().routes).toEqual({});
  });

  it('toggleRoute flips only existing routes', () => {
    store().addRoute('WS:wss://x', cfg());
    store().toggleRoute('WS:wss://x', false);
    expect(store().routes['WS:wss://x'].enabled).toBe(false);

    const before = store().routes;
    store().toggleRoute('GET:/missing', true);
    expect(store().routes).toBe(before);
    expect(store().routes).not.toHaveProperty(['GET:/missing']);
  });

  it('splits routes by type', () => {
    store().setRoutes({
      'GET:/a': cfg(),
      'POST:/b|named': cfg(),
      'WS:wss://socket': cfg(),
      'INJ:*://example.com/*': cfg(),
    });
    expect(Object.keys(store().getRoutesByType('http'))).toEqual(['GET:/a', 'POST:/b|named']);
    expect(Object.keys(store().getRoutesByType('websocket'))).toEqual(['WS:wss://socket']);
    expect(Object.keys(store().getRoutesByType('injection'))).toEqual(['INJ:*://example.com/*']);
    expect(store().getRoutesByType('all')).toBe(store().routes);
    expect(store().isWebSocketRoute('WS:wss://socket')).toBe(true);
    expect(store().isInjectionRoute('INJ:x')).toBe(true);
    expect(store().isWebSocketRoute('GET:/WS:')).toBe(false);
  });
});

describe('app-store enabled flags', () => {
  it('setEnabled(false) also turns off the event monitor', () => {
    store().setEnabled(true);
    store().setEventMonitorEnabled(true);
    store().setEnabled(false);
    expect(store().enabled).toBe(false);
    expect(store().eventMonitorEnabled).toBe(false);
  });

  it('setEnabled(true) leaves the event monitor as it was', () => {
    store().setEventMonitorEnabled(true);
    store().setEnabled(true);
    expect(store().eventMonitorEnabled).toBe(true);
  });
});

describe('app-store notifications', () => {
  const note = (over: Partial<Omit<Notification, 'id'>> = {}): Omit<Notification, 'id'> => ({
    title: 'Saved',
    message: 'Route saved',
    type: 'success',
    timestamp: Date.now(),
    ...over,
  });

  it('assigns unique ids and stamps the current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    store().addNotification(note({ timestamp: 1 }));
    store().addNotification(note({ title: 'Other' }));
    const [a, b] = store().notifications;
    expect(a.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
    expect(a.timestamp).toBe(Date.parse('2026-01-01T00:00:00Z'));
  });

  it.each([
    ['error', 6000],
    ['warning', 4500],
    ['success', 3000],
    ['info', 3500],
  ] as const)('defaults %s notifications to %dms', (type, duration) => {
    store().addNotification(note({ type }));
    expect(store().notifications[0].duration).toBe(duration);
  });

  it('keeps explicit durations and leaves persistent ones without a duration', () => {
    store().addNotification(note({ title: 'A', duration: 10_000 }));
    store().addNotification(note({ title: 'B', persistent: true }));
    expect(store().notifications.map((n) => n.duration)).toEqual([10_000, undefined]);
  });

  it('drops an identical notification within 2 seconds but allows it afterwards', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.advanceTimersByTime(10_000);
    store().addNotification(note());
    vi.advanceTimersByTime(1999);
    store().addNotification(note());
    expect(store().notifications).toHaveLength(1);

    // Same title but different type/message is not a duplicate.
    store().addNotification(note({ type: 'error' }));
    store().addNotification(note({ message: 'Other route saved' }));
    expect(store().notifications).toHaveLength(3);

    vi.advanceTimersByTime(1);
    store().addNotification(note());
    expect(store().notifications).toHaveLength(4);
  });

  it('keeps only the 10 most recent notifications', () => {
    for (let i = 0; i < 13; i++) store().addNotification(note({ title: `n${i}` }));
    const titles = store().notifications.map((n) => n.title);
    expect(titles).toHaveLength(10);
    expect(titles[0]).toBe('n3');
    expect(titles.at(-1)).toBe('n12');
  });

  it('removes one notification or clears them all', () => {
    store().addNotification(note({ title: 'A' }));
    store().addNotification(note({ title: 'B' }));
    const [a] = store().notifications;
    store().removeNotification(a.id);
    expect(store().notifications.map((n) => n.title)).toEqual(['B']);
    store().clearNotifications();
    expect(store().notifications).toEqual([]);
  });
});

describe('app-store UI state', () => {
  it('merges filters', () => {
    expect(store().filters).toEqual({ search: '', method: 'all', routeType: 'all' });
    store().setFilters({ search: 'users' });
    store().setFilters({ method: 'POST', routeType: 'websocket' });
    expect(store().filters).toEqual({ search: 'users', method: 'POST', routeType: 'websocket' });
  });

  it('switches the active tab', () => {
    store().setActiveTab('network');
    expect(store().activeTab).toBe('network');
  });

  it('opens the form for editing and for new routes, and closes it', () => {
    store().setEditingRoute('GET:/a');
    expect(store()).toMatchObject({ editingRoute: 'GET:/a', isFormOpen: true });

    store().setEditingRoute(null);
    expect(store()).toMatchObject({ editingRoute: null, isFormOpen: false });

    store().setEditingRoute('GET:/a');
    store().openForm();
    expect(store()).toMatchObject({ editingRoute: null, isFormOpen: true });

    store().setEditingRoute('GET:/b');
    store().closeForm();
    expect(store()).toMatchObject({ editingRoute: null, isFormOpen: false });
  });
});
