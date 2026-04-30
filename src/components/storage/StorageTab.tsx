import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { RefreshCw, Download, Upload, Plus, Trash2, Search, Database } from 'lucide-react';
import { useStorageStore } from '@/stores/storage-store';
import { StorageType, StorageItem, CookieItem } from '@/types/storage';
import StorageStats from './StorageStats';
import StorageList from './StorageList';
import StorageEditor from './StorageEditor';
import CookieEditor from './CookieEditor';

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

  const getTabId = useCallback((): Promise<number | undefined> => {
    return new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        setTabUrl(tabs[0]?.url || '');
        resolve(tabs[0]?.id);
      });
    });
  }, []);

  const loadStorage = useCallback(async () => {
    const { setLoading, setLocalStorageItems, setSessionStorageItems, setCookies, setIndexedDBs, updateStats } = actions();
    setLoading(true);
    const tabId = await getTabId();
    if (!tabId) { setLoading(false); return; }

    // Get localStorage + sessionStorage
    chrome.runtime.sendMessage({ type: 'GET_ALL_STORAGE', tabId }, (response) => {
      if (response) {
        const localItems: StorageItem[] = Object.entries(response.localStorage || {}).map(([key, value]) => ({
          key,
          value: value as string,
          size: (key.length + (value as string).length) * 2,
          type: detectType(value as string),
        }));
        const sessionItems: StorageItem[] = Object.entries(response.sessionStorage || {}).map(([key, value]) => ({
          key,
          value: value as string,
          size: (key.length + (value as string).length) * 2,
          type: detectType(value as string),
        }));
        setLocalStorageItems(localItems);
        setSessionStorageItems(sessionItems);
        updateStats({
          localStorageCount: localItems.length,
          localStorageSize: response.localStorageSize || 0,
          sessionStorageCount: sessionItems.length,
          sessionStorageSize: response.sessionStorageSize || 0,
        });
      }
    });

    // Get cookies
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url;
      if (!url) return;
      chrome.runtime.sendMessage({ type: 'GET_COOKIES', url }, (response) => {
        if (response?.cookies) {
          setCookies(response.cookies);
          updateStats({ cookiesCount: response.cookies.length });
        }
      });
    });

    // Get IndexedDB info
    chrome.runtime.sendMessage({
      type: 'EXECUTE_STORAGE_ACTION',
      tabId,
      action: { type: 'GET_INDEXEDDB_INFO' },
    }, (response) => {
      if (response?.databases) {
        setIndexedDBs(response.databases);
        updateStats({ indexedDBCount: response.databases.length });
      }
      setLoading(false);
    });
  }, [getTabId]);

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

  const handleDelete = async (key: string) => {
    const tabId = await getTabId();
    if (!tabId) return;

    if (activeStorageTab === 'cookies') {
      chrome.runtime.sendMessage({ type: 'DELETE_COOKIE', url: tabUrl, name: key }, () => loadStorage());
    } else if (activeStorageTab === 'indexedDB') {
      chrome.runtime.sendMessage({
        type: 'EXECUTE_STORAGE_ACTION',
        tabId,
        action: { type: 'DELETE_INDEXEDDB', dbName: key },
      }, () => loadStorage());
    } else {
      const actionType = activeStorageTab === 'localStorage' ? 'DELETE_LOCAL' : 'DELETE_SESSION';
      chrome.runtime.sendMessage({
        type: 'EXECUTE_STORAGE_ACTION',
        tabId,
        action: { type: actionType, key },
      }, () => loadStorage());
    }
  };

  const handleSave = async (key: string, value: string) => {
    const tabId = await getTabId();
    if (!tabId) return;

    const actionType = activeStorageTab === 'localStorage' ? 'SET_LOCAL' : 'SET_SESSION';
    chrome.runtime.sendMessage({
      type: 'EXECUTE_STORAGE_ACTION',
      tabId,
      action: { type: actionType, key, value },
    }, () => {
      setEditModal(null);
      setAddModal(false);
      loadStorage();
    });
  };

  const handleCookieSave = (cookie: Record<string, unknown>) => {
    chrome.runtime.sendMessage({ type: 'SET_COOKIE', cookie }, () => {
      setCookieEditModal(null);
      setCookieAddModal(false);
      loadStorage();
    });
  };

  const handleClear = async () => {
    const tabId = await getTabId();
    if (!tabId) return;

    if (activeStorageTab === 'localStorage') {
      chrome.runtime.sendMessage({
        type: 'EXECUTE_STORAGE_ACTION', tabId, action: { type: 'CLEAR_LOCAL' },
      }, () => loadStorage());
    } else if (activeStorageTab === 'sessionStorage') {
      chrome.runtime.sendMessage({
        type: 'EXECUTE_STORAGE_ACTION', tabId, action: { type: 'CLEAR_SESSION' },
      }, () => loadStorage());
    }
  };

  const handleExport = () => {
    const data: Record<string, unknown> = {};
    if (activeStorageTab === 'localStorage') {
      localStorageItems.forEach(i => { (data as Record<string, string>)[i.key] = i.value; });
    } else if (activeStorageTab === 'sessionStorage') {
      sessionStorageItems.forEach(i => { (data as Record<string, string>)[i.key] = i.value; });
    } else if (activeStorageTab === 'cookies') {
      data.cookies = cookies;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeStorageTab}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      const tabId = await getTabId();
      if (!tabId) return;

      if (activeStorageTab === 'localStorage' || activeStorageTab === 'sessionStorage') {
        const actionPrefix = activeStorageTab === 'localStorage' ? 'SET_LOCAL' : 'SET_SESSION';
        const entries = Object.entries(data);
        for (const [key, value] of entries) {
          await new Promise<void>(resolve => {
            chrome.runtime.sendMessage({
              type: 'EXECUTE_STORAGE_ACTION',
              tabId,
              action: { type: actionPrefix, key, value: String(value) },
            }, () => resolve());
          });
        }
        loadStorage();
      }
    } catch {
      console.error('Invalid JSON file');
    }
    if (importInput) importInput.value = '';
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
        <div className="ds-search-wrap flex-1">
          <Search size={14} />
          <input
            type="text"
            className="ds-search-input"
            placeholder="Search items..."
            value={search}
            onChange={(e) => actions().setSearch(e.target.value)}
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

function detectType(value: string): 'string' | 'json' | 'number' | 'boolean' {
  try { JSON.parse(value); return 'json'; } catch { /* */ }
  if (value === 'true' || value === 'false') return 'boolean';
  if (!isNaN(Number(value)) && value.trim() !== '') return 'number';
  return 'string';
}

export default StorageTab;
