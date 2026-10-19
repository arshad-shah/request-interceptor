/**
 * Header name/value list with search highlighting
 */

import type { NetworkHeader } from '../../../types/network';
import { highlightSearchTerm } from '../utils';
import { CopyButton } from './CopyButton';

interface HeadersListProps {
  headers: NetworkHeader[] | undefined;
  searchTerm?: string;
  emptyText?: string;
  showCopy?: boolean;
}

export function HeadersList({
  headers,
  searchTerm = '',
  emptyText = 'No headers',
  showCopy = true,
}: HeadersListProps) {
  if (!headers || headers.length === 0) {
    return (
      <div className="text-[var(--text-tertiary)] italic text-sm py-2">
        {emptyText}
      </div>
    );
  }

  const filteredHeaders = searchTerm
    ? headers.filter(
        h =>
          h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          h.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : headers;

  if (filteredHeaders.length === 0) {
    return (
      <div className="text-[var(--text-tertiary)] italic text-sm py-2">
        No headers match "{searchTerm}"
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {filteredHeaders.map((h, i) => (
        <div
          key={`${h.name}-${i}`}
          className="ds-header-row group hover:bg-[var(--bg-surface)] rounded px-1.5 py-0.5 -mx-1.5"
        >
          <span className="ds-header-name">
            {highlightSearchTerm(h.name, searchTerm)}
          </span>
          <span className="ds-header-value flex-1 break-all">
            {highlightSearchTerm(h.value, searchTerm)}
          </span>
          {showCopy && (
            <CopyButton
              text={h.value}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              title="Copy value"
            />
          )}
        </div>
      ))}
    </div>
  );
}
