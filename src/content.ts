// Content script for Request Interceptor Chrome Extension
// Runs at document_start — injects the page-context script immediately,
// then relays messages between page ↔ background ↔ sidepanel.

import { pageUrlMatches } from './core/url-matching';

const SCRIPT_ID = 'request-interceptor-injected';

// Track injected DOM elements for cleanup
const injectedElements: Map<string, HTMLElement[]> = new Map();

// Track state locally
let isEnabled = false;
let interceptedRoutes: Record<string, any> = {};
let injectedScriptReady = false;
let pendingCommands: Array<{ command: string; extra?: Record<string, any> }> = [];

// ── Injection route helpers ──────────────────────────────────────────────────

function cleanupInjection(routeKey: string) {
  const elements = injectedElements.get(routeKey);
  if (elements) {
    elements.forEach(el => el.remove());
    injectedElements.delete(routeKey);
  }
}

function processInjectionRoutes(routes: Record<string, any>, enabled: boolean) {
  for (const key of injectedElements.keys()) {
    cleanupInjection(key);
  }
  if (!enabled) return;

  const pageUrl = window.location.href;
  Object.entries(routes).forEach(([key, config]) => {
    if (!key.startsWith('INJ:')) return;
    if (!config.enabled) return;
    const urlPattern = config.urlPattern || key.substring(4).split('|')[0];
    if (!pageUrlMatches(pageUrl, urlPattern)) return;

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
  });
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

chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
  if (!response) return;
  isEnabled = response.enabled;
  interceptedRoutes = response.routes || {};

  if (isEnabled) {
    sendCommand('initialize', { routes: interceptedRoutes });
  }

  if (response.eventMonitorEnabled) {
    sendCommand('enableEventMonitor');
  }

  processInjectionRoutes(interceptedRoutes, isEnabled);
});

// ── Listen for messages from background ──────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'stateChanged') {
    isEnabled = message.enabled;
    if (message.routes) interceptedRoutes = message.routes;

    if (isEnabled) {
      sendCommand('updateRoutes', { routes: interceptedRoutes });
    } else {
      sendCommand('disable');
    }

    processInjectionRoutes(interceptedRoutes, isEnabled);
    sendResponse({ success: true });
  }
  else if (message.action === 'toggleEventMonitor') {
    sendCommand(message.enabled ? 'enableEventMonitor' : 'disableEventMonitor');
    sendResponse({ success: true });
  }
  else if (message.action === 'routesChanged') {
    interceptedRoutes = message.routes || {};
    if (Object.hasOwn(message, 'enabled')) isEnabled = message.enabled;

    sendCommand('updateRoutes', { routes: interceptedRoutes });
    sendCommand(isEnabled ? 'enable' : 'disable');

    processInjectionRoutes(interceptedRoutes, isEnabled);
    sendResponse({ success: true });
  }

  return true;
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
    // The extension context is gone after a reload/update; drop events quietly.
    if (!chrome.runtime?.id) return;
    chrome.runtime
      .sendMessage({
        type: 'EVENT_CAPTURED',
        payload: event.data.payload,
        tabUrl: window.location.href,
      })
      .catch(() => {});
  }
});

export {};
