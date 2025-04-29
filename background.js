// Background script for Request Interceptor Chrome Extension

// Global state tracking
let extensionEnabled = false;
let interceptedRoutes = {};

// Initialize extension state from storage
chrome.storage.local.get(['enabled', 'routes'], (result) => {
  extensionEnabled = result.enabled || false;
  interceptedRoutes = result.routes || {};
  updateIcon();
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getState') {
    // Return current extension state
    sendResponse({
      enabled: extensionEnabled,
      routes: interceptedRoutes
    });
  } 
  else if (message.action === 'toggleEnabled') {
    // Toggle interceptor status
    extensionEnabled = message.enabled;
    
    // Save state to storage
    chrome.storage.local.set({ enabled: extensionEnabled });
    
    // Update icon
    updateIcon();
    
    // Notify all tabs about the state change
    notifyAllTabs({ action: 'stateChanged', enabled: extensionEnabled });
    
    sendResponse({ success: true });
  } 
  else if (message.action === 'addRoute') {
    // Add or update a route
    const { route, config } = message;
    interceptedRoutes[route] = config;
    
    // Save routes to storage
    chrome.storage.local.set({ routes: interceptedRoutes });
    
    // Notify all tabs about the route change
    notifyAllTabs({ 
      action: 'routesChanged', 
      routes: interceptedRoutes 
    });
    
    sendResponse({ success: true });
  } 
  else if (message.action === 'removeRoute') {
    // Remove a route
    const { route } = message;
    
    if (interceptedRoutes[route]) {
      delete interceptedRoutes[route];
      
      // Save routes to storage
      chrome.storage.local.set({ routes: interceptedRoutes });
      
      // Notify all tabs about the route change
      notifyAllTabs({ 
        action: 'routesChanged', 
        routes: interceptedRoutes 
      });
      
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Route not found' });
    }
  } 
  else if (message.action === 'clearRoutes') {
    // Clear all routes
    interceptedRoutes = {};
    
    // Save empty routes to storage
    chrome.storage.local.set({ routes: {} });
    
    // Notify all tabs about the route change
    notifyAllTabs({ 
      action: 'routesChanged', 
      routes: {} 
    });
    
    sendResponse({ success: true });
  }
  
  // Return true to indicate that we will send a response asynchronously
  return true;
});

// Update the extension icon based on enabled/disabled state
function updateIcon() {
  const iconPath = extensionEnabled ? 'icons/icon48.png' : 'icons/icon48_disabled.png';
  chrome.action.setIcon({ path: iconPath });
}

// Send a message to all active tabs
function notifyAllTabs(message) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      // Only send to regular http/https tabs, not extension pages
      if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Silently fail if the tab doesn't have our content script (like chrome:// URLs)
        });
      }
    });
  });
}

// Listen for tab updates to inject our script when a page loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    // Send current state to the newly loaded tab
    chrome.tabs.sendMessage(tabId, {
      action: 'stateChanged',
      enabled: extensionEnabled,
      routes: interceptedRoutes
    }).catch(() => {
      // Tab might not have content script loaded yet, which is fine
    });
  }
});