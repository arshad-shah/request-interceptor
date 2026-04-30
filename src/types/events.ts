export type EventCategory = 'CustomEvent' | 'postMessage' | 'EventEmitter' | 'System';

export interface CapturedEvent {
  id: string;
  timestamp: number;
  category: EventCategory;
  eventType: string;
  data: unknown;
  target: string;
  stack: string;
  tabUrl?: string;
  bookmarked?: boolean;
}

export interface EventsFilterState {
  search: string;
  category: 'all' | EventCategory;
  showBookmarkedOnly: boolean;
  useRegex: boolean;
}
