import { describe, it, expect, beforeEach } from 'vitest';
import { useEventsStore, selectStats } from '../events-store';
import type { CapturedEvent } from '@/types/events';

const initial = useEventsStore.getState();

const makeEvent = (id: string, overrides: Partial<CapturedEvent> = {}): CapturedEvent => ({
  id,
  timestamp: 1_700_000_000_000,
  category: 'CustomEvent',
  eventType: `evt-${id}`,
  data: { id },
  target: 'window',
  stack: '',
  ...overrides,
});

const state = () => useEventsStore.getState();
const filteredIds = () => state().filteredEvents.map((e) => e.id);

beforeEach(() => {
  useEventsStore.setState(initial, true);
});

describe('events-store', () => {
  it('starts empty, unpaused and out of compare mode', () => {
    expect(state()).toMatchObject({
      events: [],
      filteredEvents: [],
      isPaused: false,
      selectedEventId: null,
      compareMode: false,
      compareEventIds: [null, null],
      filters: { search: '', category: 'all', showBookmarkedOnly: false, useRegex: false },
    });
  });

  it('setEvents replaces events and applies the current filters', () => {
    state().setFilters({ category: 'postMessage' });
    state().setEvents([makeEvent('a'), makeEvent('b', { category: 'postMessage' })]);
    expect(state().events).toHaveLength(2);
    expect(filteredIds()).toEqual(['b']);
  });

  it('addEvent appends events and keeps filteredEvents in sync', () => {
    state().addEvent(makeEvent('a'));
    state().addEvent(makeEvent('b'));
    expect(state().events.map((e) => e.id)).toEqual(['a', 'b']);
    expect(filteredIds()).toEqual(['a', 'b']);
  });

  it('caps the buffer at 1000 events, dropping the oldest first', () => {
    state().setEvents(Array.from({ length: 1000 }, (_, i) => makeEvent(`e${i}`)));
    state().addEvent(makeEvent('newest'));
    const { events, filteredEvents } = state();
    expect(events).toHaveLength(1000);
    expect(events[0].id).toBe('e1');
    expect(events.at(-1)?.id).toBe('newest');
    expect(filteredEvents).toHaveLength(1000);
  });

  it('ignores new events while paused and resumes afterwards', () => {
    state().togglePaused();
    expect(state().isPaused).toBe(true);
    state().addEvent(makeEvent('dropped'));
    expect(state().events).toEqual([]);

    state().togglePaused();
    state().addEvent(makeEvent('kept'));
    expect(state().events.map((e) => e.id)).toEqual(['kept']);
  });

  describe('search', () => {
    beforeEach(() => {
      state().setEvents([
        makeEvent('a', { eventType: 'user:login', data: { name: 'Alice' }, target: 'window' }),
        makeEvent('b', { eventType: 'cart:add', data: { sku: 'X-1' }, target: 'document' }),
        makeEvent('c', { eventType: 'cart:remove', data: { sku: 'Y-2' }, target: 'iframe#pay' }),
      ]);
    });

    it('matches event type, payload and target case-insensitively', () => {
      state().setFilters({ search: 'CART' });
      expect(filteredIds()).toEqual(['b', 'c']);
      state().setFilters({ search: 'alice' });
      expect(filteredIds()).toEqual(['a']);
      state().setFilters({ search: 'iframe' });
      expect(filteredIds()).toEqual(['c']);
      state().setFilters({ search: 'nothing-matches' });
      expect(filteredIds()).toEqual([]);
    });

    it('supports regex mode across event type and payload', () => {
      state().setFilters({ useRegex: true, search: '^cart:(add|remove)$' });
      expect(filteredIds()).toEqual(['b', 'c']);
      state().setFilters({ search: 'X-\\d' });
      expect(filteredIds()).toEqual(['b']);
    });

    it('treats an invalid regex as matching nothing instead of throwing', () => {
      state().setFilters({ useRegex: true, search: '(' });
      expect(filteredIds()).toEqual([]);
    });

    it('restores every event when the search is cleared', () => {
      state().setFilters({ search: 'login' });
      state().setFilters({ search: '' });
      expect(filteredIds()).toEqual(['a', 'b', 'c']);
    });
  });

  it('filters by category and combines it with search', () => {
    state().setEvents([
      makeEvent('a', { category: 'CustomEvent', eventType: 'ping' }),
      makeEvent('b', { category: 'postMessage', eventType: 'ping' }),
      makeEvent('c', { category: 'postMessage', eventType: 'pong' }),
    ]);
    state().setFilters({ category: 'postMessage' });
    expect(filteredIds()).toEqual(['b', 'c']);
    state().setFilters({ search: 'ping' });
    expect(filteredIds()).toEqual(['b']);
    expect(state().filters).toMatchObject({ category: 'postMessage', search: 'ping' });
  });

  it('toggles bookmarks and filters to bookmarked events only', () => {
    state().setEvents([makeEvent('a'), makeEvent('b')]);
    state().toggleBookmark('b');
    expect(state().events.find((e) => e.id === 'b')?.bookmarked).toBe(true);

    state().setFilters({ showBookmarkedOnly: true });
    expect(filteredIds()).toEqual(['b']);

    state().toggleBookmark('b');
    expect(filteredIds()).toEqual([]);
    state().toggleBookmark('a');
    expect(filteredIds()).toEqual(['a']);
  });

  it('tracks the selected event', () => {
    state().setSelectedEventId('a');
    expect(state().selectedEventId).toBe('a');
    state().setSelectedEventId(null);
    expect(state().selectedEventId).toBeNull();
  });

  it('fills compare slots and resets them whenever compare mode changes', () => {
    state().setCompareMode(true);
    state().setCompareEvent(0, 'a');
    state().setCompareEvent(1, 'b');
    expect(state().compareEventIds).toEqual(['a', 'b']);

    state().setCompareEvent(0, null);
    expect(state().compareEventIds).toEqual([null, 'b']);

    state().setCompareMode(false);
    expect(state()).toMatchObject({ compareMode: false, compareEventIds: [null, null] });
  });

  it('clearEvents empties the buffer and the selection but keeps filters', () => {
    state().setFilters({ category: 'System' });
    state().setEvents([makeEvent('a', { category: 'System' })]);
    state().setSelectedEventId('a');
    state().clearEvents();
    expect(state()).toMatchObject({ events: [], filteredEvents: [], selectedEventId: null });
    expect(state().filters.category).toBe('System');
  });

  it('selectStats counts events per category over the unfiltered buffer', () => {
    state().setEvents([
      makeEvent('a', { category: 'CustomEvent' }),
      makeEvent('b', { category: 'CustomEvent' }),
      makeEvent('c', { category: 'postMessage' }),
      makeEvent('d', { category: 'EventEmitter' }),
      makeEvent('e', { category: 'System' }),
    ]);
    state().setFilters({ category: 'postMessage' });
    expect(selectStats(state())).toEqual({ total: 5, custom: 2, messages: 1, emitter: 1 });
  });
});
