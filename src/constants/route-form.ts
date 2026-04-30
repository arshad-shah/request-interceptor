import { RouteFormData, WebSocketRule, InjectionConfig } from '@/types';
import { formatJson } from '@/lib/chrome-api';

export const defaultWebSocketRule: Omit<WebSocketRule, 'id'> = {
  enabled: true,
  type: 'replace',
  matchType: 'contains',
  match: '',
  replacement: '',
  description: ''
};

export const defaultFormData: RouteFormData = {
  routeType: 'http',
  name: '',
  url: '',
  method: 'GET',
  status: 200,
  delay: 0,
  contentType: 'application/json',
  response: formatJson({ status: 'success', data: [{ id: 1, name: 'Example' }] }),
  responseHeaders: {},
  requestHeaders: {},
  removeRequestHeaders: [],
  headersOnly: false,
  interceptionMode: 'mock',
  redirectUrl: '',
  requestBody: '',
  queryParamRules: [],
  graphqlOperationName: '',
  incomingRules: [],
  outgoingRules: [],
  scripts: [],
  stylesheets: [],
  injectAt: 'document_end'
};

export const defaultInjectionConfig: Omit<InjectionConfig, 'timestamp'> = {
  enabled: true,
  scripts: [],
  stylesheets: [],
  injectAt: 'document_end',
  urlPattern: ''
};

// Common response headers
export const commonResponseHeaders = [
  { key: 'Access-Control-Allow-Origin', value: '*', description: 'Allow cross-origin requests from any domain' },
  { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS', description: 'Allowed HTTP methods for CORS' },
  { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization', description: 'Allowed headers for CORS' },
  { key: 'Cache-Control', value: 'no-cache', description: 'Disable caching of the response' },
  { key: 'Cache-Control', value: 'max-age=3600', description: 'Cache response for 1 hour' },
  { key: 'X-Powered-By', value: 'Request Interceptor', description: 'Custom powered by header' },
  { key: 'X-Response-Time', value: '150ms', description: 'Simulate response time header' },
  { key: 'Set-Cookie', value: 'sessionId=abc123; HttpOnly; Secure', description: 'Set a secure session cookie' },
  { key: 'Location', value: '/api/redirect', description: 'Redirect location for 3xx responses' },
  { key: 'Content-Disposition', value: 'attachment; filename="data.json"', description: 'Force file download' }
];

// Common request headers to add/modify
export const commonRequestHeaders = [
  { key: 'Authorization', value: 'Bearer token123', description: 'Add/override authorization header' },
  { key: 'User-Agent', value: 'Request-Interceptor/1.0', description: 'Override user agent' },
  { key: 'X-API-Key', value: 'your-api-key', description: 'Add API key header' },
  { key: 'X-Forwarded-For', value: '127.0.0.1', description: 'Add forwarded IP header' },
  { key: 'Accept', value: 'application/json', description: 'Override accept header' },
  { key: 'Content-Type', value: 'application/json', description: 'Override content type' },
  { key: 'X-Requested-With', value: 'XMLHttpRequest', description: 'Mark as AJAX request' },
  { key: 'Origin', value: 'https://trusted-domain.com', description: 'Override origin header' }
];

// Common headers to remove from requests
export const commonRemoveHeaders = [
  { key: 'Authorization', description: 'Remove authorization to simulate logged-out state' },
  { key: 'User-Agent', description: 'Remove user agent for anonymity testing' },
  { key: 'Referer', description: 'Remove referer header for privacy testing' },
  { key: 'Cookie', description: 'Remove all cookies' },
  { key: 'X-Forwarded-For', description: 'Remove forwarded IP header' },
  { key: 'X-Real-IP', description: 'Remove real IP header' },
  { key: 'Accept-Encoding', description: 'Remove compression preferences' },
  { key: 'If-Modified-Since', description: 'Remove conditional request header' }
];
