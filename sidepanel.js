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

// function to load a script dynamically
function loadScript(src, callback) {
  console.log(`Loading script: ${src}`);
  
  const script = document.createElement('script');
  script.src = src;
  script.onload = function() {
    if (callback) callback();
  };
  document.head.appendChild(script);
}



document.addEventListener('DOMContentLoaded', function() {
  initAceEditors();

  let notificationManager = null;
  // notification manager
  loadScript('notification-manager.js', function() {
    // Initialize NotificationManager after script is loaded
    notificationManager = new NotificationManager();
  });

    console.log('NotificationManager initialized:', notificationManager);
    

  //load the templates.js script
  loadScript('templates.js', function() {
    loadScript('templates-manager.js', function() {
      const templatesManager = new TemplatesManager(notificationManager);
      // Make templatesManager available globally for debugging
      window.templatesManager = templatesManager;
    });
  });


  // UI Elements
  const elements = {
    enableToggle: document.getElementById('enableToggle'),
    statusText: document.getElementById('status-text'),
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    routeList: document.getElementById('route-list'),
    clearRoutesBtn: document.getElementById('clear-routes-btn'),
    addRouteForm: document.getElementById('add-route-form'),
    routeNameInput: document.getElementById('routeName'),
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
    editingRouteKey: null,
    originalName: null
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
  const routeName = elements.routeNameInput ? elements.routeNameInput.value.trim() : '';
  
  // Get value from Ace editor if available, otherwise from textarea
  const responseBodyStr = window.responseBodyEditor ? 
    window.responseBodyEditor.getValue() : 
    elements.responseBodyTextarea.value;
  
  if (!url) {
    notificationManager.show('URL Required', 'Please enter a valid URL pattern to intercept requests', 'error');
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
    notificationManager.show('Invalid JSON', 'Please enter valid JSON in the response body', 'error');
    return;
  }
  
  // Create the new route key - include name in the route key if provided
  let newRouteKey;
  if (routeName) {
    // Use method:url|name format with pipe as delimiter
    newRouteKey = `${method}:${url}|${routeName}`;
  } else {
    // Use method:url format if no name is provided
    newRouteKey = `${method}:${url}`;
  }
  
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
    const routeUrl = key.split(':').slice(1, 2).join(':'); // Get URL part (middle part)
    const routeMethod = key.split(':')[0]; // Get method part
    return routeUrl === url && routeMethod !== method;
  });
  
  // If editing and changing the method, check if the new method+URL combination already exists
  if (isEditing && methodOrUrlChanged && currentState.originalUrl === url && 
      currentState.originalMethod !== method) {
    
    // Check if route with new method exists
    const existingRoutes = Object.keys(currentState.routes).filter(key => {
      const routeUrl = key.split(':').slice(1, 2).join(':'); // Get URL part
      const routeMethod = key.split(':')[0]; // Get method part
      return routeUrl === url && routeMethod === method;
    });
    
    if (existingRoutes.length > 0) {
      if (!confirm(`A route with ${method} method for URL "${url}" already exists. Do you want to overwrite it?`)) {
        return; // Abort if user cancels
      }
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
        proceedWithAddRoute();
      }
    );
    return; // Return early while waiting for confirmation
  }
  
  // Proceed with adding the route
  proceedWithAddRoute();
  
  function proceedWithAddRoute() {
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
      timestamp: Date.now(),
      name: routeName // Store name in config
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
          addRouteWithKey(newRouteKey, routeConfig);
        }
      });
      return;
    }
    
    // If editing and only the name has changed
    if (isEditing && currentState.originalName !== routeName) {
      // Remove the old route first
      chrome.runtime.sendMessage({
        action: 'removeRoute',
        route: currentState.editingRouteKey
      }, function(removeResponse) {
        if (removeResponse && removeResponse.success) {
          // Add with new key including the new name
          addRouteWithKey(newRouteKey, routeConfig);
        }
      });
      return;
    }
    
    // Standard add/update without changing method/URL or name
    const routeKey = isEditing ? currentState.editingRouteKey : newRouteKey;
    addRouteWithKey(routeKey, routeConfig);
  }
}

// Helper function to add a route with specific key
function addRouteWithKey(routeKey, routeConfig) {
  chrome.runtime.sendMessage({
    action: 'addRoute',
    route: routeKey,
    config: routeConfig,
    name: routeConfig.name // Pass name separately as well
  }, function(response) {
    if (response && response.success) {
      // Update local state to reflect changes immediately
      currentState.routes[routeKey] = routeConfig;
      updateRoutesList();
      
      if (response.isUpdate) {
        notificationManager.show('Success', 'Route updated successfully');
      } else {
        notificationManager.show('Success', 'Route added successfully');
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
        notificationManager.show('Success', 'Route removed successfully');
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
        notificationManager.show('Success', 'All routes cleared successfully');
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
      notificationManager.show('Success', 'JSON formatted successfully');
      
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
      notificationManager.show('Success', 'JSON formatted successfully');
    }
  } catch (error) {
    notificationManager.show('Error', 'Invalid JSON format. Please check your input.', 'error');
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
  
  // Clear the route name field
  if (elements.routeNameInput) {
    elements.routeNameInput.value = '';
  }
  
  // Reset editing mode
  currentState.editingRouteKey = null;
  currentState.originalMethod = null;
  currentState.originalUrl = null;
  currentState.originalName = null;

  // Update button text to reflect we're adding a new route
  elements.addRouteBtn.textContent = 'Add Interception';
}
  
function editRoute(routeKey) {
  const routeConfig = currentState.routes[routeKey];
  
  if (routeConfig) {
    // Parse the route key
    const firstColonIndex = routeKey.indexOf(':');
    const method = routeKey.substring(0, firstColonIndex);
    const remaining = routeKey.substring(firstColonIndex + 1);
    
    // Check if route has a name (method:url|name format)
    let url, name;
    const pipeIndex = remaining.indexOf('|');
    if (pipeIndex !== -1) {
      // The part before pipe is the URL
      url = remaining.substring(0, pipeIndex);
      // The part after pipe is the name
      name = remaining.substring(pipeIndex + 1);
    } else {
      // No name, just method:url format
      url = remaining;
      name = routeConfig.name || '';
    }
    
    // Check if other routes exist with the same URL but different methods
    const relatedRoutes = Object.keys(currentState.routes).filter(key => {
      const keyParts = key.split(':');
      const routeMethod = keyParts[0];
      const routeUrl = keyParts[1];
      return routeUrl === url && routeMethod !== method;
    });
    
    // If related routes exist, show a notification
    if (relatedRoutes.length > 0) {
      const relatedMethods = relatedRoutes.map(key => key.split(':')[0]).join(', ');
      notificationManager.show("Editing Route", `This URL is also used with method(s): ${relatedMethods}. Make sure to check them if needed.`, 'info');
    } else {
      // Standard notification
      notificationManager.show("Editing Route", `Editing route for ${method} ${url}`, 'info');
    }
    
    // Populate form with existing values
    elements.urlInput.value = url;
    elements.methodSelect.value = method;
    elements.statusInput.value = routeConfig.status;
    elements.delayInput.value = routeConfig.delay;
    elements.contentTypeSelect.value = routeConfig.contentType || 'application/json';
    
    // Set route name if available
    if (elements.routeNameInput) {
      // Use the name from the route key or from the config
      elements.routeNameInput.value = name;
    }
    
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
    
    // Store the original values for reference when saving
    currentState.editingRouteKey = routeKey;
    currentState.originalMethod = method;
    currentState.originalUrl = url;
    currentState.originalName = name;
    
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
      // The background script will handle disabling other routes with the same URL
      // We'll just update the UI when we receive the routesChanged message
      if (enabled) {
        notificationManager.show('Success', 'Route enabled successfully');
      } else {
        notificationManager.show('Success', 'Route disabled successfully');
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
          
          notificationManager.show('Routes exported!','File downloaded and copied to clipboard.');
        } else {
          notificationManager.show('Routes exported!','File downloaded and copied to clipboard.');
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
  
// Updated Route List rendering function with compact expandable design
function updateRoutesList() {
  // Clear current list
  elements.routeList.innerHTML = '';
  
  const routeEntries = Object.entries(currentState.routes);
  
  // Show empty state if no routes
  if (routeEntries.length === 0) {
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
  
  // Add export button if there are routes
  if (!document.querySelector('.export-btn')) {
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
    const url = urlParts.join(':').split('|')[0];
    
    if (!urlMethodMap[url]) {
      urlMethodMap[url] = [];
    }
    urlMethodMap[url].push(method);
  });
  
  // Add each route
  routeEntries.forEach(([key, config]) => {
    const [method, ...urlParts] = key.split(':');
    const [url, routeName] = urlParts.join(':').split('|');
    
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
    
    // Format response for display
    const responsePreview = formatResponsePreview(config.response);
    
    // Get the status code class (2xx, 3xx, etc.)
    const statusClass = `status-${Math.floor(config.status / 100)}xx`;
    
    // Create a new route element
    const routeElement = document.createElement('div');
    routeElement.className = `route-card ${method} ${!isEnabled ? 'route-disabled' : ''}`;
    routeElement.dataset.routeKey = key;
    
    // Create multi-method indicator HTML if needed
    let multiMethodHtml = '';
    if (hasMultipleMethods) {
      const otherMethods = urlMethodMap[url].filter(m => m !== method);
      multiMethodHtml = `
        <div class="multi-method-indicator">
          <i class="fas fa-code-branch"></i> Also used with: ${otherMethods.join(', ')}
        </div>
      `;
    }
    
    // Build the route element HTML
    routeElement.innerHTML = `
      <div class="route-header">
        <div class="route-main">
          <div class="method-badge ${method}">${method}</div>
          <div class="route-url-container">
            <div class="route-url">${escapeHtml(url)}</div>
            ${routeName ? `<div class="route-name"><i class="fas fa-tag"></i>${escapeHtml(routeName)}</div>` : ''}
          </div>
        </div>
        
        <div class="route-meta">
          <div class="route-meta-item ${statusClass}">
            <i class="fas fa-code"></i>
            <span>${config.status}</span>
          </div>
          <div class="route-meta-item">
            <i class="fas fa-clock"></i>
            <span>${config.delay}ms</span>
          </div>
        </div>
        
        <div class="route-controls">
          <label class="toggle">
            <input type="checkbox" class="route-toggle-input" data-route="${escapeHtml(key)}" ${isEnabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <div class="expand-icon">
            <i class="fas fa-chevron-down"></i>
          </div>
        </div>
      </div>
      
      <div class="route-content">
        <div class="route-content-inside">
          ${description ? `
            <div class="route-description">
              <span>${description}</span>
              ${multiMethodHtml}
            </div>
          ` : multiMethodHtml ? `<div class="route-description">${multiMethodHtml}</div>` : ''}
          
          <div class="route-info-grid">
            <div class="info-item">
              <div class="info-label">Status</div>
              <div class="info-value ${statusClass}">${config.status}</div>
            </div>
            
            <div class="info-item">
              <div class="info-label">Delay</div>
              <div class="info-value">${config.delay}ms</div>
            </div>
            
            <div class="info-item">
              <div class="info-label">Content Type</div>
              <div class="info-value">${contentTypeName}</div>
            </div>
            
            <div class="info-item">
              <div class="info-label">Added</div>
              <div class="info-value">${timestamp}</div>
            </div>
          </div>
          
          <div class="response-container">
            <div class="response-header">
              <div class="response-title">
                <i class="fas fa-code"></i>
                <span>Response Body</span>
              </div>
              <button class="expand-button" title="Expand/Collapse">
                <i class="fas fa-expand-alt"></i>
              </button>
            </div>
            <div class="response-body">
              <pre><code class="language-json">${responsePreview}</code></pre>
            </div>
          </div>
          
          <div class="route-actions">
            <button class="action-button edit-button" data-route="${escapeHtml(key)}">
              <i class="fas fa-edit"></i>
              <span>Edit</span>
            </button>
            <button class="action-button delete-button" data-route="${escapeHtml(key)}">
              <i class="fas fa-trash-alt"></i>
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add the route element to the list
    elements.routeList.appendChild(routeElement);
    
    // Add event listeners
    
    // Toggle expand/collapse when clicking on header
    const routeHeader = routeElement.querySelector('.route-header');
    if (routeHeader) {
      routeHeader.addEventListener('click', function(e) {
        // Don't toggle if clicking on the toggle switch
        if (e.target.closest('.toggle')) {
          return;
        }
        
        routeElement.classList.toggle('expanded');
      });
    }
    
    // Toggle button
    const toggleInput = routeElement.querySelector('.route-toggle-input');
    if (toggleInput) {
      toggleInput.addEventListener('change', function(e) {
        e.stopPropagation(); // Prevent the header click from triggering
        
        const routeKey = this.getAttribute('data-route');
        const isEnabled = this.checked;
        toggleRoute(routeKey, isEnabled);
        
        // Update visual state
        if (isEnabled) {
          routeElement.classList.remove('route-disabled');
        } else {
          routeElement.classList.add('route-disabled');
        }
      });
    }
    
    // Expand/collapse response button
    const expandButton = routeElement.querySelector('.expand-button');
    const responseBody = routeElement.querySelector('.response-body');
    
    if (expandButton && responseBody) {
      expandButton.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent the event from bubbling up
        
        if (responseBody.classList.contains('expanded')) {
          responseBody.classList.remove('expanded');
          this.innerHTML = '<i class="fas fa-expand-alt"></i>';
        } else {
          responseBody.classList.add('expanded');
          this.innerHTML = '<i class="fas fa-compress-alt"></i>';
        }
      });
    }
    
    // Edit button
    const editButton = routeElement.querySelector('.edit-button');
    if (editButton) {
      editButton.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent the event from bubbling up
        
        const routeKey = this.getAttribute('data-route');
        editRoute(routeKey);
      });
    }
    
    // Delete button
    const deleteButton = routeElement.querySelector('.delete-button');
    if (deleteButton) {
      deleteButton.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent the event from bubbling up
        
        const routeKey = this.getAttribute('data-route');
        showConfirmationDialog(
          'Delete Route',
          `Are you sure you want to delete the ${method} route for "${url}"?`,
          () => removeRoute(routeKey)
        );
      });
    }
  });
  
  // Apply any active filters
  filterRoutes();
  
  // Apply syntax highlighting if Prism is available
  if (window.Prism) {
    Prism.highlightAll();
  }
}

// Updated filter routes function
function filterRoutes() {
  const searchTerm = document.getElementById('search-routes').value.toLowerCase();
  const methodFilter = document.getElementById('filter-method').value;
  const routeCards = document.querySelectorAll('.route-card');
  let visibleCount = 0;
  
  routeCards.forEach(card => {
    // Get the URL text from this route card
    const urlElement = card.querySelector('.route-url');
    if (!urlElement) return;
    
    const url = urlElement.textContent.toLowerCase();
    const method = card.classList.contains('GET') ? 'GET' :
                   card.classList.contains('POST') ? 'POST' :
                   card.classList.contains('PUT') ? 'PUT' :
                   card.classList.contains('DELETE') ? 'DELETE' :
                   card.classList.contains('PATCH') ? 'PATCH' : '';
    
    // Also check route name if it exists
    const nameElement = card.querySelector('.route-name');
    const routeName = nameElement ? nameElement.textContent.toLowerCase() : '';
    
    // Check if it matches both the search term and the method filter
    const matchesSearch = url.includes(searchTerm) || routeName.includes(searchTerm);
    const matchesMethod = methodFilter === 'all' || method === methodFilter;
    
    // Show or hide based on both conditions
    if (matchesSearch && matchesMethod) {
      card.style.display = '';
      visibleCount++;
    } else {
      card.style.display = 'none';
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

// Updated filter routes function
function filterRoutes() {
  const searchTerm = document.getElementById('search-routes').value.toLowerCase();
  const methodFilter = document.getElementById('filter-method').value;
  const routeCards = document.querySelectorAll('.route-card');
  let visibleCount = 0;
  
  routeCards.forEach(card => {
    // Get the URL text from this route card
    const urlElement = card.querySelector('.route-url');
    if (!urlElement) return;
    
    const url = urlElement.textContent.toLowerCase();
    const method = card.classList.contains('GET') ? 'GET' :
                   card.classList.contains('POST') ? 'POST' :
                   card.classList.contains('PUT') ? 'PUT' :
                   card.classList.contains('DELETE') ? 'DELETE' :
                   card.classList.contains('PATCH') ? 'PATCH' : '';
    
    // Also check route name if it exists
    const nameElement = card.querySelector('.route-name');
    const routeName = nameElement ? nameElement.textContent.toLowerCase() : '';
    
    // Check if it matches both the search term and the method filter
    const matchesSearch = url.includes(searchTerm) || routeName.includes(searchTerm);
    const matchesMethod = methodFilter === 'all' || method === methodFilter;
    
    // Show or hide based on both conditions
    if (matchesSearch && matchesMethod) {
      card.style.display = '';
      visibleCount++;
    } else {
      card.style.display = 'none';
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
        <button class="btn btn-danger confirm-btn">Confirm</button>
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