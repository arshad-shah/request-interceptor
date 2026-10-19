/**
 * Details panel header: method/status badges, URL and quick stats
 */

import { clsx } from 'clsx';
import { X, Clock, Database, FileJson } from 'lucide-react';
import type { NetworkRequest } from '../../../types/network';
import { getStatusClass, getStatusText, formatSize, formatTime } from '../../../lib/network-api';

interface DetailsHeaderProps {
  request: NetworkRequest;
  onClose: () => void;
}

export function DetailsHeader({ request, onClose }: DetailsHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 p-4 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
      <div className="flex-1 min-w-0">
        {/* Badges row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="ds-badge indigo font-mono text-[11px]">
            {request.method}
          </span>
          {request.statusCode && (
            <span className={clsx('ds-badge', getStatusClass(request.statusCode, request.status))}>
              {request.statusCode} {getStatusText(request.statusCode)}
            </span>
          )}
          {request.fromCache && (
            <span className="ds-badge gray text-[10px]">cached</span>
          )}
          {request.protocol && (
            <span className="ds-badge gray text-[10px]">{request.protocol}</span>
          )}
        </div>

        {/* URL */}
        <div
          className="font-mono text-[11px] text-[var(--text-tertiary)] break-all leading-relaxed"
          title={request.url}
        >
          {request.url}
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 mt-2 text-[10px] text-[var(--text-tertiary)]">
          {request.duration !== undefined && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatTime(request.duration)}
            </span>
          )}
          {request.encodedSize !== undefined && (
            <span className="flex items-center gap-1">
              <Database size={10} />
              {formatSize(request.encodedSize)}
            </span>
          )}
          {request.type && (
            <span className="flex items-center gap-1">
              <FileJson size={10} />
              {request.type}
            </span>
          )}
        </div>
      </div>

      {/* Header actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onClose} className="ds-icon-btn" title="Close (Esc)">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
