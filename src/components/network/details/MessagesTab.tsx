/**
 * Messages tab: WebSocket frames with direction filter, search and a detail pane
 */

import { useMemo } from 'react';
import { clsx } from 'clsx';
import { X, Copy, Search, ArrowUp, ArrowDown, MessageSquare } from 'lucide-react';
import type { NetworkRequest, WebSocketFrame } from '../../../types/network';
import { formatSize } from '../../../lib/network-api';
import { JsonTreeViewer } from '../../common/JsonTreeViewer';
import Input from '@/components/ui/Input';
import { CodeBlock, CopyButton, EmptyState } from '../components';
import type { CopyHandler } from './types';

export type WsDirectionFilter = 'all' | 'sent' | 'received';

interface MessagesTabProps {
  request: NetworkRequest;
  wsFilter: WsDirectionFilter;
  setWsFilter: (filter: WsDirectionFilter) => void;
  wsSearch: string;
  setWsSearch: (search: string) => void;
  selectedFrame: WebSocketFrame | null;
  setSelectedFrame: (frame: WebSocketFrame | null) => void;
  handleCopy: CopyHandler;
}

function formatFrameTime(timestamp: number) {
  const date = new Date(timestamp);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

function formatFrameData(data: string) {
  // Try to parse as JSON for pretty display
  try {
    const parsed = JSON.parse(data);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return data;
  }
}

function isJson(data: string) {
  try {
    JSON.parse(data);
    return true;
  } catch {
    return false;
  }
}

export function MessagesTab({
  request,
  wsFilter,
  setWsFilter,
  wsSearch,
  setWsSearch,
  selectedFrame,
  setSelectedFrame,
  handleCopy,
}: MessagesTabProps) {
  const filteredFrames = useMemo(() => {
    if (!request.wsFrames) return [];
    
    let frames = request.wsFrames;
    
    // Filter by direction
    if (wsFilter !== 'all') {
      frames = frames.filter(f => f.type === wsFilter);
    }
    
    // Filter by search
    if (wsSearch) {
      const search = wsSearch.toLowerCase();
      frames = frames.filter(f => f.data.toLowerCase().includes(search));
    }
    
    return frames;
  }, [request.wsFrames, wsFilter, wsSearch]);

  const frames = request.wsFrames || [];
  
  if (frames.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare size={32} />}
        title="No messages yet"
        description="WebSocket messages will appear here once sent or received"
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex-shrink-0">
        {/* Direction filter */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWsFilter('all')}
            className={clsx('ds-filter-tab', wsFilter === 'all' && 'active')}
          >
            All
            <span className="ds-badge gray text-[9px] ml-1">{frames.length}</span>
          </button>
          <button
            onClick={() => setWsFilter('sent')}
            className={clsx('ds-filter-tab', wsFilter === 'sent' && 'active')}
          >
            <ArrowUp size={10} className="text-emerald-500" />
            Sent
            <span className="ds-badge gray text-[9px] ml-1">
              {frames.filter(f => f.type === 'sent').length}
            </span>
          </button>
          <button
            onClick={() => setWsFilter('received')}
            className={clsx('ds-filter-tab', wsFilter === 'received' && 'active')}
          >
            <ArrowDown size={10} className="text-rose-500" />
            Received
            <span className="ds-badge gray text-[9px] ml-1">
              {frames.filter(f => f.type === 'received').length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[180px] max-w-[300px]">
          <Input
            size="sm"
            value={wsSearch}
            onChange={(e) => setWsSearch(e.target.value)}
            placeholder="Filter messages..."
            leftIcon={<Search />}
            clearable
            onClear={() => setWsSearch('')}
          />
        </div>

        {/* Stats */}
        <div className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-3 ml-auto">
          <span className="flex items-center gap-1">
            <ArrowUp size={11} className="text-emerald-500" />
            {formatSize(request.wsSentSize || 0)}
          </span>
          <span className="flex items-center gap-1">
            <ArrowDown size={11} className="text-rose-500" />
            {formatSize(request.wsReceivedSize || 0)}
          </span>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 flex overflow-hidden">
        {/* Message list */}
        <div className={clsx(
          'overflow-y-auto min-w-0',
          selectedFrame ? 'w-2/5 flex-shrink-0' : 'flex-1'
        )}>
          {filteredFrames.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[var(--text-tertiary)] text-sm p-4">
              No messages match your filter
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {filteredFrames.map((frame, index) => {
                const isSent = frame.type === 'sent';
                const isSelected = selectedFrame === frame;
                
                return (
                  <div
                    key={`${frame.timestamp}-${index}`}
                    onClick={() => setSelectedFrame(isSelected ? null : frame)}
                    className={clsx(
                      'group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
                      'hover:bg-[var(--bg-elevated)]',
                      isSelected && 'bg-[var(--accent-indigo)]/10 border-l-2 border-l-[var(--accent-indigo)]',
                      !isSelected && (isSent ? 'bg-emerald-500/5' : 'bg-rose-500/5')
                    )}
                  >
                    {/* Direction icon */}
                    <div className={clsx(
                      'flex-shrink-0 p-1.5 rounded-md',
                      isSent ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                    )}>
                      {isSent ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
                          {formatFrameTime(frame.timestamp)}
                        </span>
                        <span className={clsx(
                          'ds-badge text-[9px]',
                          frame.opcode === 1 ? 'blue' : 'violet'
                        )}>
                          {frame.opcode === 1 ? 'text' : 'binary'}
                        </span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">
                          {formatSize(frame.length)}
                        </span>
                        {isJson(frame.data) && (
                          <span className="ds-badge amber text-[9px]">JSON</span>
                        )}
                      </div>
                      <div className={clsx(
                        'font-mono text-[12px] break-all leading-relaxed',
                        isSent ? 'text-emerald-400' : 'text-rose-400',
                        !isSelected && 'line-clamp-2'
                      )}>
                        {isSelected ? formatFrameData(frame.data) : frame.data}
                      </div>
                    </div>

                    {/* Copy button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(frame.data, 'Message');
                      }}
                      className="ds-icon-btn flex-shrink-0 opacity-0 group-hover:opacity-100"
                      title="Copy message"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected frame detail panel */}
        {selectedFrame && (
          <div className="w-3/5 border-l border-[var(--border-subtle)] flex flex-col bg-[var(--bg-base)]">
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <span className={clsx(
                  'ds-badge',
                  selectedFrame.type === 'sent' ? 'emerald' : 'rose'
                )}>
                  {selectedFrame.type === 'sent' ? 'Sent' : 'Received'}
                </span>
                <span className="text-[12px] text-[var(--text-tertiary)] font-mono">
                  {formatFrameTime(selectedFrame.timestamp)}
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {formatSize(selectedFrame.length)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CopyButton text={selectedFrame.data} title="Copy" />
                <button
                  onClick={() => setSelectedFrame(null)}
                  className="ds-icon-btn"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {isJson(selectedFrame.data) ? (
                <JsonTreeViewer 
                  data={selectedFrame.data} 
                  maxHeight={600}
                  searchable
                />
              ) : (
                <CodeBlock
                  content={selectedFrame.data}
                  language="text"
                  maxHeight={600}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
