export type StorageType = 'localStorage' | 'sessionStorage' | 'cookies' | 'indexedDB';

export interface StorageItem {
  key: string;
  value: string;
  size: number;
  type: 'string' | 'json' | 'number' | 'boolean';
}

export interface CookieItem {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  expirationDate?: number;
  session: boolean;
}

export interface IndexedDBInfo {
  name: string;
  version?: number;
}

export interface StorageStats {
  localStorageCount: number;
  localStorageSize: number;
  sessionStorageCount: number;
  sessionStorageSize: number;
  cookiesCount: number;
  indexedDBCount: number;
}

export interface StorageData {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  localStorageSize: number;
  sessionStorageSize: number;
}
