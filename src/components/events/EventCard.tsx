import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Bookmark, Clock, Code, Layers } from 'lucide-react';
import { CapturedEvent } from '@/types/events';
import { useEventsStore } from '@/stores/events-store';
import EventPayload from './EventPayload';
import { CodeEditor } from '@/components/common/code-editor';

const CATEGORY_COLORS: Record<string, string> = {
  CustomEvent: 'var(--accent-indigo)',
  postMessage: 'var(--accent-cyan)',
  EventEmitter: 'var(--accent-emerald)',
  System: 'var(--accent-amber)',
};

interface EventCardProps {
  event: CapturedEvent;
  isSelected: boolean;
}

const EventCard: React.FC<EventCardProps> = ({ event, isSelected }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'smart' | 'raw' | 'stack'>('smart');
  const { toggleBookmark, setSelectedEventId, compareMode, setCompareEvent, compareEventIds } = useEventsStore();

  const color = CATEGORY_COLORS[event.category] || 'var(--text-tertiary)';
  const time = new Date(event.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions);

  const handleClick = () => {
    if (compareMode) {
      if (!compareEventIds[0]) {
        setCompareEvent(0, event.id);
      } else if (!compareEventIds[1]) {
        setCompareEvent(1, event.id);
      }
      return;
    }
    setExpanded(!expanded);
    setSelectedEventId(expanded ? null : event.id);
  };

  const isCompareSelected = compareEventIds.includes(event.id);

  return (
    <div
      className={`ds-list-item ${expanded ? 'expanded' : ''} ${isSelected ? 'border-[var(--accent-indigo)]' : ''} ${isCompareSelected ? 'border-[var(--accent-amber)]' : ''}`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 p-2.5 cursor-pointer select-none"
        onClick={handleClick}
      >
        <div
          className="ds-list-item-indicator"
          style={{ backgroundColor: color }}
        />
        <button className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span className="ds-badge" style={{ background: `${color}20`, color }}>{event.category}</span>
        <span className="text-[13px] font-medium text-[var(--text-primary)] truncate flex-1">
          {event.eventType}
        </span>
        <span className="text-[10px] text-[var(--text-tertiary)] font-mono whitespace-nowrap flex items-center gap-1">
          <Clock size={10} />
          {time}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); toggleBookmark(event.id); }}
          className={`p-1 rounded transition-colors ${event.bookmarked ? 'text-[var(--accent-amber)]' : 'text-[var(--text-tertiary)] hover:text-[var(--accent-amber)]'}`}
          title="Bookmark"
        >
          <Bookmark size={12} fill={event.bookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-3">
          {/* Metadata */}
          <div className="flex flex-wrap gap-3 mb-3 text-[11px] text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1">
              <Layers size={10} /> Target: <span className="text-[var(--text-secondary)]">{event.target}</span>
            </span>
          </div>

          {/* Tabs */}
          <div className="ds-tabs mb-3">
            <button
              className={`ds-tab ${activeTab === 'smart' ? 'active' : ''}`}
              onClick={() => setActiveTab('smart')}
            >
              <Code size={10} className="inline mr-1" /> Smart
            </button>
            <button
              className={`ds-tab ${activeTab === 'raw' ? 'active' : ''}`}
              onClick={() => setActiveTab('raw')}
            >
              Raw
            </button>
            <button
              className={`ds-tab ${activeTab === 'stack' ? 'active' : ''}`}
              onClick={() => setActiveTab('stack')}
            >
              Stack
            </button>
          </div>

          {activeTab === 'smart' && <EventPayload data={event.data} />}
          {activeTab === 'raw' && (
            <CodeEditor
              value={JSON.stringify(event.data, null, 2)}
              language="json"
              readOnly
              height={250}
              showGutter={false}
              fontSize={12}
            />
          )}
          {activeTab === 'stack' && (
            <CodeEditor
              value={event.stack || 'No stack trace available'}
              language="text"
              readOnly
              height={180}
              showGutter={false}
              fontSize={12}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default EventCard;
