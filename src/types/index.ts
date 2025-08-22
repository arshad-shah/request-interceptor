export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export interface HeaderConfig {
  [key: string]: string;
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
  headersOnly?: boolean; // NEW: Flag to enable headers-only mode
}


export interface Route {
  key: string;
  config: RouteConfig;
}

export interface AppState {
  enabled: boolean;
  routes: Record<string, RouteConfig>;
}

export interface ParsedRoute {
  method: HttpMethod;
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
}

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

export interface ChromeMessage {
  action: string;
  [key: string]: any;
}

export type TabId = 'routes' | 'add' | 'templates';

export interface RouteFormData {
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
  headersOnly: boolean; // NEW: Flag for headers-only mode
}

export interface FilterState {
  search: string;
  method: 'all' | HttpMethod;
}