import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Popup from '../popup';
import { useAppStore } from '@/stores/app-store';
import { DEFAULT_SETTINGS } from '@/core/settings';
import type { RouteConfig } from '@/types';

type Listener = (payload: unknown) => void;
const listeners = new Map<string, Listener>();
const request = vi.fn<(type: string, payload?: unknown) => Promise<unknown>>();
vi.mock('@/lib/messaging', () => ({
  request: (type: string, payload?: unknown) => request(type, payload),
  onEvent: (type: string, cb: Listener) => {
    listeners.set(type, cb);
    return () => listeners.delete(type);
  },
}));

const route = (enabled: boolean) => ({ enabled, status: 200, response: '{}' }) as unknown as RouteConfig;

let backgroundState: { enabled: boolean; routes: Record<string, RouteConfig>; eventMonitorEnabled: boolean };

const getCurrent = vi.fn();
const tabsCreate = vi.fn();
const sidePanelOpen = vi.mocked(chrome.sidePanel.open);
const originalSidePanel = chrome.sidePanel;
const initial = useAppStore.getState();

beforeEach(() => {
  listeners.clear();
  backgroundState = { enabled: true, routes: {}, eventMonitorEnabled: false };
  useAppStore.setState({ ...initial, enabled: false, routes: {}, notifications: [] });
  request.mockReset().mockImplementation(async (type, payload) => {
    switch (type) {
      case 'GET_STATE':
        return backgroundState;
      case 'GET_SETTINGS':
        return DEFAULT_SETTINGS;
      case 'SET_ENABLED':
        return { enabled: (payload as { enabled: boolean }).enabled };
      default:
        throw new Error(`unexpected ${type}`);
    }
  });
  (chrome.tabs.query as unknown as Mock<(q: chrome.tabs.QueryInfo) => Promise<chrome.tabs.Tab[]>>).mockReset().mockResolvedValue([{ url: 'https://shop.test/' } as chrome.tabs.Tab]);
  getCurrent.mockReset().mockResolvedValue({ id: 7 });
  tabsCreate.mockReset().mockResolvedValue({});
  sidePanelOpen.mockReset().mockResolvedValue(undefined);
  Object.assign(chrome, { windows: { getCurrent }, sidePanel: originalSidePanel });
  Object.assign(chrome.tabs, { create: tabsCreate });
  Object.assign(chrome.runtime, { getURL: (p: string) => `chrome-extension://test/${p}` });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const masterToggle = () => screen.getByRole('switch', { name: 'Toggle request interception' });
const notifications = () => useAppStore.getState().notifications;

describe('Popup', () => {
  it('renders interception state and route counts from GET_STATE', async () => {
    backgroundState = {
      enabled: true,
      routes: { 'GET:/a': route(true), 'GET:/b': route(false), 'POST:/c': route(true) },
      eventMonitorEnabled: false,
    };
    render(<Popup />);
    await waitFor(() => expect(masterToggle()).toBeChecked());
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Configured Routes').nextElementSibling).toHaveTextContent('3');
    expect(screen.getByText('Active Routes').nextElementSibling).toHaveTextContent('2');
    expect(screen.queryByText(/No routes configured yet/)).toBeNull();
  });

  it('shows the inactive, empty state', async () => {
    backgroundState.enabled = false;
    render(<Popup />);
    await waitFor(() => expect(request).toHaveBeenCalledWith('GET_STATE', undefined));
    expect(masterToggle()).not.toBeChecked();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText(/No routes configured yet/)).toBeInTheDocument();
  });

  it('reports a GET_STATE failure as a notification', async () => {
    request.mockImplementation(async (type) => {
      if (type === 'GET_STATE') throw new Error('Service worker asleep');
      return DEFAULT_SETTINGS;
    });
    render(<Popup />);
    await waitFor(() =>
      expect(notifications().at(-1)).toMatchObject({ title: 'Could not load state', message: 'Service worker asleep', type: 'error' })
    );
  });

  it('follows STATE_CHANGED broadcasts', async () => {
    render(<Popup />);
    await waitFor(() => expect(masterToggle()).toBeChecked());
    act(() => listeners.get('STATE_CHANGED')?.({ enabled: false, routes: { 'GET:/x': route(true) } }));
    expect(masterToggle()).not.toBeChecked();
    expect(screen.getByText('Configured Routes').nextElementSibling).toHaveTextContent('1');
  });

  it('toggles interception through SET_ENABLED', async () => {
    backgroundState.enabled = false;
    render(<Popup />);
    await waitFor(() => expect(request).toHaveBeenCalledWith('GET_STATE', undefined));
    fireEvent.click(masterToggle());
    await waitFor(() => expect(masterToggle()).toBeChecked());
    expect(request).toHaveBeenCalledWith('SET_ENABLED', { enabled: true });
    expect(useAppStore.getState().enabled).toBe(true);
  });

  it('keeps the previous state and notifies when SET_ENABLED fails', async () => {
    render(<Popup />);
    await waitFor(() => expect(masterToggle()).toBeChecked());
    request.mockRejectedValueOnce(new Error('Permission denied'));
    fireEvent.click(masterToggle());
    await waitFor(() =>
      expect(notifications().at(-1)).toMatchObject({
        title: 'Could not toggle interception',
        message: 'Permission denied',
        type: 'error',
      })
    );
    expect(masterToggle()).toBeChecked();
    expect(useAppStore.getState().enabled).toBe(true);
  });

  it('opens the side panel for the current window', async () => {
    render(<Popup />);
    fireEvent.click(screen.getByRole('button', { name: /open side panel/i }));
    await waitFor(() => expect(sidePanelOpen).toHaveBeenCalledWith({ windowId: 7 }));
    expect(tabsCreate).not.toHaveBeenCalled();
  });

  it('falls back to a tab when the side panel API is missing', async () => {
    Object.assign(chrome, { sidePanel: undefined });
    render(<Popup />);
    fireEvent.click(screen.getByRole('button', { name: /open side panel/i }));
    await waitFor(() =>
      expect(tabsCreate).toHaveBeenCalledWith({ url: 'chrome-extension://test/ui/sidepanel/index.html' })
    );
  });

  it('falls back to a tab when opening the side panel throws', async () => {
    sidePanelOpen.mockRejectedValue(new Error('user gesture required'));
    render(<Popup />);
    fireEvent.click(screen.getByRole('button', { name: /open side panel/i }));
    await waitFor(() => expect(tabsCreate).toHaveBeenCalledTimes(1));
    expect(notifications()).toHaveLength(0);
  });

  it('notifies when both the side panel and the fallback tab fail', async () => {
    sidePanelOpen.mockRejectedValue(new Error('nope'));
    tabsCreate.mockRejectedValue(new Error('also nope'));
    render(<Popup />);
    fireEvent.click(screen.getByRole('button', { name: /open side panel/i }));
    await waitFor(() =>
      expect(notifications().at(-1)?.message).toMatch(/Failed to open side panel/)
    );
  });

  it('includes the per-site switch for the active tab', async () => {
    render(<Popup />);
    const site = await screen.findByRole('switch', { name: 'Run on shop.test' });
    expect(site).toBeChecked();
    fireEvent.click(site);
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith('UPDATE_SETTINGS', { patch: { sites: { denylist: ['shop.test'] } } })
    );
  });
});
