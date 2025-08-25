// Complete injected script with HTTP, Headers-Only, and WebSocket interception - FIXED

(function() {
  const RequestInterceptor = (function() {
    // Store original methods
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    const originalWebSocket = window.WebSocket;
    
    // Internal state
    let isActive = false;
    let interceptedRoutes: Record<string, any> = {};
    let interceptedWebSockets: Record<string, any> = {};
    let activeWebSockets: Map<WebSocket, any> = new Map();
    
    /**
     * Log a message to the console and notify the content script
     */
    function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [Request Interceptor] ${message}`;
      
      switch (level) {
        case 'warn':
          console.warn(logMessage);
          break;
        case 'error':
          console.error(logMessage);
          break;
        default:
          console.log(logMessage);
      }
      
      window.postMessage({
        type: 'REQUEST_INTERCEPTOR_LOG',
        message,
        level,
        timestamp
      }, '*');
    }
    
    /**
     * Parse a route key into its components (method and URL)
     */
    function parseRouteKey(routeKey: string) {
      const firstColonIndex = routeKey.indexOf(':');
      if (firstColonIndex === -1) return { method: 'GET', url: routeKey };
      
      const method = routeKey.substring(0, firstColonIndex);
      const remaining = routeKey.substring(firstColonIndex + 1);
      
      const pipeIndex = remaining.indexOf('|');
      if (pipeIndex === -1) {
        return { method, url: remaining };
      }
      
      const url = remaining.substring(0, pipeIndex);
      const name = remaining.substring(pipeIndex + 1);
      
      return { method, url, name };
    }

    /**
     * Parse WebSocket route key - FIXED
     */
    function parseWebSocketRouteKey(routeKey: string): { url: string; name: string } {
      if (!routeKey.startsWith('WS:')) {
        throw new Error('Invalid WebSocket route key');
      }
      
      const remaining = routeKey.substring(3); // Remove 'WS:'
      const pipeIndex = remaining.indexOf('|');
      
      if (pipeIndex === -1) {
        return { url: remaining, name: '' };
      }
      
      const url = remaining.substring(0, pipeIndex);
      const name = remaining.substring(pipeIndex + 1);
      
      return { url, name };
    }

    /**
     * Match a request URL against a pattern URL with regex support - IMPROVED
     */
    function urlMatches(requestUrl: string, patternUrl: string): boolean {
      // Direct string match first (fastest)
      if (requestUrl === patternUrl) {
        return true;
      }

      // Check if patternUrl is a regex pattern (starts and ends with /)
      if (patternUrl.startsWith('/') && patternUrl.lastIndexOf('/') > 0) {
        try {
          const lastSlashIndex = patternUrl.lastIndexOf('/');
          const pattern = patternUrl.substring(1, lastSlashIndex);
          const flags = patternUrl.substring(lastSlashIndex + 1);
          
          const regex = new RegExp(pattern, flags);
          return regex.test(requestUrl);
        } catch (e) {
          log(`Invalid regex pattern: ${patternUrl}`, 'warn');
        }
      }
      
      // Normalize URLs for comparison
      let normalizedRequest = requestUrl;
      let normalizedPattern = patternUrl;
      
      // Handle WebSocket protocols
      if (requestUrl.startsWith('ws://') || requestUrl.startsWith('wss://')) {
        normalizedRequest = requestUrl.replace(/^wss?:\/\//, 'http://');
      }
      if (patternUrl.startsWith('ws://') || patternUrl.startsWith('wss://')) {
        normalizedPattern = patternUrl.replace(/^wss?:\/\//, 'http://');
      }
      
      // Process URLs for more complex matching
      let requestUrlObj: URL, patternUrlObj: URL;
      
      try {
        requestUrlObj = new URL(normalizedRequest, window.location.origin);
        patternUrlObj = new URL(normalizedPattern, window.location.origin);
      } catch (e) {
        // If URL parsing fails, try relative URL handling
        try {
          requestUrlObj = new URL(normalizedRequest, window.location.origin);
          patternUrlObj = new URL(normalizedPattern, window.location.origin);
        } catch (e2) {
          // Final fallback to simple string comparison
          return requestUrl === patternUrl;
        }
      }
      
      // Normalize paths (remove trailing slashes)
      const normalizedRequestPath = requestUrlObj.pathname.replace(/\/+$/, '');
      const normalizedPatternPath = patternUrlObj.pathname.replace(/\/+$/, '');
      
      // Check if hosts match (for full URLs)
      if (patternUrlObj.hostname !== 'localhost' && requestUrlObj.hostname !== patternUrlObj.hostname) {
        // Allow localhost patterns to match any host for development
        if (!patternUrlObj.hostname.includes('localhost')) {
          return false;
        }
      }
      
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
          .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
          .replace(/\*/g, '.*');
        
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(requestUrl) || regex.test(requestUrlObj.pathname);
      }
      
      return false;
    }
    
    /**
     * Check if a WebSocket should be intercepted - FIXED
     */
    function shouldInterceptWebSocket(url: string): string | null {
      log(`Checking WebSocket interception for: ${url}`);
      
      const enabledRoutes = Object.keys(interceptedWebSockets)
        .filter(key => {
          const config = interceptedWebSockets[key];
          const isEnabled = config.enabled !== false; // Default to enabled
          return isEnabled && key.startsWith('WS:');
        });
      
      log(`Enabled WebSocket routes: ${enabledRoutes.length}`);
      
      // Try exact matches first, then pattern matches
      for (const routeKey of enabledRoutes) {
        try {
          const { url: routeUrl } = parseWebSocketRouteKey(routeKey);
          
          log(`Checking WebSocket route: ${routeUrl} (${routeKey})`);
          
          if (urlMatches(url, routeUrl)) {
            log(`✓ Found matching WebSocket route: ${routeKey}`);
            return routeKey;
          }
        } catch (error) {
          log(`Error parsing WebSocket route key "${routeKey}": ${error}`, 'error');
        }
      }
      
      log(`No matching WebSocket route found for: ${url}`);
      return null;
    }

    /**
     * Validate WebSocket rule - NEW
     */
    function validateWebSocketRule(rule: any): { valid: boolean; error?: string } {
      if (!rule || typeof rule !== 'object') {
        return { valid: false, error: 'Rule must be an object' };
      }
      
      if (!rule.match || rule.match.trim() === '') {
        return { valid: false, error: 'Match pattern is required' };
      }
      
      if (rule.type !== 'block' && (!rule.replacement || rule.replacement.trim() === '')) {
        return { valid: false, error: 'Replacement text is required for replace and inject rules' };
      }
      
      if (rule.matchType === 'regex') {
        try {
          new RegExp(rule.match, rule.flags || '');
        } catch (error) {
          return { valid: false, error: `Invalid regex pattern: ${error}` };
        }
      }
      
      return { valid: true };
    }

    /**
     * Check if rule matches message - NEW
     */
    function checkRuleMatch(message: string, rule: any): boolean {
      switch (rule.matchType) {
        case 'exact':
            if (message === rule.match) {
            return true;
            }
            // For exact match, also check if message contains the exact string
            return message.includes(rule.match);
          
        case 'contains':
          return message.includes(rule.match);
          
        case 'regex':
          try {
            const flags = rule.flags || 'g';
            const regex = new RegExp(rule.match, flags);
            return regex.test(message);
          } catch (error) {
            log(`Invalid regex in rule "${rule.description || rule.id}": ${error}`, 'error');
            return false;
          }
          
        default:
          return false;
      }
    }

    /**
     * Apply rule replacement - NEW
     */
    function applyReplacement(message: string, rule: any): string {
      switch (rule.matchType) {
        case 'exact':
          return message === rule.match ? (rule.replacement || '') : message;
          
        case 'contains':
          return message.replace(new RegExp(escapeRegExp(rule.match), 'g'), rule.replacement || '');
          
        case 'regex':
          try {
            const flags = rule.flags || 'g';
            const regex = new RegExp(rule.match, flags);
            return message.replace(regex, rule.replacement || '');
          } catch (error) {
            log(`Error applying regex replacement: ${error}`, 'error');
            return message;
          }
          
        default:
          return message;
      }
    }

    /**
     * Process message based on configuration - COMPLETELY REWRITTEN
     */
    function processMessage(
      message: any, 
      config: any, 
      direction: 'incoming' | 'outgoing'
    ): { result: any; blocked: boolean; injected?: any } {
      if (!config) return { result: message, blocked: false };
      
      const rules = direction === 'incoming' ? config.incomingRules : config.outgoingRules;
      if (!rules || rules.length === 0) return { result: message, blocked: false };

      let processedMessage = message;
      let injectedMessage: any = null;
      
      // Better type conversion
      if (typeof processedMessage !== 'string') {
        if (processedMessage instanceof ArrayBuffer) {
          processedMessage = new TextDecoder().decode(processedMessage);
        } else if (processedMessage instanceof Blob) {
          // Handle Blob asynchronously or convert to string
          return { result: processedMessage, blocked: false }; // Pass through for now
        } else if (typeof processedMessage === 'object') {
          try {
            processedMessage = JSON.stringify(processedMessage);
          } catch {
            processedMessage = String(processedMessage);
          }
        } else {
          processedMessage = String(processedMessage);
        }
      }
      
      // Apply each rule in order
      for (const rule of rules) {
        if (!rule.enabled) continue;
        
        const validation = validateWebSocketRule(rule);
        if (!validation.valid) {
          log(`Skipping invalid rule: ${validation.error}`, 'warn');
          continue;
        }
        
        try {
          const matches = checkRuleMatch(processedMessage, rule);
          
          if (matches) {
            switch (rule.type) {
              case 'replace':
                processedMessage = applyReplacement(processedMessage, rule);
                log(`WebSocket ${direction} message replaced: ${rule.description || 'No description'}`);
                break;
                
              case 'block':
                log(`WebSocket ${direction} message blocked: ${rule.description || 'No description'}`);
                return { result: null, blocked: true };
                
              case 'inject':
                injectedMessage = rule.replacement;
                log(`WebSocket ${direction} message injection triggered: ${rule.description || 'No description'}`);
                break;
            }
          }
        } catch (error) {
          log(`Error processing WebSocket rule "${rule.description || rule.id}": ${error}`, 'error');
        }
      }
      
      return { 
        result: processedMessage, 
        blocked: false, 
        injected: injectedMessage 
      };
    }
    
    /**
     * Escape string for use in regex
     */
    function escapeRegExp(string: string): string {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Check if a request should be intercepted based on configured routes
     */
    function shouldIntercept(method: string, url: string): { routeKey: string; mode: 'full' | 'headers-only' } | null {
      const normalizedMethod = method.toUpperCase();
      
      log(`Checking interception for: ${normalizedMethod} ${url}`);
      log(`Available routes: ${Object.keys(interceptedRoutes).length}`);
      
      // Find enabled routes
      const enabledRoutes = Object.keys(interceptedRoutes).filter(key => {
        const config = interceptedRoutes[key];
        const isEnabled = config.enabled === true || config.enabled === undefined || config.enabled !== false;
        return isEnabled;
      });
      
      log(`Enabled routes: ${enabledRoutes.length} of ${Object.keys(interceptedRoutes).length}`);
      
      // Find matching routes
      const matchingRoutes = [];
      
      for (const routeKey of enabledRoutes) {
        const { method: routeMethod, url: routeUrl } = parseRouteKey(routeKey);
        
        log(`Checking route: ${routeMethod} ${routeUrl} (${routeKey})`);
        
        // Method must match
        if (routeMethod !== normalizedMethod) {
          log(`Method mismatch: ${routeMethod} !== ${normalizedMethod}`);
          continue;
        }
        
        // Check URL match
        if (urlMatches(url, routeUrl)) {
          log(`✓ URL matches for route: ${routeKey}`);
          matchingRoutes.push(routeKey);
        } else {
          log(`URL mismatch: ${url} does not match ${routeUrl}`);
        }
      }
      
      if (matchingRoutes.length === 0) {
        log(`No matching route found for: ${normalizedMethod} ${url}`);
        return null;
      }
      
      // Handle multiple matching routes - prefer named routes over simple routes
      let selectedRoute: string;
      if (matchingRoutes.length > 1) {
        log(`Multiple matching routes found: ${matchingRoutes.join(', ')}`);
        
        const namedRoutes = matchingRoutes.filter(key => key.includes('|'));
        const simpleRoutes = matchingRoutes.filter(key => !key.includes('|'));
        
        selectedRoute = namedRoutes.length > 0 ? namedRoutes[0] : simpleRoutes[0];
        log(`✓ Selected route: ${selectedRoute}`);
      } else {
        selectedRoute = matchingRoutes[0];
        log(`✓ Found matching route: ${selectedRoute}`);
      }
      
      // Determine interception mode
      const config = interceptedRoutes[selectedRoute];
      const hasResponse = config.response !== undefined && config.response !== null && config.response !== '';
      const hasHeaders = (config.responseHeaders && Object.keys(config.responseHeaders).length > 0) ||
                        (config.requestHeaders && Object.keys(config.requestHeaders).length > 0) ||
                        (config.removeRequestHeaders && config.removeRequestHeaders.length > 0);
      
      const mode = config.headersOnly || (!hasResponse && hasHeaders) ? 'headers-only' : 'full';
      
      log(`Interception mode: ${mode} (hasResponse: ${hasResponse}, hasHeaders: ${hasHeaders}, headersOnly: ${config.headersOnly})`);
      
      return { routeKey: selectedRoute, mode };
    }

    /**
     * Apply request header modifications
     */
    function modifyRequestHeaders(headers: Headers, config: any): Headers {
      const modifiedHeaders = new Headers(headers);
      
      // Remove headers if specified
      if (config.removeRequestHeaders && Array.isArray(config.removeRequestHeaders)) {
        config.removeRequestHeaders.forEach((headerName: string) => {
          modifiedHeaders.delete(headerName);
          log(`Removed request header: ${headerName}`);
        });
      }
      
      // Add/modify headers if specified
      if (config.requestHeaders && typeof config.requestHeaders === 'object') {
        Object.entries(config.requestHeaders).forEach(([key, value]) => {
          modifiedHeaders.set(key, value as string);
          log(`Set request header: ${key} = ${value}`);
        });
      }
      
      return modifiedHeaders;
    }
    
    /**
     * Apply response header modifications to a real response
     */
    function modifyResponseHeaders(response: Response, config: any): Response {
      if (!config.responseHeaders || Object.keys(config.responseHeaders).length === 0) {
        return response;
      }
      
      // Create new headers with the original ones plus modifications
      const newHeaders = new Headers(response.headers);
      
      Object.entries(config.responseHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value as string);
        log(`Added response header: ${key} = ${value}`);
      });
      
      // Create new response with modified headers
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }
    
    /**
     * Create a mock response object with custom headers (for full interception)
     */
    function createMockResponse(body: any, config: any): Response {
      let responseBody: string, contentType: string;
      
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
        try {
          responseBody = JSON.stringify(body);
          contentType = config.contentType || 'application/json';
        } catch (e) {
          responseBody = String(body);
          contentType = 'text/plain';
        }
      }
      
      // Create headers object
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'X-Request-Intercepted': 'true'
      };
      
      // Add custom response headers if specified
      if (config.responseHeaders && typeof config.responseHeaders === 'object') {
        Object.entries(config.responseHeaders).forEach(([key, value]) => {
          headers[key] = value as string;
          log(`Added response header: ${key} = ${value}`);
        });
      }
      
      const response = new Response(responseBody, {
        status: config.status || 200,
        statusText: getStatusText(config.status || 200),
        headers: new Headers(headers),
      });
      
      return response;
    }
    
    /**
     * Get the appropriate status text for a status code
     */
    function getStatusText(status: number): string {
      const statusTexts: Record<number, string> = {
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
     * Set up WebSocket interception - COMPLETELY REWRITTEN
     */
    function setupWebSocketInterceptor() {
      (window as any).WebSocket = function(url: string | URL, protocols?: string | string[]) {
        const wsUrl = String(url);
        const routeKey = shouldInterceptWebSocket(wsUrl);
        
        if (routeKey) {
          log(`✓ Intercepting WebSocket: ${wsUrl} with route: ${routeKey}`);
          const config = interceptedWebSockets[routeKey];
          
          // Create the actual WebSocket connection
          const realWs = new originalWebSocket(wsUrl, protocols);
          const interceptedWs = Object.create(originalWebSocket.prototype);
          
          // Store the config for this WebSocket
          activeWebSockets.set(interceptedWs, { config, realWs, url: wsUrl });
          
          // Proxy all properties and methods
          const propertiesToProxy = [
            'url', 'readyState', 'bufferedAmount', 'extensions', 'protocol'
          ];
          
          propertiesToProxy.forEach(prop => {
            Object.defineProperty(interceptedWs, prop, {
              get() { return (realWs as any)[prop]; },
              configurable: true
            });
          });
          
          // Setup message handling
          const interceptIncomingMessage = (originalHandler: Function) => {
            return function(event: MessageEvent) {
              log(`WebSocket incoming message: ${event.data}`);
              
              const result = processMessage(event.data, config, 'incoming');
              
              if (result.blocked) {
                log(`WebSocket incoming message blocked`);
                return; // Don't trigger handler
              }
              
              // Handle injection first
              if (result.injected) {
                log(`WebSocket injecting incoming message: ${result.injected}`);
                const injectedEvent = new MessageEvent('message', {
                  data: result.injected,
                  origin: event.origin,
                  lastEventId: event.lastEventId,
                  source: event.source,
                  ports: [...event.ports]
                });
                originalHandler.call(interceptedWs, injectedEvent);
              }
              
              // Trigger handler with processed message
              if (result.result !== null) {
                const newEvent = new MessageEvent('message', {
                  data: result.result,
                  origin: event.origin,
                  lastEventId: event.lastEventId,
                  source: event.source,
                  ports: [...event.ports]
                });
                originalHandler.call(interceptedWs, newEvent);
              }
            };
          };
          
          // Proxy methods
          interceptedWs.send = function(data: any) {
            log(`WebSocket outgoing message: ${data}`);
            
            const result = processMessage(data, config, 'outgoing');
            
            if (result.blocked) {
              log(`WebSocket outgoing message blocked`);
              return; // Don't send anything
            }
            
            // Handle injection first
            if (result.injected) {
              log(`WebSocket injecting outgoing message: ${result.injected}`);
              realWs.send(result.injected);
            }
            
            // Send the processed message
            if (result.result !== null) {
              realWs.send(result.result);
            }
          };
          
          interceptedWs.close = function(code?: number, reason?: string) {
            activeWebSockets.delete(interceptedWs);
            return realWs.close(code, reason);
          };
          
          // Proxy event handlers - SIMPLIFIED
          const eventProperties = ['onopen', 'onclose', 'onerror', 'onmessage'];
          eventProperties.forEach(prop => {
            Object.defineProperty(interceptedWs, prop, {
              get() { return (realWs as Record<string, any>)[prop]; },
              set(handler) {
                if (prop === 'onmessage' && handler) {
                  // Intercept incoming messages
                  realWs[prop] = interceptIncomingMessage(handler);
                } else {
                  (realWs as any)[prop] = handler ? handler.bind(interceptedWs) : handler;
                }
              },
              configurable: true
            });
          });
          
          // Proxy addEventListener and removeEventListener - SIMPLIFIED
          interceptedWs.addEventListener = function(type: string, listener: any, options?: any) {
            if (type === 'message' && listener) {
              const wrappedListener = interceptIncomingMessage(listener);
              return realWs.addEventListener(type, wrappedListener, options);
            } else {
              return realWs.addEventListener(type, listener ? listener.bind(interceptedWs) : listener, options);
            }
          };
          
          interceptedWs.removeEventListener = function(type: string, listener: any, options?: any) {
            return realWs.removeEventListener(type, listener, options);
          };
          
          interceptedWs.dispatchEvent = function(event: Event) {
            return realWs.dispatchEvent(event);
          };
          
          // Set up constants
          Object.defineProperty(interceptedWs, 'CONNECTING', { value: 0, writable: false });
          Object.defineProperty(interceptedWs, 'OPEN', { value: 1, writable: false });
          Object.defineProperty(interceptedWs, 'CLOSING', { value: 2, writable: false });
          Object.defineProperty(interceptedWs, 'CLOSED', { value: 3, writable: false });
          
          return interceptedWs;
        }
        
        // If not intercepted, create normal WebSocket
        log(`→ Not intercepting WebSocket: ${wsUrl}`);
        return new originalWebSocket(url, protocols);
      };
      
      // Copy static properties
      (window as any).WebSocket.CONNECTING = 0;
      (window as any).WebSocket.OPEN = 1;
      (window as any).WebSocket.CLOSING = 2;
      (window as any).WebSocket.CLOSED = 3;
    }
    
    /**
     * Initialize the interceptor
     */
    function init() {
      setupFetchInterceptor();
      setupXHRInterceptor();
      setupWebSocketInterceptor();
      log('Request Interceptor initialized with full support');
    }
    
    /**
     * Set up fetch API interception with headers-only mode
     */
    function setupFetchInterceptor() {
      (window as any).fetch = function(resource: RequestInfo | URL, options: RequestInit = {}) {
        if (!isActive) {
          return originalFetch.apply(this, arguments as any);
        }
        
        const url = resource instanceof Request ? resource.url : String(resource);
        const method = options.method || (resource instanceof Request ? resource.method : 'GET');
        
        const interceptResult = shouldIntercept(method, url);

        if (interceptResult) {
          const { routeKey, mode } = interceptResult;
          const interceptConfig = interceptedRoutes[routeKey];
          
          log(`✓ Intercepting fetch request: ${method} ${url} with route: ${routeKey} (mode: ${mode})`);
          
          if (mode === 'full') {
            // Full interception - return mock response
            return new Promise(resolve => {
              setTimeout(() => {
                const response = createMockResponse(interceptConfig.response, interceptConfig);
                resolve(response);
              }, interceptConfig.delay || 0);
            });
          } else {
            // Headers-only interception - modify request and let it proceed
            let modifiedResource = resource;
            let modifiedOptions = { ...options };
            
            // Modify request headers
            if (interceptConfig.requestHeaders || interceptConfig.removeRequestHeaders) {
              const originalHeaders = new Headers(options.headers);
              const modifiedHeaders = modifyRequestHeaders(originalHeaders, interceptConfig);
              modifiedOptions.headers = modifiedHeaders;
            }
            
            // Make the real request with modified headers
            const realRequestPromise = originalFetch.call(this, modifiedResource, modifiedOptions);
            
            // If we need to modify response headers, intercept the response
            if (interceptConfig.responseHeaders && Object.keys(interceptConfig.responseHeaders).length > 0) {
              return realRequestPromise.then(response => {
                log(`✓ Modifying response headers for: ${method} ${url}`);
                return modifyResponseHeaders(response, interceptConfig);
              });
            }
            
            return realRequestPromise;
          }
        }
        
        // If not intercepted, proceed with original request
        log(`→ Not intercepting fetch request: ${method} ${url}`);
        return originalFetch.call(this, resource, options);
      };
    }
    
    /**
     * Set up XHR interception with headers-only mode
     */
    function setupXHRInterceptor() {
      // Override the XHR open method to capture the URL and method
      XMLHttpRequest.prototype.open = function(method: string, url: string | URL) {
        (this as any)._interceptUrl = String(url);
        (this as any)._interceptMethod = method;
        (this as any)._interceptHeaders = new Map();
        (this as any)._originalHeaders = new Map();
        
        return originalXHROpen.apply(this, arguments as any);
      };
      
      // Override setRequestHeader to track headers
      XMLHttpRequest.prototype.setRequestHeader = function(name: string, value: string) {
        if (!(this as any)._interceptHeaders) {
          (this as any)._interceptHeaders = new Map();
        }
        if (!(this as any)._originalHeaders) {
          (this as any)._originalHeaders = new Map();
        }
        
        (this as any)._originalHeaders.set(name.toLowerCase(), value);
        (this as any)._interceptHeaders.set(name.toLowerCase(), value);
        
        return originalXHRSetRequestHeader.apply(this, arguments as any);
      };
      
      // Override the XHR send method to intercept if needed
      XMLHttpRequest.prototype.send = function(data?: Document | BodyInit | null) {
        if (!isActive) {
          return originalXHRSend.apply(this, arguments as any);
        }
        
        const method = (this as any)._interceptMethod;
        const url = (this as any)._interceptUrl;
        const interceptResult = shouldIntercept(method, url);

        if (interceptResult) {
          const { routeKey, mode } = interceptResult;
          const interceptConfig = interceptedRoutes[routeKey];
          
          log(`✓ Intercepting XMLHttpRequest: ${method} ${url} with route: ${routeKey} (mode: ${mode})`);
          
          if (mode === 'full') {
            // Full interception - return mock response
            const xhr = this;
            
            setTimeout(() => {
              const responseBody = interceptConfig.response;
              
              let responseText: string;
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
              
              // Create response headers
              const responseHeaders: Record<string, string> = {
                'Content-Type': interceptConfig.contentType || 'application/json',
                'X-Request-Intercepted': 'true'
              };
              
              // Add custom response headers
              if (interceptConfig.responseHeaders) {
                Object.assign(responseHeaders, interceptConfig.responseHeaders);
              }
              
              (xhr as any).responseHeaders = responseHeaders;
              
              // Override getResponseHeader method
              xhr.getResponseHeader = function(name: string) {
                return (xhr as any).responseHeaders[name.toLowerCase()] || null;
              };
              
              // Override getAllResponseHeaders method
              xhr.getAllResponseHeaders = function() {
                return Object.entries((xhr as any).responseHeaders)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join('\r\n');
              };
              
              // Trigger callbacks
              if (xhr.onreadystatechange) {
                xhr.onreadystatechange(new Event('readystatechange'));
              }
              if (xhr.onload) {
                xhr.onload(new ProgressEvent('load'));
              }
              
              if (xhr.dispatchEvent) {
                xhr.dispatchEvent(new Event('load'));
                xhr.dispatchEvent(new Event('loadend'));
              }
            }, interceptConfig.delay || 0);
            
            return;
          } else {
            // Headers-only interception - modify request headers and let it proceed
            const xhr = this;
            
            // Apply request header modifications
            if (interceptConfig.requestHeaders || interceptConfig.removeRequestHeaders) {
              const currentHeaders = (this as any)._interceptHeaders || new Map();
              
              // Remove headers
              if (interceptConfig.removeRequestHeaders) {
                interceptConfig.removeRequestHeaders.forEach((headerName: string) => {
                  currentHeaders.delete(headerName.toLowerCase());
                  log(`Removed request header: ${headerName}`);
                });
              }
              
              // Add/modify headers
              if (interceptConfig.requestHeaders) {
                Object.entries(interceptConfig.requestHeaders).forEach(([key, value]) => {
                  currentHeaders.set(key.toLowerCase(), value as string);
                  log(`Set request header: ${key} = ${value}`);
                });
              }
              
              // Re-apply all headers to the XHR
              currentHeaders.forEach((value: string, key: string) => {
                originalXHRSetRequestHeader.call(this, key, value);
              });
            }
            
            // If we need to modify response headers, intercept the response
            if (interceptConfig.responseHeaders && Object.keys(interceptConfig.responseHeaders).length > 0) {
              const originalOnReadyStateChange = xhr.onreadystatechange;
              const originalOnLoad = xhr.onload;
              
              xhr.onreadystatechange = function(event) {
                if (xhr.readyState === 4) {
                  log(`✓ Modifying response headers for XHR: ${method} ${url}`);
                  
                  // Modify response headers
                  const originalGetResponseHeader = xhr.getResponseHeader;
                  const originalGetAllResponseHeaders = xhr.getAllResponseHeaders;
                  
                  const enhancedHeaders = { ...(xhr as any).responseHeaders };
                  Object.assign(enhancedHeaders, interceptConfig.responseHeaders);
                  (xhr as any).responseHeaders = enhancedHeaders;
                  
                  xhr.getResponseHeader = function(name: string) {
                    return enhancedHeaders[name.toLowerCase()] || originalGetResponseHeader.call(xhr, name);
                  };
                  
                  xhr.getAllResponseHeaders = function() {
                    const original = originalGetAllResponseHeaders.call(xhr);
                    const additional = Object.entries(interceptConfig.responseHeaders)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join('\r\n');
                    return original + (original ? '\r\n' : '') + additional;
                  };
                }
                
                if (originalOnReadyStateChange) {
                  originalOnReadyStateChange.call(xhr, event);
                }
              };
              
              if (originalOnLoad) {
                xhr.onload = function(event) {
                  originalOnLoad.call(xhr, event);
                };
              }
            }
            
            // Proceed with the original request
            return originalXHRSend.apply(this, arguments as any);
          }
        }
        
        // If not intercepted, proceed with original request
        log(`→ Not intercepting XMLHttpRequest: ${method} ${url}`);
        return originalXHRSend.apply(this, arguments as any);
      };
    }
    
    /**
     * Restore original methods
     */
    function destroy() {
      (window as any).fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
      XMLHttpRequest.prototype.setRequestHeader = originalXHRSetRequestHeader;
      (window as any).WebSocket = originalWebSocket;
      
      // Close all active WebSocket connections
      activeWebSockets.clear();
      
      isActive = false;
      log('Request Interceptor destroyed');
    }
    
    // Public API
    return {
      initialize: function(routes: Record<string, any>) {
        interceptedRoutes = {};
        interceptedWebSockets = {};
        
        // Separate HTTP routes and WebSocket routes
        Object.keys(routes || {}).forEach(key => {
          if (key.startsWith('WS:')) {
            interceptedWebSockets[key] = routes[key];
          } else {
            interceptedRoutes[key] = routes[key];
          }
        });
        
        isActive = true;
        init();
        
        const httpRoutes = Object.keys(interceptedRoutes).length;
        const wsRoutes = Object.keys(interceptedWebSockets).length;
        log(`Request Interceptor activated with ${httpRoutes} HTTP routes and ${wsRoutes} WebSocket routes`);
        
        // Debug: Log all routes
        Object.keys(interceptedRoutes).forEach(key => {
          const config = interceptedRoutes[key];
          const { method, url, name } = parseRouteKey(key);
          const isEnabled = config.enabled === true || config.enabled === undefined || config.enabled !== false;
          const hasResponse = config.response !== undefined && config.response !== null && config.response !== '';
          const hasHeaders = (config.responseHeaders && Object.keys(config.responseHeaders).length > 0) ||
                            (config.requestHeaders && Object.keys(config.requestHeaders).length > 0) ||
                            (config.removeRequestHeaders && config.removeRequestHeaders.length > 0);
          const mode = config.headersOnly || (!hasResponse && hasHeaders) ? 'headers-only' : 'full';
          
          log(`HTTP Route: ${method} ${url} ${name ? `(${name})` : ''} - ${isEnabled ? 'ENABLED' : 'DISABLED'} - Mode: ${mode}`);
        });
        
        Object.keys(interceptedWebSockets).forEach(key => {
          const config = interceptedWebSockets[key];
          try {
            const { url, name } = parseWebSocketRouteKey(key);
            const isEnabled = config.enabled === true || config.enabled === undefined || config.enabled !== false;
            const incomingRules = (config.incomingRules || []).filter((r: any) => r.enabled).length;
            const outgoingRules = (config.outgoingRules || []).filter((r: any) => r.enabled).length;
            log(`WebSocket Route: ${url} ${name ? `(${name})` : ''} - ${isEnabled ? 'ENABLED' : 'DISABLED'} - Rules: ${incomingRules} incoming, ${outgoingRules} outgoing`);
          } catch (error) {
            log(`Invalid WebSocket route key: ${key}`, 'error');
          }
        });
      },
      
      updateRoutes: function(routes: Record<string, any>) {
        this.initialize(routes);
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
  (window as any).__requestInterceptor = RequestInterceptor;
  
  // Listen for commands from the content script
  window.addEventListener('message', (event) => {
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
  
  console.log('[Request Interceptor] Complete script injected with HTTP, Headers-Only, and WebSocket support');
})();

export {};