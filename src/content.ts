// Content script for Request Interceptor Chrome Extension
// Runs at document_start — injects the page-context script immediately,
// then relays messages between page ↔ background ↔ sidepanel.

import { pageUrlMatches } from './core/url-matching';
import { isEventMessage, type Events } from './core/messaging/protocol';
import { request } from './lib/messaging';

const SCRIPT_ID = 'request-interceptor-injected';

// Track injected DOM elements for cleanup, and what each route injected, so a
// route is only re-injected when its own content changes (a removed <script>
// can't be un-run; re-adding it would run the user's code again).
const injectedElements: Map<string, HTMLElement[]> = new Map();
const injectedSignatures: Map<string, string> = new Map();

let injectedScriptReady = false;
let pendingCommands: Array<{ command: string; extra?: Record<string, any> }> = [];

// ── Injection route helpers ──────────────────────────────────────────────────

function cleanupInjection(routeKey: string) {
  const elements = injectedElements.get(routeKey);
  if (elements) {
    elements.forEach(el => el.remove());
    injectedElements.delete(routeKey);
  }
  injectedSignatures.delete(routeKey);
}

function injectionSignature(config: any): string {
  return JSON.stringify([config.scripts || [], config.stylesheets || []]);
}

function injectRoute(key: string, config: any) {
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

function processInjectionRoutes(routes: Record<string, any>, enabled: boolean) {
  const pageUrl = window.location.href;
  const wanted = new Map<string, any>();
  if (enabled) {
    Object.entries(routes).forEach(([key, config]) => {
      if (!key.startsWith('INJ:') || !config.enabled) return;
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

function sendCommand(command: string, extra?: Record<string, any>) {
  if (!injectedScriptReady) {
    pendingCommands.push({ command, extra });
    return;
  }
  window.postMessage({ type: 'REQUEST_INTERCEPTOR_COMMAND', command, ...extra }, '*');
}

function flushPendingCommands() {
  injectedScriptReady = true;
  for (const { command, extra } of pendingCommands) {
    window.postMessage({ type: 'REQUEST_INTERCEPTOR_COMMAND', command, ...extra }, '*');
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

// ── Get initial state from background ────────────────────────────────────────

/** Push interception state into the page script and apply injection routes. */
function applyState(enabled: boolean, routes: Record<string, any>) {
  // updateRoutes re-initializes (and activates) the page interceptors; follow with the real state
  sendCommand('updateRoutes', { routes });
  sendCommand(enabled ? 'enable' : 'disable');
  processInjectionRoutes(routes, enabled);
}

request('GET_STATE')
  .then((state) => {
    applyState(state.enabled, state.routes);
    if (state.eventMonitorEnabled) sendCommand('enableEventMonitor');
  })
  .catch(() => {
    /* extension context unavailable (reloaded); the page keeps working untouched */
  });

// ── Listen for events from background ────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isEventMessage(message)) return false;
  if (message.type === 'STATE_CHANGED') {
    const { enabled, routes } = message.payload as Events['STATE_CHANGED'];
    applyState(enabled, routes);
  } else if (message.type === 'EVENT_MONITOR_CHANGED') {
    sendCommand((message.payload as Events['EVENT_MONITOR_CHANGED']).enabled ? 'enableEventMonitor' : 'disableEventMonitor');
  }
  return false;
});

// ── Listen for messages from page context ────────────────────────────────────

window.addEventListener('message', (event) => {
  if (!event.data || event.source !== window) return;

  // Request Interceptor logs
  if (event.data.type === 'REQUEST_INTERCEPTOR_LOG') {
    console.log(`[Request Interceptor] ${event.data.message}`);
  }

  // EventBus Monitor events → forward to background
  if (event.data.type === 'eventbus-monitor-channel') {
    // Fails quietly once the extension context is gone (reload/update)
    request('EVENT_CAPTURED', { event: event.data.payload, tabUrl: window.location.href }).catch(() => {});
  }
});

export {};
