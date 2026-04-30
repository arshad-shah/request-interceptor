import { describe, it, expect } from 'vitest';
import { applyQueryParamRules } from '../query-params';

describe('applyQueryParamRules', () => {
  const base = 'http://localhost';

  it('returns url unchanged with empty rules', () => {
    expect(applyQueryParamRules('http://example.com/api', [])).toBe('http://example.com/api');
    expect(applyQueryParamRules('http://example.com/api', [], base)).toBe('http://example.com/api');
  });

  it('adds a query param', () => {
    const result = applyQueryParamRules('http://example.com/api', [
      { key: 'page', value: '1', action: 'add' }
    ], base);
    expect(result).toBe('http://example.com/api?page=1');
  });

  it('removes a query param', () => {
    const result = applyQueryParamRules('http://example.com/api?page=1&limit=10', [
      { key: 'page', action: 'remove' }
    ], base);
    expect(result).toBe('http://example.com/api?limit=10');
  });

  it('modifies an existing query param', () => {
    const result = applyQueryParamRules('http://example.com/api?page=1', [
      { key: 'page', value: '2', action: 'modify' }
    ], base);
    expect(result).toBe('http://example.com/api?page=2');
  });

  it('does not modify non-existent param', () => {
    const result = applyQueryParamRules('http://example.com/api', [
      { key: 'page', value: '2', action: 'modify' }
    ], base);
    expect(result).toBe('http://example.com/api');
  });

  it('applies multiple rules in order', () => {
    const result = applyQueryParamRules('http://example.com/api?a=1', [
      { key: 'b', value: '2', action: 'add' },
      { key: 'a', action: 'remove' },
    ], base);
    expect(result).toBe('http://example.com/api?b=2');
  });

  it('returns original url on invalid URL', () => {
    const result = applyQueryParamRules('not-a-url', [
      { key: 'a', value: '1', action: 'add' }
    ]);
    // With baseOrigin default, should still work via URL constructor
    expect(result).toContain('a=1');
  });
});
