// Simplified interceptor.js

(function() {
  const RequestInterceptor = (function() {
    // Store original methods
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    // Internal state
    let isActive = false;
    let interceptedRoutes = {};
    
    /**
     * Log a message to the console and notify the content script
     */
    function log(message) {
      console.log(`[Request Interceptor] ${message}`);
      window.postMessage({
        type: 'REQUEST_INTERCEPTOR_LOG',
        message
      }, '*');
    }
    
    /**
     * Parse a route key into its components (method and URL)
     */
    function parseRouteKey(routeKey) {
      const [method, ...urlParts] = routeKey.split(':');
      return {
        method,
        url: urlParts.join(':') // Rejoin in case the URL contained colons
      };
    }
    
/**
 * Match a request URL against a pattern URL with regex support
 */
function urlMatches(requestUrl, patternUrl) {
  // Check if patternUrl is a regex pattern (starts and ends with /)
  if (patternUrl.startsWith('/') && patternUrl.lastIndexOf('/') > 0) {
    try {
      // Extract the regex pattern and flags
      const lastSlashIndex = patternUrl.lastIndexOf('/');
      const pattern = patternUrl.substring(1, lastSlashIndex);
      const flags = patternUrl.substring(lastSlashIndex + 1);
      
      // Create and test the RegExp
      const regex = new RegExp(pattern, flags);
      return regex.test(requestUrl);
    } catch (e) {
      console.warn(`[Request Interceptor] Invalid regex pattern: ${patternUrl}`, e);
      // Fall back to regular matching if regex is invalid
    }
  }
  
  // Process URLs
  let requestUrlObj, patternUrlObj;
  
  try {
    requestUrlObj = new URL(requestUrl, window.location.origin);
    patternUrlObj = new URL(patternUrl.includes('://') ? patternUrl : patternUrl, window.location.origin);
  } catch (e) {
    try {
      requestUrlObj = new URL(window.location.origin + (requestUrl.startsWith('/') ? requestUrl : '/' + requestUrl));
      patternUrlObj = new URL(window.location.origin + (patternUrl.startsWith('/') ? patternUrl : '/' + patternUrl));
    } catch (e2) {
      // If all parsing fails, fall back to direct string comparison
      return requestUrl === patternUrl;
    }
  }
  
  // Normalize paths (remove trailing slashes)
  const normalizedRequestPath = requestUrlObj.pathname.replace(/\/+$/, '');
  const normalizedPatternPath = patternUrlObj.pathname.replace(/\/+$/, '');
  
  // Direct path match
  if (normalizedRequestPath === normalizedPatternPath) {
    // If pattern has query params, they must all match
    if (patternUrlObj.search) {
      const patternParams = new URLSearchParams(patternUrlObj.search);
      const requestParams = new URLSearchParams(requestUrlObj.search);
      
      for (const [key, value] of patternParams) {
        if (requestParams.get(key) !== value) {
          return false;
        }
      }
    }
    return true;
  }
  
  // Wildcard matching
  if (patternUrl.includes('*')) {
    const regexPattern = patternUrl
      .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&') // Escape regex special chars except *
      .replace(/\*/g, '.*'); // Convert * to .*
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(requestUrl) || regex.test(requestUrlObj.pathname);
  }
  
  return false;
}
    
    /**
     * Check if a request should be intercepted based on configured routes
     */
    function shouldIntercept(method, url) {
      const normalizedMethod = method.toUpperCase();
      
      // Direct key match
      const directKey = `${normalizedMethod}:${url}`;
      if (interceptedRoutes[directKey]) {
        // Check if this specific route is enabled
        if (interceptedRoutes[directKey].hasOwnProperty('enabled') && !interceptedRoutes[directKey].enabled) {
          log(`Found match for ${directKey} but route is disabled`);
          return null;
        }
        
        log(`Found direct match for: ${directKey}`);
        return directKey;
      }
      
      // Check all routes for pattern matching
      for (const key in interceptedRoutes) {
        const { method: routeMethod, url: routeUrl } = parseRouteKey(key);
        
        // Method must match
        if (routeMethod !== normalizedMethod) continue;
        
        // Check if this specific route is enabled
        if (interceptedRoutes[key].hasOwnProperty('enabled') && !interceptedRoutes[key].enabled) {
          continue; // Skip disabled routes
        }
        
        // Check URL using advanced matching
        if (urlMatches(url, routeUrl)) {
          log(`Found match for ${method} ${url} using pattern: ${routeUrl}`);
          return key;
        }
      }
      
      return null;
    }
    
    /**
     * Create a proper response object
     */
    function createResponse(body, config) {
      // Format the body appropriately
      let responseBody, contentType;
      
      if (typeof body === 'string') {
        responseBody = body;
        if (!config.contentType) {
          if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
            contentType = 'application/json';
          } else if (body.trim().startsWith('<')) {
            contentType = 'text/html';
          } else {
            contentType = 'text/plain';
          }
        } else {
          contentType = config.contentType;
        }
      } else {
        // For objects, stringify and default to JSON
        try {
          responseBody = JSON.stringify(body);
          contentType = config.contentType || 'application/json';
        } catch (e) {
          responseBody = String(body);
          contentType = 'text/plain';
        }
      }
      
      // Create the response with appropriate status
      const response = new Response(responseBody, {
        status: config.status || 200,
        statusText: getStatusText(config.status || 200),
        headers: new Headers({
          'Content-Type': contentType,
          'X-Request-Intercepted': 'true'
        }),
      });
      
      return response;
    }
    
    /**
     * Get the appropriate status text for a status code
     */
    function getStatusText(status) {
      const statusTexts = {
        200: 'OK',
        201: 'Created',
        204: 'No Content',
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        500: 'Internal Server Error'
      };
      
      return statusTexts[status] || 'Unknown';
    }
    
    /**
     * Initialize the interceptor
     */
    function init() {
      setupFetchInterceptor();
      setupXHRInterceptor();
      log('Request Interceptor initialized');
    }
    
    /**
     * Set up fetch API interception
     */
    function setupFetchInterceptor() {
      window.fetch = function(resource, options = {}) {
        if (!isActive) {
          return originalFetch.apply(this, arguments);
        }
        
        const url = resource instanceof Request ? resource.url : resource;
        const method = options.method || (resource instanceof Request ? resource.method : 'GET');
        console.log("Checking if fetch should be intercepted:", method, url);
        
        const routeKey = shouldIntercept(method, url);
        
        // Check if this request should be intercepted
        if (routeKey) {
          log(`Intercepting fetch request: ${method} ${url}`);
          const interceptConfig = interceptedRoutes[routeKey];
          
          return new Promise(resolve => {
            setTimeout(() => {
              // Get the response based on configuration
              const responseBody = interceptConfig.response;
              
              // Create a response object
              const response = createResponse(responseBody, interceptConfig);
              
              resolve(response);
            }, interceptConfig.delay || 0);
          });
        }
        
        // Not intercepted, proceed normally
        return originalFetch.apply(this, arguments);
      };
    }
    
    /**
     * Set up XHR interception
     */
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
          log(`Intercepting XMLHttpRequest: ${this._interceptMethod} ${this._interceptUrl}`);
          const interceptConfig = interceptedRoutes[routeKey];
          const xhr = this;
          
          // Simulate the XHR response after delay
          setTimeout(() => {
            // Get the response based on configuration
            const responseBody = interceptConfig.response;
            
            // Format the response based on content type
            let responseText;
            if (typeof responseBody === 'object') {
              try {
                responseText = JSON.stringify(responseBody);
              } catch (e) {
                responseText = String(responseBody);
              }
            } else {
              responseText = String(responseBody);
            }
            
            // Set XHR properties
            Object.defineProperty(xhr, 'readyState', { value: 4, configurable: true });
            Object.defineProperty(xhr, 'status', { value: interceptConfig.status || 200, configurable: true });
            Object.defineProperty(xhr, 'statusText', { value: getStatusText(interceptConfig.status || 200), configurable: true });
            Object.defineProperty(xhr, 'responseText', { value: responseText, configurable: true });
            Object.defineProperty(xhr, 'response', { value: responseText, configurable: true });
            
            // Set content type header
            const contentType = interceptConfig.contentType || 
              (typeof responseBody === 'object' ? 'application/json' : 'text/plain');
            
            xhr.responseHeaders = {
              'Content-Type': contentType,
              'X-Request-Intercepted': 'true'
            };
            
            // Override getResponseHeader method
            xhr.getResponseHeader = function(name) {
              return xhr.responseHeaders[name.toLowerCase()];
            };
            
            // Trigger callbacks
            if (xhr.onreadystatechange) {
              xhr.onreadystatechange();
            }
            if (xhr.onload) {
              xhr.onload();
            }
            
            // For modern promise-based code
            if (xhr.dispatchEvent) {
              xhr.dispatchEvent(new Event('load'));
              xhr.dispatchEvent(new Event('loadend'));
            }
          }, interceptConfig.delay || 0);
          
          return;
        }
        
        // Not intercepted, proceed normally
        return originalXHRSend.apply(this, arguments);
      };
    }
    
    /**
     * Restore original methods
     */
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
        case 'destroy':
          RequestInterceptor.destroy();
          break;
      }
    }
  });
  
  // Notify that the script has been loaded
  console.log('[Request Interceptor] Script injected into page');
})();