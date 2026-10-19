/**
 * Service worker composition root: one message router shared by every
 * background module.
 */
import { MessageRouter } from './core/messaging/router';
import { networkManager } from './lib/network-background';
import { logger } from './lib/logger';
import { StateStore } from './sw/state';
import { EventBuffer } from './sw/events';
import { registerStorageHandlers } from './sw/storage';

const log = logger.child('background');

const state = new StateStore();
const router = new MessageRouter({
  ready: state.ready,
  onError: (type, error) => log.warn('Request failed', { type, error: String(error) }),
});

state.register(router);
new EventBuffer().register(router);
registerStorageHandlers(router);
networkManager.register(router);
router.listen();

// Content scripts ask for state when they load; re-send after navigations
// complete so pages that loaded during a service-worker restart catch up.
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && /^https?:/.test(tab.url ?? '')) state.sendToTab(tabId);
});

chrome.runtime.onInstalled.addListener(({ reason }) => log.info('Installed/updated', { reason }));

self.addEventListener('unhandledrejection', (event) => {
  log.error('Unhandled rejection', { reason: String((event as PromiseRejectionEvent).reason) });
});
self.addEventListener('error', (event) => {
  log.error('Uncaught error', { message: (event as ErrorEvent).message });
});
