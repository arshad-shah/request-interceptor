import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import StorageTab from '../StorageTab';
import { useStorageStore } from '@/stores/storage-store';
import type { CookieItem, IndexedDBInfo } from '@/types/storage';
import type { StorageAction } from '@/core/messaging/protocol';

const request = vi.fn();
vi.mock('@/lib/messaging', () => ({
  request: (...args: unknown[]) => request(...args),
  onEvent: vi.fn(() => () => {}),
}));

vi.mock('@/components/common/code-editor', () => ({
  CodeEditor: ({ value, onChange, placeholder }: { value: string; onChange?: (v: string) => void; placeholder?: string }) => (
    <textarea aria-label={placeholder} value={value} onChange={(e) => onChange?.(e.target.value)} />
  ),
}));

const TAB_ID = 3;
const TAB_URL = 'https://shop.example.test/cart';
const tabsApi = chrome.tabs as unknown as Record<string, unknown>;

interface Fixture {
  local: Record<string, string>;
  session: Record<string, string>;
  cookies: CookieItem[];
  databases: IndexedDBInfo[];
}
let data: Fixture;

const sessionCookie: CookieItem = {
  name: 'sid', value: 'abc123', domain: 'shop.example.test', path: '/',
  secure: true, httpOnly: true, sameSite: 'strict', session: true,
};

const initialStore = useStorageStore.getState();

beforeEach(() => {
  data = {
    local: { theme: 'dark', prefs: '{"lang":"en"}' },
    session: { step: 'checkout' },
    cookies: [sessionCookie],
    databases: [{ name: 'app-db', version: 3 }],
  };
  request.mockReset().mockImplementation(async (type: string, payload: { action?: StorageAction }) => {
    switch (type) {
      case 'GET_WEB_STORAGE':
        return { localStorage: data.local, sessionStorage: data.session, localStorageSize: 40, sessionStorageSize: 12 };
      case 'GET_COOKIES':
        return data.cookies;
      case 'STORAGE_ACTION':
        return payload.action?.type === 'GET_INDEXEDDB_INFO' ? { databases: data.databases } : {};
      default:
        return undefined;
    }
  });
  tabsApi.query = vi.fn(async () => [{ id: TAB_ID, url: TAB_URL }]);
  useStorageStore.setState(initialStore, true);
});

const renderLoaded = async () => {
  render(<StorageTab />);
  await waitFor(() => expect(useStorageStore.getState().loading).toBe(false));
  await waitFor(() => expect(request).toHaveBeenCalledWith('GET_WEB_STORAGE', { tabId: TAB_ID }));
};
const row = (key: string) => screen.getByText(key).closest('.group') as HTMLElement;
const openTab = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const actionCalls = () =>
  request.mock.calls
    .filter(([type, payload]) => type === 'STORAGE_ACTION' && payload.action.type !== 'GET_INDEXEDDB_INFO')
    .map(([, payload]) => payload.action as StorageAction);

describe('StorageTab', () => {
  it('loads every storage area for the active tab and fills the stats', async () => {
    await renderLoaded();
    expect(request).toHaveBeenCalledWith('GET_COOKIES', { url: TAB_URL });
    expect(request).toHaveBeenCalledWith('STORAGE_ACTION', { tabId: TAB_ID, action: { type: 'GET_INDEXEDDB_INFO' } });
    expect(await screen.findByText('theme')).toBeInTheDocument();
    expect(screen.getByText('prefs')).toBeInTheDocument();
    expect(useStorageStore.getState().stats).toEqual({
      localStorageCount: 2, localStorageSize: 40, sessionStorageCount: 1,
      sessionStorageSize: 12, cookiesCount: 1, indexedDBCount: 1,
    });
    expect(useStorageStore.getState().localStorageItems.find((i) => i.key === 'prefs')?.type).toBe('json');
  });

  it('shows session storage, cookies and IndexedDB lists per tab', async () => {
    await renderLoaded();
    openTab('Session');
    expect(screen.getByText('checkout')).toBeInTheDocument();
    expect(screen.queryByText('theme')).toBeNull();

    openTab('Cookies');
    expect(screen.getByText('sid')).toBeInTheDocument();
    expect(within(row('sid')).getByText('secure')).toBeInTheDocument();
    expect(within(row('sid')).getByText('httpOnly')).toBeInTheDocument();

    openTab('IndexedDB');
    expect(screen.getByText('app-db')).toBeInTheDocument();
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.queryByTitle('Add item')).toBeNull();
    expect(screen.queryByTitle('Clear all')).toBeNull();
  });

  it('shows empty states when a storage area has nothing in it', async () => {
    data = { local: {}, session: {}, cookies: [], databases: [] };
    await renderLoaded();
    expect(await screen.findByText('No storage items found')).toBeInTheDocument();
    openTab('IndexedDB');
    expect(screen.getByText('No IndexedDB databases found')).toBeInTheDocument();
  });

  it('filters items by key or value', async () => {
    await renderLoaded();
    await screen.findByText('theme');
    fireEvent.change(screen.getByPlaceholderText('Search items...'), { target: { value: 'DARK' } });
    expect(screen.getByText('theme')).toBeInTheDocument();
    expect(screen.queryByText('prefs')).toBeNull();
  });

  it('surfaces a failed load in an error banner that can be dismissed', async () => {
    request.mockRejectedValue(new Error('Cannot access a chrome:// URL'));
    await renderLoaded();
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot access a chrome:// URL');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('edits a local storage value and reloads', async () => {
    await renderLoaded();
    fireEvent.click(within(row('theme')).getByTitle('Edit'));
    expect(screen.getByLabelText('Key')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Enter value...'), { target: { value: 'light' } });
    request.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByText('Edit Item')).toBeNull());
    expect(actionCalls()).toEqual([{ type: 'SET_LOCAL', key: 'theme', value: 'light' }]);
    expect(request).toHaveBeenCalledWith('GET_WEB_STORAGE', { tabId: TAB_ID });
  });

  it('adds a session storage item', async () => {
    await renderLoaded();
    openTab('Session');
    fireEvent.click(screen.getByTitle('Add item'));
    fireEvent.change(screen.getByLabelText('Key'), { target: { value: '  token ' } });
    fireEvent.change(screen.getByLabelText('Enter value...'), { target: { value: 'xyz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(actionCalls()).toEqual([{ type: 'SET_SESSION', key: 'token', value: 'xyz' }]));
  });

  it('keeps the editor open and shows the error when saving fails', async () => {
    await renderLoaded();
    request.mockImplementation(async (type: string, payload: { action?: StorageAction }) => {
      if (type === 'STORAGE_ACTION' && payload.action?.type === 'SET_LOCAL') throw new Error('Quota exceeded');
      return type === 'GET_COOKIES' ? [] : { localStorage: {}, sessionStorage: {}, localStorageSize: 0, sessionStorageSize: 0 };
    });
    fireEvent.click(within(row('theme')).getByTitle('Edit'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Quota exceeded');
    expect(screen.getByText('Edit Item')).toBeInTheDocument();
  });

  it('deletes local and session keys, cookies and databases with the right payloads', async () => {
    await renderLoaded();
    fireEvent.click(within(row('theme')).getByTitle('Delete'));
    await waitFor(() => expect(actionCalls()).toContainEqual({ type: 'DELETE_LOCAL', key: 'theme' }));

    openTab('Session');
    fireEvent.click(within(row('step')).getByTitle('Delete'));
    await waitFor(() => expect(actionCalls()).toContainEqual({ type: 'DELETE_SESSION', key: 'step' }));

    openTab('Cookies');
    fireEvent.click(within(row('sid')).getByTitle('Delete'));
    await waitFor(() => expect(request).toHaveBeenCalledWith('DELETE_COOKIE', { url: TAB_URL, name: 'sid' }));

    openTab('IndexedDB');
    fireEvent.click(within(row('app-db')).getByTitle('Delete'));
    await waitFor(() => expect(actionCalls()).toContainEqual({ type: 'DELETE_INDEXEDDB', dbName: 'app-db' }));
  });

  it('shows the error banner when deleting a cookie fails', async () => {
    await renderLoaded();
    openTab('Cookies');
    request.mockImplementation(async (type: string) => {
      if (type === 'DELETE_COOKIE') throw new Error('No host permission');
      if (type === 'GET_COOKIES') return data.cookies;
      if (type === 'STORAGE_ACTION') return { databases: [] };
      return { localStorage: {}, sessionStorage: {}, localStorageSize: 0, sessionStorageSize: 0 };
    });
    fireEvent.click(within(row('sid')).getByTitle('Delete'));
    expect(await screen.findByRole('alert')).toHaveTextContent('No host permission');
  });

  it('clears the active web storage area', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByTitle('Clear all'));
    await waitFor(() => expect(actionCalls()).toEqual([{ type: 'CLEAR_LOCAL' }]));
    openTab('Session');
    fireEvent.click(screen.getByTitle('Clear all'));
    await waitFor(() => expect(actionCalls()).toEqual([{ type: 'CLEAR_LOCAL' }, { type: 'CLEAR_SESSION' }]));
  });

  it('edits a cookie through the cookie editor and sends SET_COOKIE', async () => {
    await renderLoaded();
    openTab('Cookies');
    fireEvent.click(within(row('sid')).getByTitle('Edit'));
    expect(screen.getByText('Edit Cookie')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cookie value...'), { target: { value: 'rotated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByText('Edit Cookie')).toBeNull());
    const setCall = request.mock.calls.find(([type]) => type === 'SET_COOKIE');
    expect(setCall?.[1].cookie).toEqual({
      url: 'https://shop.example.test/', name: 'sid', value: 'rotated', domain: 'shop.example.test',
      path: '/', secure: true, httpOnly: true, sameSite: 'strict',
    });
  });

  // Regression: IndexedDB rows offered Edit, and saving wrote the database name into sessionStorage.
  it('offers no Edit action for IndexedDB databases', async () => {
    await renderLoaded();
    openTab('IndexedDB');
    expect(within(row('app-db')).queryByTitle('Edit')).toBeNull();
    expect(within(row('app-db')).getByTitle('Delete')).toBeInTheDocument();
  });

  // Regression: "42" and "true" parse as JSON and were badged "json".
  it('labels numeric and boolean values with their own type badge', async () => {
    data.local = { count: '42', flag: 'true' };
    await renderLoaded();
    expect(within(row('count')).getByText('number')).toBeInTheDocument();
    expect(within(row('flag')).getByText('boolean')).toBeInTheDocument();
  });
});
