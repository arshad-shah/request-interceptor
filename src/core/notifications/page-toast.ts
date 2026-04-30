/**
 * Page-world toast notifications.
 *
 * Renders ephemeral notifications inside a Shadow DOM container so
 * page styles cannot affect them and our styles cannot leak. State
 * is in-memory only — nothing is persisted.
 *
 * Designed to be called from the injected (page-world) script when an
 * interception fires. Safe to call before document.body exists.
 */

export type ToastKind = 'success' | 'info' | 'warn' | 'error';

export interface ToastOptions {
  /** ms before auto-dismiss. Default 3000. Pass 0 to disable. */
  duration?: number;
  /** Optional sub-line (smaller, dimmer). */
  detail?: string;
}

const HOST_ID = '__request-interceptor-toast-host__';
const MAX_VISIBLE = 5;
const DEFAULT_DURATION = 3000;

const KIND_COLORS: Record<ToastKind, { accent: string; icon: string }> = {
  success: { accent: '#10b981', icon: '✓' },
  info:    { accent: '#38bdf8', icon: 'ℹ' },
  warn:    { accent: '#f59e0b', icon: '↻' },
  error:   { accent: '#f87171', icon: '✕' },
};

let shadowRoot: ShadowRoot | null = null;
let stack: HTMLElement | null = null;

function ensureRoot(): ShadowRoot | null {
  if (shadowRoot) return shadowRoot;
  const root = document.documentElement || document.body;
  if (!root) return null;

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText =
    'position:fixed;top:0;right:0;z-index:2147483647;pointer-events:none;';
  root.appendChild(host);

  shadowRoot = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    .stack {
      display: flex; flex-direction: column; gap: 10px;
      padding: 16px; width: 360px; max-width: calc(100vw - 32px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px; line-height: 1.45;
      box-sizing: border-box;
    }
    .stack * { box-sizing: border-box; }
    .toast {
      pointer-events: auto;
      display: grid;
      grid-template-columns: 24px 1fr;
      column-gap: 10px;
      align-items: start;
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid #334155;
      border-left: 4px solid var(--accent, #38bdf8);
      border-radius: 8px;
      padding: 12px 14px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55), 0 2px 6px rgba(0, 0, 0, 0.35);
      cursor: pointer;
      animation: slide-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
      transition: transform 120ms ease, opacity 120ms ease;
    }
    .toast:hover { transform: translateX(-2px); }
    .toast.leaving { animation: slide-out 180ms ease-in forwards; }
    .toast .icon {
      grid-column: 1;
      width: 24px; height: 24px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      background: var(--accent, #38bdf8);
      color: #0f172a;
      font-weight: 700;
      font-size: 13px;
      line-height: 1;
      flex-shrink: 0;
    }
    .toast .body {
      grid-column: 2;
      min-width: 0;
    }
    .toast .msg {
      font-weight: 600;
      color: #ffffff;
      font-size: 13px;
      letter-spacing: 0.01em;
    }
    .toast .detail {
      margin-top: 4px;
      color: #cbd5e1;
      font-size: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      word-break: break-all;
      overflow-wrap: anywhere;
    }
    @keyframes slide-in {
      from { transform: translateX(120%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    @keyframes slide-out {
      from { transform: translateX(0);    opacity: 1; }
      to   { transform: translateX(120%); opacity: 0; }
    }
  `;
  shadowRoot.appendChild(style);

  stack = document.createElement('div');
  stack.className = 'stack';
  shadowRoot.appendChild(stack);
  return shadowRoot;
}

function dismiss(el: HTMLElement): void {
  if (!el.isConnected) return;
  el.classList.add('leaving');
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

export function pageToast(
  message: string,
  kind: ToastKind = 'info',
  options: ToastOptions = {},
): void {
  if (typeof document === 'undefined') return;
  if (!ensureRoot() || !stack) return;

  // Cap visible stack — drop oldest.
  while (stack.children.length >= MAX_VISIBLE) {
    stack.firstElementChild?.remove();
  }

  const colors = KIND_COLORS[kind];
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.setProperty('--accent', colors.accent);

  const icon = document.createElement('div');
  icon.className = 'icon';
  icon.textContent = colors.icon;
  toast.appendChild(icon);

  const body = document.createElement('div');
  body.className = 'body';

  const msg = document.createElement('div');
  msg.className = 'msg';
  msg.textContent = message;
  body.appendChild(msg);

  if (options.detail) {
    const det = document.createElement('div');
    det.className = 'detail';
    det.textContent = options.detail;
    body.appendChild(det);
  }

  toast.appendChild(body);

  toast.addEventListener('click', () => dismiss(toast));
  stack.appendChild(toast);

  const duration = options.duration ?? DEFAULT_DURATION;
  if (duration > 0) {
    setTimeout(() => dismiss(toast), duration);
  }
}
