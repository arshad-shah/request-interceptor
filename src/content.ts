// Content script for Request Interceptor Chrome Extension
// Runs at document_start — injects the page-context script immediately,
// then relays messages between page ↔ background ↔ sidepanel.

import { pageUrlMatches } from './core/url-matching';
import { isEventMessage, type AnyRouteConfig, type Events, type Routes } from './core/messaging/protocol';
import type { InjectionConfig } from './types';
import { request } from './lib/messaging';
import { isSiteEnabled, type Settings } from './core/settings';

const SCRIPT_ID = 'request-interceptor-injected';

// Track injected DOM elements for cleanup, and what each route injected, so a
// route is only re-injected when its own content changes (a removed <script>
// can't be un-run; re-adding it would run the user's code again).
const injectedElements: Map<string, HTMLElement[]> = new Map();
const injectedSignatures: Map<string, string> = new Map();

let injectedScriptReady = false;
let pendingCommands: Array<{ command: string; extra?: Record<string, unknown> }> = [];

// ── Injection route helpers ──────────────────────────────────────────────────

function cleanupInjection(routeKey: string) {
  const elements = injectedElements.get(routeKey);
  if (elements) {
    elements.forEach(el => el.remove());
    injectedElements.delete(routeKey);
  }
  injectedSignatures.delete(routeKey);
}

function injectionSignature(config: Partial<InjectionConfig>): string {
  return JSON.stringify([config.scripts || [], config.stylesheets || []]);
}

function injectRoute(key: string, config: Partial<InjectionConfig>) {
  const elements: HTMLElement[] = [];
  if (config.scripts && Array.isArray(config.scripts)) {
    config.scripts.forEach((code: string) => {
      if (!code.trim()) return;
      const s = document.createElement('script');
      s.textContent = code;
      s.setAttribute('data-injected-by', 'request-interceptor');
      s.setAttribute('data-route-key', key);
      (document.head || document.documentElement).appendChild(s);
      elements.push(s);
    });
  }
  if (config.stylesheets && Array.isArray(config.stylesheets)) {
    config.stylesheets.forEach((css: string) => {
      if (!css.trim()) return;
      const s = document.createElement('style');
      s.textContent = css;
      s.setAttribute('data-injected-by', 'request-interceptor');
      s.setAttribute('data-route-key', key);
      (document.head || document.documentElement).appendChild(s);
      elements.push(s);
    });
  }
  if (elements.length > 0) injectedElements.set(key, elements);
  injectedSignatures.set(key, injectionSignature(config));
}

function processInjectionRoutes(routes: Routes, enabled: boolean) {
  const pageUrl = window.location.href;
  const wanted = new Map<string, InjectionConfig>();
  if (enabled) {
    Object.entries(routes).forEach(([key, routeConfig]) => {
      if (!key.startsWith('INJ:') || !routeConfig.enabled) return;
      const config = routeConfig as InjectionConfig;
      const urlPattern = config.urlPattern || key.substring(4).split('|')[0];
      if (pageUrlMatches(pageUrl, urlPattern)) wanted.set(key, config);
    });
  }

  for (const key of [...injectedSignatures.keys()]) {
    const config = wanted.get(key);
    if (!config || injectionSignature(config) !== injectedSignatures.get(key)) {
      cleanupInjection(key);
    }
  }
  for (const [key, config] of wanted) {
    if (!injectedSignatures.has(key)) injectRoute(key, config);
  }
}

// ── Send command to injected script ──────────────────────────────────────────

/** Post to this window only (opaque origins such as file:// need '*'). */
function postToPage(message: Record<string, unknown>) {
  const origin = window.location.origin;
  window.postMessage(message, origin && origin !== 'null' ? origin : '*');
}

function sendCommand(command: string, extra?: Record<string, unknown>) {
  if (!injectedScriptReady) {
    pendingCommands.push({ command, extra });
    return;
  }
  postToPage({ type: 'REQUEST_INTERCEPTOR_COMMAND', command, ...extra });
}

function flushPendingCommands() {
  injectedScriptReady = true;
  for (const { command, extra } of pendingCommands) {
    postToPage({ type: 'REQUEST_INTERCEPTOR_COMMAND', command, ...extra });
  }
  pendingCommands = [];
}

// ── Inject page-context script immediately ───────────────────────────────────
// This MUST happen synchronously at document_start so the EventBus monitor
// patches (dispatchEvent, postMessage) are in place before page scripts run.

function injectPageScript() {
  if (document.getElementById(SCRIPT_ID)) {
    injectedScriptReady = true;
    return;
  }
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = () => flushPendingCommands();
  (document.head || document.documentElement).appendChild(script);
}

// Inject immediately — don't wait for getState
injectPageScript();

// ── State and settings from background ───────────────────────────────────────

// `settings` stays null until loaded: until then the site counts as excluded
// (fail closed), so an early state broadcast can't activate a denied site.
let latest: { enabled: boolean; routes: Routes; monitor: boolean; settings: Settings | null } = {
  enabled: false,
  routes: {},
  monitor: false,
  settings: null,
};

/**
 * The page script can only intercept with the routes it is given, and the page
 * can read whatever we post to it. So post nothing while interception is off
 * or the site is excluded, and only enabled HTTP/WebSocket routes otherwise
 * (injection routes stay in the content script).
 */
function pageRoutes(routes: Routes): Record<string, AnyRouteConfig> {
  return Object.fromEntries(
    Object.entries(routes).filter(([key, config]) => !key.startsWith('INJ:') && config?.enabled !== false)
  );
}

function apply(next: Partial<typeof latest>) {
  latest = { ...latest, ...next };
  const { enabled, routes, monitor, settings } = latest;
  const active = !!settings && enabled && isSiteEnabled(window.location.href, settings);

  if (settings) {
    sendCommand('updateSettings', {
      consoleLogs: settings.diagnostics.pageConsoleLogs,
      toasts: { ...settings.notifications, enabled: settings.notifications.pageToasts },
    });
  }
  if (active) {
    // updateRoutes re-initializes (and activates) the page interceptors
    sendCommand('updateRoutes', { routes: pageRoutes(routes) });
    sendCommand('enable');
  } else {
    sendCommand('updateRoutes', { routes: {} });
    sendCommand('disable');
  }
  sendCommand(active && monitor ? 'enableEventMonitor' : 'disableEventMonitor');
  processInjectionRoutes(routes, active);
}

Promise.all([request('GET_STATE'), request('GET_SETTINGS')])
  .then(([state, settings]) => {
    apply({ enabled: state.enabled, routes: state.routes, monitor: state.eventMonitorEnabled, settings });
  })
  .catch(() => {
    /* extension context unavailable (reloaded); the page keeps working untouched */
  });

// ── Listen for events from background ────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isEventMessage(message)) return false;
  if (message.type === 'STATE_CHANGED') {
    const { enabled, routes } = message.payload as Events['STATE_CHANGED'];
    apply({ enabled, routes });
  } else if (message.type === 'EVENT_MONITOR_CHANGED') {
    apply({ monitor: (message.payload as Events['EVENT_MONITOR_CHANGED']).enabled });
  } else if (message.type === 'SETTINGS_CHANGED') {
    apply({ settings: message.payload as Settings });
  }
  return false;
});

// ── Listen for messages from page context ────────────────────────────────────

window.addEventListener('message', (event) => {
  if (!event.data || event.source !== window) return;

  // EventBus Monitor events → forward to background
  if (event.data.type === 'eventbus-monitor-channel') {
    // Fails quietly once the extension context is gone (reload/update)
    request('EVENT_CAPTURED', { event: event.data.payload, tabUrl: window.location.href }).catch(() => {});
  }
});

export {};
