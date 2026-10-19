/**
 * Text helpers for the request details panel
 */

export function highlightSearchTerm(text: string, search: string): string {
  if (!search || !text) return text;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark class="ds-search-highlight">$1</mark>');
}

export function getLanguageFromMime(mimeType: string): string {
  if (mimeType.includes('json')) return 'json';
  if (mimeType.includes('xml')) return 'xml';
  if (mimeType.includes('html')) return 'html';
  if (mimeType.includes('css')) return 'css';
  if (mimeType.includes('javascript')) return 'javascript';
  return 'text';
}
