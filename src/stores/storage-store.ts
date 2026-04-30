import { create } from 'zustand';
import { StorageType, StorageItem, CookieItem, IndexedDBInfo, StorageStats } from '@/types/storage';

interface StorageStore {
  activeStorageTab: StorageType;
  localStorageItems: StorageItem[];
  sessionStorageItems: StorageItem[];
  cookies: CookieItem[];
  indexedDBs: IndexedDBInfo[];
  stats: StorageStats;
  search: string;
  loading: boolean;
  editingItem: { storageType: StorageType; key: string; value: string } | null;
  addingItem: StorageType | null;

  // Actions
  setActiveStorageTab: (tab: StorageType) => void;
  setLocalStorageItems: (items: StorageItem[]) => void;
  setSessionStorageItems: (items: StorageItem[]) => void;
  setCookies: (cookies: CookieItem[]) => void;
  setIndexedDBs: (dbs: IndexedDBInfo[]) => void;
  setStats: (stats: StorageStats) => void;
  setSearch: (search: string) => void;
  setLoading: (loading: boolean) => void;
  setEditingItem: (item: StorageStore['editingItem']) => void;
  setAddingItem: (type: StorageType | null) => void;

  // Filtered getters
  getFilteredLocalStorage: () => StorageItem[];
  getFilteredSessionStorage: () => StorageItem[];
  getFilteredCookies: () => CookieItem[];
}

function filterItems(items: StorageItem[], search: string): StorageItem[] {
  if (!search) return items;
  const s = search.toLowerCase();
  return items.filter(item => item.key.toLowerCase().includes(s) || item.value.toLowerCase().includes(s));
}

export const useStorageStore = create<StorageStore>((set, get) => ({
  activeStorageTab: 'localStorage',
  localStorageItems: [],
  sessionStorageItems: [],
  cookies: [],
  indexedDBs: [],
  stats: {
    localStorageCount: 0,
    localStorageSize: 0,
    sessionStorageCount: 0,
    sessionStorageSize: 0,
    cookiesCount: 0,
    indexedDBCount: 0,
  },
  search: '',
  loading: false,
  editingItem: null,
  addingItem: null,

  setActiveStorageTab: (tab) => set({ activeStorageTab: tab }),
  setLocalStorageItems: (items) => set({ localStorageItems: items }),
  setSessionStorageItems: (items) => set({ sessionStorageItems: items }),
  setCookies: (cookies) => set({ cookies }),
  setIndexedDBs: (dbs) => set({ indexedDBs: dbs }),
  setStats: (stats) => set({ stats }),
  setSearch: (search) => set({ search }),
  setLoading: (loading) => set({ loading }),
  setEditingItem: (item) => set({ editingItem: item }),
  setAddingItem: (type) => set({ addingItem: type }),

  getFilteredLocalStorage: () => filterItems(get().localStorageItems, get().search),
  getFilteredSessionStorage: () => filterItems(get().sessionStorageItems, get().search),
  getFilteredCookies: () => {
    const { cookies, search } = get();
    if (!search) return cookies;
    const s = search.toLowerCase();
    return cookies.filter(c => c.name.toLowerCase().includes(s) || c.value.toLowerCase().includes(s));
  },
}));
