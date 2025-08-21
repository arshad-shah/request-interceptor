// Background script for Request Interceptor Chrome Extension

interface RouteConfig {
  status: number;
  delay: number;
  response: any;
  contentType: string;
  enabled: boolean;
  timestamp: number;
  name?: string;
}

interface AppState {
  enabled: boolean;
  routes: Record<string, RouteConfig>;
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
      ? {
          '16': 'icons/icon16.png',
          '48': 'icons/icon48.png',
          '128': 'icons/icon128.png'
        }
      : {
          '16': 'icons/icon16-disabled.png',
          '48': 'icons/icon48-disabled.png', 
          '128': 'icons/icon128-disabled.png'
        };
      
    chrome.action.setIcon({ path: iconPath }).catch(() => {
      // Fallback to single icon if multiple sizes fail
      chrome.action.setIcon({ 
        path: this.state.enabled ? 'icons/icon128.png' : 'icons/icon128-disabled.png' 
      });
    });
  }

  notifyAllTabs(message: ChromeMessage): void {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {
            // Silently fail if the tab doesn't have our content script
            console.log(`[Background] Could not send message to tab ${tab.id}`);
          });
        }
      });
    });
  }

  setupMessageHandlers(): void {
    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep the messaging channel open for async responses
    });
  }

  setupTabHandlers(): void {
    // Listen for tab updates to inject our script when a page loads
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        // Send current state to the newly loaded tab
        chrome.tabs.sendMessage(tabId, {
          action: 'stateChanged',
          enabled: this.state.enabled,
          routes: this.state.routes
        }).catch(() => {
          // Tab might not have content script loaded yet, which is fine
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
      console.log('[Background] Received message:', message.action, message);

      switch (message.action) {
        case 'getState':
          sendResponse(this.state);
          break;

        case 'toggleEnabled':
          await this.toggleEnabled(message.enabled);
          sendResponse({ success: true });
          break;

        case 'addRoute':
          const isUpdate = await this.addRoute(message.route, message.config, message.name);
          sendResponse({ success: true, isUpdate });
          break;

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

        case 'exportRoutes':
          const exportData = this.exportRoutes();
          sendResponse({ success: true, data: exportData });
          break;

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
    
    this.notifyAllTabs({
      action: 'stateChanged',
      enabled: this.state.enabled,
      routes: this.state.routes
    });
  }

  async addRoute(route: string, config: RouteConfig, name?: string): Promise<boolean> {
    console.log('[Background] Adding route:', route, config);
    
    // Store the name in the config if provided
    if (name) {
      config.name = name;
    }

    // Check if this route already exists
    const isUpdate = this.state.routes.hasOwnProperty(route);

    // If enabling this route, disable other routes with the same URL and method
    if (config.enabled) {
      const [method, ...urlParts] = route.split(':');
      const url = urlParts.join(':').split('|')[0]; // Remove name part if present

      Object.keys(this.state.routes).forEach(key => {
        const [otherMethod, ...otherUrlParts] = key.split(':');
        const otherUrl = otherUrlParts.join(':').split('|')[0];

        // If same URL and method but different route, disable it
        if (otherUrl === url && otherMethod === method && key !== route) {
          this.state.routes[key].enabled = false;
          console.log('[Background] Disabled conflicting route:', key);
        }
      });
    }

    // Update or add the route
    this.state.routes[route] = config;
    await this.saveState();

    this.notifyAllTabs({
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
      
      this.notifyAllTabs({
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
      // Get the URL part from the route key
      const [method, ...urlParts] = route.split(':');
      const url = urlParts.join(':').split('|')[0];

      // If enabling this route, disable all other routes with the same URL and method
      if (enabled) {
        Object.keys(this.state.routes).forEach(key => {
          const [otherMethod, ...otherUrlParts] = key.split(':');
          const otherUrl = otherUrlParts.join(':').split('|')[0];

          // If same URL and method but different route (different name), disable it
          if (otherUrl === url && otherMethod === method && key !== route) {
            this.state.routes[key].enabled = false;
            console.log('[Background] Disabled conflicting route:', key);
          }
        });
      }

      // Update the enabled state of the specific route
      this.state.routes[route].enabled = enabled;
      await this.saveState();
      
      this.notifyAllTabs({
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
    
    this.notifyAllTabs({
      action: 'routesChanged',
      routes: {},
      enabled: this.state.enabled
    });
  }

  exportRoutes(): { routes: any[] } {
    console.log('[Background] Exporting routes');
    
    return {
      routes: Object.entries(this.state.routes).map(([key, config]) => {
        // Parse the route key
        const firstColonIndex = key.indexOf(':');
        const method = key.substring(0, firstColonIndex);
        const remaining = key.substring(firstColonIndex + 1);

        // Check if route has a name (method:url|name format)
        let url: string, name: string;
        const pipeIndex = remaining.indexOf('|');
        if (pipeIndex !== -1) {
          // The part before pipe is the URL
          url = remaining.substring(0, pipeIndex);
          // The part after pipe is the name
          name = remaining.substring(pipeIndex + 1);
        } else {
          // No name, just method:url format
          url = remaining;
          name = config.name || '';
        }

        return {
          method,
          url,
          name,
          status: config.status || 200,
          delay: config.delay || 0,
          contentType: config.contentType,
          response: config.response,
          enabled: config.enabled !== false
        };
      })
    };
  }

  async openSidePanel(): Promise<void> {
    console.log('[Background] Opening side panel');
    
    try {
      if (chrome.sidePanel) {
        // Get the current active tab
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

// Initialize the state manager
console.log('[Background] Initializing Request Interceptor');
const stateManager = new StateManager();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Set default state on first install
    chrome.storage.local.set({
      enabled: false,
      routes: {}
    });
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Extension started');
});

// Make stateManager available for debugging
(globalThis as any).__stateManager = stateManager;

export {}; // Make this a module