/**
 * NetworkRequestList Component
 * Chrome DevTools-style network request list with sortable columns and proper scrolling
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  ChevronUp,
  ChevronDown,
  Filter,
  XCircle,
} from 'lucide-react';
import { useNetworkStore, useNetworkSettings } from '../../stores/network-store';
import type { NetworkRequest } from '../../types/network';
import NetworkRequestRow from './NetworkRequestRow';
import NetworkEmptyState from './NetworkEmptyState';

// ============================================================================
// Types
// ============================================================================

interface NetworkRequestListProps {
  requests: NetworkRequest[];
  selectedRequest: NetworkRequest | null;
  onSelectRequest: (request: NetworkRequest) => void;
  onInterceptRequest: (request: NetworkRequest) => void;
}

type SortField = 'status' | 'method' | 'name' | 'type' | 'size' | 'time' | 'waterfall';
type SortDirection = 'asc' | 'desc';

interface ColumnConfig {
  id: SortField;
  label: string;
  width: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  hideOnNarrow?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const COLUMNS: ColumnConfig[] = [
  { id: 'status', label: 'Status', width: 'w-[52px]', align: 'center', sortable: true },
  { id: 'method', label: 'Method', width: 'w-[56px]', align: 'center', sortable: true },
  { id: 'name', label: 'Name', width: 'flex-1 min-w-[120px]', align: 'left', sortable: true },
  { id: 'type', label: 'Type', width: 'w-[65px]', align: 'center', sortable: true, hideOnNarrow: true },
  { id: 'size', label: 'Size', width: 'w-[65px]', align: 'right', sortable: true },
  { id: 'time', label: 'Time', width: 'w-[60px]', align: 'right', sortable: true },
  { id: 'waterfall', label: 'Waterfall', width: 'w-[120px]', align: 'left', sortable: true },
];

// ============================================================================
// Sorting Logic
// ============================================================================

function sortRequests(
  requests: NetworkRequest[],
  field: SortField,
  direction: SortDirection
): NetworkRequest[] {
  const sorted = [...requests].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'status':
        comparison = (a.statusCode || 0) - (b.statusCode || 0);
        break;
      case 'method':
        comparison = (a.method || '').localeCompare(b.method || '');
        break;
      case 'name':
        const nameA = a.filename || a.pathname || a.url;
        const nameB = b.filename || b.pathname || b.url;
        comparison = nameA.localeCompare(nameB);
        break;
      case 'type':
        comparison = (a.type || '').localeCompare(b.type || '');
        break;
      case 'size':
        comparison = (a.encodedSize || a.size || 0) - (b.encodedSize || b.size || 0);
        break;
      case 'time':
        comparison = (a.duration || 0) - (b.duration || 0);
        break;
      case 'waterfall':
        comparison = (a.startTime || 0) - (b.startTime || 0);
        break;
    }

    return direction === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

// ============================================================================
// Column Header Component
// ============================================================================

interface ColumnHeaderProps {
  column: ColumnConfig;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  showWaterfall: boolean;
}

function ColumnHeader({
  column,
  sortField,
  sortDirection,
  onSort,
  showWaterfall,
}: ColumnHeaderProps) {
  if (column.id === 'waterfall' && !showWaterfall) return null;

  const isActive = sortField === column.id;
  const canSort = column.sortable !== false;

  return (
    <div
      className={clsx(
        column.width,
        'px-1.5 py-1.5 select-none',
        column.align === 'center' && 'text-center',
        column.align === 'right' && 'text-right',
        canSort && 'cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors',
        isActive && 'text-[var(--text-primary)]'
      )}
      onClick={() => canSort && onSort(column.id)}
      title={canSort ? `Sort by ${column.label}` : undefined}
    >
      <span className="inline-flex items-center gap-0.5">
        {column.label}
        {isActive && (
          sortDirection === 'asc' ? (
            <ChevronUp size={10} className="text-[var(--accent-blue)]" />
          ) : (
            <ChevronDown size={10} className="text-[var(--accent-blue)]" />
          )
        )}
      </span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function NetworkRequestList({
  requests,
  selectedRequest,
  onSelectRequest,
  onInterceptRequest,
}: NetworkRequestListProps) {
  const settings = useNetworkSettings();
  const { startTime, maxTime, filters, clearFilters } = useNetworkStore();

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Refs for scroll management
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRowRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected request
  useEffect(() => {
    if (selectedRequest && selectedRowRef.current && listRef.current) {
      const list = listRef.current;
      const row = selectedRowRef.current;
      const listRect = list.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();

      // Check if row is outside visible area
      if (rowRect.top < listRect.top || rowRect.bottom > listRect.bottom) {
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedRequest?.requestId]);

  // Handle sort
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      // Toggle direction or clear sort
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  // Sorted requests
  const sortedRequests = useMemo(() => {
    if (!sortField) return requests;
    return sortRequests(requests, sortField, sortDirection);
  }, [requests, sortField, sortDirection]);

  // Check for active filters
  const hasFilters = filters.type !== 'all' || filters.search !== '';

  // Empty state
  if (requests.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <NetworkEmptyState
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* ─── Column Headers ─────────────────────────────────────────────── */}
      <div
        className={clsx(
          'flex items-center px-2',
          'bg-[var(--bg-surface)] border-b border-[var(--border-default)]',
          'text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider',
          'flex-shrink-0'
        )}
      >
        {COLUMNS.map(column => (
          <ColumnHeader
            key={column.id}
            column={column}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            showWaterfall={settings.showWaterfall}
          />
        ))}
        {/* Actions column header */}
        <div className="w-[36px]" />
      </div>

      {/* ─── Filter indicator ───────────────────────────────────────────── */}
      {hasFilters && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] flex-shrink-0">
          <Filter size={12} className="text-[var(--accent-blue)]" />
          <span className="text-[11px] text-[var(--text-secondary)]">
            Showing {sortedRequests.length} filtered request{sortedRequests.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={clearFilters}
            className="ml-auto text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] 
              flex items-center gap-1 transition-colors"
          >
            <XCircle size={12} />
            Clear filters
          </button>
        </div>
      )}

      {/* ─── Request List (Scrollable) ──────────────────────────────────── */}
      <div 
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
      >
        {sortedRequests.map((request, index) => (
          <div
            key={request.requestId}
            ref={selectedRequest?.requestId === request.requestId ? selectedRowRef : undefined}
          >
            <NetworkRequestRow
              request={request}
              isSelected={selectedRequest?.requestId === request.requestId}
              showWaterfall={settings.showWaterfall}
              maxTime={maxTime}
              startTime={startTime}
              onSelect={onSelectRequest}
              onIntercept={onInterceptRequest}
              isEven={index % 2 === 0}
            />
          </div>
        ))}
      </div>

      {/* ─── Sort indicator (bottom) ────────────────────────────────────── */}
      {sortField && (
        <div className="flex items-center justify-between px-3 py-1 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] flex-shrink-0">
          <span className="text-[10px] text-[var(--text-tertiary)]">
            Sorted by <span className="text-[var(--text-secondary)]">{sortField}</span>
            {' '}({sortDirection === 'asc' ? 'ascending' : 'descending'})
          </span>
          <button
            onClick={() => {
              setSortField(null);
              setSortDirection('asc');
            }}
            className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Clear sort
          </button>
        </div>
      )}
    </div>
  );
}

export default NetworkRequestList;