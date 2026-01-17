import React from 'react';
import Button from '../ui/Button';
import { Search, X } from 'lucide-react';

const FilterEmptyState: React.FC<{ onClearFilters: () => void }> = ({ onClearFilters }) => (
  <div className="ds-empty-state">
    <div className="ds-empty-state-icon">
      <Search size={24} />
    </div>

    <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">
      No routes match your filters
    </h3>

    <p className="text-[12px] text-[var(--text-secondary)] mb-4 max-w-xs">
      Try broadening your search or adjusting the filters to find what you're looking for.
    </p>

    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3 mb-4 w-full max-w-xs">
      <p className="text-[11px] font-medium text-[var(--text-secondary)] mb-2">Try:</p>
      <div className="space-y-1 text-[11px] text-[var(--text-tertiary)]">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 bg-[var(--text-tertiary)] rounded-full" />
          <span>Using different keywords</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 bg-[var(--text-tertiary)] rounded-full" />
          <span>Removing some filters</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 bg-[var(--text-tertiary)] rounded-full" />
          <span>Checking your spelling</span>
        </div>
      </div>
    </div>

    <Button
      variant="default"
      onClick={onClearFilters}
      leftIcon={<X size={14} />}
    >
      Clear Filters
    </Button>
  </div>
);

export default FilterEmptyState;
