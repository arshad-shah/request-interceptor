import { ChromeMessage, AppState, RouteConfig, WebSocketConfig } from '@/types';

// Chrome runtime messaging helpers
export const sendMessage = <T = any>(message: ChromeMessage): Promise<T> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
};

// Background script API methods
export const chromeApi = {
  // Get current state from background
  getState: (): Promise<AppState> => {
    return sendMessage({ action: 'getState' });
  },

  // Toggle interceptor enabled/disabled
  toggleEnabled: (enabled: boolean): Promise<{ success: boolean }> => {
    return sendMessage({ action: 'toggleEnabled', enabled });
  },

  // Add or update a route
  addRoute: (route: string, config: RouteConfig | WebSocketConfig, name?: string): Promise<{ success: boolean; isUpdate: boolean }> => {
    return sendMessage({ action: 'addRoute', route, config, name });
  },

  // Remove a route
  removeRoute: (route: string): Promise<{ success: boolean }> => {
    return sendMessage({ action: 'removeRoute', route });
  },

  // Toggle a specific route
  toggleRoute: (route: string, enabled: boolean): Promise<{ success: boolean }> => {
    return sendMessage({ action: 'toggleRoute', route, enabled });
  },

  // Clear all routes
  clearRoutes: (): Promise<{ success: boolean }> => {
    return sendMessage({ action: 'clearRoutes' });
  },

  // Export routes
  exportRoutes: (): Promise<{ success: boolean; data: any }> => {
    return sendMessage({ action: 'exportRoutes' });
  },

  // Open side panel
  openSidePanel: (): Promise<{ success: boolean }> => {
    return sendMessage({ action: 'openSidePanel' });
  }
};

// Improved message listener with cleanup capability
export const addMessageListener = (callback: (message: ChromeMessage) => void): (() => void) => {
  const messageListener = (
    message: ChromeMessage, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
  ) => {
    // Only handle messages from the background script
    if (sender.id === chrome.runtime.id) {
      callback(message);
    }
    return true; // Keep the message channel open for async responses
  };

  // Add the listener
  chrome.runtime.onMessage.addListener(messageListener);

  // Return cleanup function
  return () => {
    chrome.runtime.onMessage.removeListener(messageListener);
  };
};

// Parse route key into components
export const parseRouteKey = (routeKey: string) => {
  const firstColonIndex = routeKey.indexOf(':');
  if (firstColonIndex === -1) {
    return { method: 'GET', url: routeKey, name: '' };
  }
  
  const method = routeKey.substring(0, firstColonIndex);
  const remaining = routeKey.substring(firstColonIndex + 1);
  
  const pipeIndex = remaining.indexOf('|');
  if (pipeIndex === -1) {
    return { method, url: remaining, name: '' };
  }
  
  const url = remaining.substring(0, pipeIndex);
  const name = remaining.substring(pipeIndex + 1);
  
  return { method, url, name };
};

// Create route key from components
export const createRouteKey = (method: string, url: string, name?: string) => {
  if (name) {
    return `${method}:${url}|${name}`;
  }
  return `${method}:${url}`;
};

// Validate JSON string
export const validateJson = (jsonString: string): { isValid: boolean; parsed?: any; error?: string } => {
  try {
    const parsed = JSON.parse(jsonString);
    return { isValid: true, parsed };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Invalid JSON'
    };
  }
};

// Format JSON string with proper indentation
export const formatJson = (obj: any): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

// Download file helper
export const downloadFile = (content: string, filename: string, contentType = 'application/json') => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Copy to clipboard helper
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};