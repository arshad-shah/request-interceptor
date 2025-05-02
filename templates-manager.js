// templates-manager.js - Create this file in your extension folder

class TemplatesManager {
constructor(notificationManager) {
  this.templates = {};
  this.parsedRoutes = [];
  this.notificationManager = notificationManager || {
    show: (message, type) => console.log(`[${type}] ${message}`)
  };
  
  // UI Elements
  this.elements = {
    schemaInput: document.getElementById('schemaInput'),
    templateOptionsContainer: document.getElementById('template-options-container'),
    templateOptions: document.querySelectorAll('.template-option'),
    parseSchemaBtn: document.getElementById('parseSchemaBtn'),
    importRoutesBtn: document.getElementById('importRoutesBtn'),
    previewContainer: document.getElementById('preview-container'),
    previewCount: document.getElementById('preview-count'),
    routesPreview: document.getElementById('routes-preview'),
    closePreview: document.getElementById('close-preview')
  };
  
  this.loadTemplates();
  this.createTemplateButtons();
  this.bindEvents();
  this.schemaInputEditor = window.schemaInputEditor;
}

  // Create template buttons dynamically based on available templates
createTemplateButtons() {
  // Clear existing buttons
  if (this.elements.templateOptionsContainer) {
    this.elements.templateOptionsContainer.innerHTML = '';
    
    // Create a button for each template
    for (const templateName in this.templates) {
      const button = document.createElement('button');
      button.className = 'template-option';
      button.setAttribute('data-template', templateName);
      
      // Display formatted template name (convert camelCase or snake_case to Title Case)
      const displayName = templateName
        .replace(/([A-Z])/g, ' $1') // Insert space before capital letters
        .replace(/_/g, ' ')         // Replace underscores with spaces
        .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
        
      button.textContent = displayName;
      
      // Add click event listener
      button.addEventListener('click', () => {
        this.loadTemplate(templateName);
        
        // Remove active class from all buttons
        document.querySelectorAll('.template-option').forEach(btn => {
          btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        button.classList.add('active');
      });
      
      this.elements.templateOptionsContainer.appendChild(button);
    }
  }
}
  
  // Load templates from the templates.js file
  loadTemplates() {
    this.templates = Templates || {}; // Templates is defined in templates.js
  }
  
  // Bind UI events
  bindEvents() {
    // Parse schema button
    this.elements.parseSchemaBtn.addEventListener('click', () => {
      this.parseSchema();
    });
    
    // Import routes button
    this.elements.importRoutesBtn.addEventListener('click', () => {
      this.importRoutes();
    });
    
    // Close preview button
    this.elements.closePreview.addEventListener('click', () => {
      this.elements.previewContainer.style.display = 'none';
      this.parsedRoutes = [];
      this.elements.importRoutesBtn.disabled = true;
    });
    
    // Template option buttons
    console.log('Template options:', this.elements.templateOptions);
    
    this.elements.templateOptions.forEach(option => {
      option.addEventListener('click', () => {
        const templateName = option.getAttribute('data-template');
        this.loadTemplate(templateName);
      });
    });
    
    // Import from file button - NEW
    const importFromFileBtn = document.getElementById('importFromFileBtn');
    if (importFromFileBtn) {
      importFromFileBtn.addEventListener('click', () => {
        this.importRoutesFromFile();
      });
    }
  }

  // Add this function to import routes from a file
  importRoutesFromFile() {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';
    
    // Handle file selection
    fileInput.addEventListener('change', (event) => {
      if (fileInput.files.length === 0) {
        return; // No file selected
      }
      
      const file = fileInput.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          // Parse the file content
          const content = e.target.result;
          
          // Set content to schema input using Ace editor if available
          if (this.schemaInputEditor) {
            this.schemaInputEditor.setValue(content, -1);
          } else if (this.elements.schemaInput) {
            this.elements.schemaInput.value = content;
          } else {
            throw new Error('Schema input element not found');
          }
          
          // Switch to templates tab
          if (typeof selectTab === 'function') {
            selectTab('templates');
          }
          
          // Trigger parse
          setTimeout(() => this.parseSchema(), 100);
          
          this.notificationManager.show('Routes imported from file successfully!');
        } catch (error) {
          this.notificationManager.show(`Error importing routes: ${error.message}`, 'error');
        }
      };
      
      reader.onerror = () => {
        this.notificationManager.show('Error reading the file.', 'error');
      };
      
      // Read the file as text
      reader.readAsText(file);
    });
    
    // Trigger click to open file dialog
    fileInput.click();
  }
  
  // Load a predefined template into the schema input
  loadTemplate(templateName) {
    const template = this.templates[templateName];
    if (!template) {
      this.notificationManager.show(`Template "${templateName}" not found.`, 'error');
      return;
    }
    
    // Format the template as pretty JSON
    const formattedTemplate = JSON.stringify(template, null, 2);
    
    // Use Ace editor instead of input element
    if (this.schemaInputEditor) {
      this.schemaInputEditor.setValue(formattedTemplate, -1);
    } else {
      this.elements.schemaInput.value = formattedTemplate;
    }
    
    // Parse the template immediately
    this.parseSchema();
    
    // Highlight the selected template
    this.elements.templateOptions.forEach(option => {
      if (option.getAttribute('data-template') === templateName) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
  }
  
  // Parse the JSON schema from the input
  parseSchema() {
    // Get text from Ace editor if available, otherwise from input element
    const schemaText = this.schemaInputEditor ? 
      this.schemaInputEditor.getValue().trim() : 
      this.elements.schemaInput.value.trim();
      
    if (!schemaText) {
      this.notificationManager.show('Please enter a JSON schema.', 'error');
      return;
    }
    
    try {
      const schema = JSON.parse(schemaText);
      
      // Validate the schema structure
      if (!schema.routes || !Array.isArray(schema.routes)) {
        this.notificationManager.show('Invalid schema format. Schema must contain a "routes" array.', 'error');
        return;
      }
      
      // Parse and validate each route
      const parsedRoutes = [];
      for (const route of schema.routes) {
        if (!this.validateRoute(route)) continue;
        
        // Format the route for our system
        const formattedRoute = this.formatRoute(route);
        parsedRoutes.push(formattedRoute);
      }
      
      if (parsedRoutes.length === 0) {
        this.notificationManager.show('No valid routes found in the schema.', 'error');
        return;
      }
      
      // Update the preview
      this.parsedRoutes = parsedRoutes;
      this.showPreview(parsedRoutes);
      this.elements.importRoutesBtn.disabled = false;
      
      this.notificationManager.show(`Successfully parsed ${parsedRoutes.length} routes.`, 'success');
    } catch (error) {
      this.notificationManager.show(`Error parsing JSON: ${error.message}`, 'error');
    }
  }
  
  // Validate a single route
  validateRoute(route) {
    if (!route.method || !route.url) {
      console.warn('Route missing required fields (method and url):', route);
      return false;
    }
    
    // Normalize method
    route.method = route.method.toUpperCase();
    
    // Check if method is valid
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validMethods.includes(route.method)) {
      console.warn(`Invalid HTTP method "${route.method}" for route:`, route);
      return false;
    }
    
    // Ensure response exists
    if (!route.response) {
      console.warn('Route missing response:', route);
      return false;
    }
    
    return true;
  }
  
  // Format a route for our system
  formatRoute(route) {
    const routeKey = `${route.method}:${route.url}`;
    const defaultContentType = typeof route.response === 'object' ? 'application/json' : 'text/plain';
    
    return {
      key: routeKey,
      config: {
        status: route.status || 200,
        delay: route.delay || 0,
        contentType: route.contentType || defaultContentType,
        response: route.response,
        // Include enabled state if provided, default to true
        enabled: route.hasOwnProperty('enabled') ? route.enabled : true,
        timestamp: Date.now()
      },
      originalRoute: route
    };
  }
  
  // Show preview of parsed routes
  showPreview(routes) {
    this.elements.previewContainer.style.display = 'block';
    this.elements.previewCount.textContent = `${routes.length} routes`;
    this.elements.routesPreview.innerHTML = '';
    
    for (const route of routes) {
      const { method, url } = this.parseRouteKey(route.key);
      const previewRoute = document.createElement('div');
      previewRoute.className = `preview-route method-${method}`;
      
      previewRoute.innerHTML = `
        <div class="preview-route-info">
          <span class="preview-route-method ${method}">${method}</span>
          <span class="preview-route-url">${this.escapeHtml(url)}</span>
        </div>
        <div class="preview-route-status">
          <span class="preview-route-code">${route.config.status}</span>
        </div>
      `;
      
      this.elements.routesPreview.appendChild(previewRoute);
    }
  }
  
  // Import all parsed routes
  importRoutes() {
    if (this.parsedRoutes.length === 0) {
      this.notificationManager.show('No routes to import.', 'error');
      return;
    }
    
    // Import routes in batches to avoid overwhelming the background script
    this.importRoutesInBatches(this.parsedRoutes, 5);
  }
  
  // Import routes in batches to avoid overwhelming the background script
async importRoutesInBatches(routes, batchSize) {
  const batches = [];
  
  // Create batches of routes
  for (let i = 0; i < routes.length; i += batchSize) {
    batches.push(routes.slice(i, i + batchSize));
  }
  
  // Import each batch with a slight delay between them
  let importedCount = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const importPromises = batch.map(route => {
      return new Promise(resolve => {
        chrome.runtime.sendMessage({
          action: 'addRoute',
          route: route.key,
          config: route.config
        }, response => {
          if (response && response.success) {
            importedCount++;
          }
          resolve();
        });
      });
    });
    
    // Wait for all promises in batch to resolve
    await Promise.all(importPromises);
    
    // Short delay between batches to let the UI update
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  this.notificationManager.show(`Successfully imported ${importedCount} routes.`, 'success');
  
  // Reset the UI
  this.elements.previewContainer.style.display = 'none';
  this.elements.importRoutesBtn.disabled = true;
  this.parsedRoutes = [];
  
  // NEW: Request current state from background to ensure UI is up-to-date
  chrome.runtime.sendMessage({ action: 'getState' }, function(response) {
    if (response) {
      // Update local state
      window.currentState = response; // Update the global state
      
      // Call updateRoutesList if it exists in global scope
      if (typeof updateRoutesList === 'function') {
        updateRoutesList();
      }
      
      // Switch to routes tab after state is updated
      const routesTab = document.querySelector('.tab[data-tab="routes"]');
      if (routesTab) {
        routesTab.click();
      }
    }
  });
}
  
  // Parse a route key into method and URL
  parseRouteKey(routeKey) {
    const [method, ...urlParts] = routeKey.split(':');
    return {
      method,
      url: urlParts.join(':') // Rejoin in case the URL contained colons
    };
  }
  
  // Helper function to escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create a simple notification manager class
class NotificationManager {
  constructor() {
    this.container = document.getElementById('notification-container');
  }
  
  show(message, type = 'success') {
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
    this.container.appendChild(notification);
    
    // Remove after timeout
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
}