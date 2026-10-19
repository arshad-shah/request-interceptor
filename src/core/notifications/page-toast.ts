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

import { ENABLED_PALETTE } from '../../brand/mark';

/** Accent color and status glyph path (24×24 viewBox, stroked) per kind. */
const KIND_STYLES: Record<ToastKind, { accent: string; path: string }> = {
  success: { accent: '#10b981', path: 'M5 12.5l4.5 4.5L19 7.5' },
  info:    { accent: '#38bdf8', path: 'M12 11v6M12 7.5v.01' },
  warn:    { accent: '#f59e0b', path: 'M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4' },
  error:   { accent: '#f87171', path: 'M7 7l10 10M17 7L7 17' },
};

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Build SVG with DOM APIs, not innerHTML: pages that enforce Trusted Types
 * reject string-to-markup sinks, and toasts must work on every page.
 */
function svgEl(tag: string, attrs: Record<string, string | number>, children: Element[] = []): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
  for (const child of children) el.appendChild(child);
  return el;
}

function statusIcon(path: string): SVGElement {
  return svgEl('svg', { viewBox: '0 0 24 24', width: 14, height: 14, 'aria-hidden': 'true' }, [
    svgEl('path', { d: path, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  ]);
}

/** Compact, flat-colored version of the brand mark (see src/brand/mark.ts). */
function brandMark(size: number): SVGElement {
  const p = ENABLED_PALETTE;
  return svgEl('svg', { viewBox: '0 0 128 128', width: size, height: size, 'aria-hidden': 'true' }, [
    svgEl('rect', { width: 128, height: 128, rx: 28, fill: p.bgFrom }),
    svgEl('path', { d: 'M22 80 H64 V36 M52 48 L64 36 L76 48', fill: 'none', stroke: p.strokeFrom, 'stroke-width': 12, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    svgEl('circle', { cx: 22, cy: 80, r: 9, fill: p.strokeFrom }),
    svgEl('circle', { cx: 64, cy: 80, r: 14, fill: p.pinFrom }),
    svgEl('circle', { cx: 64, cy: 80, r: 5, fill: p.pinCore }),
  ]);
}

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
      flex-shrink: 0;
    }
    .toast .brand {
      display: flex; align-items: center; gap: 6px;
      margin-bottom: 2px;
      color: #94a3b8; font-size: 11px; font-weight: 500; letter-spacing: 0.02em;
    }
    .toast .brand svg { border-radius: 3px; }
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

  const style = KIND_STYLES[kind];
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  toast.style.setProperty('--accent', style.accent);

  const icon = document.createElement('div');
  icon.className = 'icon';
  icon.appendChild(statusIcon(style.path));
  toast.appendChild(icon);

  const body = document.createElement('div');
  body.className = 'body';

  const brand = document.createElement('div');
  brand.className = 'brand';
  brand.appendChild(brandMark(12));
  brand.appendChild(document.createTextNode('Request Interceptor'));
  body.appendChild(brand);

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
