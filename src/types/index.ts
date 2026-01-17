// Complete types for the Request Interceptor extension

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type RouteType = 'http' | 'websocket';
export type MessageDirection = 'incoming' | 'outgoing';
export type MatchType = 'exact' | 'contains' | 'regex';
export type RuleType = 'replace' | 'block' | 'inject';

export interface HeaderConfig {
  [key: string]: string;
}

export interface WebSocketRule {
  id: string;
  enabled: boolean;
  type: RuleType;
  matchType: MatchType;
  match: string;
  replacement?: string;
  flags?: string; // For regex flags
  description?: string;
}

export interface RouteConfig {
  status: number;
  delay: number;
  response: any;
  contentType: string;
  enabled: boolean;
  timestamp: number;
  name?: string;
  responseHeaders?: HeaderConfig;
  requestHeaders?: HeaderConfig;
  removeRequestHeaders?: string[];
  headersOnly?: boolean;
}

export interface WebSocketConfig {
  enabled: boolean;
  timestamp: number;
  name?: string;
  incomingRules: WebSocketRule[];
  outgoingRules: WebSocketRule[];
  delay?: number;
}

export interface Route {
  key: string;
  config: RouteConfig | WebSocketConfig;
}

export interface AppState {
  enabled: boolean;
  routes: Record<string, RouteConfig | WebSocketConfig>;
}

export interface ParsedRoute {
  method: HttpMethod;
  url: string;
  name?: string;
}

export interface ParsedWebSocketRoute {
  url: string;
  name?: string;
}

export interface Template {
  routes: TemplateRoute[];
}

export interface TemplateRoute {
  method: HttpMethod;
  url: string;
  status: number;
  delay: number;
  name?: string;
  contentType: string;
  enabled?: boolean;
  response: any;
  responseHeaders?: HeaderConfig;
  requestHeaders?: HeaderConfig;
  removeRequestHeaders?: string[];
  headersOnly?: boolean;
}

export interface WebSocketTemplate {
  routes: WebSocketTemplateRoute[];
}

export interface WebSocketTemplateRoute {
  routeType: 'websocket';
  url: string;
  name?: string;
  delay?: number;
  incomingRules: WebSocketRule[];
  outgoingRules: WebSocketRule[];
}

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  duration?: number;
  persistent?: boolean;
  icon?: string;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  label: string;
  action: () => void;
}

export interface ChromeMessage {
  action: string;
  [key: string]: any;
}

export type TabId = 'routes' | 'add' | 'templates' | 'network';

export interface RouteFormData {
  routeType: RouteType;
  name: string;
  url: string;
  method: HttpMethod;
  status: number;
  delay: number;
  contentType: string;
  response: string;
  responseHeaders: HeaderConfig;
  requestHeaders: HeaderConfig;
  removeRequestHeaders: string[];
  headersOnly: boolean;
  // WebSocket specific
  incomingRules: WebSocketRule[];
  outgoingRules: WebSocketRule[];
}

export interface WebSocketFormData {
  name: string;
  url: string;
  incomingRules: WebSocketRule[];
  outgoingRules: WebSocketRule[];
  delay: number;
}

export interface FilterState {
  search: string;
  method: 'all' | HttpMethod;
  routeType?: 'all' | RouteType;
}