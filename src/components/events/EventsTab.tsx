import React, { useEffect, useRef } from 'react';
import { Pause, Play, Download, Trash2, Radio } from 'lucide-react';
import { useEventsStore } from '@/stores/events-store';
import EventFilters from './EventFilters';
import EventCard from './EventCard';
import EventCompare from './EventCompare';

const EventsTab: React.FC = () => {
  const {
    filteredEvents, isPaused, selectedEventId, compareMode,
    togglePaused, clearEvents, getStats, setEvents, addEvent,
  } = useEventsStore();
  const listRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef(true);

  // Load events from background on mount
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      chrome.runtime.sendMessage({ type: 'GET_EVENTS', tabId }, (response) => {
        if (response?.events) {
          setEvents(response.events);
        }
      });
    });

    // Listen for new events from background
    const listener = (message: { type: string; event?: any }) => {
      if (message.type === 'NEW_EVENT' && message.event) {
        addEvent(message.event);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [setEvents, addEvent]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [filteredEvents.length]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    autoScroll.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  const handleExport = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      chrome.runtime.sendMessage({ type: 'EXPORT_EVENTS', tabId }, (response) => {
        if (response?.events) {
          const blob = new Blob([JSON.stringify(response.events, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `events-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    });
  };

  const handleClear = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      chrome.runtime.sendMessage({ type: 'CLEAR_EVENTS', tabId }, () => {
        clearEvents();
      });
    });
  };

  const stats = getStats();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-[var(--accent-indigo)]" />
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">Events</span>
          <div className={`ds-status ${isPaused ? 'paused' : ''}`}>
            <div className="ds-status-dot" />
            {isPaused ? 'Paused' : 'Monitoring'}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="ds-icon-btn sm" onClick={togglePaused} title={isPaused ? 'Resume' : 'Pause'}>
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button className="ds-icon-btn sm" onClick={handleExport} title="Export events">
            <Download size={14} />
          </button>
          <button className="ds-icon-btn sm danger" onClick={handleClear} title="Clear events">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 p-2 border-b border-[var(--border-subtle)]">
        {[
          { label: 'Total', value: stats.total, color: 'var(--text-primary)' },
          { label: 'Custom', value: stats.custom, color: 'var(--accent-indigo)' },
          { label: 'Messages', value: stats.messages, color: 'var(--accent-cyan)' },
          { label: 'Emitter', value: stats.emitter, color: 'var(--accent-emerald)' },
        ].map(s => (
          <div key={s.label} className="ds-stat-card compact">
            <span className="ds-stat-value" style={{ color: s.color }}>{s.value}</span>
            <span className="ds-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <EventFilters />

      {/* Event List */}
      <div
        ref={listRef}
        className="flex-1 overflow-auto p-2"
        onScroll={handleScroll}
      >
        {filteredEvents.length === 0 ? (
          <div className="ds-empty-state">
            <div className="ds-empty-icon">
              <Radio size={24} />
            </div>
            <div className="ds-empty-title">No Events Captured</div>
            <div className="ds-empty-text">
              Events will appear here as they are dispatched on the page.
            </div>
          </div>
        ) : (
          filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              isSelected={selectedEventId === event.id}
            />
          ))
        )}
      </div>

      {/* Compare modal */}
      {compareMode && <EventCompare />}
    </div>
  );
};

export default EventsTab;
