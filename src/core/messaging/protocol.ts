/**
 * The extension's message protocol: every request (UI/content → background)
 * and every broadcast event (background → UI/content), with payload and
 * response types. Wire format:
 *   request:  { type, payload }   → response { ok: true, data } | { ok: false, error }
 *   event:    { type, payload }   (no response)
 */
import type { RouteConfig, WebSocketConfig, InjectionConfig } from '@/types';
import type { CapturedEvent } from '@/types/events';
import type { CookieItem, IndexedDBInfo } from '@/types/storage';
import type { NetworkRequest, NetworkSettings, ResponseBody, ReplayResult } from '@/types/network';

export type AnyRouteConfig = RouteConfig | WebSocketConfig | InjectionConfig;
export type Routes = Record<string, AnyRouteConfig>;

export interface StateSnapshot {
  enabled: boolean;
  routes: Routes;
  eventMonitorEnabled: boolean;
}

export interface WebStorageSnapshot {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  localStorageSize: number;
  sessionStorageSize: number;
}

export type StorageAction =
  | { type: 'SET_LOCAL' | 'SET_SESSION'; key: string; value: string }
  | { type: 'DELETE_LOCAL' | 'DELETE_SESSION'; key: string }
  | { type: 'CLEAR_LOCAL' | 'CLEAR_SESSION' }
  | { type: 'GET_INDEXEDDB_INFO' }
  | { type: 'DELETE_INDEXEDDB'; dbName: string };

export interface StorageActionResult {
  databases?: IndexedDBInfo[];
}

type Req<P, R> = { payload: P; result: R };

export interface Requests {
  // State & routes
  GET_STATE: Req<void, StateSnapshot>;
  SET_ENABLED: Req<{ enabled: boolean }, void>;
  ADD_ROUTE: Req<{ route: string; config: AnyRouteConfig; name?: string }, { isUpdate: boolean }>;
  REMOVE_ROUTE: Req<{ route: string }, void>;
  TOGGLE_ROUTE: Req<{ route: string; enabled: boolean }, void>;
  CLEAR_ROUTES: Req<void, void>;
  EXPORT_ROUTES: Req<void, unknown>;
  SET_EVENT_MONITOR: Req<{ enabled: boolean }, void>;

  // Event monitor
  EVENT_CAPTURED: Req<{ event: CapturedEvent; tabUrl: string }, void>;
  GET_EVENTS: Req<{ tabId: number }, CapturedEvent[]>;
  CLEAR_EVENTS: Req<{ tabId: number }, void>;

  // Storage inspector
  GET_COOKIES: Req<{ url: string }, CookieItem[]>;
  SET_COOKIE: Req<{ cookie: chrome.cookies.SetDetails }, void>;
  DELETE_COOKIE: Req<{ url: string; name: string }, void>;
  GET_WEB_STORAGE: Req<{ tabId: number }, WebStorageSnapshot>;
  STORAGE_ACTION: Req<{ tabId: number; action: StorageAction }, StorageActionResult>;

  // Network inspector
  NETWORK_GET_REQUESTS: Req<{ tabId: number }, { requests: NetworkRequest[]; settings: NetworkSettings; attached: boolean }>;
  NETWORK_GET_REQUEST_DETAILS: Req<{ tabId: number; requestId: string }, { request: NetworkRequest | null; responseBody: ResponseBody | null }>;
  NETWORK_GET_RESPONSE_BODY: Req<{ tabId: number; requestId: string }, ResponseBody | null>;
  NETWORK_CLEAR_REQUESTS: Req<{ tabId: number }, void>;
  NETWORK_UPDATE_SETTINGS: Req<{ settings: Partial<NetworkSettings> }, NetworkSettings>;
  NETWORK_GET_SETTINGS: Req<void, NetworkSettings>;
  NETWORK_EXPORT_HAR: Req<{ tabId: number }, string>;
  NETWORK_REPLAY_REQUEST: Req<{ request: NetworkRequest }, ReplayResult>;
  NETWORK_ATTACH_DEBUGGER: Req<{ tabId: number }, boolean>;
  NETWORK_DETACH_DEBUGGER: Req<{ tabId: number }, void>;
  NETWORK_GET_DEBUGGER_STATUS: Req<{ tabId: number }, boolean>;
}

export interface Events {
  /** Interception toggled, or routes changed. Sent to extension UIs and tabs. */
  STATE_CHANGED: { enabled: boolean; routes: Routes };
  EVENT_MONITOR_CHANGED: { enabled: boolean };
  EVENT_RECORDED: { tabId: number; event: CapturedEvent };
  NETWORK_REQUESTS_UPDATED: { tabId: number; requests: NetworkRequest[] };
  NETWORK_DEBUGGER_ATTACHED: { tabId: number };
  NETWORK_DEBUGGER_DETACHED: { tabId: number; reason: string };
}

export type RequestType = keyof Requests;
export type EventType = keyof Events;
export type PayloadOf<K extends RequestType> = Requests[K]['payload'];
export type ResultOf<K extends RequestType> = Requests[K]['result'];

export interface RequestMessage<K extends RequestType = RequestType> {
  type: K;
  payload: PayloadOf<K>;
}

export interface EventMessage<K extends EventType = EventType> {
  type: K;
  payload: Events[K];
}

export type Response<T> = { ok: true; data: T } | { ok: false; error: string };

/** Requests that legitimately take longer than the default timeout. */
export const REQUEST_TIMEOUTS: Partial<Record<RequestType, number>> = {
  NETWORK_EXPORT_HAR: 60_000,
  NETWORK_REPLAY_REQUEST: 60_000,
};
export const DEFAULT_REQUEST_TIMEOUT = 15_000;

const EVENT_TYPES: ReadonlySet<string> = new Set<EventType>([
  'STATE_CHANGED',
  'EVENT_MONITOR_CHANGED',
  'EVENT_RECORDED',
  'NETWORK_REQUESTS_UPDATED',
  'NETWORK_DEBUGGER_ATTACHED',
  'NETWORK_DEBUGGER_DETACHED',
]);

export function isEventMessage(message: unknown): message is EventMessage {
  return !!message && typeof message === 'object' && EVENT_TYPES.has((message as { type?: string }).type ?? '');
}
