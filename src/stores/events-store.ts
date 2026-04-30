import { create } from 'zustand';
import { CapturedEvent, EventsFilterState, EventCategory } from '@/types/events';

interface EventsStore {
  events: CapturedEvent[];
  filteredEvents: CapturedEvent[];
  filters: EventsFilterState;
  isPaused: boolean;
  selectedEventId: string | null;
  compareEventIds: [string | null, string | null];
  compareMode: boolean;

  // Actions
  setEvents: (events: CapturedEvent[]) => void;
  addEvent: (event: CapturedEvent) => void;
  clearEvents: () => void;
  setFilters: (filters: Partial<EventsFilterState>) => void;
  togglePaused: () => void;
  setSelectedEventId: (id: string | null) => void;
  toggleBookmark: (id: string) => void;
  setCompareMode: (on: boolean) => void;
  setCompareEvent: (slot: 0 | 1, id: string | null) => void;
}

const MAX_EVENTS = 1000;

function applyFilters(events: CapturedEvent[], filters: EventsFilterState): CapturedEvent[] {
  return events.filter(event => {
    if (filters.category !== 'all' && event.category !== filters.category) return false;
    if (filters.showBookmarkedOnly && !event.bookmarked) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (filters.useRegex) {
        try {
          const regex = new RegExp(filters.search, 'i');
          return regex.test(event.eventType) || regex.test(JSON.stringify(event.data));
        } catch {
          return false;
        }
      }
      const matchType = event.eventType.toLowerCase().includes(searchLower);
      const matchData = JSON.stringify(event.data).toLowerCase().includes(searchLower);
      const matchTarget = event.target.toLowerCase().includes(searchLower);
      if (!matchType && !matchData && !matchTarget) return false;
    }
    return true;
  });
}

export const useEventsStore = create<EventsStore>((set, get) => ({
  events: [],
  filteredEvents: [],
  filters: {
    search: '',
    category: 'all',
    showBookmarkedOnly: false,
    useRegex: false,
  },
  isPaused: false,
  selectedEventId: null,
  compareEventIds: [null, null],
  compareMode: false,

  setEvents: (events) => {
    const { filters } = get();
    set({ events, filteredEvents: applyFilters(events, filters) });
  },

  addEvent: (event) => {
    if (get().isPaused) return;
    set(state => {
      const newEvents = [...state.events, event];
      if (newEvents.length > MAX_EVENTS) newEvents.splice(0, newEvents.length - MAX_EVENTS);
      return {
        events: newEvents,
        filteredEvents: applyFilters(newEvents, state.filters),
      };
    });
  },

  clearEvents: () => set({ events: [], filteredEvents: [], selectedEventId: null }),

  setFilters: (partial) => {
    set(state => {
      const filters = { ...state.filters, ...partial };
      return { filters, filteredEvents: applyFilters(state.events, filters) };
    });
  },

  togglePaused: () => set(state => ({ isPaused: !state.isPaused })),

  setSelectedEventId: (id) => set({ selectedEventId: id }),

  toggleBookmark: (id) => {
    set(state => {
      const events = state.events.map(e =>
        e.id === id ? { ...e, bookmarked: !e.bookmarked } : e
      );
      return { events, filteredEvents: applyFilters(events, state.filters) };
    });
  },

  setCompareMode: (on) => set({ compareMode: on, compareEventIds: [null, null] }),

  setCompareEvent: (slot, id) => {
    set(state => {
      const ids = [...state.compareEventIds] as [string | null, string | null];
      ids[slot] = id;
      return { compareEventIds: ids };
    });
  },
}));

/** Derive stats from events array — use as a selector: useEventsStore(selectStats) */
export function selectStats(state: { events: CapturedEvent[] }) {
  const counts: Record<EventCategory | 'total', number> = {
    total: state.events.length,
    CustomEvent: 0,
    postMessage: 0,
    EventEmitter: 0,
    System: 0,
  };
  state.events.forEach(e => { counts[e.category]++; });
  return {
    total: counts.total,
    custom: counts.CustomEvent,
    messages: counts.postMessage,
    emitter: counts.EventEmitter,
  };
}
