/**
 * Network Inspector Types
 * Type definitions for network monitoring functionality
 */

// ============================================
// Resource Types
// ============================================

export type ResourceType =
  | 'xhr'
  | 'fetch'
  | 'script'
  | 'stylesheet'
  | 'image'
  | 'font'
  | 'document'
  | 'media'
  | 'websocket'
  | 'manifest'
  | 'other';

export type RequestStatus = 'pending' | 'loading' | 'complete' | 'error';

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'OPTIONS'
  | 'HEAD'
  | 'WS';

// ============================================
// Header Types
// ============================================

export interface NetworkHeader {
  name: string;
  value: string;
}

// ============================================
// Timing Information
// ============================================

export interface RequestTiming {
  startTime?: number;
  dnsStart?: number;
  dnsEnd?: number;
  connectStart?: number;
  connectEnd?: number;
  sslStart?: number;
  sslEnd?: number;
  sendStart?: number;
  sendEnd?: number;
  receiveHeadersEnd?: number;
  responseStart?: number;
  responseEnd?: number;
}

// ============================================
// Request Body Types
// ============================================

export interface RequestBodyRaw {
  bytes?: ArrayBuffer;
}

export interface RequestBody {
  raw?: RequestBodyRaw[];
  formData?: Record<string, string[]>;
}

// ============================================
// Response Body
// ============================================

export interface ResponseBody {
  body: string;
  base64Encoded: boolean;
  mimeType?: string;
  truncated?: boolean;
}

// ============================================
// Network Request
// ============================================

export interface NetworkRequest {
  // Identification
  requestId: string;
  tabId: number;
  frameId?: number;

  // URL Information
  url: string;
  hostname: string;
  pathname: string;
  filename: string;
  query: string;

  // Request Details
  method: HttpMethod;
  type: ResourceType;
  resourceType?: string;
  initiator?: string;

  // Headers
  requestHeaders: NetworkHeader[];
  responseHeaders: NetworkHeader[];

  // Request Body
  hasPostData?: boolean;
  postData?: string;
  requestBody?: RequestBody;

  // Response Details
  statusCode?: number;
  statusLine?: string;
  mimeType?: string;
  contentType?: string;
  protocol?: string;

  // Size Information
  size?: number;
  encodedSize?: number;
  encodedDataLength?: number;

  // Timing
  startTime: number;
  duration?: number;
  timing?: RequestTiming;

  // Status
  status: RequestStatus;
  error?: string;

  // Caching
  fromCache?: boolean;
  fromServiceWorker?: boolean;

  // Network
  ip?: string;
  remoteIPAddress?: string;
  remotePort?: number;

  // Redirect
  redirectedTo?: string;

  // Response Body (populated when request completes)
  responseBody?: ResponseBody;

  // WebSocket specific fields
  wsFramesSent?: number;
  wsFramesReceived?: number;
  wsSentSize?: number;
  wsReceivedSize?: number;
  wsFrames?: WebSocketFrame[];
}

// ============================================
// WebSocket Frame
// ============================================

export interface WebSocketFrame {
  type: 'sent' | 'received';
  timestamp: number;
  opcode: number; // 1 = text, 2 = binary
  data: string;
  length: number;
  mask?: boolean;
}

// ============================================
// Filter Types
// ============================================

export type NetworkFilterType =
  | 'all'
  | 'xhr'
  | 'script'
  | 'stylesheet'
  | 'image'
  | 'font'
  | 'document'
  | 'media'
  | 'websocket'
  | 'other';

export interface NetworkFilters {
  type: NetworkFilterType;
  search: string;
  statusCode?: number;
  method?: HttpMethod;
}

// ============================================
// Settings
// ============================================

export interface NetworkSettings {
  preserveLog: boolean;
  recording: boolean;
  disableCache: boolean;
  showWaterfall: boolean;
}

// ============================================
// Stats
// ============================================

export interface NetworkStats {
  requestCount: number;
  transferSize: number;
  totalTime: number;
  domLoaded?: number;
}

// ============================================
// Store State
// ============================================

export interface NetworkState {
  // Data
  requests: NetworkRequest[];
  selectedRequest: NetworkRequest | null;
  responseBody: ResponseBody | null;

  // UI State
  filters: NetworkFilters;
  settings: NetworkSettings;
  debuggerAttached: boolean;

  // Stats
  stats: NetworkStats;
  startTime: number | null;
  maxTime: number;
}

export interface NetworkActions {
  // Request Management
  setRequests: (requests: NetworkRequest[]) => void;
  addRequest: (request: NetworkRequest) => void;
  updateRequest: (requestId: string, data: Partial<NetworkRequest>) => void;
  clearRequests: () => void;

  // Selection
  selectRequest: (request: NetworkRequest | null) => void;
  setResponseBody: (body: ResponseBody | null) => void;

  // Filters
  setFilter: (type: NetworkFilterType) => void;
  setSearch: (search: string) => void;
  clearFilters: () => void;

  // Settings
  updateSettings: (settings: Partial<NetworkSettings>) => void;
  toggleRecording: () => void;

  // Debugger
  setDebuggerAttached: (attached: boolean) => void;

  // Stats
  updateStats: () => void;

  // Computed
  getFilteredRequests: () => NetworkRequest[];
}

export type NetworkStore = NetworkState & NetworkActions;

// ============================================
// Message Types (Chrome Extension)
// ============================================

export type NetworkMessageType =
  | 'NETWORK_GET_REQUESTS'
  | 'NETWORK_REQUESTS_UPDATED'
  | 'NETWORK_GET_REQUEST_DETAILS'
  | 'NETWORK_GET_RESPONSE_BODY'
  | 'NETWORK_CLEAR_REQUESTS'
  | 'NETWORK_UPDATE_SETTINGS'
  | 'NETWORK_GET_SETTINGS'
  | 'NETWORK_EXPORT_HAR'
  | 'NETWORK_REPLAY_REQUEST'
  | 'NETWORK_ATTACH_DEBUGGER'
  | 'NETWORK_DETACH_DEBUGGER'
  | 'NETWORK_GET_DEBUGGER_STATUS'
  | 'NETWORK_DEBUGGER_ATTACHED'
  | 'NETWORK_DEBUGGER_DETACHED';

export interface NetworkMessage {
  type: NetworkMessageType;
  tabId?: number;
  requestId?: string;
  requests?: NetworkRequest[];
  settings?: Partial<NetworkSettings>;
  request?: NetworkRequest;
  reason?: string;
}

export interface NetworkMessageResponse {
  success?: boolean;
  requests?: NetworkRequest[];
  request?: NetworkRequest | null;
  responseBody?: ResponseBody | null;
  settings?: NetworkSettings;
  attached?: boolean;
  har?: string;
  result?: ReplayResult;
}

// ============================================
// HAR Export Types
// ============================================

export interface HAREntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    httpVersion: string;
    cookies: unknown[];
    headers: NetworkHeader[];
    queryString: { name: string; value: string }[];
    headersSize: number;
    bodySize: number;
    postData?: {
      mimeType: string;
      text: string;
    };
  };
  response: {
    status: number;
    statusText: string;
    httpVersion: string;
    cookies: unknown[];
    headers: NetworkHeader[];
    content: {
      size: number;
      mimeType: string;
      compression?: number;
      text?: string;
    };
    redirectURL: string;
    headersSize: number;
    bodySize: number;
  };
  cache: Record<string, unknown>;
  timings: {
    blocked: number;
    dns: number;
    connect: number;
    ssl: number;
    send: number;
    wait: number;
    receive: number;
  };
  serverIPAddress: string;
  connection: string;
}

export interface HAR {
  log: {
    version: string;
    creator: {
      name: string;
      version: string;
    };
    browser: {
      name: string;
      version: string;
    };
    pages: unknown[];
    entries: HAREntry[];
  };
}

// ============================================
// Replay Types
// ============================================

export interface ReplayResult {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
  truncated?: boolean;
  error?: string;
}

// ============================================
// Detail Panel Types
// ============================================

export type DetailTab = 'headers' | 'payload' | 'response' | 'timing';

export type ResponseView = 'preview' | 'raw';

// ============================================
// Timing Phase Types
// ============================================

export interface TimingPhase {
  name: string;
  value: number;
  className: string;
}

// ============================================
// Utility Types
// ============================================

export interface QueryParam {
  name: string;
  value: string;
}

// Resource type to color mapping
export const RESOURCE_TYPE_COLORS: Record<ResourceType, string> = {
  xhr: 'amber',
  fetch: 'amber',
  script: 'yellow',
  stylesheet: 'violet',
  image: 'emerald',
  font: 'pink',
  document: 'blue',
  media: 'teal',
  websocket: 'orange',
  manifest: 'gray',
  other: 'gray',
};

// HTTP status code to color mapping
export const STATUS_CODE_COLORS: Record<string, string> = {
  '2xx': 'emerald',
  '3xx': 'indigo',
  '4xx': 'amber',
  '5xx': 'rose',
  pending: 'gray',
  error: 'rose',
};

// Common status text lookup
export const STATUS_TEXTS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

/** Port name the network panel holds open while mounted (see NetworkManager). */
export const NETWORK_PANEL_PORT = 'network-panel';
