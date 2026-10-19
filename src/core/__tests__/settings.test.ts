import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings, mergeSettings, isSiteEnabled, siteMatches } from '../settings';

describe('normalizeSettings', () => {
  it('returns defaults for missing or corrupt input', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('garbage')).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ notifications: 42, sites: [] })).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values and repairs invalid ones', () => {
    const s = normalizeSettings({
      notifications: { pageToasts: false, position: 'bottom-left', durationMs: 999999, maxVisible: -3, events: { mock: false, block: 'yes' } },
      sites: { mode: 'allowlist', allowlist: [' example.com ', 'example.com', 7, ''], denylist: 'nope' },
      network: { maxRequests: 'lots', bodyCacheMB: 64.6 },
    });
    expect(s.notifications.pageToasts).toBe(false);
    expect(s.notifications.position).toBe('bottom-left');
    expect(s.notifications.durationMs).toBe(15000);
    expect(s.notifications.maxVisible).toBe(1);
    expect(s.notifications.events).toEqual({ ...DEFAULT_SETTINGS.notifications.events, mock: false });
    expect(s.sites).toEqual({ mode: 'allowlist', allowlist: ['example.com'], denylist: [] });
    expect(s.network).toEqual({ ...DEFAULT_SETTINGS.network, bodyCacheMB: 65 });
  });
});

describe('mergeSettings', () => {
  it('deep-merges a partial update without dropping siblings', () => {
    const s = mergeSettings(DEFAULT_SETTINGS, { notifications: { events: { websocket: false } } });
    expect(s.notifications.events.websocket).toBe(false);
    expect(s.notifications.events.mock).toBe(true);
    expect(s.notifications.position).toBe('top-right');
  });

  it('replaces arrays rather than merging them', () => {
    const a = mergeSettings(DEFAULT_SETTINGS, { sites: { denylist: ['a.com', 'b.com'] } });
    expect(mergeSettings(a, { sites: { denylist: ['c.com'] } }).sites.denylist).toEqual(['c.com']);
  });
});

describe('site rules', () => {
  it('matches hosts including subdomains, wildcards and regex', () => {
    expect(siteMatches('https://app.example.com/x', 'example.com')).toBe(true);
    expect(siteMatches('https://notexample.com/', 'example.com')).toBe(false);
    expect(siteMatches('https://a.example.com/', '*.example.com')).toBe(true);
    expect(siteMatches('http://localhost:3000/admin', 'http://localhost:3000/*')).toBe(true);
    expect(siteMatches('https://x.test/api', '/\\.test\\//')).toBe(true);
  });

  it('applies deny list over everything and allow-list mode', () => {
    const deny = mergeSettings(DEFAULT_SETTINGS, { sites: { denylist: ['bank.com'] } });
    expect(isSiteEnabled('https://bank.com/login', deny)).toBe(false);
    expect(isSiteEnabled('https://shop.com/', deny)).toBe(true);

    const allow = mergeSettings(DEFAULT_SETTINGS, { sites: { mode: 'allowlist', allowlist: ['localhost'], denylist: ['localhost'] } });
    expect(isSiteEnabled('http://localhost:5173/', allow)).toBe(false);
    const allowOnly = mergeSettings(allow, { sites: { denylist: [] } });
    expect(isSiteEnabled('http://localhost:5173/', allowOnly)).toBe(true);
    expect(isSiteEnabled('https://example.com/', allowOnly)).toBe(false);
  });
});
