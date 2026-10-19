import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { RefreshCw, Download, Upload, Plus, Trash2, Search, Database } from 'lucide-react';
import { useStorageStore } from '@/stores/storage-store';
import { StorageType, StorageItem, CookieItem } from '@/types/storage';
import { request } from '@/lib/messaging';
import { downloadFile } from '@/lib/chrome-api';
import type { StorageAction } from '@/core/messaging/protocol';
import StorageStats from './StorageStats';
import StorageList from './StorageList';
import StorageEditor from './StorageEditor';
import CookieEditor from './CookieEditor';
import Input from '@/components/ui/Input';

const STORAGE_TABS: Array<{ id: StorageType; label: string; color: string }> = [
  { id: 'localStorage', label: 'Local', color: 'var(--accent-blue)' },
  { id: 'sessionStorage', label: 'Session', color: 'var(--accent-violet)' },
  { id: 'cookies', label: 'Cookies', color: 'var(--accent-amber)' },
  { id: 'indexedDB', label: 'IndexedDB', color: 'var(--accent-cyan)' },
];

// Grab stable action references outside the component
const actions = () => useStorageStore.getState();

const StorageTab: React.FC = () => {
  // Select individual state slices for proper reactivity
  const activeStorageTab = useStorageStore(s => s.activeStorageTab);
  const localStorageItems = useStorageStore(s => s.localStorageItems);
  const sessionStorageItems = useStorageStore(s => s.sessionStorageItems);
  const cookies = useStorageStore(s => s.cookies);
  const indexedDBs = useStorageStore(s => s.indexedDBs);
  const search = useStorageStore(s => s.search);
  const loading = useStorageStore(s => s.loading);

  const [tabUrl, setTabUrl] = useState('');
  const [editModal, setEditModal] = useState<{ key: string; value: string } | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [cookieEditModal, setCookieEditModal] = useState<CookieItem | null>(null);
  const [cookieAddModal, setCookieAddModal] = useState(false);
  const [importInput, setImportInput] = useState<HTMLInputElement | null>(null);

  const [error, setError] = useState<string | null>(null);

  const getActiveTab = useCallback(async (): Promise<{ id?: number; url: string }> => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    setTabUrl(tab?.url || '');
    return { id: tab?.id, url: tab?.url || '' };
  }, []);

  /** Run a storage operation, surfacing failures instead of silently doing nothing. */
  const attempt = useCallback(async (operation: () => Promise<unknown>) => {
    try {
      setError(null);
      await operation();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  const loadStorage = useCallback(async () => {
    const { setLoading, setLocalStorageItems, setSessionStorageItems, setCookies, setIndexedDBs, updateStats } = actions();
    setLoading(true);
    try {
      const { id: tabId, url } = await getActiveTab();
      if (!tabId) return;
      await attempt(async () => {
        const [web, cookieList, idb] = await Promise.all([
          request('GET_WEB_STORAGE', { tabId }),
          url ? request('GET_COOKIES', { url }) : Promise.resolve([]),
          request('STORAGE_ACTION', { tabId, action: { type: 'GET_INDEXEDDB_INFO' } }),
        ]);
        const localItems = toItems(web.localStorage);
        const sessionItems = toItems(web.sessionStorage);
        setLocalStorageItems(localItems);
        setSessionStorageItems(sessionItems);
        setCookies(cookieList);
        setIndexedDBs(idb.databases ?? []);
        updateStats({
          localStorageCount: localItems.length,
          localStorageSize: web.localStorageSize,
          sessionStorageCount: sessionItems.length,
          sessionStorageSize: web.sessionStorageSize,
          cookiesCount: cookieList.length,
          indexedDBCount: idb.databases?.length ?? 0,
        });
      });
    } finally {
      setLoading(false);
    }
  }, [getActiveTab, attempt]);

  useEffect(() => {
    loadStorage();
  }, [loadStorage]);

  const handleEdit = (key: string, value: string) => {
    if (activeStorageTab === 'cookies') {
      const cookie = cookies.find(c => c.name === key);
      if (cookie) setCookieEditModal(cookie);
    } else {
      setEditModal({ key, value });
    }
  };

  /** Apply a page storage action to the active tab, then reload. */
  const runAction = async (action: StorageAction) => {
    const { id: tabId } = await getActiveTab();
    if (!tabId) return false;
    const ok = await attempt(() => request('STORAGE_ACTION', { tabId, action }));
    await loadStorage();
    return ok;
  };

  const handleDelete = async (key: string) => {
    if (activeStorageTab === 'cookies') {
      await attempt(() => request('DELETE_COOKIE', { url: tabUrl, name: key }));
      await loadStorage();
    } else if (activeStorageTab === 'indexedDB') {
      await runAction({ type: 'DELETE_INDEXEDDB', dbName: key });
    } else {
      await runAction({ type: activeStorageTab === 'localStorage' ? 'DELETE_LOCAL' : 'DELETE_SESSION', key });
    }
  };

  const handleSave = async (key: string, value: string) => {
    const ok = await runAction({ type: activeStorageTab === 'localStorage' ? 'SET_LOCAL' : 'SET_SESSION', key, value });
    if (ok) {
      setEditModal(null);
      setAddModal(false);
    }
  };

  const handleCookieSave = async (cookie: Record<string, unknown>) => {
    const ok = await attempt(() => request('SET_COOKIE', { cookie: cookie as unknown as chrome.cookies.SetDetails }));
    if (ok) {
      setCookieEditModal(null);
      setCookieAddModal(false);
    }
    await loadStorage();
  };

  const handleClear = async () => {
    if (activeStorageTab === 'localStorage') await runAction({ type: 'CLEAR_LOCAL' });
    else if (activeStorageTab === 'sessionStorage') await runAction({ type: 'CLEAR_SESSION' });
  };

  const handleExport = () => {
    const data: Record<string, unknown> = {};
    if (activeStorageTab === 'localStorage') {
      localStorageItems.forEach(i => { data[i.key] = i.value; });
    } else if (activeStorageTab === 'sessionStorage') {
      sessionStorageItems.forEach(i => { data[i.key] = i.value; });
    } else if (activeStorageTab === 'cookies') {
      data.cookies = cookies;
    }
    downloadFile(JSON.stringify(data, null, 2), `${activeStorageTab}-${Date.now()}.json`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (importInput) importInput.value = '';
    if (!file || (activeStorageTab !== 'localStorage' && activeStorageTab !== 'sessionStorage')) return;

    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setError(`${file.name} is not valid JSON`);
      return;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      setError('Import expects a JSON object of key/value pairs');
      return;
    }
    const { id: tabId } = await getActiveTab();
    if (!tabId) return;
    const type = activeStorageTab === 'localStorage' ? 'SET_LOCAL' : 'SET_SESSION';
    await attempt(async () => {
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        await request('STORAGE_ACTION', {
          tabId,
          action: { type, key, value: typeof value === 'string' ? value : JSON.stringify(value) },
        });
      }
    });
    await loadStorage();
  };

  const handleAdd = () => {
    if (activeStorageTab === 'cookies') {
      setCookieAddModal(true);
    } else if (activeStorageTab !== 'indexedDB') {
      setAddModal(true);
    }
  };

  // Derive filtered items reactively via useMemo
  const filteredItems = useMemo(() => {
    const s = search.toLowerCase();
    switch (activeStorageTab) {
      case 'localStorage':
        return s ? localStorageItems.filter(i => i.key.toLowerCase().includes(s) || i.value.toLowerCase().includes(s)) : localStorageItems;
      case 'sessionStorage':
        return s ? sessionStorageItems.filter(i => i.key.toLowerCase().includes(s) || i.value.toLowerCase().includes(s)) : sessionStorageItems;
      case 'cookies':
        return s ? cookies.filter(c => c.name.toLowerCase().includes(s) || c.value.toLowerCase().includes(s)) : cookies;
      case 'indexedDB':
        return indexedDBs.map(db => ({
          key: db.name,
          value: `v${db.version || '?'}`,
          size: 0,
          type: 'string' as const,
        }));
    }
  }, [activeStorageTab, search, localStorageItems, sessionStorageItems, cookies, indexedDBs]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-[var(--accent-blue)]" />
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">Storage</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="ds-icon-btn sm" onClick={loadStorage} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="ds-icon-btn sm" onClick={handleExport} title="Export">
            <Download size={14} />
          </button>
          <button className="ds-icon-btn sm" onClick={() => importInput?.click()} title="Import">
            <Upload size={14} />
          </button>
          <input
            ref={setImportInput}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="mx-2 mt-2 px-3 py-2 text-[12px] rounded-[var(--radius-md)] bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.3)] text-[var(--accent-rose)] flex items-start justify-between gap-2">
          <span>{error}</span>
          <button className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" onClick={() => setError(null)} aria-label="Dismiss error">✕</button>
        </div>
      )}

      <StorageStats />

      {/* Storage type tabs */}
      <div className="ds-tabs mx-2 mt-2">
        {STORAGE_TABS.map(tab => (
          <button
            key={tab.id}
            className={`ds-tab ${activeStorageTab === tab.id ? 'active' : ''}`}
            onClick={() => actions().setActiveStorageTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + actions bar */}
      <div className="flex items-center gap-2 p-2 border-b border-[var(--border-subtle)]">
        <div className="flex-1 min-w-0">
          <Input
            size="sm"
            placeholder="Search items..."
            value={search}
            onChange={(e) => actions().setSearch(e.target.value)}
            leftIcon={<Search />}
            clearable
            onClear={() => actions().setSearch('')}
          />
        </div>
        {activeStorageTab !== 'indexedDB' && (
          <button className="ds-icon-btn sm" onClick={handleAdd} title="Add item">
            <Plus size={14} />
          </button>
        )}
        {(activeStorageTab === 'localStorage' || activeStorageTab === 'sessionStorage') && (
          <button className="ds-icon-btn sm danger" onClick={handleClear} title="Clear all">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        <StorageList
          items={filteredItems as StorageItem[] | CookieItem[]}
          storageType={activeStorageTab}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Modals */}
      {editModal && (
        <StorageEditor
          storageType={activeStorageTab}
          initialKey={editModal.key}
          initialValue={editModal.value}
          isNew={false}
          onSave={handleSave}
          onCancel={() => setEditModal(null)}
        />
      )}
      {addModal && (
        <StorageEditor
          storageType={activeStorageTab}
          isNew
          onSave={handleSave}
          onCancel={() => setAddModal(false)}
        />
      )}
      {cookieEditModal && (
        <CookieEditor
          initialCookie={cookieEditModal}
          url={tabUrl}
          isNew={false}
          onSave={handleCookieSave}
          onCancel={() => setCookieEditModal(null)}
        />
      )}
      {cookieAddModal && (
        <CookieEditor
          url={tabUrl}
          isNew
          onSave={handleCookieSave}
          onCancel={() => setCookieAddModal(false)}
        />
      )}
    </div>
  );
};

function detectType(value: string): StorageItem['type'] {
  const trimmed = value.trim();
  if (trimmed === 'true' || trimmed === 'false') return 'boolean';
  if (trimmed !== '' && !isNaN(Number(trimmed))) return 'number';
  if (/^[[{]/.test(trimmed)) {
    try { JSON.parse(trimmed); return 'json'; } catch { /* not JSON */ }
  }
  return 'string';
}

function toItems(entries: Record<string, string>): StorageItem[] {
  return Object.entries(entries).map(([key, value]) => ({
    key,
    value,
    size: (key.length + value.length) * 2,
    type: detectType(value),
  }));
}

export default StorageTab;
