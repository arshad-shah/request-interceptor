/**
 * Query parameter manipulation for intercepted requests.
 */

import type { QueryParamRule } from '@/types';

/**
 * Apply query parameter rules to a URL.
 * Supports add, remove, and modify actions.
 *
 * @param url - The URL to modify
 * @param rules - Array of query param rules to apply
 * @param baseOrigin - Base origin for resolving relative URLs
 * @returns The modified URL string
 */
export function applyQueryParamRules(url: string, rules: QueryParamRule[], baseOrigin = 'http://localhost'): string {
  if (!rules || rules.length === 0) return url;

  try {
    const urlObj = new URL(url, baseOrigin);
    for (const rule of rules) {
      switch (rule.action) {
        case 'add':
          urlObj.searchParams.set(rule.key, rule.value || '');
          break;
        case 'remove':
          urlObj.searchParams.delete(rule.key);
          break;
        case 'modify':
          if (urlObj.searchParams.has(rule.key)) {
            urlObj.searchParams.set(rule.key, rule.value || '');
          }
          break;
      }
    }
    return urlObj.toString();
  } catch {
    return url;
  }
}
