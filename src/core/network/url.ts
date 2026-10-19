/** Pure URL/header helpers for network capture. */
import type { NetworkHeader, ResourceType } from '@/types/network';
import type { CdpHeaders } from './cdp-types';

export interface ParsedRequestUrl {
  hostname: string;
  pathname: string;
  /** Last path segment, or the hostname for `/` and empty paths. */
  filename: string;
  /** `location.search`, including the leading `?` (empty when absent). */
  query: string;
}

/** Split a URL into the display fields of a request row. Never throws. */
export function parseRequestUrl(url: string): ParsedRequestUrl {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    let filename = urlObj.pathname.split('/').pop() || urlObj.hostname;
    if (!filename || filename === '/') filename = hostname;
    return { hostname, pathname: urlObj.pathname, filename, query: urlObj.search };
  } catch {
    const hostname = url.substring(0, 50);
    return { hostname, pathname: '', filename: hostname, query: '' };
  }
}

/** `?a=1&b=2` → HAR-style name/value pairs. */
export function parseQueryString(query: string | undefined): NetworkHeader[] {
  if (!query || query === '?') return [];
  try {
    const params = new URLSearchParams(query);
    return Array.from(params.entries()).map(([name, value]) => ({ name, value }));
  } catch {
    return [];
  }
}

/** CDP header object (or an existing array) → name/value list. */
export function headersToArray(headers: CdpHeaders | undefined | null): NetworkHeader[] {
  if (!headers) return [];
  if (Array.isArray(headers)) return headers;
  return Object.entries(headers).map(([name, value]) => ({ name, value: String(value) }));
}

const RESOURCE_TYPES: Record<string, ResourceType> = {
  Document: 'document',
  Stylesheet: 'stylesheet',
  Script: 'script',
  Image: 'image',
  Font: 'font',
  XHR: 'xhr',
  Fetch: 'xhr',
  Ping: 'other',
  Media: 'media',
  WebSocket: 'websocket',
  Manifest: 'other',
  Other: 'other',
};

/** CDP `ResourceType` (e.g. `Fetch`) → the UI's resource type. */
export function toResourceType(cdpType: string | undefined): ResourceType {
  return RESOURCE_TYPES[cdpType ?? ''] || ((cdpType?.toLowerCase() || 'other') as ResourceType);
}
