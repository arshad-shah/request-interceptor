import React from 'react';
import { Search, X } from 'lucide-react';
import EmptyState from './EmptyState';

const FilterEmptyState: React.FC<{ onClearFilters: () => void }> = ({ onClearFilters }) => (
  <EmptyState
    icon={<Search size={24} />}
    title="No routes match your filters"
    description="Try broadening your search or adjusting the filters to find what you're looking for."
    action={{
      label: 'Clear Filters',
      onClick: onClearFilters,
      icon: <X size={14} />,
      variant: 'default',
    }}
  />
);

export default FilterEmptyState;
