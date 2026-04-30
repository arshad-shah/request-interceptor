import React from 'react';
import { Search, Bookmark, GitCompare, Regex } from 'lucide-react';
import { useEventsStore } from '@/stores/events-store';
import { EventCategory } from '@/types/events';

const CATEGORIES: Array<{ label: string; value: 'all' | EventCategory }> = [
  { label: 'All', value: 'all' },
  { label: 'Custom', value: 'CustomEvent' },
  { label: 'Message', value: 'postMessage' },
  { label: 'Emitter', value: 'EventEmitter' },
  { label: 'System', value: 'System' },
];

const EventFilters: React.FC = () => {
  const { filters, setFilters, compareMode, setCompareMode } = useEventsStore();

  return (
    <div className="flex flex-col gap-2 p-2 border-b border-[var(--border-subtle)]">
      {/* Search */}
      <div className="ds-search-wrap">
        <Search size={14} />
        <input
          type="text"
          className="ds-search-input"
          placeholder="Search events..."
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
        />
        <div className="absolute right-2 flex items-center gap-1">
          <button
            className={`ds-icon-btn sm ${filters.useRegex ? 'active' : ''}`}
            onClick={() => setFilters({ useRegex: !filters.useRegex })}
            title="Regex search"
          >
            <Regex size={12} />
          </button>
        </div>
      </div>

      {/* Category filters + actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="ds-filter-tabs flex-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              className={`ds-filter-tab ${filters.category === cat.value ? 'active' : ''}`}
              onClick={() => setFilters({ category: cat.value })}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <button
          className={`ds-icon-btn sm ${filters.showBookmarkedOnly ? 'active' : ''}`}
          onClick={() => setFilters({ showBookmarkedOnly: !filters.showBookmarkedOnly })}
          title="Show bookmarked only"
        >
          <Bookmark size={14} />
        </button>
        <button
          className={`ds-icon-btn sm ${compareMode ? 'active' : ''}`}
          onClick={() => setCompareMode(!compareMode)}
          title="Compare events"
        >
          <GitCompare size={14} />
        </button>
      </div>
    </div>
  );
};

export default EventFilters;
