import { describe, it, expect } from 'vitest';
import { validateHttpConfig, validateWebSocketConfig, validateInjectionConfig } from '../route-validation';

describe('validateHttpConfig', () => {
  it('validates mock mode requires response', () => {
    expect(validateHttpConfig({ interceptionMode: 'mock', response: '{}' }).valid).toBe(true);
    expect(validateHttpConfig({ interceptionMode: 'mock', response: null }).valid).toBe(false);
    expect(validateHttpConfig({ interceptionMode: 'mock', response: undefined }).valid).toBe(false);
  });

  it('validates passthrough requires at least one modification', () => {
    expect(validateHttpConfig({ interceptionMode: 'passthrough' }).valid).toBe(false);
    expect(validateHttpConfig({ interceptionMode: 'passthrough', responseHeaders: { 'X-Custom': 'val' } }).valid).toBe(true);
    expect(validateHttpConfig({ interceptionMode: 'passthrough', requestHeaders: { 'X-Custom': 'val' } }).valid).toBe(true);
    expect(validateHttpConfig({ interceptionMode: 'passthrough', removeRequestHeaders: ['Cookie'] }).valid).toBe(true);
    expect(validateHttpConfig({ interceptionMode: 'passthrough', requestBody: 'body' }).valid).toBe(true);
    expect(validateHttpConfig({ interceptionMode: 'passthrough', queryParamRules: [{ key: 'a', action: 'add' }] }).valid).toBe(true);
  });

  it('validates block mode needs nothing extra', () => {
    expect(validateHttpConfig({ interceptionMode: 'block' }).valid).toBe(true);
  });

  it('validates redirect requires URL', () => {
    expect(validateHttpConfig({ interceptionMode: 'redirect', redirectUrl: 'http://example.com' }).valid).toBe(true);
    expect(validateHttpConfig({ interceptionMode: 'redirect' }).valid).toBe(false);
    expect(validateHttpConfig({ interceptionMode: 'redirect', redirectUrl: '  ' }).valid).toBe(false);
  });

  it('validates status code range', () => {
    expect(validateHttpConfig({ interceptionMode: 'block', status: 200 }).valid).toBe(true);
    expect(validateHttpConfig({ interceptionMode: 'block', status: 99 }).valid).toBe(false);
    expect(validateHttpConfig({ interceptionMode: 'block', status: 600 }).valid).toBe(false);
  });

  it('falls back to headersOnly for mode detection', () => {
    expect(validateHttpConfig({ headersOnly: true, responseHeaders: { 'X-Test': '1' } }).valid).toBe(true);
  });
});

describe('validateWebSocketConfig', () => {
  it('requires at least one rule set', () => {
    expect(validateWebSocketConfig({}).valid).toBe(false);
    expect(validateWebSocketConfig({ incomingRules: [] }).valid).toBe(true);
  });

  it('validates rules have required fields', () => {
    expect(validateWebSocketConfig({
      incomingRules: [{ id: '1', match: 'hello', type: 'replace', replacement: 'world' }]
    }).valid).toBe(true);

    expect(validateWebSocketConfig({
      incomingRules: [{ match: 'hello' }]
    }).valid).toBe(false); // missing id
  });

  it('validates block rules dont need replacement', () => {
    expect(validateWebSocketConfig({
      incomingRules: [{ id: '1', match: 'hello', type: 'block' }]
    }).valid).toBe(true);
  });

  it('validates regex patterns', () => {
    expect(validateWebSocketConfig({
      incomingRules: [{ id: '1', match: '[invalid', matchType: 'regex', type: 'block' }]
    }).valid).toBe(false);
  });
});

describe('validateInjectionConfig', () => {
  it('requires URL pattern', () => {
    expect(validateInjectionConfig({ scripts: ['code'] }).valid).toBe(false);
    expect(validateInjectionConfig({ urlPattern: '', scripts: ['code'] }).valid).toBe(false);
  });

  it('requires at least one script or stylesheet', () => {
    expect(validateInjectionConfig({ urlPattern: 'http://example.com/*' }).valid).toBe(false);
    expect(validateInjectionConfig({ urlPattern: 'http://example.com/*', scripts: ['code'] }).valid).toBe(true);
    expect(validateInjectionConfig({ urlPattern: 'http://example.com/*', stylesheets: ['css'] }).valid).toBe(true);
  });

  it('ignores empty strings in scripts/stylesheets', () => {
    expect(validateInjectionConfig({ urlPattern: 'http://example.com/*', scripts: ['', '  '] }).valid).toBe(false);
  });
});
