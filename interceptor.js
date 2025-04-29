// Injected interceptor script that runs in the page context
// This script gets injected into the page and has access to the page's window object

(function() {
  // Create a self-contained instance to avoid conflicts
  const RequestInterceptor = (function() {
    // Keep track of the original methods
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    // Internal state
    let isActive = false;
    let interceptedRoutes = {};
    let isLoggingEnabled = true;
    
    // Logging function
    function log(message) {
      if (isLoggingEnabled) {
        console.log(`[Request Interceptor] ${message}`);
        
        // Also notify the content script for centralized logging
        window.postMessage({
          type: 'REQUEST_INTERCEPTOR_LOG',
          message
        }, '*');
      }
    }
    
    // Parse the route key into its components
    function parseRouteKey(routeKey) {
      const [method, ...urlParts] = routeKey.split(':');
      return {
        method,
        url: urlParts.join(':') // Rejoin in case the URL contained colons
      };
    }
    
    // Check if a route should be intercepted
    function shouldIntercept(method, url) {
      const normalizedMethod = method.toUpperCase();
      const routeKey = `${normalizedMethod}:${url}`;
      
      // Direct match
      if (interceptedRoutes[routeKey]) {
        return routeKey;
      }
      
      // Check for wildcards and patterns
      for (const key in interceptedRoutes) {
        const { method: routeMethod, url: routeUrl } = parseRouteKey(key);
        
        // Method must match
        if (routeMethod !== normalizedMethod) continue;
        
        // Check URL patterns
        if (routeUrl.includes('*')) {
          const pattern = routeUrl.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          if (regex.test(url)) {
            return key;
          }
        }
        
        // Check URL with query params
        if (routeUrl.includes('?')) {
          // Get the base URL without query params
          const baseUrl = routeUrl.split('?')[0];
          if (url.startsWith(baseUrl)) {
            // Parse query params from both URLs
            const routeParams = new URLSearchParams(routeUrl.split('?')[1]);
            const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
            
            // Check if all route params exist in the URL
            let isMatch = true;
            for (const [key, value] of routeParams.entries()) {
              if (urlParams.get(key) !== value) {
                isMatch = false;
                break;
              }
            }
            
            if (isMatch) {
              return key;
            }
          }
        }
      }
      
      return null;
    }
    
    // Initialize the interceptor
    function init() {
      setupFetchInterceptor();
      setupXHRInterceptor();
      log('Request Interceptor initialized');
    }
    
    // Set up fetch API interception
    function setupFetchInterceptor() {
      window.fetch = function(resource, options = {}) {
        if (!isActive) {
          return originalFetch.apply(this, arguments);
        }
        
        const url = resource instanceof Request ? resource.url : resource;
        const method = options.method || 'GET';
        const routeKey = shouldIntercept(method, url);
        
        // Check if this request should be intercepted
        if (routeKey) {
          log(`Intercepting fetch request: ${method} ${url}`);
          const interceptConfig = interceptedRoutes[routeKey];
          
          // Special case for "passthrough" to allow delays without replacing the response
          if (interceptConfig.response === 'PASSTHROUGH') {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(originalFetch.apply(this, arguments));
              }, interceptConfig.delay || 0);
            });
          }
          
          return new Promise(resolve => {
            setTimeout(() => {
              const responseBody = typeof interceptConfig.response === 'function' 
                ? interceptConfig.response(resource, options) 
                : interceptConfig.response;
              
              const responseData = typeof responseBody === 'string' 
                ? responseBody 
                : JSON.stringify(responseBody);

                console.log(`Responding with: ${responseData}`);
                
              const response = new Response(responseData, {
                status: interceptConfig.status || 200,
                headers: {
                  'Content-Type': interceptConfig.contentType || 'application/json'
                }
              });
              
              resolve(response);
            }, interceptConfig.delay || 0);
          });
        }
        
        // Not intercepted, proceed normally
        return originalFetch.apply(this, arguments);
      };
    }
    
    // Set up XHR interception
    function setupXHRInterceptor() {
      // Override the XHR open method to capture the URL and method
      XMLHttpRequest.prototype.open = function(method, url) {
        this._interceptUrl = url;
        this._interceptMethod = method;
        return originalXHROpen.apply(this, arguments);
      };
      
      // Override the XHR send method to intercept if needed
      XMLHttpRequest.prototype.send = function(data) {
        if (!isActive) {
          return originalXHRSend.apply(this, arguments);
        }
        
        const routeKey = shouldIntercept(this._interceptMethod, this._interceptUrl);
        
        // Check if this request should be intercepted
        if (routeKey) {
          console.log(`Request Interceptor: ${this._interceptMethod} ${this._interceptUrl}`);
          log(`Intercepting XMLHttpRequest: ${this._interceptMethod} ${this._interceptUrl}`);
          const interceptConfig = interceptedRoutes[routeKey];
          const xhr = this;
          
          // Special case for "passthrough" to allow delays without replacing the response
          if (interceptConfig.response === 'PASSTHROUGH') {
            originalXHRSend.apply(this, arguments);
            const originalOnReadyStateChange = xhr.onreadystatechange;
            
            // Delay the response events
            xhr.onreadystatechange = function() {
              if (xhr.readyState === 4) {
                // When complete, delay the event
                setTimeout(() => {
                  if (originalOnReadyStateChange) {
                    originalOnReadyStateChange.apply(this, arguments);
                  }
                }, interceptConfig.delay || 0);
                return;
              }
              
              // For other ready states, proceed normally
              if (originalOnReadyStateChange) {
                originalOnReadyStateChange.apply(this, arguments);
              }
            };
            
            return;
          }
          
          // Simulate the XHR response
          setTimeout(() => {
            Object.defineProperty(xhr, 'readyState', { value: 4 });
            Object.defineProperty(xhr, 'status', { value: interceptConfig.status || 200 });
            Object.defineProperty(xhr, 'statusText', { value: interceptConfig.status === 200 ? 'OK' : 'Error' });
            
            const responseBody = typeof interceptConfig.response === 'function' 
              ? interceptConfig.response(data, { method: this._interceptMethod, url: this._interceptUrl }) 
              : interceptConfig.response;
            
            const responseText = typeof responseBody === 'string' 
              ? responseBody 
              : JSON.stringify(responseBody);

              console.log(`Responding with: ${responseText}`);


            
            Object.defineProperty(xhr, 'responseText', { value: responseText });
            Object.defineProperty(xhr, 'response', { value: responseText });
            
            if (xhr.onreadystatechange) {
              xhr.onreadystatechange();
            }
            if (xhr.onload) {
              xhr.onload();
            }
          }, interceptConfig.delay || 0);
          
          return;
        }
        
        // Not intercepted, proceed normally
        return originalXHRSend.apply(this, arguments);
      };
    }
    
    // Clean up and restore original methods
    function destroy() {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
      isActive = false;
      log('Request Interceptor destroyed');
    }
    
    // Public API
    return {
      initialize: function(routes) {
        interceptedRoutes = routes || {};
        isActive = true;
        init();
        log(`Request Interceptor activated with ${Object.keys(interceptedRoutes).length} routes`);
      },
      
      updateRoutes: function(routes) {
        interceptedRoutes = routes || {};
        log(`Updated routes. Now intercepting ${Object.keys(interceptedRoutes).length} routes`);
      },
      
      enable: function() {
        isActive = true;
        log('Request Interceptor enabled');
      },
      
      disable: function() {
        isActive = false;
        log('Request Interceptor disabled');
      },
      
      setLogging: function(enabled) {
        isLoggingEnabled = enabled;
      },
      
      destroy: destroy
    };
  })();
  
  // Make the interceptor available globally for debugging
  window.__requestInterceptor = RequestInterceptor;
  
  // Listen for commands from the content script
  window.addEventListener('message', (event) => {
    // Ensure the message is from our content script
    if (event.data && event.data.type === 'REQUEST_INTERCEPTOR_COMMAND') {
      const { command, routes } = event.data;
      
      switch (command) {
        case 'initialize':
          RequestInterceptor.initialize(routes);
          break;
        case 'updateRoutes':
          RequestInterceptor.updateRoutes(routes);
          break;
        case 'enable':
          RequestInterceptor.enable();
          break;
        case 'disable':
          RequestInterceptor.disable();
          break;
        case 'setLogging':
          RequestInterceptor.setLogging(true);
          break;
        case 'destroy':
          RequestInterceptor.destroy();
          break;
      }
    }
  });
  
  // Notify that the script has been loaded
  console.log('[Request Interceptor] Script injected into page');
})();