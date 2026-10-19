/**
 * Route configuration migration logic.
 * Handles upgrading old route formats to current schema.
 */

import type { RouteConfig, WebSocketConfig, WebSocketRule } from '@/types';

/** A stored route config of unknown vintage. */
type StoredConfig = Record<string, unknown>;
import { isWebSocketRoute, isInjectionRoute } from './route-keys';

/**
 * Migrate a single HTTP route config to include all required fields.
 * Idempotent — safe to call on already-migrated configs.
 */
export function migrateHttpConfig(config: object): { config: RouteConfig; changed: boolean } {
  let changed = false;
  const c: StoredConfig = { ...config };

  if (!Object.hasOwn(c, 'responseHeaders')) { c.responseHeaders = {}; changed = true; }
  if (!Object.hasOwn(c, 'requestHeaders')) { c.requestHeaders = {}; changed = true; }
  if (!Object.hasOwn(c, 'removeRequestHeaders')) { c.removeRequestHeaders = []; changed = true; }
  if (!Object.hasOwn(c, 'headersOnly')) { c.headersOnly = false; changed = true; }
  if (!Object.hasOwn(c, 'interceptionMode')) {
    c.interceptionMode = c.headersOnly ? 'passthrough' : 'mock';
    changed = true;
  }
  if (!Object.hasOwn(c, 'queryParamRules')) { c.queryParamRules = []; changed = true; }
  if (!Object.hasOwn(c, 'enabled')) { c.enabled = true; changed = true; }

  return { config: c as unknown as RouteConfig, changed };
}

/**
 * Migrate a single WebSocket route config to include all required fields.
 */
export function migrateWebSocketConfig(config: object): { config: WebSocketConfig; changed: boolean } {
  let changed = false;
  const c: StoredConfig = { ...config };

  if (!Object.hasOwn(c, 'incomingRules')) { c.incomingRules = []; changed = true; }
  if (!Object.hasOwn(c, 'outgoingRules')) { c.outgoingRules = []; changed = true; }
  if (!Object.hasOwn(c, 'delay')) { c.delay = 0; changed = true; }
  if (!Object.hasOwn(c, 'enabled')) { c.enabled = true; changed = true; }

  // Ensure rules have proper structure
  for (const ruleType of ['incomingRules', 'outgoingRules'] as const) {
    const rules = c[ruleType];
    if (Array.isArray(rules)) {
      rules.forEach((rule: Partial<WebSocketRule>, index: number) => {
        if (!rule.id) { rule.id = `migrated-rule-${Date.now()}-${index}`; changed = true; }
        if (rule.enabled === undefined) { rule.enabled = true; changed = true; }
        if (!rule.type) { rule.type = 'replace'; changed = true; }
        if (!rule.matchType) { rule.matchType = 'contains'; changed = true; }
      });
    }
  }

  return { config: c as unknown as WebSocketConfig, changed };
}

/**
 * Migrate all routes in a routes map. Returns the migrated map and whether any changes were made.
 */
export function migrateRoutes(routes: Record<string, object>): { routes: Record<string, object>; changed: boolean } {
  let anyChanged = false;
  const migrated: Record<string, object> = {};

  for (const [key, config] of Object.entries(routes)) {
    if (isWebSocketRoute(key)) {
      const result = migrateWebSocketConfig(config);
      migrated[key] = result.config;
      if (result.changed) anyChanged = true;
    } else if (isInjectionRoute(key)) {
      // Injection routes — just ensure enabled
      const c: StoredConfig = { ...config };
      if (!Object.hasOwn(c, 'enabled')) {
        c.enabled = true;
        anyChanged = true;
      }
      migrated[key] = c;
    } else {
      const result = migrateHttpConfig(config);
      migrated[key] = result.config;
      if (result.changed) anyChanged = true;
    }
  }

  return { routes: migrated, changed: anyChanged };
}
