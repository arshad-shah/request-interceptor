/**
 * NetworkRequestDetails - Utility Functions
 * Parsing, analyzing, and processing network request data
 */

import type { NetworkRequest, ResponseBody, NetworkHeader } from '../../types/network';
import { formatSize, formatTime } from '../../lib/network-api';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ParsedCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  maxAge?: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: string;
  size: number;
}

export interface SecurityInfo {
  protocol: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  keyExchange?: string;
  cipher?: string;
  subjectName?: string;
  isSecure: boolean;
}

export interface PerformanceInsight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  category: 'performance' | 'security' | 'caching' | 'compression' | 'best-practice';
  title: string;
  description: string;
  metric?: string;
  suggestion?: string;
}

export interface DecodedJwt {
  location: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  isExpired: boolean;
  expiresAt?: Date;
  issuedAt?: Date;
  issuer?: string;
  subject?: string;
}

export interface InitiatorInfo {
  type: 'parser' | 'script' | 'preload' | 'preflight' | 'redirect' | 'other';
  description: string;
  url?: string;
  lineNumber?: number;
  stack?: Array<{
    functionName: string;
    url: string;
    lineNumber: number;
    columnNumber: number;
  }>;
}

export type ExtendedDetailTab =
  | 'headers'
  | 'payload'
  | 'response'
  | 'timing'
  | 'cookies'
  | 'initiator'
  | 'insights';

// ============================================================================
// Cookie Parsing
// ============================================================================

export function parseCookies(
  requestHeaders: NetworkHeader[] | undefined,
  responseHeaders: NetworkHeader[] | undefined
): { request: ParsedCookie[]; response: ParsedCookie[] } {
  const requestCookies: ParsedCookie[] = [];
  const responseCookies: ParsedCookie[] = [];

  // Parse request Cookie header
  const cookieHeader = requestHeaders?.find(h => h.name.toLowerCase() === 'cookie');
  if (cookieHeader) {
    const pairs = cookieHeader.value.split(';').map(p => p.trim()).filter(Boolean);
    for (const pair of pairs) {
      const eqIndex = pair.indexOf('=');
      if (eqIndex > 0) {
        const name = pair.substring(0, eqIndex).trim();
        const value = pair.substring(eqIndex + 1).trim();
        requestCookies.push({
          name,
          value,
          httpOnly: false,
          secure: false,
          size: pair.length,
        });
      }
    }
  }

  // Parse response Set-Cookie headers
  const setCookieHeaders = responseHeaders?.filter(
    h => h.name.toLowerCase() === 'set-cookie'
  ) || [];

  for (const header of setCookieHeaders) {
    const parts = header.value.split(';').map(p => p.trim());
    const [nameValue, ...attributes] = parts;
    const eqIndex = nameValue.indexOf('=');

    if (eqIndex > 0) {
      const name = nameValue.substring(0, eqIndex).trim();
      const value = nameValue.substring(eqIndex + 1).trim();

      const cookie: ParsedCookie = {
        name,
        value,
        httpOnly: false,
        secure: false,
        size: header.value.length,
      };

      for (const attr of attributes) {
        const attrLower = attr.toLowerCase();
        const attrEqIndex = attr.indexOf('=');

        if (attrLower === 'httponly') {
          cookie.httpOnly = true;
        } else if (attrLower === 'secure') {
          cookie.secure = true;
        } else if (attrEqIndex > 0) {
          const attrName = attr.substring(0, attrEqIndex).trim().toLowerCase();
          const attrValue = attr.substring(attrEqIndex + 1).trim();

          switch (attrName) {
            case 'domain': cookie.domain = attrValue; break;
            case 'path': cookie.path = attrValue; break;
            case 'expires': cookie.expires = attrValue; break;
            case 'max-age': cookie.maxAge = attrValue; break;
            case 'samesite': cookie.sameSite = attrValue; break;
          }
        }
      }

      responseCookies.push(cookie);
    }
  }

  return { request: requestCookies, response: responseCookies };
}

// ============================================================================
// Security Analysis
// ============================================================================

export function extractSecurityInfo(request: NetworkRequest): SecurityInfo {
  const isSecure = request.url.startsWith('https://');

  let hostname: string;
  try {
    hostname = new URL(request.url).hostname;
  } catch {
    hostname = 'unknown';
  }

  if (!isSecure) {
    return {
      protocol: 'HTTP (Insecure)',
      isSecure: false,
      subjectName: hostname,
    };
  }

  const securityDetails = (request as any).securityDetails;

  return {
    protocol: securityDetails?.protocol || 'TLS 1.2/1.3',
    issuer: securityDetails?.issuer,
    validFrom: securityDetails?.validFrom
      ? new Date(securityDetails.validFrom * 1000).toLocaleDateString()
      : undefined,
    validTo: securityDetails?.validTo
      ? new Date(securityDetails.validTo * 1000).toLocaleDateString()
      : undefined,
    keyExchange: securityDetails?.keyExchange || 'ECDHE',
    cipher: securityDetails?.cipher || 'AES_256_GCM',
    subjectName: securityDetails?.subjectName || hostname,
    isSecure: true,
  };
}

// ============================================================================
// JWT Token Handling
// ============================================================================

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

export function decodeJwt(token: string): {
  header: any;
  payload: any;
  signature: string;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));

    return { header, payload, signature: parts[2] };
  } catch {
    return null;
  }
}

export function findJwtTokens(request: NetworkRequest): DecodedJwt[] {
  const tokens: DecodedJwt[] = [];
  const jwtPattern = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
  const seenSignatures = new Set<string>();

  const addToken = (token: string, location: string) => {
    const decoded = decodeJwt(token);
    if (decoded && !seenSignatures.has(decoded.signature)) {
      seenSignatures.add(decoded.signature);

      const exp = decoded.payload.exp as number | undefined;
      const iat = decoded.payload.iat as number | undefined;
      const expiresAt = exp ? new Date(exp * 1000) : undefined;
      const issuedAt = iat ? new Date(iat * 1000) : undefined;

      tokens.push({
        location,
        header: decoded.header,
        payload: decoded.payload,
        signature: decoded.signature,
        isExpired: expiresAt ? expiresAt < new Date() : false,
        expiresAt,
        issuedAt,
        issuer: decoded.payload.iss as string | undefined,
        subject: decoded.payload.sub as string | undefined,
      });
    }
  };

  // Check Authorization header
  const authHeader = request.requestHeaders?.find(
    h => h.name.toLowerCase() === 'authorization'
  );
  if (authHeader?.value) {
    const bearerMatch = authHeader.value.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) {
      addToken(bearerMatch[1], 'Authorization Header');
    }
  }

  // Check cookies for JWT
  const cookieHeader = request.requestHeaders?.find(
    h => h.name.toLowerCase() === 'cookie'
  );
  if (cookieHeader) {
    const matches = cookieHeader.value.match(jwtPattern);
    matches?.forEach(match => addToken(match, 'Cookie'));
  }

  // Check URL query params
  const urlMatches = request.url.match(jwtPattern);
  urlMatches?.forEach(match => addToken(match, 'URL Parameter'));

  // Check request body
  if (request.postData) {
    const bodyMatches = request.postData.match(jwtPattern);
    bodyMatches?.forEach(match => addToken(match, 'Request Body'));
  }

  return tokens;
}

// ============================================================================
// Initiator Analysis
// ============================================================================

export function getInitiatorInfo(request: NetworkRequest): InitiatorInfo {
  const initiator = (request as any).initiator;

  if (!initiator) {
    return {
      type: 'other',
      description: 'Unknown initiator',
    };
  }

  const type = (initiator.type || 'other') as InitiatorInfo['type'];
  let description = '';
  let stack: InitiatorInfo['stack'];

  switch (type) {
    case 'parser':
      description = `HTML parser${initiator.url ? ` (${initiator.url})` : ''}`;
      break;
    case 'script':
      description = 'JavaScript execution';
      if (initiator.stack?.callFrames?.length > 0) {
        stack = initiator.stack.callFrames.slice(0, 8).map((frame: any) => ({
          functionName: frame.functionName || '(anonymous)',
          url: frame.url || '',
          lineNumber: frame.lineNumber || 0,
          columnNumber: frame.columnNumber || 0,
        }));
      }
      break;
    case 'preload':
      description = 'Resource preload hint';
      break;
    case 'preflight':
      description = 'CORS preflight request';
      break;
    case 'redirect':
      description = `Redirect from ${initiator.url || 'unknown'}`;
      break;
    default:
      description = initiator.url || 'Unknown source';
  }

  return {
    type,
    description,
    url: initiator.url,
    lineNumber: initiator.lineNumber,
    stack,
  };
}

// ============================================================================
// Performance Analysis
// ============================================================================

export function analyzePerformance(
  request: NetworkRequest,
  _responseBody: ResponseBody | null
): PerformanceInsight[] {
  const insights: PerformanceInsight[] = [];
  let id = 0;

  const add = (insight: Omit<PerformanceInsight, 'id'>) => {
    insights.push({ ...insight, id: `insight-${id++}` });
  };

  // ─── Response Time ─────────────────────────────────────────────────────────
  if (request.duration) {
    if (request.duration > 3000) {
      add({
        type: 'error',
        category: 'performance',
        title: 'Very Slow Response',
        description: `Response took ${formatTime(request.duration)}, significantly impacting UX.`,
        metric: formatTime(request.duration),
        suggestion: 'Optimize server response, implement caching, or use a CDN.',
      });
    } else if (request.duration > 1000) {
      add({
        type: 'warning',
        category: 'performance',
        title: 'Slow Response',
        description: `Response time of ${formatTime(request.duration)} may affect perceived performance.`,
        metric: formatTime(request.duration),
        suggestion: 'Consider server optimization or caching.',
      });
    } else if (request.duration < 100 && !request.fromCache) {
      add({
        type: 'success',
        category: 'performance',
        title: 'Fast Response',
        description: 'Excellent response time under 100ms.',
        metric: formatTime(request.duration),
      });
    }
  }

  // ─── Caching ───────────────────────────────────────────────────────────────
  const cacheControl = request.responseHeaders?.find(
    h => h.name.toLowerCase() === 'cache-control'
  );
  const etag = request.responseHeaders?.find(h => h.name.toLowerCase() === 'etag');
  const lastModified = request.responseHeaders?.find(
    h => h.name.toLowerCase() === 'last-modified'
  );

  if (request.fromCache) {
    add({
      type: 'success',
      category: 'caching',
      title: 'Served from Cache',
      description: 'Request served from browser cache.',
    });
  } else if (request.statusCode === 304) {
    add({
      type: 'success',
      category: 'caching',
      title: 'Cache Validated (304)',
      description: 'Cache validated with server, saving bandwidth.',
    });
  } else if (!cacheControl && request.statusCode === 200) {
    const isStatic = ['script', 'stylesheet', 'image', 'font'].includes(request.type);
    if (isStatic) {
      add({
        type: 'warning',
        category: 'caching',
        title: 'No Cache Headers',
        description: 'Static asset lacks caching directives.',
        suggestion: 'Add Cache-Control header with appropriate max-age.',
      });
    }
  }

  if (!etag && !lastModified && request.statusCode === 200) {
    const isStatic = ['script', 'stylesheet', 'image', 'font'].includes(request.type);
    if (isStatic) {
      add({
        type: 'info',
        category: 'caching',
        title: 'No Cache Validators',
        description: 'Missing ETag or Last-Modified headers.',
        suggestion: 'Add validators for conditional requests (304).',
      });
    }
  }

  // ─── Compression ───────────────────────────────────────────────────────────
  const contentEncoding = request.responseHeaders?.find(
    h => h.name.toLowerCase() === 'content-encoding'
  );
  const mimeType = request.mimeType || '';
  const compressible = [
    'application/json', 'text/html', 'text/css',
    'text/javascript', 'application/javascript', 'text/plain',
  ].some(t => mimeType.includes(t));

  if (contentEncoding?.value.includes('br')) {
    add({
      type: 'success',
      category: 'compression',
      title: 'Brotli Compression',
      description: 'Using optimal Brotli compression.',
    });
  } else if (contentEncoding?.value.includes('gzip')) {
    add({
      type: 'success',
      category: 'compression',
      title: 'Gzip Compression',
      description: 'Response is gzip compressed.',
    });
  } else if (compressible && !contentEncoding && request.size && request.size > 1024) {
    add({
      type: 'warning',
      category: 'compression',
      title: 'No Compression',
      description: `${formatSize(request.size)} response not compressed.`,
      suggestion: 'Enable gzip or Brotli compression.',
    });
  }

  // ─── Security ──────────────────────────────────────────────────────────────
  const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');

  if (request.url.startsWith('http://') && !isLocal) {
    add({
      type: 'error',
      category: 'security',
      title: 'Insecure Connection',
      description: 'Request over unencrypted HTTP.',
      suggestion: 'Use HTTPS in production.',
    });
  }

  const hsts = request.responseHeaders?.find(
    h => h.name.toLowerCase() === 'strict-transport-security'
  );
  if (request.url.startsWith('https://') && !hsts && request.type === 'document') {
    add({
      type: 'info',
      category: 'security',
      title: 'No HSTS Header',
      description: 'Missing Strict-Transport-Security header.',
      suggestion: 'Add HSTS to enforce HTTPS.',
    });
  }

  const cors = request.responseHeaders?.find(
    h => h.name.toLowerCase() === 'access-control-allow-origin'
  );
  if (cors?.value === '*') {
    add({
      type: 'warning',
      category: 'security',
      title: 'Permissive CORS',
      description: 'Using wildcard (*) for CORS.',
      suggestion: 'Restrict to specific origins in production.',
    });
  }

  // ─── Size ──────────────────────────────────────────────────────────────────
  if (request.encodedSize && request.encodedSize > 1024 * 1024) {
    add({
      type: 'warning',
      category: 'performance',
      title: 'Large Payload',
      description: `Response is ${formatSize(request.encodedSize)}.`,
      metric: formatSize(request.encodedSize),
      suggestion: 'Consider pagination or lazy loading.',
    });
  }

  // ─── Timing Phases ─────────────────────────────────────────────────────────
  if (request.timing) {
    const { dnsStart, dnsEnd, sslStart, sslEnd } = request.timing;

    if (dnsStart !== undefined && dnsEnd !== undefined) {
      const dnsTime = dnsEnd - dnsStart;
      if (dnsTime > 100) {
        add({
          type: 'warning',
          category: 'performance',
          title: 'Slow DNS Lookup',
          description: `DNS resolution took ${formatTime(dnsTime)}.`,
          metric: formatTime(dnsTime),
          suggestion: 'Consider DNS prefetching.',
        });
      }
    }

    if (sslStart !== undefined && sslEnd !== undefined) {
      const sslTime = sslEnd - sslStart;
      if (sslTime > 300) {
        add({
          type: 'info',
          category: 'performance',
          title: 'SSL Handshake Overhead',
          description: `TLS handshake took ${formatTime(sslTime)}.`,
          metric: formatTime(sslTime),
          suggestion: 'HTTP/2 connection reuse helps.',
        });
      }
    }
  }

  // ─── Best Practices ────────────────────────────────────────────────────────
  const contentType = request.responseHeaders?.find(
    h => h.name.toLowerCase() === 'content-type'
  );
  if (!contentType && request.statusCode === 200) {
    add({
      type: 'warning',
      category: 'best-practice',
      title: 'Missing Content-Type',
      description: 'Response lacks Content-Type header.',
      suggestion: 'Always specify Content-Type.',
    });
  }

  return insights;
}

// ============================================================================
// Text Helpers
// ============================================================================

export function highlightSearchTerm(text: string, search: string): string {
  if (!search || !text) return text;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark class="ds-search-highlight">$1</mark>');
}

export function truncateMiddle(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const half = Math.floor((maxLen - 3) / 2);
  return `${str.slice(0, half)}...${str.slice(-half)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getLanguageFromMime(mimeType: string): string {
  if (mimeType.includes('json')) return 'json';
  if (mimeType.includes('xml')) return 'xml';
  if (mimeType.includes('html')) return 'html';
  if (mimeType.includes('css')) return 'css';
  if (mimeType.includes('javascript')) return 'javascript';
  return 'text';
}