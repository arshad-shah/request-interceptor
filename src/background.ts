// Enhanced Background script for Request Interceptor Chrome Extension with WebSocket Support - FIXED

// Import network monitoring functionality
import { networkManager } from './lib/network-background';

// Initialize network manager (imported for side effects - sets up listeners)
console.log('[Background] Network manager initialized:', !!networkManager);

interface HeaderConfig {
  [key: string]: string;
}

interface WebSocketRule {
  id: string;
  enabled: boolean;
  type: 'replace' | 'block' | 'inject';
  matchType: 'exact' | 'contains' | 'regex';
  match: string;
  replacement?: string;
  flags?: string;
  description?: string;
}

interface RouteConfig {
  status: number;
  delay: number;
  response: any;
  contentType: string;
  enabled: boolean;
  timestamp: number;
  name?: string;
  // Header fields
  responseHeaders?: HeaderConfig;
  requestHeaders?: HeaderConfig;
  removeRequestHeaders?: string[];
  headersOnly?: boolean;
}

interface WebSocketConfig {
  enabled: boolean;
  timestamp: number;
  name?: string;
  incomingRules: WebSocketRule[];
  outgoingRules: WebSocketRule[];
  delay?: number;
}

interface AppState {
  enabled: boolean;
  routes: Record<string, RouteConfig | WebSocketConfig>;
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
      console.log('[Background] State loaded with WebSocket support:', this.state);
    } catch (error) {
      console.error('[Background] Error loading state:', error);
    }
  }

  private migrateRoutesToIncludeHeaders(): void {
    let needsSave = false;
    
    Object.keys(this.state.routes).forEach(key => {
      const route = this.state.routes[key];
      
      if (key.startsWith('WS:')) {
        // WebSocket route migration
        const wsRoute = route as WebSocketConfig;
        if (!wsRoute.hasOwnProperty('incomingRules')) {
          (wsRoute as any).incomingRules = [];
          needsSave = true;
        }
        if (!wsRoute.hasOwnProperty('outgoingRules')) {
          (wsRoute as any).outgoingRules = [];
          needsSave = true;
        }
        if (!wsRoute.hasOwnProperty('delay')) {
          (wsRoute as any).delay = 0;
          needsSave = true;
        }
        
        // Migrate rules to ensure they have proper structure
        ['incomingRules', 'outgoingRules'].forEach(ruleType => {
          const rules = (wsRoute as any)[ruleType];
          if (Array.isArray(rules)) {
            rules.forEach((rule: any, index: number) => {
              if (!rule.id) {
                rule.id = `migrated-rule-${Date.now()}-${index}`;
                needsSave = true;
              }
              if (rule.enabled === undefined) {
                rule.enabled = true;
                needsSave = true;
              }
              if (!rule.type) {
                rule.type = 'replace';
                needsSave = true;
              }
              if (!rule.matchType) {
                rule.matchType = 'contains';
                needsSave = true;
              }
            });
          }
        });
      } else {
        // HTTP route migration
        const httpRoute = route as RouteConfig;
        if (!httpRoute.hasOwnProperty('responseHeaders')) {
          (httpRoute as any).responseHeaders = {};
          needsSave = true;
        }
        if (!httpRoute.hasOwnProperty('requestHeaders')) {
          (httpRoute as any).requestHeaders = {};
          needsSave = true;
        }
        if (!httpRoute.hasOwnProperty('removeRequestHeaders')) {
          (httpRoute as any).removeRequestHeaders = [];
          needsSave = true;
        }
        if (!httpRoute.hasOwnProperty('headersOnly')) {
          (httpRoute as any).headersOnly = false;
          needsSave = true;
        }
      }
      
      // Ensure all routes have explicit enabled property (both HTTP and WebSocket)
      if (!route.hasOwnProperty('enabled')) {
        (route as any).enabled = true; // Default existing routes to enabled
        needsSave = true;
      }
    });
    
    if (needsSave) {
      this.saveState();
      console.log('[Background] Migrated routes to include WebSocket and header fields');
    }
  }

  async saveState(): Promise<void> {
    try {
      await chrome.storage.local.set(this.state);
      console.log('[Background] State saved with WebSocket support:', this.state);
    } catch (error) {
      console.error('[Background] Error saving state:', error);
    }
  }

  updateIcon(): void {
    const iconPath = this.state.enabled 
      ? {
          '16': 'icons/icon-16.png',
          '48': 'icons/icon-48.png',
          '128': 'icons/icon-128.png'
        }
      : {
          '16': 'icons/icon-16-disabled.png',
          '48': 'icons/icon-48-disabled.png', 
          '128': 'icons/icon-128-disabled.png'
        };
      
    chrome.action.setIcon({ path: iconPath }).catch(() => {
      // Fallback to single icon if multiple sizes fail
      chrome.action.setIcon({ 
        path: this.state.enabled ? 'icons/icon-128.png' : 'icons/icon-128-disabled.png' 
      });
    });
  }

  notifyAllTabs(message: ChromeMessage): void {
    // Notify webpage tabs with content scripts
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

  notifyExtensionUIs(message: ChromeMessage): void {
    // Notify extension contexts (popup, sidepanel, etc.)
    // This uses chrome.runtime.sendMessage to broadcast to all extension contexts
    try {
      // Send message to all extension contexts
      chrome.runtime.sendMessage(message).catch(() => {
        // Extension UIs may not be open, which is normal
        console.log('[Background] Could not send message to extension UIs (may be closed)');
      });
    } catch (error) {
      console.log('[Background] Error sending message to extension UIs:', error);
    }
  }

  notifyAll(message: ChromeMessage): void {
    // Notify both tabs and extension UIs
    this.notifyAllTabs(message);
    this.notifyExtensionUIs(message);
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
    
    this.notifyAll({
      action: 'stateChanged',
      enabled: this.state.enabled,
      routes: this.state.routes
    });
  }

  private isWebSocketRoute(routeKey: string): boolean {
    return routeKey.startsWith('WS:');
  }

  private validateWebSocketConfig(config: any): { valid: boolean; error?: string } {
    if (!config.incomingRules && !config.outgoingRules) {
      return { valid: false, error: 'WebSocket route must have at least one rule set' };
    }
    
    const validateRules = (rules: any[], ruleType: string) => {
      if (!Array.isArray(rules)) return { valid: false, error: `${ruleType} must be an array` };
      
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        if (!rule.id) return { valid: false, error: `Rule ${i} in ${ruleType} missing id` };
        if (!rule.match) return { valid: false, error: `Rule ${i} in ${ruleType} missing match pattern` };
        if (rule.type !== 'block' && !rule.replacement) {
          return { valid: false, error: `Rule ${i} in ${ruleType} missing replacement text` };
        }
        if (rule.matchType === 'regex') {
          try {
            new RegExp(rule.match, rule.flags || '');
          } catch (error) {
            return { valid: false, error: `Rule ${i} in ${ruleType} has invalid regex: ${error}` };
          }
        }
      }
      return { valid: true };
    };
    
    if (config.incomingRules) {
      const result = validateRules(config.incomingRules, 'incomingRules');
      if (!result.valid) return result;
    }
    
    if (config.outgoingRules) {
      const result = validateRules(config.outgoingRules, 'outgoingRules');
      if (!result.valid) return result;
    }
    
    return { valid: true };
  }

  private validateHttpConfig(config: any): { valid: boolean; error?: string } {
    if (config.headersOnly) {
      const hasResponseHeaders = config.responseHeaders && Object.keys(config.responseHeaders).length > 0;
      const hasRequestHeaders = config.requestHeaders && Object.keys(config.requestHeaders).length > 0;
      const hasRemoveHeaders = config.removeRequestHeaders && config.removeRequestHeaders.length > 0;
      
      if (!hasResponseHeaders && !hasRequestHeaders && !hasRemoveHeaders) {
        return { valid: false, error: 'Headers-only route must have at least one header modification' };
      }
    } else {
      if (config.response === undefined || config.response === null) {
        return { valid: false, error: 'Full interception route must have a response' };
      }
    }
    
    if (config.status && (config.status < 100 || config.status > 599)) {
      return { valid: false, error: 'Status code must be between 100 and 599' };
    }
    
    return { valid: true };
  }

  async addRoute(route: string, config: RouteConfig | WebSocketConfig, name?: string): Promise<boolean> {
    console.log('[Background] Adding route with WebSocket support:', route, config);
    
    // Validate route configuration
    let validation: { valid: boolean; error?: string };
    if (this.isWebSocketRoute(route)) {
      validation = this.validateWebSocketConfig(config);
    } else {
      validation = this.validateHttpConfig(config);
    }
    
    if (!validation.valid) {
      throw new Error(`Invalid route configuration: ${validation.error}`);
    }
    
    // Ensure proper structure for WebSocket routes
    if (this.isWebSocketRoute(route)) {
      const wsConfig = config as WebSocketConfig;
      wsConfig.incomingRules = wsConfig.incomingRules || [];
      wsConfig.outgoingRules = wsConfig.outgoingRules || [];
      wsConfig.delay = wsConfig.delay || 0;
      
      // Ensure all rules have proper IDs
      const ensureRuleIds = (rules: WebSocketRule[]) => {
        rules.forEach((rule, index) => {
          if (!rule.id) {
            rule.id = `rule-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
          }
        });
      };
      
      ensureRuleIds(wsConfig.incomingRules);
      ensureRuleIds(wsConfig.outgoingRules);
    } else {
      // Ensure header fields exist with defaults for HTTP routes
      const httpConfig = config as RouteConfig;
      httpConfig.responseHeaders = httpConfig.responseHeaders || {};
      httpConfig.requestHeaders = httpConfig.requestHeaders || {};
      httpConfig.removeRequestHeaders = httpConfig.removeRequestHeaders || [];
      httpConfig.headersOnly = httpConfig.headersOnly || false;
    }
    
    // Store the name in the config if provided
    if (name) {
      (config as any).name = name;
    }
    
    // Ensure enabled property is explicitly set (default to true for new routes)
    if ((config as any).enabled === undefined) {
      (config as any).enabled = true;
    }

    // Check if this route already exists
    const isUpdate = this.state.routes.hasOwnProperty(route);

    // Handle route conflicts for HTTP routes only
    if (!this.isWebSocketRoute(route) && (config as any).enabled) {
      const [method, ...urlParts] = route.split(':');
      const urlWithName = urlParts.join(':');
      const hasName = urlWithName.includes('|');
      const url = hasName ? urlWithName.split('|')[0] : urlWithName;

      // Only disable conflicting routes if:
      // 1. This is a simple route (no name), OR
      // 2. We're updating an existing route
      if (!hasName || isUpdate) {
        Object.keys(this.state.routes).forEach(key => {
          if (this.isWebSocketRoute(key)) return; // Skip WebSocket routes
          
          const [otherMethod, ...otherUrlParts] = key.split(':');
          const otherUrlWithName = otherUrlParts.join(':');
          const otherUrl = otherUrlWithName.split('|')[0];

          if (otherUrl === url && otherMethod === method && key !== route) {
            (this.state.routes[key] as any).enabled = false;
            console.log('[Background] Disabled conflicting route:', key);
          }
        });
      } else {
        // For new named routes, only disable simple routes (without names) that conflict
        Object.keys(this.state.routes).forEach(key => {
          if (this.isWebSocketRoute(key)) return; // Skip WebSocket routes
          
          const [otherMethod, ...otherUrlParts] = key.split(':');
          const otherUrlWithName = otherUrlParts.join(':');
          const otherHasName = otherUrlWithName.includes('|');
          const otherUrl = otherHasName ? otherUrlWithName.split('|')[0] : otherUrlWithName;

          if (otherUrl === url && otherMethod === method && !otherHasName && key !== route) {
            (this.state.routes[key] as any).enabled = false;
            console.log('[Background] Disabled simple conflicting route:', key);
          }
        });
      }
    }

    // Update or add the route
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
      // Handle route conflicts for HTTP routes only when enabling
      if (!this.isWebSocketRoute(route) && enabled) {
        const [method, ...urlParts] = route.split(':');
        const urlWithName = urlParts.join(':');
        const hasName = urlWithName.includes('|');
        const url = hasName ? urlWithName.split('|')[0] : urlWithName;

        if (!hasName) {
          // Simple route - disable all conflicting routes
          Object.keys(this.state.routes).forEach(key => {
            if (this.isWebSocketRoute(key)) return; // Skip WebSocket routes
            
            const [otherMethod, ...otherUrlParts] = key.split(':');
            const otherUrlWithName = otherUrlParts.join(':');
            const otherUrl = otherUrlWithName.split('|')[0];

            if (otherUrl === url && otherMethod === method && key !== route) {
              (this.state.routes[key] as any).enabled = false;
              console.log('[Background] Disabled conflicting route:', key);
            }
          });
        } else {
          // Named route - only disable simple routes (without names) that conflict
          Object.keys(this.state.routes).forEach(key => {
            if (this.isWebSocketRoute(key)) return; // Skip WebSocket routes
            
            const [otherMethod, ...otherUrlParts] = key.split(':');
            const otherUrlWithName = otherUrlParts.join(':');
            const otherHasName = otherUrlWithName.includes('|');
            const otherUrl = otherHasName ? otherUrlWithName.split('|')[0] : otherUrlWithName;

            if (otherUrl === url && otherMethod === method && !otherHasName && key !== route) {
              (this.state.routes[key] as any).enabled = false;
              console.log('[Background] Disabled simple conflicting route:', key);
            }
          });
        }
      }

      // Update the enabled state of the specific route
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

  exportRoutes(): { routes: any[] } {
    console.log('[Background] Exporting routes with WebSocket support');
    
    return {
      routes: Object.entries(this.state.routes).map(([key, config]) => {
        if (key.startsWith('WS:')) {
          // WebSocket route parsing
          const remaining = key.substring(3); // Remove 'WS:'
          const pipeIndex = remaining.indexOf('|');
          
          let url: string, name: string;
          if (pipeIndex !== -1) {
            url = remaining.substring(0, pipeIndex);
            name = remaining.substring(pipeIndex + 1);
          } else {
            url = remaining;
            name = (config as any).name || '';
          }

          return {
            routeType: 'websocket',
            url,
            name,
            enabled: (config as any).enabled !== false,
            delay: (config as any).delay || 0,
            incomingRules: (config as WebSocketConfig).incomingRules || [],
            outgoingRules: (config as WebSocketConfig).outgoingRules || []
          };
        } else {
          // HTTP route parsing (existing logic)
          const firstColonIndex = key.indexOf(':');
          const method = key.substring(0, firstColonIndex);
          const remaining = key.substring(firstColonIndex + 1);

          let url: string, name: string;
          const pipeIndex = remaining.indexOf('|');
          if (pipeIndex !== -1) {
            url = remaining.substring(0, pipeIndex);
            name = remaining.substring(pipeIndex + 1);
          } else {
            url = remaining;
            name = (config as any).name || '';
          }

          return {
            routeType: 'http',
            method,
            url,
            name,
            status: (config as RouteConfig).status || 200,
            delay: (config as any).delay || 0,
            contentType: (config as RouteConfig).contentType,
            response: (config as RouteConfig).response,
            enabled: (config as any).enabled !== false,
            responseHeaders: (config as RouteConfig).responseHeaders || {},
            requestHeaders: (config as RouteConfig).requestHeaders || {},
            removeRequestHeaders: (config as RouteConfig).removeRequestHeaders || [],
            headersOnly: (config as RouteConfig).headersOnly || false
          };
        }
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
console.log('[Background] Initializing Request Interceptor with WebSocket Support');
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