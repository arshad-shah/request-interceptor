/** Storage inspector: cookies via chrome.cookies, web storage/IndexedDB via chrome.scripting in the page. */
import type { MessageRouter } from '@/core/messaging/router';
import type { StorageAction, StorageActionResult, WebStorageSnapshot } from '@/core/messaging/protocol';
import type { CookieItem } from '@/types/storage';

/** Runs in the page (MAIN world): must be self-contained. */
function readWebStorage(): WebStorageSnapshot {
  const read = (store: Storage) => {
    const items: Record<string, string> = {};
    let size = 0;
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i)!;
      const value = store.getItem(key) ?? '';
      items[key] = value;
      size += key.length + value.length;
    }
    return { items, size };
  };
  const local = read(localStorage);
  const session = read(sessionStorage);
  return {
    localStorage: local.items,
    sessionStorage: session.items,
    localStorageSize: local.size,
    sessionStorageSize: session.size,
  };
}

/** Runs in the page (MAIN world): must be self-contained. Throws on failure. */
async function runStorageAction(action: StorageAction): Promise<StorageActionResult> {
  switch (action.type) {
    case 'SET_LOCAL': localStorage.setItem(action.key, action.value); return {};
    case 'SET_SESSION': sessionStorage.setItem(action.key, action.value); return {};
    case 'DELETE_LOCAL': localStorage.removeItem(action.key); return {};
    case 'DELETE_SESSION': sessionStorage.removeItem(action.key); return {};
    case 'CLEAR_LOCAL': localStorage.clear(); return {};
    case 'CLEAR_SESSION': sessionStorage.clear(); return {};
    case 'GET_INDEXEDDB_INFO': {
      if (!indexedDB?.databases) return { databases: [] };
      const dbs = await indexedDB.databases();
      return { databases: dbs.filter((db) => db.name).map((db) => ({ name: db.name!, version: db.version })) };
    }
    case 'DELETE_INDEXEDDB':
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(action.dbName);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(new Error(req.error?.message ?? 'Delete failed'));
        req.onblocked = () => reject(new Error('Database is open in another tab'));
      });
      return {};
  }
}

async function inPage<A extends unknown[], R>(tabId: number, func: (...args: A) => R | Promise<R>, args: A): Promise<R> {
  try {
    const [result] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func, args });
    if (!result) throw new Error('No result from page');
    return result.result as R;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Restricted pages (chrome://, the Web Store, PDF viewer) can't be scripted
    throw new Error(/Cannot access|cannot be scripted|chrome:\/\//i.test(message)
      ? 'This page does not allow extensions to read its storage'
      : message);
  }
}

export function registerStorageHandlers(router: MessageRouter): void {
  router
    .on('GET_COOKIES', async ({ url }): Promise<CookieItem[]> => {
      const cookies = await chrome.cookies.getAll({ url });
      return cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite,
        expirationDate: c.expirationDate,
        session: c.session,
      }));
    })
    .on('SET_COOKIE', async ({ cookie }) => {
      const result = await chrome.cookies.set(cookie);
      if (!result) throw new Error(chrome.runtime.lastError?.message ?? 'Cookie was rejected');
    })
    .on('DELETE_COOKIE', async ({ url, name }) => {
      await chrome.cookies.remove({ url, name });
    })
    .on('GET_WEB_STORAGE', ({ tabId }) => inPage(tabId, readWebStorage, []))
    .on('STORAGE_ACTION', ({ tabId, action }) => inPage(tabId, runStorageAction, [action]));
}
