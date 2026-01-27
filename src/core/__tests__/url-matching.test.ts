import { describe, it, expect } from 'vitest';
import { urlMatches, pageUrlMatches } from '../url-matching';

describe('urlMatches', () => {
  it('matches exact URLs', () => {
    expect(urlMatches('/api/users', '/api/users')).toBe(true);
    expect(urlMatches('/api/users', '/api/posts')).toBe(false);
  });

  it('matches regex patterns', () => {
    expect(urlMatches('/api/users/123', '/\\/api\\/users\\/\\d+/')).toBe(true);
    expect(urlMatches('/api/users/abc', '/\\/api\\/users\\/\\d+/')).toBe(false);
  });

  it('matches regex with flags', () => {
    expect(urlMatches('/API/USERS', '/\\/api\\/users/i')).toBe(true);
  });

  it('matches wildcard patterns', () => {
    expect(urlMatches('/api/users/123', '/api/users/*')).toBe(true);
    expect(urlMatches('/api/posts/123', '/api/users/*')).toBe(false);
  });

  it('matches full URLs with paths', () => {
    expect(urlMatches('http://localhost/api/users', '/api/users', 'http://localhost')).toBe(true);
  });

  it('normalizes trailing slashes', () => {
    expect(urlMatches('/api/users/', '/api/users', 'http://localhost')).toBe(true);
    expect(urlMatches('/api/users', '/api/users/', 'http://localhost')).toBe(true);
  });

  it('checks query params in pattern', () => {
    expect(urlMatches('/api/users?page=1', '/api/users?page=1', 'http://localhost')).toBe(true);
    expect(urlMatches('/api/users?page=1&limit=10', '/api/users?page=1', 'http://localhost')).toBe(true);
    expect(urlMatches('/api/users?page=2', '/api/users?page=1', 'http://localhost')).toBe(false);
  });

  it('handles WebSocket protocol normalization', () => {
    expect(urlMatches('wss://example.com/ws', 'wss://example.com/ws')).toBe(true);
    expect(urlMatches('ws://example.com/ws', 'ws://example.com/ws')).toBe(true);
  });

  it('returns false for invalid regex gracefully', () => {
    expect(urlMatches('/api', '/[invalid/')).toBe(false);
  });
});

describe('pageUrlMatches', () => {
  it('matches exact URLs', () => {
    expect(pageUrlMatches('https://example.com/page', 'https://example.com/page')).toBe(true);
  });

  it('matches regex patterns', () => {
    expect(pageUrlMatches('https://example.com/page', '/example\\.com/')).toBe(true);
  });

  it('matches wildcard patterns', () => {
    expect(pageUrlMatches('https://example.com/page/1', 'https://example.com/*')).toBe(true);
    expect(pageUrlMatches('https://other.com/page', 'https://example.com/*')).toBe(false);
  });

  it('matches contains', () => {
    expect(pageUrlMatches('https://example.com/page', 'example.com')).toBe(true);
    expect(pageUrlMatches('https://other.com/page', 'example.com')).toBe(false);
  });

  it('handles invalid regex gracefully', () => {
    expect(pageUrlMatches('https://example.com', '/[invalid/')).toBe(false);
  });
});
