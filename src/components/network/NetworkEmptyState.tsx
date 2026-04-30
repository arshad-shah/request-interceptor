/**
 * NetworkEmptyState Component
 * Displayed when no network requests have been captured
 */

import { Activity, RefreshCw } from 'lucide-react';

interface NetworkEmptyStateProps {
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function NetworkEmptyState({
  hasFilters = false,
  onClearFilters,
}: NetworkEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="ds-empty-state">
        <div className="ds-empty-icon">
          <Activity size={28} />
        </div>
        <h3 className="ds-empty-title">No matching requests</h3>
        <p className="ds-empty-text">
          Try adjusting your filter criteria or search query
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="ds-btn mt-4"
          >
            <RefreshCw size={14} />
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="ds-empty-state">
      <div className="ds-empty-icon">
        <Activity size={28} />
      </div>
      <h3 className="ds-empty-title">No requests captured</h3>
      <p className="ds-empty-text">
        Navigate to a page or reload to capture network traffic
      </p>
    </div>
  );
}

export default NetworkEmptyState;
