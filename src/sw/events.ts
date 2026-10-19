/** Per-tab, in-memory buffer of events captured by the page event monitor. */
import type { CapturedEvent } from '@/types/events';
import type { MessageRouter } from '@/core/messaging/router';
import { emit } from '@/lib/messaging';

const MAX_EVENTS_PER_TAB = 1000;

export class EventBuffer {
  private tabs = new Map<number, CapturedEvent[]>();

  constructor() {
    chrome.tabs.onRemoved.addListener((tabId) => this.tabs.delete(tabId));
    chrome.tabs.onUpdated.addListener((tabId, info) => {
      if (info.status === 'loading') this.tabs.delete(tabId);
    });
  }

  record(tabId: number, event: CapturedEvent, tabUrl: string): void {
    let events = this.tabs.get(tabId);
    if (!events) this.tabs.set(tabId, (events = []));
    events.push({ ...event, tabUrl } as CapturedEvent);
    if (events.length > MAX_EVENTS_PER_TAB) events.splice(0, events.length - MAX_EVENTS_PER_TAB);
    emit('EVENT_RECORDED', { tabId, event });
  }

  register(router: MessageRouter): void {
    router
      .on('EVENT_CAPTURED', ({ event, tabUrl }, sender) => {
        if (sender.tab?.id !== undefined) this.record(sender.tab.id, event, tabUrl);
      }, { from: 'content' })
      .on('GET_EVENTS', ({ tabId }) => this.tabs.get(tabId) ?? [])
      .on('CLEAR_EVENTS', ({ tabId }) => void this.tabs.delete(tabId));
  }
}
