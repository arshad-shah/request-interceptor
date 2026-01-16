/**
 * NetworkRequestRow Component
 * Chrome DevTools-style individual row in the network request list
 */

import { memo } from 'react';
import { clsx } from 'clsx';
import { Plus, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import type { NetworkRequest } from '../../types/network';
import { formatSize, formatTime, getStatusClass } from '../../lib/network-api';

// ============================================================================
// Types
// ============================================================================

interface NetworkRequestRowProps {
  request: NetworkRequest;
  isSelected: boolean;
  showWaterfall: boolean;
  maxTime: number;
  startTime: number | null;
  onSelect: (request: NetworkRequest) => void;
  onIntercept: (request: NetworkRequest) => void;
  isEven?: boolean;
}

// ============================================================================
// Helper Components
// ============================================================================

function StatusIndicator({ request }: { request: NetworkRequest }) {
  const { status, statusCode } = request;

  if (status === 'pending') {
    return (
      <span className="ds-badge gray flex items-center gap-1">
        <Loader2 size={10} className="animate-spin" />
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="ds-badge rose flex items-center gap-1" title="Request failed">
        <AlertCircle size={10} />
      </span>
    );
  }

  if (!statusCode) {
    return <span className="ds-badge gray">—</span>;
  }

  const statusClass = getStatusClass(statusCode, status);

  return (
    <span className={clsx('ds-badge', statusClass)}>
      {statusCode}
    </span>
  );
}

function WaterfallBar({
  request,
  maxTime,
  startTime,
}: {
  request: NetworkRequest;
  maxTime: number;
  startTime: number | null;
}) {
  const duration = request.duration ?? 0;

  if (duration <= 0 || maxTime <= 0) {
    return <div className="ds-waterfall" />;
  }

  // Calculate bar positioning
  let offsetPercent = 0;
  if (startTime && request.startTime) {
    const totalWindow = maxTime * 1.2; // Add 20% padding
    offsetPercent = Math.max(0, ((request.startTime - startTime) / totalWindow) * 100);
  }

  const widthPercent = Math.max((duration / maxTime) * 100, 2);

  // Color based on response time
  const getBarColor = () => {
    if (request.fromCache) return 'var(--text-tertiary)';
    if (duration > 1000) return 'var(--accent-amber)';
    if (duration > 500) return 'var(--accent-blue)';
    return 'var(--accent-emerald)';
  };

  return (
    <div className="ds-waterfall relative group">
      <div
        className="absolute top-0 bottom-0 rounded-sm transition-opacity"
        style={{
          left: `${offsetPercent}%`,
          width: `${Math.min(widthPercent, 100 - offsetPercent)}%`,
          backgroundColor: getBarColor(),
          minWidth: '3px',
        }}
      />
      {/* Tooltip on hover */}
      <div className="absolute left-0 right-0 -top-6 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5 text-[10px] text-[var(--text-primary)] whitespace-nowrap shadow-lg">
          {formatTime(duration)}
          {request.fromCache && ' (cached)'}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const NetworkRequestRow = memo(function NetworkRequestRow({
  request,
  isSelected,
  showWaterfall,
  maxTime,
  startTime,
  onSelect,
  onIntercept,
  isEven = false,
}: NetworkRequestRowProps) {
  const isError = request.status === 'error' || (request.statusCode && request.statusCode >= 400);
  const isPending = request.status === 'pending';
  const isCached = request.fromCache;

  // Format display values
  const displayName = request.filename || request.pathname?.split('/').pop() || request.url;
  const displayHost = request.hostname;
  const displaySize = isCached
    ? '(cache)'
    : request.encodedSize || request.size
    ? formatSize(request.encodedSize || request.size)
    : '—';
  const displayTime = request.duration ? formatTime(request.duration) : isPending ? '...' : '—';

  const handleClick = () => onSelect(request);
  
  const handleIntercept = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIntercept(request);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(request);
    }
  };

  return (
    <div
      role="row"
      tabIndex={0}
      className={clsx(
        'flex items-center px-2 py-1.5 cursor-pointer transition-colors duration-75 group',
        'border-b border-[var(--border-subtle)]',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-inset',
        // Selection state
        isSelected && 'bg-[var(--accent-indigo)]/10 border-l-2 border-l-[var(--accent-indigo)]',
        !isSelected && isEven && 'bg-[var(--bg-base)]',
        !isSelected && !isEven && 'bg-[var(--bg-surface)]/30',
        // Error state
        isError && !isSelected && 'bg-rose-500/5',
        // Hover
        !isSelected && 'hover:bg-[var(--bg-elevated)]'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Status */}
      <div className="w-[52px] flex justify-center px-1">
        <StatusIndicator request={request} />
      </div>

      {/* Method */}
      <div className="w-[56px] flex justify-center px-1">
        <span
          className={clsx(
            'ds-badge font-mono text-[10px]',
            request.method === 'GET' && 'indigo',
            request.method === 'POST' && 'emerald',
            request.method === 'PUT' && 'amber',
            request.method === 'PATCH' && 'cyan',
            request.method === 'DELETE' && 'rose',
            request.method === 'OPTIONS' && 'gray',
            request.method === 'WS' && 'violet',
            !['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'WS'].includes(request.method) && 'gray'
          )}
        >
          {request.method}
        </span>
      </div>

      {/* Name (expandable) */}
      <div className="flex-1 min-w-[120px] px-1.5 overflow-hidden">
        <div className="flex flex-col gap-0">
          <span
            className={clsx(
              'font-mono text-[11px] truncate',
              isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
              isError && 'text-rose-400',
              isPending && 'text-[var(--text-tertiary)]'
            )}
            title={request.url}
          >
            {displayName}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)] truncate">
            {displayHost}
          </span>
        </div>
      </div>

      {/* Type */}
      <div className="w-[65px] flex justify-center px-1">
        <span
          className={clsx(
            'ds-badge text-[9px]',
            request.type === 'xhr' && 'amber',
            request.type === 'fetch' && 'amber',
            request.type === 'document' && 'blue',
            request.type === 'script' && 'yellow',
            request.type === 'stylesheet' && 'violet',
            request.type === 'image' && 'emerald',
            request.type === 'font' && 'pink',
            request.type === 'websocket' && 'orange',
            !['xhr', 'fetch', 'document', 'script', 'stylesheet', 'image', 'font', 'websocket'].includes(request.type) && 'gray'
          )}
        >
          {request.type}
        </span>
      </div>

      {/* Size */}
      <div className="w-[65px] text-right px-1">
        <span
          className={clsx(
            'font-mono text-[11px]',
            isCached ? 'text-[var(--text-tertiary)] italic' : 'text-[var(--text-secondary)]'
          )}
        >
          {displaySize}
        </span>
      </div>

      {/* Time */}
      <div className="w-[60px] text-right px-1">
        <span
          className={clsx(
            'font-mono text-[11px]',
            request.duration && request.duration > 1000 && 'text-[var(--accent-amber)]',
            request.duration && request.duration <= 1000 && 'text-[var(--text-secondary)]',
            isPending && 'text-[var(--text-tertiary)]',
            !request.duration && !isPending && 'text-[var(--text-tertiary)]'
          )}
        >
          {displayTime}
        </span>
      </div>

      {/* Waterfall */}
      {showWaterfall && (
        <div className="w-[120px] px-1">
          <WaterfallBar
            request={request}
            maxTime={maxTime}
            startTime={startTime}
          />
        </div>
      )}

      {/* Actions */}
      <div className="w-[36px] flex justify-center">
        <button
          onClick={handleIntercept}
          className={clsx(
            'ds-icon-btn p-1',
            'opacity-0 group-hover:opacity-100 focus:opacity-100',
            'hover:bg-[var(--accent-indigo)] hover:text-white',
            'transition-all duration-100'
          )}
          title="Create intercept rule"
          tabIndex={-1}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
});

export default NetworkRequestRow;