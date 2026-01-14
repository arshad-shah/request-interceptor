/**
 * NetworkRequestList Component
 * Displays the list of captured network requests with headers
 */

import { useNetworkStore, useNetworkSettings } from '../../stores/network-store';
import type { NetworkRequest } from '../../types/network';
import NetworkRequestRow from './NetworkRequestRow';
import NetworkEmptyState from './NetworkEmptyState';

interface NetworkRequestListProps {
  requests: NetworkRequest[];
  selectedRequest: NetworkRequest | null;
  onSelectRequest: (request: NetworkRequest) => void;
  onInterceptRequest: (request: NetworkRequest) => void;
}

export function NetworkRequestList({
  requests,
  selectedRequest,
  onSelectRequest,
  onInterceptRequest,
}: NetworkRequestListProps) {
  const settings = useNetworkSettings();
  const { startTime, maxTime, filters, clearFilters } = useNetworkStore();

  const hasFilters = filters.type !== 'all' || filters.search !== '';

  if (requests.length === 0) {
    return (
      <NetworkEmptyState
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* List Header */}
      <div
        className="
          flex items-center py-2 px-3
          bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]
          text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider
        "
      >
        <div className="w-[60px] text-center">Status</div>
        <div className="w-[60px] px-1">Method</div>
        <div className="flex-1 px-1">Name</div>
        <div className="w-[70px] px-1">Type</div>
        <div className="w-[70px] text-right px-1">Size</div>
        <div className="w-[70px] text-right px-1">Time</div>
        {settings.showWaterfall && <div className="w-[100px] px-1">Waterfall</div>}
        <div className="w-[40px]"></div>
      </div>

      {/* Request List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {requests.map((request) => (
          <NetworkRequestRow
            key={request.requestId}
            request={request}
            isSelected={selectedRequest?.requestId === request.requestId}
            showWaterfall={settings.showWaterfall}
            maxTime={maxTime}
            startTime={startTime}
            onSelect={onSelectRequest}
            onIntercept={onInterceptRequest}
          />
        ))}
      </div>
    </div>
  );
}

export default NetworkRequestList;
