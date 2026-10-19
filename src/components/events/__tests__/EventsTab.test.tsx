import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import EventsTab from '../EventsTab';
import { useEventsStore } from '@/stores/events-store';
import { useAppStore } from '@/stores/app-store';
import type { CapturedEvent } from '@/types/events';

type Listener = (payload: unknown) => void;
const listeners = new Map<string, Listener>();

const request = vi.fn();
vi.mock('@/lib/messaging', () => ({
  request: (...args: unknown[]) => request(...args),
  onEvent: (type: string, cb: Listener) => {
    listeners.set(type, cb);
    return () => listeners.delete(type);
  },
}));

const downloadFile = vi.fn();
vi.mock('@/lib/chrome-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/chrome-api')>()),
  downloadFile: (...args: unknown[]) => downloadFile(...args),
}));

vi.mock('@/components/common/code-editor', () => ({
  CodeEditor: ({ value }: { value: string }) => <pre data-testid="code-editor">{value}</pre>,
}));

const TAB_ID = 7;
const tabsApi = chrome.tabs as unknown as Record<string, unknown>;

const makeEvent = (id: string, overrides: Partial<CapturedEvent> = {}): CapturedEvent => ({
  id,
  timestamp: 1_700_000_000_000,
  category: 'CustomEvent',
  eventType: `evt-${id}`,
  data: { id },
  target: 'window',
  stack: '',
  ...overrides,
});

const initialEvents = useEventsStore.getState();
const initialApp = useAppStore.getState();

let getEventsResult: CapturedEvent[] = [];

beforeEach(() => {
  listeners.clear();
  downloadFile.mockReset();
  getEventsResult = [];
  request.mockReset().mockImplementation(async (type: string) => {
    if (type === 'GET_EVENTS') return getEventsResult;
    return undefined;
  });
  const tabs = [{ id: TAB_ID, url: 'https://example.test/' }];
  tabsApi.query = vi.fn((_q: unknown, cb?: (t: typeof tabs) => void) => {
    cb?.(tabs);
    return Promise.resolve(tabs);
  });
  tabsApi.onActivated = { addListener: vi.fn(), removeListener: vi.fn() };
  useEventsStore.setState(initialEvents, true);
  useAppStore.setState({ ...initialApp, enabled: true, eventMonitorEnabled: true, notifications: [] });
});

const monitorSwitch = () => screen.getByRole('switch', { name: 'Toggle event monitoring' });
const emit = (type: string, payload: unknown) => act(() => listeners.get(type)?.(payload));

describe('EventsTab', () => {
  it('explains how to enable monitoring when the extension is off', () => {
    useAppStore.setState({ enabled: false, eventMonitorEnabled: false });
    render(<EventsTab />);
    expect(screen.getByText('Event Monitor Disabled')).toBeInTheDocument();
    expect(screen.getByText(/Enable the main extension first/)).toBeInTheDocument();
    expect(monitorSwitch()).toBeDisabled();
    expect(screen.getByTitle('Pause')).toBeDisabled();
  });

  it('prompts to enable the monitor when only the monitor is off', () => {
    useAppStore.setState({ eventMonitorEnabled: false });
    render(<EventsTab />);
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByText(/Enable the event monitor to capture/)).toBeInTheDocument();
    expect(monitorSwitch()).not.toBeChecked();
  });

  it('shows the empty state when the active tab has no events', async () => {
    render(<EventsTab />);
    await waitFor(() => expect(request).toHaveBeenCalledWith('GET_EVENTS', { tabId: TAB_ID }));
    expect(screen.getByText('No Events Captured')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
  });

  it('lists events loaded for the active tab with category stats', async () => {
    getEventsResult = [
      makeEvent('a', { eventType: 'user:login' }),
      makeEvent('b', { eventType: 'frame-ready', category: 'postMessage' }),
    ];
    render(<EventsTab />);
    expect(await screen.findByText('user:login')).toBeInTheDocument();
    expect(screen.getByText('frame-ready')).toBeInTheDocument();
    const statValue = (label: string) => screen.getByText(label, { selector: '.ds-stat-label' }).previousSibling;
    expect(statValue('Total')).toHaveTextContent('2');
    expect(statValue('Custom')).toHaveTextContent('1');
    expect(statValue('Messages')).toHaveTextContent('1');
  });

  it('falls back to an empty list when loading events fails', async () => {
    useEventsStore.getState().setEvents([makeEvent('stale', { eventType: 'stale-event' })]);
    request.mockRejectedValue(new Error('no receiver'));
    render(<EventsTab />);
    await waitFor(() => expect(screen.queryByText('stale-event')).toBeNull());
    expect(screen.getByText('No Events Captured')).toBeInTheDocument();
  });

  it('appends live events for the shown tab only', async () => {
    render(<EventsTab />);
    await waitFor(() => expect(request).toHaveBeenCalledWith('GET_EVENTS', { tabId: TAB_ID }));

    emit('EVENT_RECORDED', { tabId: 999, event: makeEvent('other', { eventType: 'other-tab' }) });
    emit('EVENT_RECORDED', { tabId: TAB_ID, event: makeEvent('live', { eventType: 'live-event' }) });

    expect(screen.getByText('live-event')).toBeInTheDocument();
    expect(screen.queryByText('other-tab')).toBeNull();
  });

  it('pauses capture of live events and resumes', async () => {
    render(<EventsTab />);
    await waitFor(() => expect(request).toHaveBeenCalledWith('GET_EVENTS', { tabId: TAB_ID }));

    fireEvent.click(screen.getByTitle('Pause'));
    expect(screen.getByText('Paused')).toBeInTheDocument();
    emit('EVENT_RECORDED', { tabId: TAB_ID, event: makeEvent('p', { eventType: 'while-paused' }) });
    expect(screen.queryByText('while-paused')).toBeNull();

    fireEvent.click(screen.getByTitle('Resume'));
    emit('EVENT_RECORDED', { tabId: TAB_ID, event: makeEvent('r', { eventType: 'after-resume' }) });
    expect(screen.getByText('after-resume')).toBeInTheDocument();
  });

  it('filters by search text, category and bookmarks', async () => {
    getEventsResult = [
      makeEvent('a', { eventType: 'cart:add' }),
      makeEvent('b', { eventType: 'cart:remove', category: 'postMessage' }),
      makeEvent('c', { eventType: 'login' }),
    ];
    render(<EventsTab />);
    await screen.findByText('cart:add');

    fireEvent.change(screen.getByPlaceholderText('Search events...'), { target: { value: 'cart' } });
    expect(screen.queryByText('login')).toBeNull();
    expect(screen.getByText('cart:remove')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Message' }));
    expect(screen.queryByText('cart:add')).toBeNull();
    expect(screen.getByText('cart:remove')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    fireEvent.change(screen.getByPlaceholderText('Search events...'), { target: { value: '' } });
    const loginRow = screen.getByText('login').closest('.ds-list-item') as HTMLElement;
    fireEvent.click(loginRow.querySelector('button[title="Bookmark"]') as HTMLElement);
    fireEvent.click(screen.getByTitle('Show bookmarked only'));
    expect(screen.getByText('login')).toBeInTheDocument();
    expect(screen.queryByText('cart:add')).toBeNull();
  });

  it('expands an event to show its target and payload tabs', async () => {
    getEventsResult = [makeEvent('a', { eventType: 'expand-me', target: 'iframe#pay', stack: 'at fn (x.js:1)' })];
    render(<EventsTab />);
    fireEvent.click(await screen.findByText('expand-me'));
    expect(screen.getByText('iframe#pay')).toBeInTheDocument();
    expect(useEventsStore.getState().selectedEventId).toBe('a');
    fireEvent.click(screen.getByRole('button', { name: 'Stack' }));
    expect(screen.getByTestId('code-editor')).toHaveTextContent('at fn (x.js:1)');
  });

  it('persists the monitor toggle to the background', async () => {
    render(<EventsTab />);
    fireEvent.click(monitorSwitch());
    expect(useAppStore.getState().eventMonitorEnabled).toBe(false);
    await waitFor(() => expect(request).toHaveBeenCalledWith('SET_EVENT_MONITOR', { enabled: false }));
    expect(screen.getByText('Event Monitor Disabled')).toBeInTheDocument();
  });

  it('reverts the monitor toggle and notifies when the background rejects it', async () => {
    useAppStore.setState({ eventMonitorEnabled: false });
    request.mockImplementation(async (type: string) => {
      if (type === 'SET_EVENT_MONITOR') throw new Error('state write failed');
      return [];
    });
    render(<EventsTab />);
    fireEvent.click(monitorSwitch());
    expect(request).toHaveBeenCalledWith('SET_EVENT_MONITOR', { enabled: true });

    await waitFor(() => expect(useAppStore.getState().eventMonitorEnabled).toBe(false));
    expect(monitorSwitch()).not.toBeChecked();
    expect(useAppStore.getState().notifications.at(-1)).toMatchObject({
      title: 'Could not toggle event monitor',
      message: 'state write failed',
      type: 'error',
    });
  });

  it('clears events in the background and locally', async () => {
    getEventsResult = [makeEvent('a', { eventType: 'to-clear' })];
    render(<EventsTab />);
    await screen.findByText('to-clear');
    fireEvent.click(screen.getByTitle('Clear events'));
    await waitFor(() => expect(screen.queryByText('to-clear')).toBeNull());
    expect(request).toHaveBeenCalledWith('CLEAR_EVENTS', { tabId: TAB_ID });
    expect(useEventsStore.getState().events).toEqual([]);
  });

  it('keeps events and notifies when clearing fails', async () => {
    getEventsResult = [makeEvent('a', { eventType: 'survives' })];
    render(<EventsTab />);
    await screen.findByText('survives');
    request.mockImplementation(async (type: string) => {
      if (type === 'CLEAR_EVENTS') throw new Error('tab closed');
      return getEventsResult;
    });
    fireEvent.click(screen.getByTitle('Clear events'));
    await waitFor(() =>
      expect(useAppStore.getState().notifications.at(-1)).toMatchObject({ title: 'Clear failed', message: 'tab closed' })
    );
    expect(screen.getByText('survives')).toBeInTheDocument();
  });

  it('exports the active tab events as JSON', async () => {
    getEventsResult = [makeEvent('a')];
    render(<EventsTab />);
    fireEvent.click(screen.getByTitle('Export events'));
    await waitFor(() => expect(downloadFile).toHaveBeenCalledTimes(1));
    const [content, filename] = downloadFile.mock.calls[0] as [string, string];
    expect(JSON.parse(content)).toEqual(getEventsResult);
    expect(filename).toMatch(/^events-\d+\.json$/);
  });

  it('prompts to pick two events in compare mode, then opens the comparison', async () => {
    getEventsResult = [makeEvent('a', { eventType: 'first' }), makeEvent('b', { eventType: 'second' })];
    render(<EventsTab />);
    await screen.findByText('first');
    fireEvent.click(screen.getByTitle('Compare events'));
    expect(screen.getByText('Click two events to compare them')).toBeInTheDocument();

    fireEvent.click(screen.getByText('first'));
    expect(screen.getByText('Select second event to compare')).toBeInTheDocument();
    fireEvent.click(screen.getByText('second'));
    expect(screen.getByText('Compare Events')).toBeInTheDocument();
    expect(useEventsStore.getState().compareEventIds).toEqual(['a', 'b']);
  });
});
