// Background script for Request Interceptor Chrome Extension

import { networkManager } from './lib/network-background';
import { isWebSocketRoute, isInjectionRoute } from './core/route-keys';
import { validateHttpConfig, validateWebSocketConfig, validateInjectionConfig } from './core/route-validation';
import { migrateRoutes } from './core/route-migration';
import { exportRoutes } from './core/route-export';
import { findConflictingRoutes } from './core/route-conflicts';

console.log('[Background] Network manager initialized:', !!networkManager);

// ---- Events storage (per tab, in-memory) ----
const MAX_EVENTS = 1000;
const tabEvents = new Map<number, any[]>();

interface AppState {
  enabled: boolean;
  routes: Record<string, any>;
}

interface ChromeMessage {
  action: string;
  [key: string]: any;
}

class StateManager {
  private state: AppState = {
    enabled: false,
    routes: {}
  };

  constructor() {
    this.loadState();
    this.setupMessageHandlers();
    this.setupTabHandlers();
  }

  async loadState(): Promise<void> {
    try {
      const storedState = await chrome.storage.local.get(['enabled', 'routes']);
      this.state.enabled = storedState.enabled || false;
      this.state.routes = storedState.routes || {};

      const { routes, changed } = migrateRoutes(this.state.routes);
      if (changed) {
        this.state.routes = routes;
        this.saveState();
        console.log('[Background] Migrated routes');
      }

      this.updateIcon();
      console.log('[Background] State loaded:', this.state);
    } catch (error) {
      console.error('[Background] Error loading state:', error);
    }
  }

  async saveState(): Promise<void> {
    try {
      await chrome.storage.local.set(this.state);
      console.log('[Background] State saved:', this.state);
    } catch (error) {
      console.error('[Background] Error saving state:', error);
    }
  }

  updateIcon(): void {
    const iconPath = this.state.enabled
      ? { '16': 'icons/icon-16.png', '48': 'icons/icon-48.png', '128': 'icons/icon-128.png' }
      : { '16': 'icons/icon-16-disabled.png', '48': 'icons/icon-48-disabled.png', '128': 'icons/icon-128-disabled.png' };

    chrome.action.setIcon({ path: iconPath }).catch(() => {
      chrome.action.setIcon({
        path: this.state.enabled ? 'icons/icon-128.png' : 'icons/icon-128-disabled.png'
      });
    });
  }

  notifyAllTabs(message: ChromeMessage): void {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {
            console.log(`[Background] Could not send message to tab ${tab.id}`);
          });
        }
      });
    });
  }

  notifyExtensionUIs(message: ChromeMessage): void {
    try {
      chrome.runtime.sendMessage(message).catch(() => {
        console.log('[Background] Could not send message to extension UIs (may be closed)');
      });
    } catch (error) {
      console.log('[Background] Error sending message to extension UIs:', error);
    }
  }

  notifyAll(message: ChromeMessage): void {
    this.notifyAllTabs(message);
    this.notifyExtensionUIs(message);
  }

  setupMessageHandlers(): void {
    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }

  setupTabHandlers(): void {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        chrome.tabs.sendMessage(tabId, {
          action: 'stateChanged',
          enabled: this.state.enabled,
          routes: this.state.routes
        }).catch(() => {
          console.log(`[Background] Could not send initial state to tab ${tabId}`);
        });
      }
    });
  }

  async handleMessage(
    message: ChromeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      console.log('[Background] Received message:', message.action || message.type, message);

      // Handle type-based messages (events + storage)
      if (message.type) {
        this.handleTypedMessage(message, sender, sendResponse);
        return;
      }

      switch (message.action) {
        case 'getState':
          sendResponse(this.state);
          break;
        case 'toggleEnabled':
          await this.toggleEnabled(message.enabled);
          sendResponse({ success: true });
          break;
        case 'addRoute': {
          const isUpdate = await this.addRoute(message.route, message.config, message.name);
          sendResponse({ success: true, isUpdate });
          break;
        }
        case 'removeRoute':
          await this.removeRoute(message.route);
          sendResponse({ success: true });
          break;
        case 'toggleRoute':
          await this.toggleRoute(message.route, message.enabled);
          sendResponse({ success: true });
          break;
        case 'clearRoutes':
          await this.clearRoutes();
          sendResponse({ success: true });
          break;
        case 'exportRoutes': {
          const exportData = exportRoutes(this.state.routes as any);
          sendResponse({ success: true, data: exportData });
          break;
        }
        case 'openSidePanel':
          await this.openSidePanel();
          sendResponse({ success: true });
          break;
        default:
          console.warn('[Background] Unknown action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[Background] Error handling message:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  handleTypedMessage(
    message: ChromeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): void {
    const tabId = sender.tab?.id || message.tabId;

    switch (message.type) {
      // ---- Events ----
      case 'EVENT_CAPTURED': {
        if (!sender.tab?.id) {
          console.log('[EVT-4] background:store SKIPPED — no sender tab id');
          break;
        }
        const tid = sender.tab.id;
        if (!tabEvents.has(tid)) tabEvents.set(tid, []);
        const events = tabEvents.get(tid)!;
        events.push({ ...message.payload, tabUrl: message.tabUrl });
        if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
        console.log('[EVT-4] background:store', { tabId: tid, totalForTab: events.length, eventType: message.payload?.eventType });
        // Notify side panel
        chrome.runtime.sendMessage({ type: 'NEW_EVENT', tabId: tid, event: message.payload }).catch(() => {});
        break;
      }
      case 'GET_EVENTS':
        sendResponse({ events: tabEvents.get(message.tabId) || [] });
        break;
      case 'CLEAR_EVENTS':
        tabEvents.set(message.tabId, []);
        sendResponse({ success: true });
        break;
      case 'EXPORT_EVENTS':
        sendResponse({ events: tabEvents.get(message.tabId) || [] });
        break;

      // ---- Storage ----
      case 'GET_COOKIES':
        chrome.cookies.getAll({ url: message.url }, (cookies) => {
          sendResponse({
            cookies: cookies.map(c => ({
              name: c.name, value: c.value, domain: c.domain, path: c.path,
              secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite,
              expirationDate: c.expirationDate, session: c.session,
            })),
          });
        });
        break;
      case 'SET_COOKIE':
        chrome.cookies.set(message.cookie, (result) => {
          sendResponse({ success: !!result, cookie: result });
        });
        break;
      case 'DELETE_COOKIE':
        chrome.cookies.remove({ url: message.url, name: message.name }, () => {
          sendResponse({ success: true });
        });
        break;
      case 'GET_ALL_STORAGE':
        if (!tabId) { sendResponse({ localStorage: {}, sessionStorage: {} }); break; }
        chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const data: any = { localStorage: {}, sessionStorage: {}, localStorageSize: 0, sessionStorageSize: 0 };
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i)!;
              const value = localStorage.getItem(key)!;
              data.localStorage[key] = value;
              data.localStorageSize += key.length + value.length;
            }
            for (let i = 0; i < sessionStorage.length; i++) {
              const key = sessionStorage.key(i)!;
              const value = sessionStorage.getItem(key)!;
              data.sessionStorage[key] = value;
              data.sessionStorageSize += key.length + value.length;
            }
            return data;
          },
          world: 'MAIN' as any,
        }).then(results => {
          sendResponse(results[0]?.result || { localStorage: {}, sessionStorage: {} });
        }).catch(error => {
          sendResponse({ localStorage: {}, sessionStorage: {}, error: error.message });
        });
        break;
      case 'EXECUTE_STORAGE_ACTION':
        if (!tabId) { sendResponse({ success: false, error: 'No tab' }); break; }
        chrome.scripting.executeScript({
          target: { tabId },
          func: (action: any) => {
            try {
              switch (action.type) {
                case 'SET_LOCAL': localStorage.setItem(action.key, action.value); return { success: true };
                case 'DELETE_LOCAL': localStorage.removeItem(action.key); return { success: true };
                case 'CLEAR_LOCAL': localStorage.clear(); return { success: true };
                case 'SET_SESSION': sessionStorage.setItem(action.key, action.value); return { success: true };
                case 'DELETE_SESSION': sessionStorage.removeItem(action.key); return { success: true };
                case 'CLEAR_SESSION': sessionStorage.clear(); return { success: true };
                case 'GET_INDEXEDDB_INFO':
                  if (!window.indexedDB || !indexedDB.databases) return { databases: [] };
                  return indexedDB.databases().then(dbs => ({ databases: dbs })).catch(() => ({ databases: [] }));
                case 'DELETE_INDEXEDDB':
                  return new Promise(resolve => {
                    const req = indexedDB.deleteDatabase(action.dbName);
                    req.onsuccess = () => resolve({ success: true });
                    req.onerror = () => resolve({ success: false, error: req.error?.message });
                  });
                default: return { success: false, error: 'Unknown action' };
              }
            } catch (e: any) { return { success: false, error: e.message }; }
          },
          args: [message.action],
          world: 'MAIN' as any,
        }).then(results => {
          sendResponse(results[0]?.result || { success: false });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
        break;
      default:
        sendResponse({ success: false, error: 'Unknown type' });
    }
  }

  async toggleEnabled(enabled: boolean): Promise<void> {
    console.log('[Background] Toggling enabled:', enabled);
    this.state.enabled = enabled;
    await this.saveState();
    this.updateIcon();

    this.notifyAll({
      action: 'stateChanged',
      enabled: this.state.enabled,
      routes: this.state.routes
    });
  }

  async addRoute(route: string, config: any, name?: string): Promise<boolean> {
    console.log('[Background] Adding route:', route, config);

    // Validate
    let validation;
    if (isWebSocketRoute(route)) {
      validation = validateWebSocketConfig(config);
    } else if (isInjectionRoute(route)) {
      validation = validateInjectionConfig(config);
    } else {
      validation = validateHttpConfig(config);
    }

    if (!validation.valid) {
      throw new Error(`Invalid route configuration: ${validation.error}`);
    }

    // Ensure proper structure
    if (isWebSocketRoute(route)) {
      config.incomingRules = config.incomingRules || [];
      config.outgoingRules = config.outgoingRules || [];
      config.delay = config.delay || 0;

      const ensureRuleIds = (rules: any[]) => {
        rules.forEach((rule, index) => {
          if (!rule.id) {
            rule.id = `rule-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
          }
        });
      };
      ensureRuleIds(config.incomingRules);
      ensureRuleIds(config.outgoingRules);
    } else if (!isInjectionRoute(route)) {
      config.responseHeaders = config.responseHeaders || {};
      config.requestHeaders = config.requestHeaders || {};
      config.removeRequestHeaders = config.removeRequestHeaders || [];
      config.headersOnly = config.headersOnly || false;
    }

    if (name) config.name = name;
    if (config.enabled === undefined) config.enabled = true;

    const isUpdate = this.state.routes.hasOwnProperty(route);

    // Resolve conflicts
    if (!isWebSocketRoute(route) && !isInjectionRoute(route) && config.enabled) {
      const conflicts = findConflictingRoutes(route, this.state.routes, isUpdate);
      for (const key of conflicts) {
        (this.state.routes[key] as any).enabled = false;
        console.log('[Background] Disabled conflicting route:', key);
      }
    }

    this.state.routes[route] = config;
    await this.saveState();

    this.notifyAll({
      action: 'routesChanged',
      routes: this.state.routes,
      enabled: this.state.enabled
    });

    return isUpdate;
  }

  async removeRoute(route: string): Promise<void> {
    console.log('[Background] Removing route:', route);

    if (this.state.routes[route]) {
      delete this.state.routes[route];
      await this.saveState();

      this.notifyAll({
        action: 'routesChanged',
        routes: this.state.routes,
        enabled: this.state.enabled
      });
    } else {
      console.warn('[Background] Route not found for removal:', route);
    }
  }

  async toggleRoute(route: string, enabled: boolean): Promise<void> {
    console.log('[Background] Toggling route:', route, enabled);

    if (this.state.routes[route]) {
      // Resolve conflicts when enabling
      if (!isWebSocketRoute(route) && !isInjectionRoute(route) && enabled) {
        const conflicts = findConflictingRoutes(route, this.state.routes, false);
        for (const key of conflicts) {
          (this.state.routes[key] as any).enabled = false;
          console.log('[Background] Disabled conflicting route:', key);
        }
      }

      (this.state.routes[route] as any).enabled = enabled;
      await this.saveState();

      this.notifyAll({
        action: 'routesChanged',
        routes: this.state.routes,
        enabled: this.state.enabled
      });
    } else {
      console.warn('[Background] Route not found for toggle:', route);
    }
  }

  async clearRoutes(): Promise<void> {
    console.log('[Background] Clearing all routes');
    this.state.routes = {};
    await this.saveState();

    this.notifyAll({
      action: 'routesChanged',
      routes: {},
      enabled: this.state.enabled
    });
  }

  async openSidePanel(): Promise<void> {
    console.log('[Background] Opening side panel');
    try {
      if (chrome.sidePanel) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id) {
          //@ts-ignore
          chrome.sidePanel.open({ windowId: tab.windowId });
        } else {
          throw new Error('No active tab found');
        }
      } else {
        throw new Error('Side panel API not available');
      }
    } catch (error) {
      console.error('[Background] Error opening side panel:', error);
      throw error;
    }
  }
}

// Clean up events when tabs close or navigate
chrome.tabs.onRemoved.addListener((tid) => { tabEvents.delete(tid); });
chrome.tabs.onUpdated.addListener((tid, changeInfo) => {
  if (changeInfo.status === 'loading') tabEvents.set(tid, []);
});

// Initialize
console.log('[Background] Initializing Request Interceptor');
const stateManager = new StateManager();

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    chrome.storage.local.set({ enabled: false, routes: {} });
  } else if (details.reason === 'update') {
    stateManager.loadState();
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Extension started');
});

(globalThis as any).__stateManager = stateManager;

export {};
