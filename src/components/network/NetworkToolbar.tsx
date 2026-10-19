/**
 * NetworkToolbar Component
 * Recording status plus panel, record, clear and HAR export actions
 */

import { clsx } from 'clsx';
import {
  Circle,
  Trash2,
  Download,
  PanelBottomClose,
  PanelRightClose,
  AlertTriangle,
} from 'lucide-react';

interface NetworkToolbarProps {
  isRecording: boolean;
  debuggerAttached: boolean;
  hasSelection: boolean;
  isBottomPanel: boolean;
  exportDisabled: boolean;
  onTogglePanelPosition: () => void;
  onToggleRecording: () => void;
  onClear: () => void;
  onExport: () => void;
}

export function NetworkToolbar({
  isRecording,
  debuggerAttached,
  hasSelection,
  isBottomPanel,
  exportDisabled,
  onTogglePanelPosition,
  onToggleRecording,
  onClear,
  onExport,
}: NetworkToolbarProps) {
  return (
    <div className="flex-none flex items-center justify-between px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
      <div className="flex items-center gap-2">
        <div className={clsx('ds-status', !isRecording && 'paused')}>
          <span className="ds-status-dot" />
          <span>{isRecording ? 'Recording' : 'Paused'}</span>
        </div>
        {/* Only warn when recording is on but debugger detached unexpectedly. */}
        {isRecording && !debuggerAttached && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)] rounded text-[11px] text-[var(--accent-amber)]">
            <AlertTriangle size={12} />
            <span>Debugger not attached</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {hasSelection && (
          <button
            onClick={onTogglePanelPosition}
            className="ds-icon-btn"
            title={`Switch to ${isBottomPanel ? 'side' : 'bottom'} panel`}
          >
            {isBottomPanel ? <PanelRightClose size={14} /> : <PanelBottomClose size={14} />}
          </button>
        )}

        <div className="w-px h-4 bg-[var(--border-subtle)] mx-1" />

        <button
          onClick={onToggleRecording}
          className={clsx('ds-icon-btn', isRecording && 'recording')}
          title={isRecording ? 'Pause Recording' : 'Resume Recording'}
        >
          <Circle size={14} fill={isRecording ? 'currentColor' : 'none'} />
        </button>

        <button
          onClick={onClear}
          className="ds-icon-btn danger"
          title="Clear Requests"
        >
          <Trash2 size={14} />
        </button>

        <button
          onClick={onExport}
          className="ds-icon-btn"
          title="Export HAR"
          disabled={exportDisabled}
        >
          <Download size={14} />
        </button>
      </div>
    </div>
  );
}
