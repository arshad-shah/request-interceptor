import { describe, it, expect, beforeEach } from 'vitest';
import { useStorageStore } from '../storage-store';
import type { CookieItem, StorageItem } from '@/types/storage';

const initial = useStorageStore.getState();
const state = () => useStorageStore.getState();

const item = (key: string, value: string): StorageItem => ({
  key,
  value,
  size: (key.length + value.length) * 2,
  type: 'string',
});

const cookie: CookieItem = {
  name: 'sid',
  value: 'abc',
  domain: 'example.test',
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'lax',
  session: true,
};

beforeEach(() => {
  useStorageStore.setState(initial, true);
});

describe('storage-store', () => {
  it('starts on the local storage tab with empty data and zeroed stats', () => {
    expect(state()).toMatchObject({
      activeStorageTab: 'localStorage',
      localStorageItems: [],
      sessionStorageItems: [],
      cookies: [],
      indexedDBs: [],
      search: '',
      loading: false,
      editingItem: null,
      addingItem: null,
    });
    expect(Object.values(state().stats).every((n) => n === 0)).toBe(true);
  });

  it('switches the active storage tab', () => {
    state().setActiveStorageTab('cookies');
    expect(state().activeStorageTab).toBe('cookies');
    state().setActiveStorageTab('indexedDB');
    expect(state().activeStorageTab).toBe('indexedDB');
  });

  it('stores each storage area independently', () => {
    state().setLocalStorageItems([item('theme', 'dark')]);
    state().setSessionStorageItems([item('step', '2'), item('draft', 'x')]);
    state().setCookies([cookie]);
    state().setIndexedDBs([{ name: 'app-db', version: 3 }]);

    expect(state().localStorageItems.map((i) => i.key)).toEqual(['theme']);
    expect(state().sessionStorageItems.map((i) => i.key)).toEqual(['step', 'draft']);
    expect(state().cookies).toEqual([cookie]);
    expect(state().indexedDBs).toEqual([{ name: 'app-db', version: 3 }]);
  });

  it('replaces (not appends) items on each set', () => {
    state().setLocalStorageItems([item('a', '1')]);
    state().setLocalStorageItems([item('b', '2')]);
    expect(state().localStorageItems.map((i) => i.key)).toEqual(['b']);
  });

  it('merges partial stat updates', () => {
    state().updateStats({ localStorageCount: 2, localStorageSize: 40 });
    state().updateStats({ cookiesCount: 5 });
    expect(state().stats).toEqual({
      localStorageCount: 2,
      localStorageSize: 40,
      sessionStorageCount: 0,
      sessionStorageSize: 0,
      cookiesCount: 5,
      indexedDBCount: 0,
    });
  });

  it('tracks search and loading flags', () => {
    state().setSearch('token');
    state().setLoading(true);
    expect(state()).toMatchObject({ search: 'token', loading: true });
    state().setLoading(false);
    state().setSearch('');
    expect(state()).toMatchObject({ search: '', loading: false });
  });

  it('tracks the item being edited or added', () => {
    state().setEditingItem({ storageType: 'sessionStorage', key: 'k', value: 'v' });
    expect(state().editingItem).toEqual({ storageType: 'sessionStorage', key: 'k', value: 'v' });
    state().setEditingItem(null);
    expect(state().editingItem).toBeNull();

    state().setAddingItem('localStorage');
    expect(state().addingItem).toBe('localStorage');
    state().setAddingItem(null);
    expect(state().addingItem).toBeNull();
  });

  it('does not touch other state when switching tabs', () => {
    state().setLocalStorageItems([item('a', '1')]);
    state().setSearch('a');
    state().setActiveStorageTab('sessionStorage');
    expect(state().localStorageItems).toHaveLength(1);
    expect(state().search).toBe('a');
  });
});
