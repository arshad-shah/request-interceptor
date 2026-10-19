/**
 * Route configuration validation logic.
 */

import type { InjectionConfig, InterceptionMode, RouteConfig, WebSocketConfig, WebSocketRule } from '@/types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Validate an HTTP route configuration */
export function validateHttpConfig(config: Partial<RouteConfig>): ValidationResult {
  const mode: InterceptionMode = config.interceptionMode || (config.headersOnly ? 'passthrough' : 'mock');

  switch (mode) {
    case 'mock':
      if (config.response === undefined || config.response === null) {
        return { valid: false, error: 'Mock interception route must have a response' };
      }
      break;
    case 'passthrough': {
      const hasResponseHeaders = config.responseHeaders && Object.keys(config.responseHeaders).length > 0;
      const hasRequestHeaders = config.requestHeaders && Object.keys(config.requestHeaders).length > 0;
      const hasRemoveHeaders = config.removeRequestHeaders && config.removeRequestHeaders.length > 0;
      const hasRequestBody = config.requestBody && config.requestBody.trim();
      const hasQueryParams = config.queryParamRules && config.queryParamRules.length > 0;

      if (!hasResponseHeaders && !hasRequestHeaders && !hasRemoveHeaders && !hasRequestBody && !hasQueryParams) {
        return { valid: false, error: 'Passthrough route must have at least one modification (headers, body, or query params)' };
      }
      break;
    }
    case 'block':
      break;
    case 'redirect':
      if (!config.redirectUrl || !config.redirectUrl.trim()) {
        return { valid: false, error: 'Redirect route must have a redirect URL' };
      }
      break;
  }

  if (config.status && (config.status < 100 || config.status > 599)) {
    return { valid: false, error: 'Status code must be between 100 and 599' };
  }

  return { valid: true };
}

/** Validate a WebSocket route configuration */
/** WebSocket config as received from the UI or an import, before rule defaults are filled in. */
type WebSocketConfigInput = Omit<Partial<WebSocketConfig>, 'incomingRules' | 'outgoingRules'> & {
  incomingRules?: Partial<WebSocketRule>[];
  outgoingRules?: Partial<WebSocketRule>[];
};

export function validateWebSocketConfig(config: WebSocketConfigInput): ValidationResult {
  if (!config.incomingRules && !config.outgoingRules) {
    return { valid: false, error: 'WebSocket route must have at least one rule set' };
  }

  const validateRules = (rules: Partial<WebSocketRule>[], ruleType: string): ValidationResult => {
    if (!Array.isArray(rules)) return { valid: false, error: `${ruleType} must be an array` };

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (!rule.id) return { valid: false, error: `Rule ${i} in ${ruleType} missing id` };
      if (!rule.match) return { valid: false, error: `Rule ${i} in ${ruleType} missing match pattern` };
      if (rule.type !== 'block' && !rule.replacement) {
        return { valid: false, error: `Rule ${i} in ${ruleType} missing replacement text` };
      }
      if (rule.matchType === 'regex') {
        try {
          new RegExp(rule.match, rule.flags || '');
        } catch (error) {
          return { valid: false, error: `Rule ${i} in ${ruleType} has invalid regex: ${error}` };
        }
      }
    }
    return { valid: true };
  };

  if (config.incomingRules) {
    const result = validateRules(config.incomingRules, 'incomingRules');
    if (!result.valid) return result;
  }

  if (config.outgoingRules) {
    const result = validateRules(config.outgoingRules, 'outgoingRules');
    if (!result.valid) return result;
  }

  return { valid: true };
}

/** Validate an injection route configuration */
export function validateInjectionConfig(config: Partial<InjectionConfig>): ValidationResult {
  if (!config.urlPattern || !config.urlPattern.trim()) {
    return { valid: false, error: 'Injection route must have a URL pattern' };
  }

  const hasScripts = config.scripts && config.scripts.length > 0 && config.scripts.some((s: string) => s.trim());
  const hasStylesheets = config.stylesheets && config.stylesheets.length > 0 && config.stylesheets.some((s: string) => s.trim());

  if (!hasScripts && !hasStylesheets) {
    return { valid: false, error: 'Injection route must have at least one script or stylesheet' };
  }

  return { valid: true };
}
