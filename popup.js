// Popup script for the Request Interceptor Chrome Extension

document.addEventListener('DOMContentLoaded', function() {
  // Get UI elements
  const enableToggle = document.getElementById('enableToggle');
  const statusText = document.getElementById('status-text');
  const routeList = document.getElementById('route-list');
  const addRouteForm = document.getElementById('add-route-form');
  const clearRoutesBtn = document.getElementById('clear-routes-btn');
  const logsContainer = document.getElementById('logs-container');
  
  // Tab navigation
  setupTabs();
  
  // Get current state from background script
  chrome.runtime.sendMessage({ action: 'getState' }, function(response) {
    if (response) {
      // Update UI based on current state
      updateEnabledState(response.enabled);
      updateRoutesList(response.routes);
    }
  });
  
  // Listen for changes to the enabled toggle
  enableToggle.addEventListener('change', function() {
    const isEnabled = enableToggle.checked;
    
    // Send message to background script
    chrome.runtime.sendMessage({ 
      action: 'toggleEnabled', 
      enabled: isEnabled 
    });
    
    // Update UI
    updateEnabledState(isEnabled);
  });
  
  // Handle form submission for adding routes
  addRouteForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form values
    const url = document.getElementById('url').value;
    const method = document.getElementById('method').value;
    const status = parseInt(document.getElementById('status').value);
    const delay = parseInt(document.getElementById('delay').value);
    const contentType = document.getElementById('contentType').value;
    const responseBodyStr = document.getElementById('responseBody').value;
    
    // Validate and parse response body
    let responseBody;
    try {
      if (contentType === 'application/json') {
        responseBody = JSON.parse(responseBodyStr);
      } else {
        responseBody = responseBodyStr;
      }
    } catch (error) {
      console.error('JSON parsing error:', error);
      alert(`Invalid JSON format in response body: ${error.message}`);
      document.getElementById('responseBody').focus();
      return;
    }
    
    // Create route key and config
    const routeKey = `${method}:${url}`;
    const routeConfig = {
      method,
      status,
      delay,
      response: responseBody,
      contentType
    };
    
    // Send to background script
    chrome.runtime.sendMessage({
      action: 'addRoute',
      route: routeKey,
      config: routeConfig
    }, function(response) {
      if (response && response.success) {
        // Switch to routes tab
        selectTab('routes');
        
        // Reset form
        addRouteForm.reset();
        document.getElementById('responseBody').value = JSON.stringify({ status: 'success', data: [{ id: 1, name: 'Example' }] }, null, 2);
        
        // Refresh routes list
        chrome.runtime.sendMessage({ action: 'getState' }, function(response) {
          if (response) {
            updateRoutesList(response.routes);
          }
        });
      }
    });
  });
  
  // Clear all routes
  clearRoutesBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all interception routes?')) {
      chrome.runtime.sendMessage({ action: 'clearRoutes' }, function(response) {
        if (response && response.success) {
          updateRoutesList({});
        }
      });
    }
  });
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'stateChanged') {
      updateEnabledState(message.enabled);
    } 
    else if (message.action === 'routesChanged') {
      updateRoutesList(message.routes);
    }
    else if (message.action === 'newLog') {
      addLogEntry(message.log);
    }
    
    return true;
  });
  
  // Setup tab navigation
  function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    // Add click event to all tabs
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        selectTab(tabName);
      });
    });
    
    // Also handle clicks on tab links inside content
    document.querySelectorAll('.tab-link').forEach(link => {
      link.addEventListener('click', () => {
        const tabName = link.getAttribute('data-tab');
        selectTab(tabName);
      });
    });
  }
  
  // Select a specific tab
  function selectTab(tabName) {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Remove active class from all tabs and contents
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }
  
  // Update UI based on enabled state
  function updateEnabledState(isEnabled) {
    enableToggle.checked = isEnabled;
    statusText.textContent = isEnabled ? 'Enabled' : 'Disabled';
    statusText.style.color = isEnabled ? '#34a853' : '#ea4335';
  }
  
  // Update routes list in UI
  function updateRoutesList(routes) {
    // Clear current list
    routeList.innerHTML = '';
    
    const routeEntries = Object.entries(routes);
    
    if (routeEntries.length === 0) {
      // Show empty state
      routeList.innerHTML = `
        <div class="empty-state">
          <p>No routes configured yet.</p>
          <button class="tab-link" data-tab="add">Add Your First Route</button>
        </div>
      `;
      
      // Reattach event listener
      routeList.querySelector('.tab-link').addEventListener('click', () => {
        selectTab('add');
      });
      
      return;
    }
    
    // Add each route
    routeEntries.forEach(([key, config]) => {
      const [method, ...urlParts] = key.split(':');
      const url = urlParts.join(':'); // Rejoin in case URL contained colons
      
      const routeElement = document.createElement('div');
      routeElement.className = 'route-item';
      
      // Set method badge class
      const methodClass = method.toLowerCase() === 'get' ? 'method-get' :
                         method.toLowerCase() === 'post' ? 'method-post' :
                         method.toLowerCase() === 'put' ? 'method-put' :
                         method.toLowerCase() === 'delete' ? 'method-delete' :
                         '';
      
      routeElement.innerHTML = `
        <div class="route-header">
          <div>
            <span class="method-badge ${methodClass}">${method}</span>
            <span class="route-url">${escapeHtml(url)}</span>
          </div>
          <button class="remove-route secondary" data-route="${escapeHtml(key)}">Remove</button>
        </div>
        <div class="route-details">
          Status: ${config.status} | Delay: ${config.delay}ms | Type: ${config.contentType}
        </div>
        <div class="route-details" style="margin-top: 4px;">
          Response: <code>${formatResponse(config.response)}</code>
        </div>
      `;
      
      routeList.appendChild(routeElement);
      
      // Add click handler for remove button
      routeElement.querySelector('.remove-route').addEventListener('click', function() {
        const routeKey = this.getAttribute('data-route');
        removeRoute(routeKey);
      });
    });
    
    // Reattach tab link handlers
    document.querySelectorAll('.tab-link').forEach(link => {
      link.addEventListener('click', () => {
        const tabName = link.getAttribute('data-tab');
        selectTab(tabName);
      });
    });
  }
  
  // Add a log entry to the logs container
  function addLogEntry(log) {
    const logElement = document.createElement('div');
    logElement.className = 'log-entry';
    
    const time = new Date().toTimeString().split(' ')[0];
    logElement.innerHTML = `
      <span class="log-time">[${time}]</span>
      ${escapeHtml(log.message)}
    `;
    
    logsContainer.prepend(logElement);
    
    // Limit to 100 log entries
    const logEntries = logsContainer.querySelectorAll('.log-entry');
    if (logEntries.length > 100) {
      logsContainer.removeChild(logEntries[logEntries.length - 1]);
    }
  }
  
  // Remove a route
  function removeRoute(routeKey) {
    chrome.runtime.sendMessage({
      action: 'removeRoute',
      route: routeKey
    }, function(response) {
      if (response && response.success) {
        // Refresh routes list
        chrome.runtime.sendMessage({ action: 'getState' }, function(response) {
          if (response) {
            updateRoutesList(response.routes);
          }
        });
      }
    });
  }
  
  // Helper function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Format response for display
  function formatResponse(response) {
    if (typeof response === 'object') {
      // For objects, show a truncated JSON representation
      const json = JSON.stringify(response);
      if (json.length > 50) {
        return json.substring(0, 50) + '...';
      }
      return json;
    }
    
    // For strings, truncate if needed
    if (typeof response === 'string' && response.length > 50) {
      return response.substring(0, 50) + '...';
    }
    
    return String(response);
  }
});