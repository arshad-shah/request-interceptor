// Content script for Request Interceptor Chrome Extension

// Create a unique ID for this instance to avoid conflicts with multiple injections
const scriptId = 'request-interceptor-script-' + Math.random().toString(36).substring(2, 11);

// Check if the interceptor script is already injected on the page
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
      
      if (isEnabled) {
        // Inject the interceptor if now enabled
        injectInterceptor();
      } else {
        // Disable the interceptor
        window.postMessage({
          type: 'REQUEST_INTERCEPTOR_COMMAND',
          command: 'disable'
        }, '*');
      }
      
      sendResponse({ success: true });
    }
    else if (message.action === 'routesChanged') {
      interceptedRoutes = message.routes || {};
      
      // Update the routes in the injected script
      window.postMessage({
        type: 'REQUEST_INTERCEPTOR_COMMAND',
        command: 'updateRoutes',
        routes: interceptedRoutes
      }, '*');
      
      sendResponse({ success: true });
    }
    
    return true; // Required for async response
  });
  
  // Function to inject the interceptor script into the page
  function injectInterceptor() {
    // First, inject our main interceptor script
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
      
      // Add event listener for logging from the injected script
      window.addEventListener('message', (event) => {
        // Only process messages from our interceptor
        if (event.data && event.data.type === 'REQUEST_INTERCEPTOR_LOG') {
          console.log(`[Request Interceptor] ${event.data.message}`);
        }
      });
    };
    
    (document.head || document.documentElement).appendChild(script);
    
    // Inject UI controller if needed (can be controlled by config)
    const shouldInjectUI = true; // Could be made configurable
    
    if (shouldInjectUI) {
      injectControlPanel();
    }
  }
  
  // Function to inject a floating control panel
  function injectControlPanel() {
    // Create container for the UI
    const container = document.createElement('div');
    container.id = 'request-interceptor-ui';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 999999;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      color: #333;
      max-width: 300px;
      display: none; /* Start hidden, toggle with button */
    `;
    
    // Create toggle button
    const toggleButton = document.createElement('div');
    toggleButton.id = 'request-interceptor-toggle';
    toggleButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4285f4;
      color: white;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000000;
      font-size: 24px;
    `;
    toggleButton.textContent = '⚡';
    toggleButton.title = 'Toggle Request Interceptor';
    
    // Add status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.style.cssText = `
      position: absolute;
      top: -5px;
      right: -5px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${isEnabled ? '#4caf50' : '#f44336'};
      border: 2px solid white;
    `;
    toggleButton.appendChild(statusIndicator);
    
    // Add click event to toggle UI
    toggleButton.addEventListener('click', () => {
      const isVisible = container.style.display !== 'none';
      container.style.display = isVisible ? 'none' : 'block';
    });
    
    // Build the control panel UI
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 16px;">Request Interceptor</h3>
        <button id="interceptor-close-btn" style="background: none; border: none; cursor: pointer; font-size: 18px;">×</button>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: flex; align-items: center;">
          <input type="checkbox" id="interceptor-enable" ${isEnabled ? 'checked' : ''}>
          <span style="margin-left: 8px;">Enable Interceptor</span>
        </label>
      </div>
      
      <div style="margin-bottom: 15px;">
        <button id="interceptor-routes-btn" style="width: 100%; padding: 8px; background: #f1f3f4; border: none; border-radius: 4px; cursor: pointer;">
          Manage Routes (${Object.keys(interceptedRoutes).length})
        </button>
      </div>
      
      <div style="font-size: 12px; color: #666;">
        Request Interceptor is running on this page.
        <a href="#" id="interceptor-open-panel" style="color: #4285f4; text-decoration: none;">Open full panel</a>
      </div>
    `;
    
    // Add to the page
    document.body.appendChild(toggleButton);
    document.body.appendChild(container);
    
    // Set up event listeners for the UI
    setTimeout(() => {
      document.getElementById('interceptor-close-btn').addEventListener('click', () => {
        container.style.display = 'none';
      });
      
      document.getElementById('interceptor-enable').addEventListener('change', (e) => {
        const enabled = e.target.checked;
        chrome.runtime.sendMessage({ action: 'toggleEnabled', enabled });
        statusIndicator.style.background = enabled ? '#4caf50' : '#f44336';
      });
      
      document.getElementById('interceptor-routes-btn').addEventListener('click', () => {
        // Open the full popup
        chrome.runtime.sendMessage({ action: 'openPopup' });
      });
      
      document.getElementById('interceptor-open-panel').addEventListener('click', (e) => {
        e.preventDefault();
        // Open the full popup
        chrome.runtime.sendMessage({ action: 'openPopup' });
      });
    }, 0);
  }
}