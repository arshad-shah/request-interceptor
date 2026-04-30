/**
 * NetworkFilters Component
 * Search and filter controls for network requests
 */

import { Search, X } from 'lucide-react';
import { useNetworkStore, useNetworkFilters } from '../../stores/network-store';
import type { NetworkFilterType } from '../../types/network';

const FILTER_TYPES: { type: NetworkFilterType; label: string }[] = [
  { type: 'all', label: 'All' },
  { type: 'xhr', label: 'XHR' },
  { type: 'script', label: 'JS' },
  { type: 'stylesheet', label: 'CSS' },
  { type: 'image', label: 'Img' },
  { type: 'font', label: 'Font' },
  { type: 'document', label: 'Doc' },
  { type: 'media', label: 'Media' },
  { type: 'websocket', label: 'WS' },
  { type: 'other', label: 'Other' },
];

export function NetworkFilters() {
  const filters = useNetworkFilters();
  const { setFilter, setSearch, clearFilters } = useNetworkStore();

  return (
    <div className="flex-none flex flex-col gap-2 p-3 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
      {/* Search Input */}
      <div className="ds-search-wrap">
        <Search size={14} />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by URL, method, or status..."
          className="ds-search-input"
          style={{ paddingLeft: '32px', paddingRight: filters.search ? '32px' : '12px' }}
        />
        {filters.search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center justify-center"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter Type Buttons */}
      <div className="ds-filter-tabs">
        {FILTER_TYPES.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`ds-filter-tab ${filters.type === type ? 'active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default NetworkFilters;
