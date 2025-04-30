// Simplified Content script for Request Interceptor

// Create a unique ID for this instance
const scriptId = 'request-interceptor-script-' + Math.random().toString(36).slice(2, 10);

// Check if the interceptor script is already injected
if (!document.getElementById(scriptId)) {
  console.log('[Request Interceptor] Initializing content script');
  
  // Track state locally
  let isEnabled = false;
  let interceptedRoutes = {};
  
  // Get initial state from background script
  chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
    if (response) {
      isEnabled = response.enabled;
      interceptedRoutes = response.routes || {};
      
      // If enabled, inject the interceptor script immediately
      if (isEnabled) {
        injectInterceptor();
      }
    }
  });
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'stateChanged') {
      isEnabled = message.enabled;
      
      // Update routes if they're included in the message
      if (message.routes) {
        interceptedRoutes = message.routes;
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
      
      sendResponse({ success: true });
    }
    else if (message.action === 'routesChanged') {
      interceptedRoutes = message.routes || {};
      
      // Update enabled state if it's included in the message
      if (message.hasOwnProperty('enabled')) {
        isEnabled = message.enabled;
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
      
      sendResponse({ success: true });
    }
    
    return true; // Required for async response
  });
  
  // Listen for messages from the page script
  window.addEventListener('message', (event) => {
    // Only process messages from our interceptor
    if (event.data && event.data.type === 'REQUEST_INTERCEPTOR_LOG') {
      console.log(`[Request Interceptor] ${event.data.message}`);
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
    script.src = chrome.runtime.getURL('interceptor.js');
    script.onload = () => {
      // After the script is loaded, initialize it with current routes
      window.postMessage({
        type: 'REQUEST_INTERCEPTOR_COMMAND',
        command: 'initialize',
        routes: interceptedRoutes
      }, '*');
    };
    
    (document.head || document.documentElement).appendChild(script);
  }
}