// Enhanced Background script for Request Interceptor Chrome Extension with Headers Support and Named Routes Fix

interface HeaderConfig {
  [key: string]: string;
}

interface RouteConfig {
  status: number;
  delay: number;
  response: any;
  contentType: string;
  enabled: boolean;
  timestamp: number;
  name?: string;
  // New header fields
  responseHeaders?: HeaderConfig;
  requestHeaders?: HeaderConfig;
  removeRequestHeaders?: string[];
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
      
      // Migrate old routes to include header fields if they don't exist
      this.migrateRoutesToIncludeHeaders();
      
      this.updateIcon();
      console.log('[Background] State loaded with headers support:', this.state);
    } catch (error) {
      console.error('[Background] Error loading state:', error);
    }
  }

  private migrateRoutesToIncludeHeaders(): void {
    let needsSave = false;
    
    Object.keys(this.state.routes).forEach(key => {
      const route = this.state.routes[key];
      
      // Add default header fields if they don't exist
      if (!route.hasOwnProperty('responseHeaders')) {
        route.responseHeaders = {};
        needsSave = true;
      }
      if (!route.hasOwnProperty('requestHeaders')) {
        route.requestHeaders = {};
        needsSave = true;
      }
      if (!route.hasOwnProperty('removeRequestHeaders')) {
        route.removeRequestHeaders = [];
        needsSave = true;
      }
    });
    
    if (needsSave) {
      this.saveState();
      console.log('[Background] Migrated routes to include header fields');
    }
  }

  async saveState(): Promise<void> {
    try {
      await chrome.storage.local.set(this.state);
      console.log('[Background] State saved with headers:', this.state);
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
    console.log('[Background] Adding route with headers:', route, config);
    
    // Ensure header fields exist with defaults
    const enhancedConfig: RouteConfig = {
      ...config,
      responseHeaders: config.responseHeaders || {},
      requestHeaders: config.requestHeaders || {},
      removeRequestHeaders: config.removeRequestHeaders || []
    };
    
    // Store the name in the config if provided
    if (name) {
      enhancedConfig.name = name;
    }

    // Check if this route already exists
    const isUpdate = this.state.routes.hasOwnProperty(route);

    // FIXED: Only disable conflicting routes for simple routes (no names) or when updating
    if (enhancedConfig.enabled) {
      const [method, ...urlParts] = route.split(':');
      const urlWithName = urlParts.join(':');
      const hasName = urlWithName.includes('|'); // Check if route has a name
      const url = hasName ? urlWithName.split('|')[0] : urlWithName;

      // Only disable conflicting routes if:
      // 1. This is a simple route (no name), OR
      // 2. We're updating an existing route
      if (!hasName || isUpdate) {
        Object.keys(this.state.routes).forEach(key => {
          const [otherMethod, ...otherUrlParts] = key.split(':');
          const otherUrlWithName = otherUrlParts.join(':');
          const otherUrl = otherUrlWithName.split('|')[0]; // Remove name part if present

          // If same URL and method but different route, disable it
          if (otherUrl === url && otherMethod === method && key !== route) {
            this.state.routes[key].enabled = false;
            console.log('[Background] Disabled conflicting route:', key);
          }
        });
      } else {
        // For new named routes, only disable simple routes (without names) that conflict
        Object.keys(this.state.routes).forEach(key => {
          const [otherMethod, ...otherUrlParts] = key.split(':');
          const otherUrlWithName = otherUrlParts.join(':');
          const otherHasName = otherUrlWithName.includes('|');
          const otherUrl = otherHasName ? otherUrlWithName.split('|')[0] : otherUrlWithName;

          // Only disable simple routes (without names) when adding a named route
          if (otherUrl === url && otherMethod === method && !otherHasName && key !== route) {
            this.state.routes[key].enabled = false;
            console.log('[Background] Disabled simple conflicting route:', key);
          }
        });
      }
    }

    // Update or add the route
    this.state.routes[route] = enhancedConfig;
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
      const urlWithName = urlParts.join(':');
      const hasName = urlWithName.includes('|'); // Check if route has a name
      const url = hasName ? urlWithName.split('|')[0] : urlWithName;

      // FIXED: Only disable conflicting routes under specific conditions
      if (enabled) {
        // For simple routes (no names), disable all conflicting routes
        // For named routes, only disable simple routes that conflict
        if (!hasName) {
          // Simple route - disable all conflicting routes
          Object.keys(this.state.routes).forEach(key => {
            const [otherMethod, ...otherUrlParts] = key.split(':');
            const otherUrlWithName = otherUrlParts.join(':');
            const otherUrl = otherUrlWithName.split('|')[0];

            if (otherUrl === url && otherMethod === method && key !== route) {
              this.state.routes[key].enabled = false;
              console.log('[Background] Disabled conflicting route:', key);
            }
          });
        } else {
          // Named route - only disable simple routes (without names) that conflict
          Object.keys(this.state.routes).forEach(key => {
            const [otherMethod, ...otherUrlParts] = key.split(':');
            const otherUrlWithName = otherUrlParts.join(':');
            const otherHasName = otherUrlWithName.includes('|');
            const otherUrl = otherHasName ? otherUrlWithName.split('|')[0] : otherUrlWithName;

            // Only disable simple routes when enabling a named route
            if (otherUrl === url && otherMethod === method && !otherHasName && key !== route) {
              this.state.routes[key].enabled = false;
              console.log('[Background] Disabled simple conflicting route:', key);
            }
          });
          // Allow multiple named routes to be enabled simultaneously
        }
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
    console.log('[Background] Exporting routes with headers');
    
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
          enabled: config.enabled !== false,
          // Include header fields in export
          responseHeaders: config.responseHeaders || {},
          requestHeaders: config.requestHeaders || {},
          removeRequestHeaders: config.removeRequestHeaders || []
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
console.log('[Background] Initializing Request Interceptor with Headers Support and Named Routes Fix');
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
  } else if (details.reason === 'update') {
    // Trigger migration on update
    stateManager.loadState();
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Extension started');
});

// Make stateManager available for debugging
(globalThis as any).__stateManager = stateManager;

export {}; // Make this a module