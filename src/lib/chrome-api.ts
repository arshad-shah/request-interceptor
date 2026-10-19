import { request } from '@/lib/messaging';
import type { AnyRouteConfig } from '@/core/messaging/protocol';

// Background API: typed requests (see src/core/messaging/protocol.ts)
export const chromeApi = {
  getState: () => request('GET_STATE'),
  toggleEnabled: (enabled: boolean) => request('SET_ENABLED', { enabled }),
  addRoute: (route: string, config: AnyRouteConfig, name?: string) => request('ADD_ROUTE', { route, config, name }),
  removeRoute: (route: string) => request('REMOVE_ROUTE', { route }),
  toggleRoute: (route: string, enabled: boolean) => request('TOGGLE_ROUTE', { route, enabled }),
  clearRoutes: () => request('CLEAR_ROUTES'),
  exportRoutes: () => request('EXPORT_ROUTES'),
  setEventMonitor: (enabled: boolean) => request('SET_EVENT_MONITOR', { enabled }),
};

// Route key helpers — re-exported from core for backwards compatibility
export { parseRouteKey, createRouteKey, createInjectionKey } from '@/core/route-keys';

// Validate JSON string
export const validateJson = (jsonString: string): { isValid: boolean; parsed?: any; error?: string } => {
  try {
    const parsed = JSON.parse(jsonString);
    return { isValid: true, parsed };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Invalid JSON'
    };
  }
};

// Format JSON string with proper indentation
export const formatJson = (obj: any): string => {
  try {
    // JSON.stringify returns undefined for functions and undefined values
    const result = JSON.stringify(obj, null, 2);
    if (result === undefined) {
      return String(obj);
    }
    return result;
  } catch {
    return String(obj);
  }
};

// Download file helper
export const downloadFile = (content: string, filename: string, contentType = 'application/json') => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Copy to clipboard helper
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};