import { describe, it, expect } from 'vitest';
import { matchesGraphqlOperation } from '../graphql';

describe('matchesGraphqlOperation', () => {
  it('returns true when no operationName filter', () => {
    expect(matchesGraphqlOperation('{}', '')).toBe(true);
    expect(matchesGraphqlOperation(null, '')).toBe(true);
  });

  it('returns true when no body', () => {
    expect(matchesGraphqlOperation(null, 'GetUsers')).toBe(true);
    expect(matchesGraphqlOperation(undefined, 'GetUsers')).toBe(true);
  });

  it('matches string body with operationName', () => {
    const body = JSON.stringify({ operationName: 'GetUsers', query: '{}' });
    expect(matchesGraphqlOperation(body, 'GetUsers')).toBe(true);
    expect(matchesGraphqlOperation(body, 'GetPosts')).toBe(false);
  });

  it('matches object body', () => {
    expect(matchesGraphqlOperation({ operationName: 'GetUsers' }, 'GetUsers')).toBe(true);
  });

  it('matches batched queries (array)', () => {
    const body = [
      { operationName: 'GetUsers' },
      { operationName: 'GetPosts' }
    ];
    expect(matchesGraphqlOperation(body, 'GetUsers')).toBe(true);
    expect(matchesGraphqlOperation(body, 'GetPosts')).toBe(true);
    expect(matchesGraphqlOperation(body, 'GetComments')).toBe(false);
  });

  it('returns false for invalid JSON string', () => {
    expect(matchesGraphqlOperation('not-json', 'GetUsers')).toBe(false);
  });

  it('returns false for non-object/non-string body', () => {
    expect(matchesGraphqlOperation(42, 'GetUsers')).toBe(false);
  });
});
