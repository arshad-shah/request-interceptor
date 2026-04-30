import React, { useEffect, useRef, useCallback } from 'react';
import { Pause, Play, Download, Trash2, Radio } from 'lucide-react';
import { useEventsStore, selectStats } from '@/stores/events-store';
import { useAppStore } from '@/stores/app-store';
import Toggle from '@/components/ui/Toggle';
import EmptyState from '@/components/common/EmptyState';
import EventFilters from './EventFilters';
import EventCard from './EventCard';
import EventCompare from './EventCompare';

// Stable reference to store actions (never changes)
const storeActions = () => useEventsStore.getState();

const EventsTab: React.FC = () => {
  // Subscribe to individual state slices for proper reactivity
  const filteredEvents = useEventsStore(s => s.filteredEvents);
  const isPaused = useEventsStore(s => s.isPaused);
  const selectedEventId = useEventsStore(s => s.selectedEventId);
  const compareMode = useEventsStore(s => s.compareMode);
  const stats = useEventsStore(selectStats);

  const enabled = useAppStore(s => s.enabled);
  const eventMonitorEnabled = useAppStore(s => s.eventMonitorEnabled);
  const setEventMonitorEnabled = useAppStore(s => s.setEventMonitorEnabled);

  const listRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef(true);

  // Toggle event monitoring on/off — persist to background (broadcasts to all tabs)
  const handleToggleMonitor = useCallback((on: boolean) => {
    setEventMonitorEnabled(on);
    chrome.runtime.sendMessage({ action: 'setEventMonitorEnabled', enabled: on });
  }, [setEventMonitorEnabled]);

  // When master toggle turns off, disable event monitor
  useEffect(() => {
    if (!enabled && eventMonitorEnabled) {
      handleToggleMonitor(false);
    }
  }, [enabled, eventMonitorEnabled, handleToggleMonitor]);

  // Load events from background on mount
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      chrome.runtime.sendMessage({ type: 'GET_EVENTS', tabId }, (response) => {
        if (response?.events) {
          storeActions().setEvents(response.events);
        }
      });
    });

    // Listen for new events from background
    const listener = (message: { type: string; event?: any }) => {
      if (message.type === 'NEW_EVENT' && message.event) {
        storeActions().addEvent(message.event);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

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

  const handleExport = useCallback(() => {
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
  }, []);

  const handleClear = useCallback(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      chrome.runtime.sendMessage({ type: 'CLEAR_EVENTS', tabId }, () => {
        storeActions().clearEvents();
      });
    });
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-[var(--accent-indigo)]" />
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">Events</span>
          <div className={`ds-status ${!eventMonitorEnabled ? 'paused' : isPaused ? 'paused' : ''}`}>
            <div className="ds-status-dot" />
            {!eventMonitorEnabled ? 'Disabled' : isPaused ? 'Paused' : 'Monitoring'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Toggle
            checked={eventMonitorEnabled}
            onChange={handleToggleMonitor}
            disabled={!enabled}
            size="sm"
            label="Toggle event monitoring"
            activeColor="indigo"
          />
          <div className="w-px h-4 bg-[var(--border-subtle)]" />
          <button className="ds-icon-btn sm" onClick={() => storeActions().togglePaused()} title={isPaused ? 'Resume' : 'Pause'} disabled={!eventMonitorEnabled}>
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

      {!eventMonitorEnabled ? (
        <EmptyState
          icon={<Radio size={24} />}
          title="Event Monitor Disabled"
          description={enabled
            ? 'Enable the event monitor to capture CustomEvents, postMessage, and EventEmitter patterns.'
            : 'Enable the main extension first, then toggle event monitoring.'}
        />
      ) : (
        <>
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
              <EmptyState
                icon={<Radio size={24} />}
                title="No Events Captured"
                description="Events will appear here as they are dispatched on the page."
              />
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
        </>
      )}
    </div>
  );
};

export default EventsTab;
