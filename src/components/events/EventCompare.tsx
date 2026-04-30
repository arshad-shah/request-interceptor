import React from 'react';
import { X } from 'lucide-react';
import { useEventsStore } from '@/stores/events-store';
import EventPayload from './EventPayload';

const EventCompare: React.FC = () => {
  const { compareEventIds, events, setCompareMode } = useEventsStore();

  const event1 = events.find(e => e.id === compareEventIds[0]);
  const event2 = events.find(e => e.id === compareEventIds[1]);

  if (!event1 || !event2) {
    return (
      <div className="p-4 text-center text-[var(--text-tertiary)] text-[13px]">
        {!event1 && !event2
          ? 'Click two events to compare them'
          : `Select ${!event2 ? 'second' : 'first'} event to compare`
        }
      </div>
    );
  }

  return (
    <div className="ds-modal-backdrop" onClick={() => setCompareMode(false)}>
      <div className="ds-modal" style={{ maxWidth: '90%', maxHeight: '80%' }} onClick={e => e.stopPropagation()}>
        <div className="ds-modal-header">
          <span className="ds-modal-title">Compare Events</span>
          <button className="ds-icon-btn" onClick={() => setCompareMode(false)}><X size={16} /></button>
        </div>
        <div className="ds-modal-body overflow-auto" style={{ maxHeight: '60vh' }}>
          <div className="grid grid-cols-2 gap-3">
            {[event1, event2].map((evt, i) => (
              <div key={i}>
                <div className="text-[11px] font-semibold text-[var(--text-primary)] mb-1">
                  {evt.eventType}
                </div>
                <div className="text-[10px] text-[var(--text-tertiary)] mb-2">
                  {evt.category} &middot; {new Date(evt.timestamp).toLocaleTimeString()}
                </div>
                <EventPayload data={evt.data} compact />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCompare;
