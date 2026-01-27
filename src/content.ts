// Enhanced Content script for Request Interceptor Chrome Extension
// Note: Minimal changes needed since it's primarily a message relay

// Create a unique ID for this instance
const scriptId = 'request-interceptor-script-' + Math.random().toString(36).slice(2, 10);

// Track injected DOM elements for cleanup
const injectedElements: Map<string, HTMLElement[]> = new Map();

import { pageUrlMatches } from './core/url-matching';

/**
 * Remove previously injected elements for a given route key
 */
function cleanupInjection(routeKey: string) {
  const elements = injectedElements.get(routeKey);
  if (elements) {
    elements.forEach(el => el.remove());
    injectedElements.delete(routeKey);
  }
}

/**
 * Process injection routes and inject scripts/styles into the page
 */
function processInjectionRoutes(routes: Record<string, any>, isEnabled: boolean) {
  // First, clean up all existing injections
  for (const key of injectedElements.keys()) {
    cleanupInjection(key);
  }

  if (!isEnabled) return;

  const pageUrl = window.location.href;

  Object.entries(routes).forEach(([key, config]) => {
    if (!key.startsWith('INJ:')) return;
    if (!config.enabled) return;

    const urlPattern = config.urlPattern || key.substring(4).split('|')[0];
    if (!pageUrlMatches(pageUrl, urlPattern)) return;

    const elements: HTMLElement[] = [];

    // Inject scripts
    if (config.scripts && Array.isArray(config.scripts)) {
      config.scripts.forEach((code: string) => {
        if (!code.trim()) return;
        const script = document.createElement('script');
        script.textContent = code;
        script.setAttribute('data-injected-by', 'request-interceptor');
        script.setAttribute('data-route-key', key);
        (document.head || document.documentElement).appendChild(script);
        elements.push(script);
        console.log(`[Request Interceptor] Injected script for route: ${key}`);
      });
    }

    // Inject stylesheets
    if (config.stylesheets && Array.isArray(config.stylesheets)) {
      config.stylesheets.forEach((css: string) => {
        if (!css.trim()) return;
        const style = document.createElement('style');
        style.textContent = css;
        style.setAttribute('data-injected-by', 'request-interceptor');
        style.setAttribute('data-route-key', key);
        (document.head || document.documentElement).appendChild(style);
        elements.push(style);
        console.log(`[Request Interceptor] Injected stylesheet for route: ${key}`);
      });
    }

    if (elements.length > 0) {
      injectedElements.set(key, elements);
    }
  });
}

// Check if the interceptor script is already injected
if (!document.getElementById(scriptId)) {
  console.log('[Request Interceptor] Initializing content script with headers support');

  // Track state locally
  let isEnabled = false;
  let interceptedRoutes: Record<string, any> = {};
  
  // Get initial state from background script
  chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
    if (response) {
      isEnabled = response.enabled;
      interceptedRoutes = response.routes || {};
      
      // Log header information for debugging
      const routesWithHeaders = Object.entries(interceptedRoutes).filter(([key, config]) => {
        return config.responseHeaders || config.requestHeaders || config.removeRequestHeaders?.length > 0;
      });
      
      if (routesWithHeaders.length > 0) {
        console.log(`[Request Interceptor] Found ${routesWithHeaders.length} routes with header configurations`);
      }
      
      // If enabled, inject the interceptor script immediately
      if (isEnabled) {
        injectInterceptor();
      }

      // Process injection routes
      processInjectionRoutes(interceptedRoutes, isEnabled);
    }
  });
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'stateChanged') {
      isEnabled = message.enabled;
      
      // Update routes if they're included in the message
      if (message.routes) {
        interceptedRoutes = message.routes;
        
        // Log header information for debugging
        const routesWithHeaders = Object.entries(interceptedRoutes).filter(([key, config]) => {
          return config.responseHeaders || config.requestHeaders || config.removeRequestHeaders?.length > 0;
        });
        
        if (routesWithHeaders.length > 0) {
          console.log(`[Request Interceptor] Updated with ${routesWithHeaders.length} routes containing headers`);
        }
      }
      
      if (isEnabled) {
        // Check if the interceptor is already injected
        if (document.getElementById(scriptId)) {
          // Update routes in the injected script
          window.postMessage({
            type: 'REQUEST_INTERCEPTOR_COMMAND',
            command: 'updateRoutes',
            routes: interceptedRoutes
          }, '*');
        } else {
          // Inject the interceptor
          injectInterceptor();
        }
      } else {
        // Disable the interceptor if it's injected
        if (document.getElementById(scriptId)) {
          window.postMessage({
            type: 'REQUEST_INTERCEPTOR_COMMAND',
            command: 'disable'
          }, '*');
        }
      }

      // Process injection routes
      processInjectionRoutes(interceptedRoutes, isEnabled);

      sendResponse({ success: true });
    }
    else if (message.action === 'routesChanged') {
      interceptedRoutes = message.routes || {};
      
      // Update enabled state if it's included in the message
      if (message.hasOwnProperty('enabled')) {
        isEnabled = message.enabled;
      }
      
      // Log header information for debugging
      const routesWithHeaders = Object.entries(interceptedRoutes).filter(([key, config]) => {
        return config.responseHeaders || config.requestHeaders || config.removeRequestHeaders?.length > 0;
      });
      
      if (routesWithHeaders.length > 0) {
        console.log(`[Request Interceptor] Routes changed - ${routesWithHeaders.length} routes with headers`);
      }
      
      // Update the routes in the injected script if it exists
      if (document.getElementById(scriptId)) {
        window.postMessage({
          type: 'REQUEST_INTERCEPTOR_COMMAND',
          command: 'updateRoutes',
          routes: interceptedRoutes
        }, '*');
        
        // Ensure interceptor is enabled/disabled correctly
        window.postMessage({
          type: 'REQUEST_INTERCEPTOR_COMMAND',
          command: isEnabled ? 'enable' : 'disable'
        }, '*');
      } else if (isEnabled) {
        // If script not injected but should be enabled, inject it
        injectInterceptor();
      }

      // Process injection routes
      processInjectionRoutes(interceptedRoutes, isEnabled);

      sendResponse({ success: true });
    }
    
    return true; // Required for async response
  });
  
  // Listen for messages from the page script (enhanced for header logging)
  window.addEventListener('message', (event) => {
    // Only process messages from our interceptor
    if (event.data && event.data.type === 'REQUEST_INTERCEPTOR_LOG') {
      // Enhanced logging to include header-specific messages
      const message = event.data.message;
      if (message.includes('header') || message.includes('Header')) {
        console.log(`[Request Interceptor - Headers] ${message}`);
      } else {
        console.log(`[Request Interceptor] ${message}`);
      }
    }
  });
  
  // Function to inject the interceptor script into the page
  function injectInterceptor() {
    // Check if script is already injected
    if (document.getElementById(scriptId)) {
      // Just update the routes
      window.postMessage({
        type: 'REQUEST_INTERCEPTOR_COMMAND',
        command: 'updateRoutes',
        routes: interceptedRoutes
      }, '*');
      return;
    }
    
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = () => {
      // After the script is loaded, initialize it with current routes
      console.log('[Request Interceptor] Injecting interceptor with header support');
      window.postMessage({
        type: 'REQUEST_INTERCEPTOR_COMMAND',
        command: 'initialize',
        routes: interceptedRoutes
      }, '*');
    };
    
    (document.head || document.documentElement).appendChild(script);
  }
}

export {}; // Make this a module