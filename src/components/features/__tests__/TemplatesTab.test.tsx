import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TemplatesTab from '../TemplatesTab';
import { useAppStore } from '@/stores/app-store';

const request = vi.fn();
vi.mock('@/lib/messaging', () => ({
  request: (...args: unknown[]) => request(...args),
  onEvent: vi.fn(() => () => {}),
}));

// CodeMirror is exercised in its own tests; a textarea keeps these focused on the tab.
vi.mock('@/components/common/code-editor', () => ({
  CodeEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="Schema" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const initial = useAppStore.getState();

beforeEach(() => {
  request.mockReset().mockResolvedValue({ isUpdate: false });
  useAppStore.setState({ ...initial, routes: {}, notifications: [], activeTab: 'templates' });
});

const notifications = () => useAppStore.getState().notifications;

const parse = (schema: unknown) => {
  fireEvent.change(screen.getByLabelText('Schema'), {
    target: { value: typeof schema === 'string' ? schema : JSON.stringify(schema) },
  });
  fireEvent.click(screen.getByRole('button', { name: /parse/i }));
};

describe('TemplatesTab', () => {
  it('rejects empty input, invalid JSON and schemas without routes', () => {
    render(<TemplatesTab />);
    fireEvent.click(screen.getByRole('button', { name: /parse/i }));
    expect(notifications().at(-1)?.message).toBe('Please enter a JSON schema');

    parse('{ nope');
    expect(notifications().at(-1)?.message).toMatch(/^Invalid JSON:/);

    parse({ items: [] });
    expect(notifications().at(-1)?.message).toBe('Schema must contain a "routes" array');
    expect(screen.queryByText(/Ready to import/)).toBeNull();
  });

  it('reports an empty routes array', () => {
    render(<TemplatesTab />);
    parse({ routes: [] });
    expect(notifications().at(-1)?.message).toBe('No routes found in schema');
  });

  it('lists per-route validation errors next to the valid preview', () => {
    render(<TemplatesTab />);
    parse({
      routes: [
        { method: 'GET', url: '/ok', response: {} },
        { url: '/no-method' },
        { method: 'GET', url: '/bad', status: 700, response: 1 },
        { routeType: 'websocket', name: 'ws-without-url' },
        { scripts: ['a.js'] },
      ],
    });
    expect(screen.getByText('4 rejected')).toBeInTheDocument();
    expect(screen.getByText('HTTP route must have a method')).toBeInTheDocument();
    expect(screen.getByText('Status code must be between 100 and 599')).toBeInTheDocument();
    expect(screen.getByText('WebSocket route must have a URL')).toBeInTheDocument();
    expect(screen.getByText('Injection route must have a URL pattern')).toBeInTheDocument();
    expect(screen.getByText('Import 1 Route')).toBeInTheDocument();
    const titles = notifications().map((n) => n.title);
    expect(titles).toContain('4 routes rejected');
    expect(notifications().at(-1)).toMatchObject({ title: 'Parsed', type: 'warning' });
  });

  it('imports HTTP, WebSocket and injection routes and returns to the routes tab', async () => {
    render(<TemplatesTab />);
    parse({
      routes: [
        { method: 'POST', url: '/api/users', name: 'create', status: 201, response: { id: 1 } },
        { routeType: 'websocket', url: 'wss://x', incomingRules: [{ match: 'ping', replacement: 'pong' }] },
        { urlPattern: '*://example.com/*', scripts: ['console.log(1)'] },
      ],
    });
    expect(screen.getByText('1 HTTP')).toBeInTheDocument();
    expect(screen.getByText('1 WebSocket')).toBeInTheDocument();
    expect(screen.getByText('1 Injection')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Import 3 Routes'));
    await waitFor(() => expect(useAppStore.getState().activeTab).toBe('routes'));

    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls.map(([type, payload]) => [type, payload.route])).toEqual([
      ['ADD_ROUTE', 'POST:/api/users|create'],
      ['ADD_ROUTE', 'WS:wss://x'],
      ['ADD_ROUTE', 'INJ:*://example.com/*'],
    ]);
    const routes = useAppStore.getState().routes;
    expect(routes['POST:/api/users|create']).toMatchObject({ status: 201, interceptionMode: 'mock' });
    expect(routes['WS:wss://x']).toMatchObject({
      incomingRules: [expect.objectContaining({ match: 'ping', type: 'replace', enabled: true })],
    });
    expect(notifications().at(-1)?.message).toBe('Successfully imported 3 routes');
  });

  it('keeps the preview open and reports routes the background rejects', async () => {
    request.mockImplementation(async (_type: string, payload: { route: string }) => {
      if (payload.route.includes('/b')) throw new Error('duplicate');
      return { isUpdate: false };
    });
    render(<TemplatesTab />);
    parse({ routes: [{ method: 'GET', url: '/a', response: 1 }, { method: 'GET', url: '/b', response: 2 }] });
    fireEvent.click(screen.getByText('Import 2 Routes'));

    await waitFor(() =>
      expect(notifications().some((n) => n.title === '1 route skipped')).toBe(true)
    );
    expect(notifications().find((n) => n.title === '1 route skipped')?.message).toBe('GET /b: duplicate');
    expect(useAppStore.getState().routes).toHaveProperty(['GET:/a']);
    expect(useAppStore.getState().activeTab).toBe('templates');
    expect(await screen.findByText('Import 2 Routes')).toBeInTheDocument();
  });

  it('cancels the preview', () => {
    render(<TemplatesTab />);
    parse({ routes: [{ method: 'GET', url: '/a', response: 'ok' }] });
    fireEvent.click(screen.getByTitle('Cancel import'));
    expect(screen.queryByText(/Ready to import/)).toBeNull();
  });

  it('rejects a null schema instead of throwing', () => {
    render(<TemplatesTab />);
    parse('null');
    expect(notifications().at(-1)?.message).toBe('Schema must contain a "routes" array');
  });

  it('rejects non-object route entries instead of throwing', () => {
    render(<TemplatesTab />);
    parse({ routes: [null, 'x', { method: 'GET', url: '/a', response: 'ok' }] });
    expect(screen.getByText('2 rejected')).toBeInTheDocument();
    expect(screen.getAllByText('Route must be an object')).toHaveLength(2);
    expect(screen.getByText('Import 1 Route')).toBeInTheDocument();
  });
});
