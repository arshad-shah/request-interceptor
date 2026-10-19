import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import RoutesTab from '../RoutesTab';
import { useAppStore } from '@/stores/app-store';
import type { InjectionConfig, RouteConfig, WebSocketConfig } from '@/types';

const request = vi.fn();
vi.mock('@/lib/messaging', () => ({
  request: (...args: unknown[]) => request(...args),
  onEvent: vi.fn(() => () => {}),
}));

const http = (overrides: Partial<RouteConfig> = {}): RouteConfig => ({
  status: 200,
  delay: 0,
  response: { ok: true },
  contentType: 'application/json',
  enabled: true,
  timestamp: 1,
  interceptionMode: 'mock',
  ...overrides,
});

const ws: WebSocketConfig = {
  enabled: true,
  timestamp: 1,
  incomingRules: [
    { id: 'r1', enabled: true, type: 'replace', matchType: 'contains', match: 'ping', replacement: 'pong' },
  ],
  outgoingRules: [],
  delay: 0,
};

const inj: InjectionConfig = {
  enabled: true,
  timestamp: 1,
  scripts: ['console.log(1)'],
  stylesheets: [],
  injectAt: 'document_end',
  urlPattern: '*://example.com/*',
};

const sampleRoutes = {
  'GET:/api/users|List users': http(),
  'POST:/api/orders': http({ status: 201 }),
  'GET:/ads/*': http({ interceptionMode: 'block' }),
  'WS:wss://chat.test': ws,
  'INJ:*://example.com/*': inj,
};

const initial = useAppStore.getState();

beforeEach(() => {
  request.mockReset().mockResolvedValue(undefined);
  useAppStore.setState({
    ...initial,
    routes: sampleRoutes,
    notifications: [],
    filters: { search: '', method: 'all', routeType: 'all' },
    editingRoute: null,
    isFormOpen: false,
  });
});

const state = () => useAppStore.getState();
const routeHeader = (url: string) =>
  screen.getByRole('button', { name: new RegExp(`^${url.replace(/[.*?|]/g, '\\$&')} route, press to`) });
const visibleUrls = () =>
  screen
    .queryAllByRole('button', { name: / route, press to (expand|collapse)$/ })
    .map((el) => el.getAttribute('aria-label')?.replace(/ route, press to .*$/, ''));
const expand = (url: string) => fireEvent.click(routeHeader(url));

describe('RoutesTab', () => {
  it('shows the empty state and opens the form from it', () => {
    useAppStore.setState({ routes: {} });
    render(<RoutesTab />);
    expect(screen.getByText('No routes configured')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Route' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /create route/i }));
    expect(state().isFormOpen).toBe(true);
    expect(state().editingRoute).toBeNull();
  });

  it('lists every route from the store with type counts', () => {
    render(<RoutesTab />);
    expect(visibleUrls()).toEqual([
      '/api/users',
      '/api/orders',
      '/ads/*',
      'wss://chat.test',
      '*://example.com/*',
    ]);
    expect(screen.getByText('List users')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^All/ })).toHaveTextContent('5');
    expect(screen.getByRole('tab', { name: /^HTTP/ })).toHaveTextContent('3');
    expect(screen.getByRole('tab', { name: /^WebSocket/ })).toHaveTextContent('1');
    expect(screen.getByRole('tab', { name: /^Injection/ })).toHaveTextContent('1');
  });

  it('opens the add form from the toolbar', () => {
    render(<RoutesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Route' }));
    expect(state().isFormOpen).toBe(true);
  });

  it('filters by route type tab', () => {
    render(<RoutesTab />);
    fireEvent.click(screen.getByRole('tab', { name: /^WebSocket/ }));
    expect(state().filters.routeType).toBe('websocket');
    expect(visibleUrls()).toEqual(['wss://chat.test']);

    fireEvent.click(screen.getByRole('tab', { name: /^Injection/ }));
    expect(visibleUrls()).toEqual(['*://example.com/*']);

    fireEvent.click(screen.getByRole('tab', { name: /^HTTP/ }));
    expect(visibleUrls()).toEqual(['/api/users', '/api/orders', '/ads/*']);
  });

  it('searches by URL, method, name and type keyword', () => {
    render(<RoutesTab />);
    const search = screen.getByPlaceholderText(/Search routes/);

    fireEvent.change(search, { target: { value: 'orders' } });
    expect(visibleUrls()).toEqual(['/api/orders']);

    fireEvent.change(search, { target: { value: 'list users' } });
    expect(visibleUrls()).toEqual(['/api/users']);

    fireEvent.change(search, { target: { value: 'post' } });
    expect(visibleUrls()).toEqual(['/api/orders']);

    fireEvent.change(search, { target: { value: 'websocket' } });
    expect(visibleUrls()).toEqual(['wss://chat.test']);
  });

  it('applies the method filter only to HTTP routes', () => {
    useAppStore.setState({ filters: { search: '', method: 'POST', routeType: 'all' } });
    render(<RoutesTab />);
    expect(visibleUrls()).toEqual(['/api/orders', 'wss://chat.test', '*://example.com/*']);
  });

  it('shows a filter empty state that clears all filters', () => {
    render(<RoutesTab />);
    fireEvent.change(screen.getByPlaceholderText(/Search routes/), { target: { value: 'nothing-matches' } });
    expect(screen.getByText('No routes match your filters')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(state().filters).toEqual({ search: '', method: 'all', routeType: 'all' });
    expect(visibleUrls()).toHaveLength(5);
  });

  it('expands a route to show its edit action, which opens the form for that route', () => {
    render(<RoutesTab />);
    expect(screen.queryByRole('button', { name: 'Edit route' })).toBeNull();
    expand('/api/orders');
    expect(routeHeader('/api/orders')).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Edit route' }));
    expect(state().editingRoute).toBe('POST:/api/orders');
    expect(state().isFormOpen).toBe(true);
  });
});

describe('RoutesTab toggling', () => {
  const switchFor = (url: string) => within(routeHeader(url)).getByRole('switch');

  it('disables a route optimistically and tells the background', async () => {
    render(<RoutesTab />);
    const toggle = switchFor('/api/orders');
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);
    expect(state().routes['POST:/api/orders'].enabled).toBe(false);
    expect(switchFor('/api/orders')).not.toBeChecked();
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith('TOGGLE_ROUTE', { route: 'POST:/api/orders', enabled: false })
    );
  });

  it('re-enables a disabled route', async () => {
    useAppStore.setState({ routes: { 'GET:/x': http({ enabled: false }) } });
    render(<RoutesTab />);
    fireEvent.click(switchFor('/x'));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith('TOGGLE_ROUTE', { route: 'GET:/x', enabled: true })
    );
    expect(state().routes['GET:/x'].enabled).toBe(true);
  });

  it('reverts the toggle and notifies when the background rejects it', async () => {
    request.mockRejectedValue(new Error('offline'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<RoutesTab />);
    fireEvent.click(switchFor('/api/orders'));

    await waitFor(() =>
      expect(state().notifications.at(-1)).toMatchObject({
        type: 'error',
        message: 'Failed to toggle route',
      })
    );
    expect(state().routes['POST:/api/orders'].enabled).toBe(true);
    expect(switchFor('/api/orders')).toBeChecked();
    consoleError.mockRestore();
  });

  // Regression: the switch sits inside the clickable header and used to expand the row too.
  it('does not expand the route when its switch is clicked', () => {
    render(<RoutesTab />);
    fireEvent.click(switchFor('/api/orders'));
    expect(routeHeader('/api/orders')).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('RoutesTab deleting', () => {
  const openDelete = (url: string) => {
    expand(url);
    fireEvent.click(screen.getByRole('button', { name: 'Delete route' }));
  };

  it('asks for confirmation and does nothing when cancelled', () => {
    render(<RoutesTab />);
    openDelete('/api/orders');
    expect(screen.getByText('Delete Route')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete this route/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Delete Route')).toBeNull();
    expect(request).not.toHaveBeenCalled();
    expect(state().routes).toHaveProperty(['POST:/api/orders']);
  });

  it('closes the confirmation on Escape without deleting', () => {
    render(<RoutesTab />);
    openDelete('/api/orders');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Delete Route')).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('removes the route after confirming', async () => {
    render(<RoutesTab />);
    openDelete('/api/orders');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(state().routes).not.toHaveProperty(['POST:/api/orders']));
    expect(request).toHaveBeenCalledWith('REMOVE_ROUTE', { route: 'POST:/api/orders' });
    expect(state().notifications.at(-1)?.message).toBe('Route removed successfully');
    expect(visibleUrls()).not.toContain('/api/orders');
    expect(screen.queryByText('Delete Route')).toBeNull();
  });

  it('keeps the route and reports an error when removal fails', async () => {
    request.mockRejectedValue(new Error('nope'));
    render(<RoutesTab />);
    openDelete('/api/orders');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(state().notifications.at(-1)).toMatchObject({ type: 'error', message: 'Failed to remove route' })
    );
    expect(state().routes).toHaveProperty(['POST:/api/orders']);
  });
});
