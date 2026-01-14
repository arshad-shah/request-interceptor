/**
 * NetworkRequestRow Component
 * Individual row in the network request list
 */

import { Plus } from 'lucide-react';
import type { NetworkRequest } from '../../types/network';
import { formatSize, formatTime, getStatusClass, escapeHtml } from '../../lib/network-api';

interface NetworkRequestRowProps {
  request: NetworkRequest;
  isSelected: boolean;
  showWaterfall: boolean;
  maxTime: number;
  startTime: number | null;
  onSelect: (request: NetworkRequest) => void;
  onIntercept: (request: NetworkRequest) => void;
}

export function NetworkRequestRow({
  request,
  isSelected,
  showWaterfall,
  maxTime,
  startTime,
  onSelect,
  onIntercept,
}: NetworkRequestRowProps) {
  const statusClass = getStatusClass(request.statusCode, request.status);
  const statusText =
    request.status === 'pending'
      ? '...'
      : request.status === 'error'
      ? 'ERR'
      : request.statusCode || '-';
  const sizeText = request.fromCache
    ? '(cached)'
    : formatSize(request.encodedSize || request.size);
  const timeText = request.duration ? formatTime(request.duration) : '-';

  // Calculate waterfall bar width and offset
  const waterfallWidth = request.duration
    ? Math.max((request.duration / maxTime) * 100, 3)
    : 0;

  let waterfallOffset = 0;
  if (startTime && request.startTime && maxTime > 0) {
    const offset = request.startTime - startTime;
    const totalDuration = maxTime + offset;
    waterfallOffset = totalDuration > 0 ? (offset / totalDuration) * 100 : 0;
  }

  const isError = request.status === 'error' || (request.statusCode && request.statusCode >= 400);

  const handleIntercept = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIntercept(request);
  };

  return (
    <div
      className={`
        flex items-center py-2 px-3 border-b border-[var(--border-subtle)]
        cursor-pointer transition-all duration-[120ms] group
        ${isSelected ? 'bg-[rgba(99,102,241,0.1)] border-[var(--accent-indigo)]' : ''}
        ${isError ? 'bg-[rgba(244,63,94,0.08)]' : ''}
        hover:bg-[var(--bg-elevated)]
      `}
      onClick={() => onSelect(request)}
    >
      {/* Status */}
      <div className="w-[60px] flex justify-center">
        <span className={`ds-badge ${statusClass}`}>{statusText}</span>
      </div>

      {/* Method */}
      <div className="w-[60px] px-1">
        <span className={`ds-badge ${request.method.toLowerCase()}`}>
          {request.method}
        </span>
      </div>

      {/* Name/URL */}
      <div className="flex-1 min-w-0 px-1">
        <div className="flex flex-col gap-0.5 overflow-hidden">
          <span
            className="font-mono text-xs text-[var(--text-primary)] truncate"
            title={request.url}
          >
            {request.filename || request.pathname || request.url}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)] truncate">
            {request.hostname}
          </span>
        </div>
      </div>

      {/* Type */}
      <div className="w-[70px] px-1">
        <span className={`ds-badge ${request.type}`}>{request.type}</span>
      </div>

      {/* Size */}
      <div className="w-[70px] text-right px-1">
        <span
          className={`font-mono text-[11px] ${
            request.fromCache
              ? 'text-[var(--text-tertiary)] italic'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          {sizeText}
        </span>
      </div>

      {/* Time */}
      <div className="w-[70px] text-right px-1">
        <span
          className={`font-mono text-[11px] ${
            request.duration && request.duration > 1000
              ? 'text-[var(--accent-amber)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          {timeText}
        </span>
      </div>

      {/* Waterfall */}
      {showWaterfall && (
        <div className="w-[100px] px-1">
          <div className="ds-waterfall">
            <div
              className="ds-waterfall-fill"
              style={{
                width: `${waterfallWidth}%`,
                marginLeft: `${waterfallOffset}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Intercept Button */}
      <div className="w-[40px] flex justify-center">
        <button
          onClick={handleIntercept}
          className="
            opacity-0 group-hover:opacity-100
            ds-icon-btn
            hover:bg-[var(--accent-indigo)] hover:text-white
            transition-all duration-[120ms]
          "
          title="Intercept this request"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export default NetworkRequestRow;
