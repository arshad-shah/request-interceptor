// Simplified Side panel script for the Request Interceptor

function initCustomSelectStyles() {
  // Function to style the currently selected option
  function updateSelectStyle(select) {
    // Get the selected option value
    const selectedValue = select.value;
    
    // Apply different styles based on the select element
    if (select.id === 'method') {
      // Style for method select
      let bgColor;
      switch (selectedValue) {
        case 'GET':
          bgColor = '#10b981';
          break;
        case 'POST':
          bgColor = '#3b82f6';
          break;
        case 'PUT':
          bgColor = '#f59e0b';
          break;
        case 'DELETE':
          bgColor = '#ef4444';
          break;
        case 'PATCH':
          bgColor = '#8b5cf6';
          break;
        default:
          bgColor = '#6b7280';
      }
      
      // Apply the background color to the select
      select.style.backgroundColor = bgColor;
      select.style.color = 'white';
      select.style.fontWeight = 'bold';
      
      // Also style the icon
      const iconElement = select.parentElement.querySelector('.select-icon i');
      if (iconElement) {
        iconElement.style.color = 'white';
      }
    } else if (select.id === 'contentType') {
      // Style for content type select - more subtle
      select.style.backgroundColor = '#f3f4f6';
      select.style.color = '#374151';
      select.style.fontWeight = 'normal';
      
      // Reset icon color
      const iconElement = select.parentElement.querySelector('.select-icon i');
      if (iconElement) {
        iconElement.style.color = '#6b7280';
      }
    }
  }
  
  // Find all custom selects
  const customSelects = document.querySelectorAll('.custom-select select');
  
  // Add event listeners and initialize styles for each select
  customSelects.forEach(select => {
    // Initialize with current selection
    updateSelectStyle(select);
    
    // Update on change
    select.addEventListener('change', function() {
      updateSelectStyle(this);
    });
  });
}


document.addEventListener('DOMContentLoaded', function() {
  initAceEditors();
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
    addRouteBtn: document.getElementById('addRouteBtn'),
    addNewRouteBtn: document.getElementById('add-route-btn')
  };
  
  // State tracking
  let currentState = {
    enabled: false,
    routes: {},
    editingRouteKey: null
  };
  
  // Initialize
  initialize();
  
function initialize() {
  setupTabs();
  setupEventListeners();
  loadState();
  
  // Initialize custom select styles when applicable
  if (document.querySelector('.custom-select')) {
    initCustomSelectStyles();
  }
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
    
    // If switching to routes tab, refresh the routes list
    if (tabName === 'routes') {
      // Refresh state from background
      chrome.runtime.sendMessage({ action: 'getState' }, function(response) {
        if (response) {
          // Update local state
          currentState.enabled = response.enabled || false;
          currentState.routes = response.routes || {};
          
          // Update the routes list with current state
          updateRoutesList();
        }
      });
    }
    
    // If switching to templates tab, refresh template buttons if templatesManager exists
    if (tabName === 'templates' && window.templatesManager) {
      window.templatesManager.createTemplateButtons();
    }
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
      showConfirmationDialog(
      'Clear All Routes',
      'Are you sure you want to clear all interception routes? This action cannot be undone.',
      clearRoutes
      );
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

    const searchInput = document.getElementById('search-routes');
    searchInput.addEventListener('input', function() {
      filterRoutes();
    });

    // Filter by method
    const methodFilter = document.getElementById('filter-method');
    methodFilter.addEventListener('change', function() {
      filterRoutes();
    });

    //add new route button
    elements.addNewRouteBtn.addEventListener('click', function() {
      selectTab('add');
    });

    // Add this to the setupEventListeners function in sidepanel.js
    document.getElementById('cancelBtn').addEventListener('click', function() {
      resetAddRouteForm();
      selectTab('routes');
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

  function filterRoutes() {
  const searchTerm = document.getElementById('search-routes').value.toLowerCase();
  const methodFilter = document.getElementById('filter-method').value;
  const routeItems = document.querySelectorAll('.route-item');
  let visibleCount = 0;
  
  routeItems.forEach(item => {
    // Get the URL text from this route item
    const urlElement = item.querySelector('.route-url');
    if (!urlElement) return;
    
    const url = urlElement.textContent.toLowerCase();
    const method = item.classList.contains('method-GET') ? 'GET' :
                   item.classList.contains('method-POST') ? 'POST' :
                   item.classList.contains('method-PUT') ? 'PUT' :
                   item.classList.contains('method-DELETE') ? 'DELETE' :
                   item.classList.contains('method-PATCH') ? 'PATCH' : '';
    
    // Check if it matches both the search term and the method filter
    const matchesSearch = url.includes(searchTerm);
    const matchesMethod = methodFilter === 'all' || method === methodFilter;
    
    // Show or hide based on both conditions
    if (matchesSearch && matchesMethod) {
      item.style.display = '';
      visibleCount++;
    } else {
      item.style.display = 'none';
    }
  });
  
  // Handle empty state when no routes match the filter
  const routeList = document.getElementById('route-list');
  const existingEmptyState = routeList.querySelector('.filter-empty-state');
  
  // If no items are visible and we have routes, show "no matches" message
  if (visibleCount === 0 && Object.keys(currentState.routes).length > 0) {
    if (!existingEmptyState) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state filter-empty-state';
      emptyState.innerHTML = `
        <div class="empty-state-icon">
          <i class="fas fa-search"></i>
        </div>
        <h3>No matching routes found</h3>
        <p>Try adjusting your search or filter criteria.</p>
        <button class="btn btn-secondary" id="clear-filters-btn">
          <i class="fas fa-times"></i>
          <span>Clear Filters</span>
        </button>
      `;
      routeList.appendChild(emptyState);
      
      // Add event listener to clear filters button
      document.getElementById('clear-filters-btn').addEventListener('click', function() {
        document.getElementById('search-routes').value = '';
        document.getElementById('filter-method').value = 'all';
        filterRoutes();
      });
    }
  } else if (existingEmptyState) {
    // Remove empty state if we have matches
    existingEmptyState.remove();
  }
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
    elements.statusText.style.fontWeight = 'bold';
    elements.statusText.style.fontSize = '16px';
    elements.statusText.style.transition = 'color 0.3s ease';
    elements.statusText.style.opacity = '1';
    elements.statusText.style.transition = 'opacity 0.3s ease';
  }
  
function addRoute() {
  // Get form values
  const url = elements.urlInput.value.trim();
  const method = elements.methodSelect.value;
  const status = parseInt(elements.statusInput.value);
  const delay = parseInt(elements.delayInput.value);
  const contentType = elements.contentTypeSelect.value;
  // Get value from Ace editor if available, otherwise from textarea
  const responseBodyStr = window.responseBodyEditor ? 
    window.responseBodyEditor.getValue() : 
    elements.responseBodyTextarea.value;
  
  if (!url) {
    showNotification('URL Required', 'Please enter a valid URL pattern to intercept requests', 'error');
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
    showNotification('Invalid JSON', 'Please enter valid JSON in the response body', 'error');
    return;
  }
  
  // Create the new route key
  const newRouteKey = `${method}:${url}`;
  
  // Check if we're in edit mode
  const isEditing = currentState.editingRouteKey != null;
  
  // Check if URL or method has been changed in edit mode
  let methodOrUrlChanged = false;
  if (isEditing) {
    const originalUrl = currentState.originalUrl;
    const originalMethod = currentState.originalMethod;
    methodOrUrlChanged = (originalUrl !== url || originalMethod !== method);
  }
  
  // Check if a route with the same URL but different method already exists
  const conflictingRoutes = Object.keys(currentState.routes).filter(key => {
    const routeUrl = key.split(':').slice(1).join(':'); // Get URL part
    const routeMethod = key.split(':')[0]; // Get method part
    return routeUrl === url && routeMethod !== method;
  });
  
  // If editing and changing the method, check if the new method+URL combination already exists
  if (isEditing && methodOrUrlChanged && currentState.originalUrl === url && 
      currentState.originalMethod !== method && currentState.routes[newRouteKey]) {
    if (!confirm(`A route with ${method} method for URL "${url}" already exists. Do you want to overwrite it?`)) {
      return; // Abort if user cancels
    }
  }
  
  // If adding a new route (not editing) and conflicting routes exist, notify the user
  if (!isEditing && conflictingRoutes.length > 0) {
    const conflictingMethods = conflictingRoutes.map(key => key.split(':')[0]).join(', ');
    
    const confirmMessage = `There's already a route for URL "${url}" with method(s): ${conflictingMethods}. Adding this route won't affect those routes since they use different methods. Continue?`;
    showConfirmationDialog(
      'Add Route',
      confirmMessage,
      () => {
      // Continue with adding the route if user confirms
      }
    );
    return; // Return early while waiting for confirmation
  }
  
  // Get the current enabled state if we're updating without changing method/url
  let enabled = true;
  if (isEditing && !methodOrUrlChanged && currentState.routes[currentState.editingRouteKey]) {
    enabled = currentState.routes[currentState.editingRouteKey].hasOwnProperty('enabled') 
      ? currentState.routes[currentState.editingRouteKey].enabled 
      : true;
  }
  
  // Create route config
  const routeConfig = {
    status,
    delay,
    response: responseBody,
    contentType,
    enabled,
    timestamp: Date.now()
  };
  
  // If we're editing and method or URL has changed, we need to:
  // 1. Remove the old route
  // 2. Add the new route
  if (isEditing && methodOrUrlChanged) {
    // Remove the old route first
    chrome.runtime.sendMessage({
      action: 'removeRoute',
      route: currentState.editingRouteKey
    }, function(removeResponse) {
      if (removeResponse && removeResponse.success) {
        // Now add the new route
        chrome.runtime.sendMessage({
          action: 'addRoute',
          route: newRouteKey,
          config: routeConfig
        }, function(addResponse) {
          if (addResponse && addResponse.success) {
            // Update local state to reflect changes
            delete currentState.routes[currentState.editingRouteKey];
            currentState.routes[newRouteKey] = routeConfig;
            updateRoutesList();
            
            showNotification('success', 'Route has been updated with new method and URL');
            
            // Switch to routes tab
            selectTab('routes');
            
            // Reset form and editing state
            resetAddRouteForm();
          }
        });
      }
    });
  } else {
    // Standard add/update without changing method/URL
    const routeKey = isEditing ? currentState.editingRouteKey : newRouteKey;
    
    chrome.runtime.sendMessage({
      action: 'addRoute',
      route: routeKey,
      config: routeConfig
    }, function(response) {
      if (response && response.success) {
        // Update local state to reflect changes immediately
        currentState.routes[routeKey] = routeConfig;
        updateRoutesList();
        
        if (response.isUpdate) {
          showNotification('Success', 'Route updated successfully');
        } else {
          showNotification('Success', 'Route added successfully');
        }
        
        // Switch to routes tab
        selectTab('routes');
        
        // Reset form
        resetAddRouteForm();
      }
    });
  }
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
        showNotification('Success', 'Route removed successfully');
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
        showNotification('Success', 'All routes cleared successfully');
      }
    });
  }

  function initAceEditors() {
    // Initialize responseBody editor
    const responseBodyEditor = ace.edit("responseBodyEditor");
    responseBodyEditor.setTheme("ace/theme/monokai");
    responseBodyEditor.session.setMode("ace/mode/json");
    responseBodyEditor.setOptions({
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      showPrintMargin: false,
      fontSize: "14px",
      wrap: true
    });
    
    // Set initial value from hidden input
    const initialResponseBody = document.getElementById('responseBody').value;
    responseBodyEditor.setValue(initialResponseBody || '{}', -1);
    
    // Update hidden input when editor content changes
    responseBodyEditor.getSession().on('change', function() {
      document.getElementById('responseBody').value = responseBodyEditor.getValue();
    });
    
    // Initialize schema input editor
    const schemaInputEditor = ace.edit("schemaInputEditor");
    schemaInputEditor.setTheme("ace/theme/monokai");
    schemaInputEditor.session.setMode("ace/mode/json");
    schemaInputEditor.setOptions({
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      showPrintMargin: false,
      fontSize: "14px",
      wrap: true
    });
    
    // Update hidden input when editor content changes
    schemaInputEditor.getSession().on('change', function() {
      document.getElementById('schemaInput').value = schemaInputEditor.getValue();
    });
    
    // Format JSON button functionality
    document.getElementById('formatJsonBtn').addEventListener('click', function() {
      formatJson(responseBodyEditor);
    });
    
    // Clear editor button functionality
    document.getElementById('clearEditorBtn').addEventListener('click', function() {
      responseBodyEditor.setValue('', -1);
    });
    
    // Make editors available globally
    window.responseBodyEditor = responseBodyEditor;
    window.schemaInputEditor = schemaInputEditor;
  }
  
  // Format JSON in the editor
function formatJson() {
  try {
    // Check if Ace editor is available
    if (window.responseBodyEditor) {
      const jsonString = window.responseBodyEditor.getValue().trim();
      if (!jsonString) return;
      
      const parsed = JSON.parse(jsonString);
      window.responseBodyEditor.setValue(JSON.stringify(parsed, null, 2), -1);
      showNotification('Success', 'JSON formatted successfully');
      
      // Add visual feedback to the format button
      const formatBtn = document.getElementById('formatJsonBtn');
      if (formatBtn) {
        formatBtn.classList.add('btn-success');
        setTimeout(() => {
          formatBtn.classList.remove('btn-success');
        }, 1000);
      }
    } else {
      // Fallback to original textarea-based formatting
      const jsonString = elements.responseBodyTextarea.value;
      const parsed = JSON.parse(jsonString);
      elements.responseBodyTextarea.value = JSON.stringify(parsed, null, 2);
      showNotification('Success', 'JSON formatted successfully');
    }
  } catch (error) {
    showNotification('Error', 'Invalid JSON format. Please check your input.', 'error');
  }
}
  
  // Reset the add route form
function resetAddRouteForm() {
  elements.addRouteForm.reset();
  
  // Reset response body
  const defaultJson = JSON.stringify({ 
    status: 'success',
    data: [{ id: 1, name: 'Example' }] 
  }, null, 2);
  
  // Update Ace editor if available
  if (window.responseBodyEditor) {
    window.responseBodyEditor.setValue(defaultJson, -1);
  } else if (elements.responseBodyTextarea) {
    elements.responseBodyTextarea.value = defaultJson;
  }
  
  // Reset editing mode
  currentState.editingRouteKey = null;
  currentState.originalMethod = null;
  currentState.originalUrl = null;

  // Update button text to reflect we're adding a new route
  elements.addRouteBtn.textContent = 'Add Interception';
}
  
function editRoute(routeKey) {
  const routeConfig = currentState.routes[routeKey];
  
  if (routeConfig) {
    // Parse the route key to get method and URL
    const [method, ...urlParts] = routeKey.split(':');
    const url = urlParts.join(':');
    
    // Check if other routes exist with the same URL but different methods
    const relatedRoutes = Object.keys(currentState.routes).filter(key => {
      const routeUrl = key.split(':').slice(1).join(':'); // Get URL part
      const routeMethod = key.split(':')[0]; // Get method part
      return routeUrl === url && routeMethod !== method;
    });
    
    // If related routes exist, show a notification
    if (relatedRoutes.length > 0) {
      const relatedMethods = relatedRoutes.map(key => key.split(':')[0]).join(', ');
      showNotification("Editing Route", `This URL is also used with method(s): ${relatedMethods}. Make sure to check them if needed.`, 'info');
    } else {
      // Standard notification
      showNotification("Editing Route", `Editing route for ${method} ${url}`, 'info');
    }
    
    // Populate form with existing values
    elements.urlInput.value = url;
    elements.methodSelect.value = method;
    elements.statusInput.value = routeConfig.status;
    elements.delayInput.value = routeConfig.delay;
    elements.contentTypeSelect.value = routeConfig.contentType || 'application/json';
    
    // Format and set response body to Ace editor if available
    if (window.responseBodyEditor) {
      if (typeof routeConfig.response === 'object') {
        window.responseBodyEditor.setValue(JSON.stringify(routeConfig.response, null, 2), -1);
      } else {
        window.responseBodyEditor.setValue(routeConfig.response || '', -1);
      }
    } else if (elements.responseBodyTextarea) {
      // Fallback to textarea if Ace editor is not available
      if (typeof routeConfig.response === 'object') {
        elements.responseBodyTextarea.value = JSON.stringify(routeConfig.response, null, 2);
      } else {
        elements.responseBodyTextarea.value = routeConfig.response || '';
      }
    }
    
    // Store the original route key for reference when saving
    currentState.editingRouteKey = routeKey;
    currentState.originalMethod = method;
    currentState.originalUrl = url;
    
    // Change button text to reflect we're updating
    elements.addRouteBtn.textContent = 'Save Changes';

    // Switch to add tab
    selectTab('add');
  }
}

function toggleRoute(routeKey, enabled) {
  chrome.runtime.sendMessage({
    action: 'toggleRoute',
    route: routeKey,
    enabled: enabled
  }, function(response) {
    if (response && response.success) {
      // Update local state
      if (currentState.routes[routeKey]) {
        currentState.routes[routeKey].enabled = enabled;
        updateRoutesList();
        showNotification('Success', `Route ${enabled ? 'enabled' : 'disabled'} successfully`);
      }
    }
  });
}


  function exportRoutes() {
    chrome.runtime.sendMessage({ action: 'exportRoutes' }, function(response) {
      if (response && response.success) {
        const exportData = response.data;
        
        // Convert to JSON string
        const jsonString = JSON.stringify(exportData, null, 2);
        
        // Copy to clipboard using the Clipboard API
        navigator.clipboard.writeText(jsonString)
          .catch(err => {
            console.error('Failed to copy text: ', err);
          });
        
        // Create a download link
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        // Get current date for filename
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        
        // Set download attributes
        a.href = url;
        a.download = `request-interceptor-routes-${dateStr}.json`;
        
        // Append to document, trigger click, and clean up
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Also set the value to the schema input in the templates tab
        const schemaInput = document.getElementById('schemaInput');
        if (schemaInput) {
          schemaInput.value = jsonString;
          // Switch to templates tab and trigger a parse
          selectTab('templates');
          
          // Find the parse button and trigger a click
          const parseBtn = document.getElementById('parseSchemaBtn');
          if (parseBtn) {
            setTimeout(() => parseBtn.click(), 100);
          }
          
          showNotification('Routes exported!','File downloaded and copied to clipboard.');
        } else {
          showNotification('Routes exported!','File downloaded and copied to clipboard.');
        }
      }
    });
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
function showNotification(title, message, type = 'success') {
  const notificationContainer = document.getElementById('notification-container');
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  // Add icon based on type
  let icon;
  switch (type) {
    case 'success':
      icon = 'check-circle';
      break;
    case 'error':
      icon = 'exclamation-circle';
      break;
    case 'info':
      icon = 'info-circle';
      break;
    default:
      icon = 'bell';
  }
  
  notification.innerHTML = `
    <div class="notification-icon">
        <i class="fas fa-${icon}"></i>
    </div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">
        ${message}
      </div>
    </div>
  `;
  
  // Add to container with animation
  notification.style.opacity = '0';
  notification.style.transform = 'translateY(10px)';
  notification.style.transition = 'all 0.3s ease';
  
  notificationContainer.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // Remove after timeout
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}
  
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
  
  if (!document.querySelector('.export-btn')) {
  // Add export button if there are routes
  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn btn-secondary export-btn';
  exportBtn.innerHTML = '<i class="fas fa-file-export"></i> Export Routes';
  exportBtn.addEventListener('click', exportRoutes);
  
  // Add export button to the action buttons container
  const actionButtons = document.querySelector('.action-buttons');
  if (actionButtons) {
    actionButtons.appendChild(exportBtn);
  }
}
  
  // Create a map of URLs to their methods for showing related routes
  const urlMethodMap = {};
  
  routeEntries.forEach(([key, config]) => {
    const [method, ...urlParts] = key.split(':');
    const url = urlParts.join(':');
    
    if (!urlMethodMap[url]) {
      urlMethodMap[url] = [];
    }
    urlMethodMap[url].push(method);
  });
  
  // Add each route
  routeEntries.forEach(([key, config]) => {
    const [method, ...urlParts] = key.split(':');
    const url = urlParts.join(':');
    
    // Check if the route is enabled
    const isEnabled = config.hasOwnProperty('enabled') ? config.enabled : true;
    
    // Check if this URL has multiple methods
    const hasMultipleMethods = urlMethodMap[url].length > 1;
    
    // Get a description based on the URL and method
    const description = getRouteDescription(method, url);
    
    // Format timestamp 
    const timestamp = config.timestamp ? new Date(config.timestamp).toLocaleDateString() : 'N/A';
    
    // Get content type display name
    const contentTypeName = getContentTypeDisplayName(config.contentType);
    
    const routeElement = document.createElement('div');
    routeElement.className = `route-item method-${method} ${!isEnabled ? 'route-disabled' : ''} ${hasMultipleMethods ? 'multi-method-url' : ''}`;
    
    // Format response for display
    const responsePreview = formatResponsePreview(config.response);
    
    // Create html for route item with additional multi-method indicator if needed
    let multiMethodHtml = '';
    if (hasMultipleMethods) {
      const otherMethods = urlMethodMap[url].filter(m => m !== method);
      multiMethodHtml = `
        <span class="multi-method-indicator">
          <i class="fas fa-code-branch"></i> Same URL also used with: ${otherMethods.join(', ')}
        </span>
      `;
    }
    
    routeElement.innerHTML = `
      <div class="route-item-header">
        <div class="route-item-title">
          <span class="method-badge method-${method}">${method}</span>
          <div class="route-url-wrapper">
            <span class="route-url">${escapeHtml(url)}</span>
            <div class="route-info">
              <span class="route-description">${description}</span>
              ${multiMethodHtml}
            </div>
          </div>
        </div>
        <div class="route-toggle">
          <label class="toggle toggle-sm">
            <input type="checkbox" class="route-toggle-input" data-route="${escapeHtml(key)}" ${isEnabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
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
    
    // Add change handler for toggle switch
    const toggleInput = routeElement.querySelector('.route-toggle-input');
    if (toggleInput) {
      toggleInput.addEventListener('change', function() {
        const routeKey = this.getAttribute('data-route');
        const isEnabled = this.checked;
        toggleRoute(routeKey, isEnabled);
      });
    }
  });

  filterRoutes();
  
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