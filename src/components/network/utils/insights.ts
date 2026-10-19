/**
 * Performance, caching, compression and security insights for a request
 */

import type { NetworkRequest, ResponseBody } from '../../../types/network';
import { formatSize, formatTime } from '../../../lib/network-api';

export interface PerformanceInsight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  category: 'performance' | 'security' | 'caching' | 'compression' | 'best-practice';
  title: string;
  description: string;
  metric?: string;
  suggestion?: string;
}

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
