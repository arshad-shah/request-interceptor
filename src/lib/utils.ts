import { type ClassValue, clsx } from 'clsx';
import { HttpMethod } from '@/types';

// Class name utility (using clsx)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// HTTP Method color utilities
export const getMethodColor = (method: HttpMethod): string => {
  const colors = {
    GET: 'text-blue-600 bg-blue-50 border-blue-200',
    POST: 'text-green-600 bg-green-50 border-green-200',
    PUT: 'text-amber-600 bg-amber-50 border-amber-200',
    DELETE: 'text-red-600 bg-red-50 border-red-200',
    PATCH: 'text-purple-600 bg-purple-50 border-purple-200',
    OPTIONS: 'text-gray-600 bg-gray-50 border-gray-200',
    HEAD: 'text-gray-200 bg-gray-50 border-gray-300',
  };
  return colors[method] || 'text-gray-600 bg-gray-50 border-gray-200';
};

// Status code color utilities
export const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) {
    return 'text-green-600 bg-green-50';
  } else if (status >= 300 && status < 400) {
    return 'text-amber-600 bg-amber-50';
  } else if (status >= 400 && status < 500) {
    return 'text-orange-600 bg-orange-50';
  } else if (status >= 500) {
    return 'text-red-600 bg-red-50';
  }
  return 'text-gray-600 bg-gray-50';
};

// Get status category for CSS classes
export const getStatusCategory = (status: number): string => {
  if (status >= 200 && status < 300) return 'status-2xx';
  if (status >= 300 && status < 400) return 'status-3xx';
  if (status >= 400 && status < 500) return 'status-4xx';
  if (status >= 500) return 'status-5xx';
  return 'status-unknown';
};

// Content type display names
export const getContentTypeDisplay = (contentType?: string): string => {
  if (!contentType) return 'JSON';
  
  const typeMap: Record<string, string> = {
    'application/json': 'JSON',
    'text/plain': 'Text',
    'text/html': 'HTML',
    'application/xml': 'XML'
  };
  
  return typeMap[contentType] || contentType.split('/')[1] || 'Unknown';
};

// Escape HTML for safe display
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Format response for preview display
export const formatResponsePreview = (response: unknown): string => {
  let text: string;
  
  if (typeof response === 'object') {
    text = JSON.stringify(response, null, 2);
  } else {
    text = String(response);
  }
  
  return text;
};

// Generate unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Debounce function
export const debounce = <A extends unknown[]>(
  func: (...args: A) => void,
  delay: number
): ((...args: A) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: A) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// URL matching — re-exported from core
export { urlMatches } from '@/core/url-matching';

// Get route description based on method and URL
export const getRouteDescription = (method: HttpMethod, url: string): string => {
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
};

// Format template name for display
export const formatTemplateName = (templateName: string): string => {
  return templateName
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, str => str.toUpperCase());
};


// Route key parsing — re-exported from core
export { parseInjectionKey, parseWebSocketKey } from '@/core/route-keys';