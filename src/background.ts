// Background script for Request Interceptor Chrome Extension

import { networkManager } from './lib/network-background';
import { isWebSocketRoute, isInjectionRoute } from './core/route-keys';
import { validateHttpConfig, validateWebSocketConfig, validateInjectionConfig } from './core/route-validation';
import { migrateRoutes } from './core/route-migration';
import { exportRoutes } from './core/route-export';
import { findConflictingRoutes } from './core/route-conflicts';

console.log('[Background] Network manager initialized:', !!networkManager);

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
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      console.log('[Background] Received message:', message.action, message);

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
