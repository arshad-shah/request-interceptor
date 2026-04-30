import { describe, it, expect } from 'vitest';
import { findConflictingRoutes } from '../route-conflicts';

describe('findConflictingRoutes', () => {
  const routes = {
    'GET:/api/users': { enabled: true },
    'GET:/api/users|Named': { enabled: true },
    'POST:/api/users': { enabled: true },
    'GET:/api/posts': { enabled: true },
    'WS:wss://example.com': { enabled: true },
    'INJ:https://example.com/*': { enabled: true },
  };

  it('simple route disables all same method+url routes', () => {
    const conflicts = findConflictingRoutes('GET:/api/users', routes, false);
    expect(conflicts).toContain('GET:/api/users|Named');
    expect(conflicts).not.toContain('POST:/api/users');
    expect(conflicts).not.toContain('GET:/api/posts');
  });

  it('named route only disables simple (unnamed) routes', () => {
    const conflicts = findConflictingRoutes('GET:/api/users|New Named', routes, false);
    expect(conflicts).toContain('GET:/api/users');
    expect(conflicts).not.toContain('GET:/api/users|Named');
  });

  it('update disables all same method+url routes', () => {
    const conflicts = findConflictingRoutes('GET:/api/users|Named', routes, true);
    expect(conflicts).toContain('GET:/api/users');
  });

  it('ignores WS and INJ routes', () => {
    const conflicts = findConflictingRoutes('WS:wss://example.com', routes, false);
    expect(conflicts).toEqual([]);

    const injConflicts = findConflictingRoutes('INJ:https://example.com/*', routes, false);
    expect(injConflicts).toEqual([]);
  });

  it('does not include the route itself', () => {
    const conflicts = findConflictingRoutes('GET:/api/users', routes, false);
    expect(conflicts).not.toContain('GET:/api/users');
  });

  it('returns empty for no conflicts', () => {
    const conflicts = findConflictingRoutes('GET:/api/new-endpoint', routes, false);
    expect(conflicts).toEqual([]);
  });
});
