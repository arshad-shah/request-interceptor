// Simplified Side panel script for the Request Interceptor

document.addEventListener('DOMContentLoaded', function() {

    // Import templates.js script dynamically
  const templatesScript = document.createElement('script');
  templatesScript.src = 'templates.js';
  templatesScript.onload = function() {
    // Import templates-manager.js script after templates.js is loaded
    const templatesManagerScript = document.createElement('script');
    templatesManagerScript.src = 'templates-manager.js';
    templatesManagerScript.onload = function() {
      // Initialize TemplatesManager after script is loaded
      const notificationManager = new NotificationManager();
      const templatesManager = new TemplatesManager(notificationManager);
      
      // Make templatesManager available globally for debugging
      window.templatesManager = templatesManager;
    };
    document.head.appendChild(templatesManagerScript);
  };
  document.head.appendChild(templatesScript);


  // UI Elements
  const elements = {
    enableToggle: document.getElementById('enableToggle'),
    statusText: document.getElementById('status-text'),
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    routeList: document.getElementById('route-list'),
    clearRoutesBtn: document.getElementById('clear-routes-btn'),
    addRouteForm: document.getElementById('add-route-form'),
    urlInput: document.getElementById('url'),
    methodSelect: document.getElementById('method'),
    statusInput: document.getElementById('status'),
    delayInput: document.getElementById('delay'),
    contentTypeSelect: document.getElementById('contentType'),
    responseBodyTextarea: document.getElementById('responseBody'),
    formatJsonBtn: document.getElementById('formatJsonBtn'),
    clearEditorBtn: document.getElementById('clearEditorBtn'),
    addRouteBtn: document.getElementById('addRouteBtn')
  };
  
  // State tracking
  let currentState = {
    enabled: false,
    routes: {},
    editingRouteKey: null
  };
  
  // Initialize
  initialize();
  
  // Functions
  function initialize() {
    setupTabs();
    setupEventListeners();
    loadState();
  }
  
  // Setup tab navigation
  function setupTabs() {
    // Add click event to all tabs
    elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        selectTab(tabName);
      });
    });
  }
  
  // Select a specific tab
  function selectTab(tabName) {
    // Remove active class from all tabs and contents
    elements.tabs.forEach(tab => tab.classList.remove('active'));
    elements.tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }
  
  // Setup event listeners
  function setupEventListeners() {
    // Toggle interceptor enabled/disabled
    elements.enableToggle.addEventListener('change', function() {
      const isEnabled = this.checked;
      toggleEnabled(isEnabled);
    });
    
    // Clear all routes
    elements.clearRoutesBtn.addEventListener('click', function() {
      if (confirm('Are you sure you want to clear all interception routes?')) {
        clearRoutes();
      }
    });
    
    // Format JSON button
    elements.formatJsonBtn.addEventListener('click', function() {
      formatJson();
    });
    
    // Clear editor button
    elements.clearEditorBtn.addEventListener('click', function() {
      elements.responseBodyTextarea.value = '';
    });
    
    // Add route button
    elements.addRouteBtn.addEventListener('click', function() {
      addRoute();
    });
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
      if (message.action === 'stateChanged') {
        updateEnabledState(message.enabled);
        // Update routes if they're included in the message
        if (message.routes) {
          currentState.routes = message.routes;
          updateRoutesList();
        }
      } 
      else if (message.action === 'routesChanged') {
        currentState.routes = message.routes || {};
        updateRoutesList();
        // Update enabled state if it's included in the message
        if (message.hasOwnProperty('enabled')) {
          updateEnabledState(message.enabled);
        }
      }
      
      return true;
    });
  }
  
  // Load state from background script
  function loadState() {
    chrome.runtime.sendMessage({ action: 'getState' }, function(response) {
      if (response) {
        currentState.enabled = response.enabled || false;
        currentState.routes = response.routes || {};
        
        updateEnabledState(currentState.enabled);
        updateRoutesList();
      }
    });
  }
  
  // Toggle interceptor enabled/disabled
  function toggleEnabled(isEnabled) {
    chrome.runtime.sendMessage({ 
      action: 'toggleEnabled', 
      enabled: isEnabled 
    }, function(response) {
      if (response && response.success) {
        currentState.enabled = isEnabled;
        updateEnabledState(isEnabled);
      }
    });
  }
  
  // Update UI based on enabled state
  function updateEnabledState(isEnabled) {
    elements.enableToggle.checked = isEnabled;
    elements.statusText.textContent = isEnabled ? 'Enabled' : 'Disabled';
    elements.statusText.style.color = isEnabled ? '#10b981' : '#ef4444';
  }
  
  // Add a new route
  function addRoute() {
    // Get form values
    const url = elements.urlInput.value.trim();
    const method = elements.methodSelect.value;
    const status = parseInt(elements.statusInput.value);
    const delay = parseInt(elements.delayInput.value);
    const contentType = elements.contentTypeSelect.value;
    const responseBodyStr = elements.responseBodyTextarea.value;
    
    if (!url) {
      showNotification('Please enter a URL to intercept', 'error');
      return;
    }
    
    // Validate and parse response body
    let responseBody;
    try {
      if (contentType === 'application/json') {
        responseBody = JSON.parse(responseBodyStr);
      } else {
        responseBody = responseBodyStr;
      }
    } catch (error) {
      showNotification(`Invalid JSON format: ${error.message}`, 'error');
      return;
    }
    
    // Create route key and config
    const routeKey = currentState.editingRouteKey || `${method}:${url}`;
    const routeConfig = {
      status,
      delay,
      response: responseBody,
      contentType
    };
    
    // Add route via background script
    chrome.runtime.sendMessage({
      action: 'addRoute',
      route: routeKey,
      config: routeConfig
    }, function(response) {
      if (response && response.success) {
        // Update local state to reflect changes immediately
        currentState.routes[routeKey] = routeConfig;
        updateRoutesList();
        
        if (currentState.editingRouteKey) {
          showNotification('Route updated successfully');
          currentState.editingRouteKey = null;
        } else {
          showNotification('Route added successfully');
        }
        
        // Switch to routes tab
        selectTab('routes');
        
        // Reset form
        resetAddRouteForm();
      }
    });
  }
  
  // Remove a route
  function removeRoute(routeKey) {
    chrome.runtime.sendMessage({
      action: 'removeRoute',
      route: routeKey
    }, function(response) {
      if (response && response.success) {
        // Update local state immediately
        delete currentState.routes[routeKey];
        updateRoutesList();
        showNotification('Route removed successfully');
      }
    });
  }
  
  // Clear all routes
  function clearRoutes() {
    chrome.runtime.sendMessage({ action: 'clearRoutes' }, function(response) {
      if (response && response.success) {
        // Update local state immediately
        currentState.routes = {};
        updateRoutesList();
        showNotification('All routes cleared');
      }
    });
  }
  
  // Format JSON in the editor
  function formatJson() {
    try {
      const jsonString = elements.responseBodyTextarea.value;
      const parsed = JSON.parse(jsonString);
      elements.responseBodyTextarea.value = JSON.stringify(parsed, null, 2);
      showNotification('JSON formatted successfully');
    } catch (error) {
      showNotification(`Invalid JSON: ${error.message}`, 'error');
    }
  }
  
  // Reset the add route form
  function resetAddRouteForm() {
    elements.addRouteForm.reset();
    elements.responseBodyTextarea.value = JSON.stringify({ 
      status: 'success',
      data: [{ id: 1, name: 'Example' }] 
    }, null, 2);
    
    // Reset editing mode
    currentState.editingRouteKey = null;

    // Update button text to reflect we're adding a new route
    elements.addRouteBtn.textContent = 'Add Route';
  }
  
// Edit an existing route
  function editRoute(routeKey) {
    const routeConfig = currentState.routes[routeKey];
    
    if (routeConfig) {
      // Show notification
      showNotification('Editing route. Make changes and click "Save Changes" to update.');
      
      // Parse the route key to get method and URL
      const [method, ...urlParts] = routeKey.split(':');
      const url = urlParts.join(':');
      
      // Populate form with existing values
      elements.urlInput.value = url;
      elements.methodSelect.value = method;
      elements.statusInput.value = routeConfig.status;
      elements.delayInput.value = routeConfig.delay;
      elements.contentTypeSelect.value = routeConfig.contentType || 'application/json';
      
      // Format and set response body
      if (typeof routeConfig.response === 'object') {
        elements.responseBodyTextarea.value = JSON.stringify(routeConfig.response, null, 2);
      } else {
        elements.responseBodyTextarea.value = routeConfig.response || '';
      }
      
      // Set editing mode
      currentState.editingRouteKey = routeKey;
      
      // Change button text to reflect we're updating
      elements.addRouteBtn.textContent = 'Save Changes';

      // Switch to add tab
      selectTab('add');
    }
  }
  
  // Format response for preview display
  function formatResponsePreview(response) {
    if (typeof response === 'object') {
      // For objects, show a formatted JSON representation
      const json = JSON.stringify(response, null, 2);
      const shortened = json.length > 500 
        ? json.substring(0, 500) + '...' 
        : json;
      return escapeHtml(shortened);
    }
    
    // For strings, truncate if needed
    if (typeof response === 'string') {
      const shortened = response.length > 500
        ? response.substring(0, 500) + '...'
        : response;
      return escapeHtml(shortened);
    }
    
    return String(response);
  }
  
  // Helper function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Show a notification
  function showNotification(message, type = 'success') {
    const notificationContainer = document.getElementById('notification-container');
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Add icon based on type
    const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center;">
        <i class="fas fa-${icon}" style="margin-right: 8px;"></i>
        <span>${message}</span>
      </div>
    `;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Remove after timeout
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
  
// Update routes list in UI
function updateRoutesList() {
  // Clear current list
  elements.routeList.innerHTML = '';
  
  const routeEntries = Object.entries(currentState.routes);
  
  if (routeEntries.length === 0) {
    // Show empty state
    elements.routeList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-route"></i>
        </div>
        <h3>No routes configured yet</h3>
        <p>Add your first route to start intercepting API requests and mocking responses.</p>
        <button class="btn" id="add-first-route">
          <i class="fas fa-plus-circle"></i>
          <span>Add Your First Route</span>
        </button>
      </div>
    `;
    
    // Attach event listener to the button
    document.getElementById('add-first-route').addEventListener('click', () => {
      selectTab('add');
    });
    
    return;
  }
  
  
  // Add each route
  routeEntries.forEach(([key, config]) => {
    const [method, ...urlParts] = key.split(':');
    const url = urlParts.join(':');
    
    // Get a description based on the URL and method
    const description = getRouteDescription(method, url);
    
    // Format timestamp (assuming config has a timestamp property)
    const timestamp = config.timestamp ? new Date(config.timestamp).toLocaleDateString() : 'N/A';
    
    // Get content type display name
    const contentTypeName = getContentTypeDisplayName(config.contentType);
    
    const routeElement = document.createElement('div');
    routeElement.className = `route-item method-${method}`;
    
    // Format response for display
    const responsePreview = formatResponsePreview(config.response);
    
    routeElement.innerHTML = `
      <div class="route-item-header">
        <div class="route-item-title">
          <span class="method-badge method-${method}">${method}</span>
          <div class="route-url-wrapper">
            <span class="route-url">${escapeHtml(url)}</span>
            <span class="route-description">${description}</span>
          </div>
        </div>
      </div>
      <div class="route-item-body">
        <div class="route-details">
          <div class="detail-item">
            <i class="fas fa-code"></i>
            <span>Status: ${config.status}</span>
          </div>
          <div class="detail-item">
            <i class="fas fa-clock"></i>
            <span>Delay: ${config.delay}ms</span>
          </div>
          <div class="detail-item">
            <i class="fas fa-file-code"></i>
            <span>${contentTypeName}</span>
          </div>
          <div class="detail-item">
            <i class="fas fa-calendar"></i>
            <span>Added: ${timestamp}</span>
          </div>
        </div>
        
        <div class="route-response-header">
          <div class="response-title">
            <i class="fas fa-exchange-alt"></i>
            <span>Response Body</span>
          </div>
        </div>
        
        <div class="route-response">
          <pre><code class="language-json">${responsePreview}</code></pre>
        </div>
        
        <div class="route-actions-buttons">
          <button class="action-btn action-btn-edit" data-route="${escapeHtml(key)}">
            <i class="fas fa-edit"></i>
            <span>Edit</span>
          </button>
          <button class="action-btn action-btn-remove" data-route="${escapeHtml(key)}">
            <i class="fas fa-trash-alt"></i>
            <span>Remove</span>
          </button>
        </div>
      </div>
    `;
    
    elements.routeList.appendChild(routeElement);
    
    // Add click handler for remove button
    routeElement.querySelector('.action-btn-remove').addEventListener('click', function() {
      const routeKey = this.getAttribute('data-route');
      showConfirmationDialog(
        'Delete Route',
        `Are you sure you want to delete the ${method} route for "${url}"?`,
        () => removeRoute(routeKey)
      );
    });
    
    // Add click handler for edit button
    routeElement.querySelector('.action-btn-edit').addEventListener('click', function() {
      const routeKey = this.getAttribute('data-route');
      editRoute(routeKey);
    });
  });
  
  // Apply syntax highlighting if Prism is available
  if (window.Prism) {
    Prism.highlightAll();
  }
}

// Helper function to get route description
function getRouteDescription(method, url) {
  // Create descriptions based on method and URL patterns
  const urlLower = url.toLowerCase();
  
  if (method === 'GET') {
    return 'Returns requested resource';
  }
  
  if (method === 'POST') {
    if (urlLower.includes('user') || urlLower.includes('register')) {
      return 'Creates a new user';
    }
    if (urlLower.includes('login') || urlLower.includes('auth')) {
      return 'Authenticates a user';
    }
    if (urlLower.includes('product')) {
      return 'Creates a new product';
    }
    return 'Creates a new resource';
  }
  
  if (method === 'PUT') {
    return 'Updates an existing resource';
  }
  
  if (method === 'DELETE') {
    return 'Deletes a resource';
  }
  
  if (method === 'PATCH') {
    return 'Partially updates a resource';
  }
  
  return 'Intercepts API requests';
}

// Helper function to get a friendly content type name
function getContentTypeDisplayName(contentType) {
  if (!contentType) return 'JSON';
  
  const typeMap = {
    'application/json': 'JSON',
    'text/plain': 'Text',
    'text/html': 'HTML',
    'application/xml': 'XML'
  };
  
  return typeMap[contentType] || contentType.split('/')[1] || 'Unknown';
}

// Show a confirmation dialog
function showConfirmationDialog(title, message, onConfirm) {
  const dialog = document.createElement('div');
  dialog.className = 'confirmation-dialog';
  dialog.innerHTML = `
    <div class="confirmation-dialog-content">
      <div class="confirmation-dialog-header">
        <h3>${title}</h3>
        <button class="confirmation-close-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="confirmation-dialog-body">
        <p>${message}</p>
      </div>
      <div class="confirmation-dialog-footer">
        <button class="btn btn-secondary cancel-btn">Cancel</button>
        <button class="btn btn-danger confirm-btn">Delete</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // Add event listeners
  dialog.querySelector('.confirmation-close-btn').addEventListener('click', () => {
    document.body.removeChild(dialog);
  });
  
  dialog.querySelector('.cancel-btn').addEventListener('click', () => {
    document.body.removeChild(dialog);
  });
  
  dialog.querySelector('.confirm-btn').addEventListener('click', () => {
    document.body.removeChild(dialog);
    onConfirm();
  });
  
  // Close dialog when clicking outside
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      document.body.removeChild(dialog);
    }
  });
}
});