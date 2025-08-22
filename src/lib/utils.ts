import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HttpMethod } from '@/types';

// Tailwind class merger utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
export const formatResponsePreview = (response: any): string => {
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
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Check if URL matches pattern (including wildcards and regex)
export const urlMatches = (requestUrl: string, patternUrl: string): boolean => {
  // Check if patternUrl is a regex pattern (starts and ends with /)
  if (patternUrl.startsWith('/') && patternUrl.lastIndexOf('/') > 0) {
    try {
      const lastSlashIndex = patternUrl.lastIndexOf('/');
      const pattern = patternUrl.substring(1, lastSlashIndex);
      const flags = patternUrl.substring(lastSlashIndex + 1);
      
      const regex = new RegExp(pattern, flags);
      return regex.test(requestUrl);
    } catch (e) {
      console.warn(`Invalid regex pattern: ${patternUrl}`, e);
    }
  }
  
  // Process URLs
  let requestUrlObj: URL, patternUrlObj: URL;
  
  try {
    requestUrlObj = new URL(requestUrl, window.location.origin);
    patternUrlObj = new URL(patternUrl.includes('://') ? patternUrl : patternUrl, window.location.origin);
  } catch (e) {
    try {
      requestUrlObj = new URL(window.location.origin + (requestUrl.startsWith('/') ? requestUrl : '/' + requestUrl));
      patternUrlObj = new URL(window.location.origin + (patternUrl.startsWith('/') ? patternUrl : '/' + patternUrl));
    } catch (e2) {
      return requestUrl === patternUrl;
    }
  }
  
  // Normalize paths (remove trailing slashes)
  const normalizedRequestPath = requestUrlObj.pathname.replace(/\/+$/, '');
  const normalizedPatternPath = patternUrlObj.pathname.replace(/\/+$/, '');
  
  // Direct path match
  if (normalizedRequestPath === normalizedPatternPath) {
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
};

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