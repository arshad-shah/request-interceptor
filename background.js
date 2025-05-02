// Simplified Background script for Request Interceptor

class StateManager {
  constructor() {
    // Simple state structure
    this.state = {
      enabled: false,
      routes: {}
    };
    
    // Initialize from storage
    this.loadState();
    
    // Setup message handlers
    this.setupMessageHandlers();
  }
  
  async loadState() {
    try {
      const storedState = await chrome.storage.local.get(['enabled', 'routes']);
      this.state.enabled = storedState.enabled || false;
      this.state.routes = storedState.routes || {};
      this.updateIcon();
    } catch (error) {
      console.error('Error loading state:', error);
    }
  }
  
  async saveState() {
    try {
      await chrome.storage.local.set(this.state);
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }
  
  updateIcon() {
    const iconPath = this.state.enabled 
      ? 'icons/icon512.png' 
      : 'icons/icon512-disabled.png';
      
    chrome.action.setIcon({ path: iconPath });
  }
  
  notifyAllTabs(message) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {
            // Silently fail if the tab doesn't have our content script
          });
        }
      });
    });
  }
  
setupMessageHandlers() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getState') {
      sendResponse(this.state);
    } 
    else if (message.action === 'toggleEnabled') {
      this.state.enabled = message.enabled;
      this.saveState();
      this.updateIcon();
      this.notifyAllTabs({ 
        action: 'stateChanged', 
        enabled: this.state.enabled,
        routes: this.state.routes // Include routes to ensure full state sync
      });
      sendResponse({ success: true });
    } 
    else if (message.action === 'addRoute') {
      const { route, config } = message;
      
      // Check if this route already exists (improves updating logic)
      const isUpdate = this.state.routes.hasOwnProperty(route);
      
      // Update or add the route
      this.state.routes[route] = config;
      this.saveState();
      
      this.notifyAllTabs({ 
        action: 'routesChanged', 
        routes: this.state.routes,
        enabled: this.state.enabled // Include enabled state to ensure full state sync
      });
      
      // Send whether this was an update or a new route
      sendResponse({ success: true, isUpdate });
    } 
    else if (message.action === 'removeRoute') {
      const { route } = message;
      if (this.state.routes[route]) {
        delete this.state.routes[route];
        this.saveState();
        this.notifyAllTabs({ 
          action: 'routesChanged', 
          routes: this.state.routes,
          enabled: this.state.enabled // Include enabled state to ensure full state sync
        });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Route not found' });
      }
    } 
    else if (message.action === 'toggleRoute') {
      const { route, enabled } = message;
      if (this.state.routes[route]) {
        // Update the enabled state of the specific route
        this.state.routes[route].enabled = enabled;
        this.saveState();
        this.notifyAllTabs({
          action: 'routesChanged',
          routes: this.state.routes,
          enabled: this.state.enabled
        });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Route not found' });
      }
    }
    else if (message.action === 'clearRoutes') {
      this.state.routes = {};
      this.saveState();
      this.notifyAllTabs({ 
        action: 'routesChanged', 
        routes: {},
        enabled: this.state.enabled // Include enabled state to ensure full state sync
      });
      sendResponse({ success: true });
    }
    else if (message.action === 'exportRoutes') {
      // Prepare routes for export
      sendResponse({ 
        success: true, 
        data: { routes: Object.entries(this.state.routes).map(([key, config]) => {
          const [method, ...urlParts] = key.split(':');
          return {
            method,
            url: urlParts.join(':'),
            status: config.status || 200,
            delay: config.delay || 0,
            contentType: config.contentType,
            response: config.response,
            enabled: config.enabled !== false // default to true if not specified
          };
        })}
      });
    }
    else if (message.action === 'openSidePanel') {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        chrome.sidePanel.open();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Side panel API not available' });
      }
    }
    return true; // Keep the messaging channel open for async responses
  });
}
}

// Initialize the state manager
const stateManager = new StateManager();

// Listen for tab updates to inject our script when a page loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    // Send current state to the newly loaded tab
    chrome.tabs.sendMessage(tabId, {
      action: 'stateChanged',
      enabled: stateManager.state.enabled,
      routes: stateManager.state.routes
    }).catch(() => {
      // Tab might not have content script loaded yet, which is fine
    });
  }
});