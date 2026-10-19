/**
 * User settings: schema, defaults, validation and site rules. Pure (no
 * browser APIs). Stored locally under the `settings` key; anything invalid
 * or missing falls back to defaults so a corrupt value can never break the
 * extension.
 */
import { pageUrlMatches } from './url-matching';

export const SETTINGS_VERSION = 1;

export const TOAST_EVENTS = ['mock', 'block', 'redirect', 'headers', 'websocket'] as const;
export type ToastEvent = (typeof TOAST_EVENTS)[number];

export const TOAST_POSITIONS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'] as const;
export type ToastPosition = (typeof TOAST_POSITIONS)[number];

export interface Settings {
  version: number;
  notifications: {
    /** On-page toasts when a rule fires. */
    pageToasts: boolean;
    events: Record<ToastEvent, boolean>;
    position: ToastPosition;
    durationMs: number;
    maxVisible: number;
  };
  sites: {
    /** 'all': run everywhere except the deny list; 'allowlist': only on listed sites. */
    mode: 'all' | 'allowlist';
    allowlist: string[];
    denylist: string[];
  };
  network: {
    maxRequests: number;
    bodyCacheMB: number;
    webSocketFrames: number;
  };
  diagnostics: {
    /** Print interception logs to the page's DevTools console. */
    pageConsoleLogs: boolean;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  notifications: {
    pageToasts: true,
    events: { mock: true, block: true, redirect: true, headers: true, websocket: true },
    position: 'top-right',
    durationMs: 3000,
    maxVisible: 5,
  },
  sites: { mode: 'all', allowlist: [], denylist: [] },
  network: { maxRequests: 500, bodyCacheMB: 32, webSocketFrames: 500 },
  diagnostics: { pageConsoleLogs: false },
};

export const LIMITS = {
  durationMs: [1000, 15000],
  maxVisible: [1, 10],
  maxRequests: [100, 5000],
  bodyCacheMB: [4, 256],
  webSocketFrames: [50, 5000],
} as const;

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? (T[K] extends unknown[] ? T[K] : DeepPartial<T[K]>) : T[K] };

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;
const clamp = (v: unknown, [min, max]: readonly [number, number], fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;
const patterns = (v: unknown): string[] =>
  Array.isArray(v)
    ? [...new Set(v.filter((p): p is string => typeof p === 'string').map((p) => p.trim()).filter(Boolean))].slice(0, 500)
    : [];

/** Coerce any stored/imported value into valid settings. */
export function normalizeSettings(input: unknown): Settings {
  const raw = isObject(input) ? input : {};
  const d = DEFAULT_SETTINGS;
  const n = isObject(raw.notifications) ? raw.notifications : {};
  const events = isObject(n.events) ? n.events : {};
  const sites = isObject(raw.sites) ? raw.sites : {};
  const network = isObject(raw.network) ? raw.network : {};
  const diagnostics = isObject(raw.diagnostics) ? raw.diagnostics : {};

  return {
    version: SETTINGS_VERSION,
    notifications: {
      pageToasts: bool(n.pageToasts, d.notifications.pageToasts),
      events: Object.fromEntries(
        TOAST_EVENTS.map((e) => [e, bool(events[e], d.notifications.events[e])])
      ) as Record<ToastEvent, boolean>,
      position: oneOf(n.position, TOAST_POSITIONS, d.notifications.position),
      durationMs: clamp(n.durationMs, LIMITS.durationMs, d.notifications.durationMs),
      maxVisible: clamp(n.maxVisible, LIMITS.maxVisible, d.notifications.maxVisible),
    },
    sites: {
      mode: oneOf(sites.mode, ['all', 'allowlist'] as const, d.sites.mode),
      allowlist: patterns(sites.allowlist),
      denylist: patterns(sites.denylist),
    },
    network: {
      maxRequests: clamp(network.maxRequests, LIMITS.maxRequests, d.network.maxRequests),
      bodyCacheMB: clamp(network.bodyCacheMB, LIMITS.bodyCacheMB, d.network.bodyCacheMB),
      webSocketFrames: clamp(network.webSocketFrames, LIMITS.webSocketFrames, d.network.webSocketFrames),
    },
    diagnostics: {
      pageConsoleLogs: bool(diagnostics.pageConsoleLogs, d.diagnostics.pageConsoleLogs),
    },
  };
}

/** Merge a partial update into current settings, then validate. */
export function mergeSettings(current: Settings, patch: DeepPartial<Settings>): Settings {
  const merge = (a: unknown, b: unknown): unknown => {
    if (!isObject(a) || !isObject(b)) return b === undefined ? a : b;
    const out: Record<string, unknown> = { ...a };
    for (const [k, v] of Object.entries(b)) out[k] = merge(a[k], v);
    return out;
  };
  return normalizeSettings(merge(current, patch));
}

/**
 * A site pattern matches a page URL when it is a host (`example.com` also
 * covers subdomains), a URL prefix/wildcard, or a /regex/ — the same
 * syntax as route URL patterns.
 */
export function siteMatches(pageUrl: string, pattern: string): boolean {
  let host = '';
  try {
    host = new URL(pageUrl).hostname;
  } catch {
    return false;
  }
  const bare = pattern.replace(/^\*\./, '');
  if (/^[a-z0-9.-]+$/i.test(bare)) return host === bare || host.endsWith(`.${bare}`);
  return pageUrlMatches(pageUrl, pattern);
}

/** Whether interception should run on this page. */
export function isSiteEnabled(pageUrl: string, settings: Settings): boolean {
  const { mode, allowlist, denylist } = settings.sites;
  if (denylist.some((p) => siteMatches(pageUrl, p))) return false;
  if (mode === 'allowlist') return allowlist.some((p) => siteMatches(pageUrl, p));
  return true;
}
