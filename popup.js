// Popup script for the Request Interceptor Chrome Extension

document.addEventListener('DOMContentLoaded', function() {
  // UI Elements
  const enableToggle = document.getElementById('enableToggle');
  const statusText = document.getElementById('status-text');
  const routesCount = document.getElementById('routes-count');
  const openSidePanelBtn = document.getElementById('open-side-panel');
  
  // Track state locally
  let currentState = {
    enabled: false,
    routes: {}
  };
  
  // Get current state from background script
  chrome.runtime.sendMessage({ action: 'getState' }, function(response) {
    if (response) {
      // Update local state
      currentState.enabled = response.enabled || false;
      currentState.routes = response.routes || {};
      
      // Update UI based on current state
      updateEnabledState(currentState.enabled);
      updateRouteCount(currentState.routes);
    }
  });
  
  // Listen for changes to the enabled toggle
  enableToggle.addEventListener('change', function() {
    const isEnabled = enableToggle.checked;
    
    // Send message to background script
    chrome.runtime.sendMessage({ 
      action: 'toggleEnabled', 
      enabled: isEnabled 
    }, function(response) {
      if (response && response.success) {
        // Update local state
        currentState.enabled = isEnabled;
        updateEnabledState(isEnabled);
      }
    });
  });
  
  // Open side panel button
  openSidePanelBtn.addEventListener('click', function() {
    // Send a message to the background script to open the side panel
    chrome.runtime.sendMessage({ action: 'openSidePanel' }, function(response) {
      if (response && response.success) {
        // Close the popup after successfully opening the side panel
        window.close();
      } else {
        // Fallback for older Chrome versions or if the operation failed
        alert('Could not open side panel. Please ensure you are using the latest Chrome version.');
      }
    });
  });
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'stateChanged') {
      // Update enabled state
      currentState.enabled = message.enabled;
      updateEnabledState(message.enabled);
      
      // Update routes if they're included in the message
      if (message.routes) {
        currentState.routes = message.routes;
        updateRouteCount(message.routes);
      }
    } 
    else if (message.action === 'routesChanged') {
      // Update routes
      currentState.routes = message.routes || {};
      updateRouteCount(message.routes || {});
      
      // Update enabled state if it's included in the message
      if (message.hasOwnProperty('enabled')) {
        currentState.enabled = message.enabled;
        updateEnabledState(message.enabled);
      }
    }
    
    return true;
  });
  
  // Update UI based on enabled state
  function updateEnabledState(isEnabled) {
    enableToggle.checked = isEnabled;
    statusText.textContent = isEnabled ? 'Enabled' : 'Disabled';
    statusText.style.color = isEnabled ? '#10b981' : '#ef4444';
  }
  
  // Update the route count in the UI
  function updateRouteCount(routes) {
    const count = Object.keys(routes).length;
    routesCount.textContent = count;
  }
});