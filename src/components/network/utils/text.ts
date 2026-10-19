/**
 * Text helpers for the request details panel
 */

import { createElement, type ReactNode } from 'react';

/**
 * Wrap case-insensitive matches of `search` in <mark> elements.
 * Returns React nodes (never an HTML string) so captured header names/values,
 * which are attacker-controlled, are always rendered as text.
 */
export function highlightSearchTerm(text: string, search: string): ReactNode {
  if (!search || !text) return text;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // With a capturing group, split() puts the matches at the odd indices.
  return text.split(new RegExp(`(${escaped})`, 'gi')).map((part, i) =>
    i % 2 === 1
      ? createElement('mark', { key: i, className: 'ds-search-highlight' }, part)
      : part
  );
}

export function getLanguageFromMime(mimeType: string): string {
  if (mimeType.includes('json')) return 'json';
  if (mimeType.includes('xml')) return 'xml';
  if (mimeType.includes('html')) return 'html';
  if (mimeType.includes('css')) return 'css';
  if (mimeType.includes('javascript')) return 'javascript';
  return 'text';
}
