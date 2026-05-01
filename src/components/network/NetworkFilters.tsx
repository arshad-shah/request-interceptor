/**
 * NetworkFilters Component
 * Search and filter controls for network requests
 */

import { Search } from 'lucide-react';
import { useNetworkStore, useNetworkFilters } from '../../stores/network-store';
import type { NetworkFilterType } from '../../types/network';
import Input from '@/components/ui/Input';

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
  const { setFilter, setSearch } = useNetworkStore();

  return (
    <div className="flex-none flex flex-col gap-2 p-3 bg-(--bg-elevated) border-b border-(--border-subtle)">
      <Input
        size="sm"
        value={filters.search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter by URL, method, or status..."
        leftIcon={<Search />}
        clearable
        onClear={() => setSearch('')}
      />

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
