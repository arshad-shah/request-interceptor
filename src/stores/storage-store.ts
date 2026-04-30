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
  updateStats: (partial: Partial<StorageStats>) => void;
  setSearch: (search: string) => void;
  setLoading: (loading: boolean) => void;
  setEditingItem: (item: StorageStore['editingItem']) => void;
  setAddingItem: (type: StorageType | null) => void;
}

export const useStorageStore = create<StorageStore>((set) => ({
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
  updateStats: (partial) => set((state) => ({ stats: { ...state.stats, ...partial } })),
  setSearch: (search) => set({ search }),
  setLoading: (loading) => set({ loading }),
  setEditingItem: (item) => set({ editingItem: item }),
  setAddingItem: (type) => set({ addingItem: type }),
}));
