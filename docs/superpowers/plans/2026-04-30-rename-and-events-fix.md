# Rename and Events Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the extension from "Web Tools" back to "Request Interceptor" and fix the events monitoring system so events are reliably captured, persisted across reloads, and visible in the side panel.

**Architecture:** Phase 1 is a mechanical string-rename across manifest, package metadata, and code. Phase 2 follows a diagnose-then-fix flow: extract `serializeEventData` into a pure core module with unit tests, instrument the four-stage pipeline (injected → content → background → sidepanel), reproduce the bug with a fixture page, then apply targeted fixes — primarily persisting `eventMonitorEnabled` in background state and broadcasting toggle changes to all tabs.

**Tech Stack:** TypeScript, React 18, Zustand, Vite, Vitest + jsdom, Chrome MV3 (manifest, service worker, content scripts, side panel).

**Spec reference:** `docs/superpowers/specs/2026-04-30-rename-events-extforge-design.md`

**Out of scope:** Phase 3 (extforge migration) — gets its own brainstorm + plan after Phase 2 ships.

---

## File map

**Phase 1 — Rename:**
- Modify: `public/manifest.json` (name, description)
- Modify: `package.json` (name)
- Modify: `CLAUDE.md` (name references)
- Modify: `src/content.ts` (log prefix, SCRIPT_ID constant, data-injected-by attribute)
- Modify: `src/injected.ts` (one console.log prefix)
- Modify: `README.md` (if name appears)

**Phase 2 — Events fix:**
- Create: `src/core/event-serialization.ts` (pure serializer extracted from injected)
- Create: `src/core/__tests__/event-serialization.test.ts`
- Modify: `src/injected.ts` (use extracted serializer; add EVT-1, EVT-2 logs)
- Modify: `src/content.ts` (add EVT-3 log; relax `event.source` guard if needed)
- Modify: `src/background.ts` (add `eventMonitorEnabled` to state + persistence; add `setEventMonitorEnabled` action; broadcast to all tabs; add EVT-4 log)
- Modify: `src/stores/app-store.ts` (initialize `eventMonitorEnabled` from background)
- Modify: `src/components/events/EventsTab.tsx` (toggle goes through background, not direct active-tab message)

---

## Phase 1 — Rename

### Task 1: Rename manifest

**Files:**
- Modify: `public/manifest.json`

- [ ] **Step 1: Update manifest name and description**

In `public/manifest.json`, change:
```json
"name": "Web Tools",
"version": "3.1.0",
"description": "Developer toolkit for intercepting API responses, monitoring events, and inspecting browser storage",
```
to:
```json
"name": "Request Interceptor",
"version": "3.1.0",
"description": "Developer toolkit for intercepting API responses, monitoring events, and inspecting browser storage",
```

(Description stays — already accurate; only the name changes.)

- [ ] **Step 2: Verify**

Run: `cat public/manifest.json | grep -E '"name"|"description"'`
Expected: `"name": "Request Interceptor"`, description unchanged.

- [ ] **Step 3: Commit**

```bash
git add public/manifest.json
git commit -m "chore: rename extension to Request Interceptor in manifest"
```

---

### Task 2: Rename package metadata

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update package name**

In `package.json`, change the `"name"` field to `"request-interceptor"` (kebab-case).

- [ ] **Step 2: Verify**

Run: `cat package.json | grep '"name"'`
Expected: `"name": "request-interceptor"`

Run: `pnpm install --frozen-lockfile=false 2>&1 | tail -5`
Expected: succeeds (lockfile may update).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: rename package to request-interceptor"
```

---

### Task 3: Update code-level name references

**Files:**
- Modify: `src/content.ts`
- Modify: `src/injected.ts`

- [ ] **Step 1: Replace log prefix and identifiers in content.ts**

In `src/content.ts`:

Change `const SCRIPT_ID = 'web-tools-injected';` to `const SCRIPT_ID = 'request-interceptor-injected';`

Change `console.log(\`[Web Tools] ${event.data.message}\`);` to `console.log(\`[Request Interceptor] ${event.data.message}\`);`

Change all occurrences of `s.setAttribute('data-injected-by', 'web-tools');` to `s.setAttribute('data-injected-by', 'request-interceptor');` (use replace_all — there are two: one for `<script>`, one for `<style>`).

- [ ] **Step 2: Replace banner log in injected.ts**

In `src/injected.ts`, change:
```typescript
console.log('[Web Tools] Complete script injected with HTTP, Headers-Only, and WebSocket support');
```
to:
```typescript
console.log('[Request Interceptor] Complete script injected with HTTP, Headers-Only, and WebSocket support');
```

- [ ] **Step 3: Verify no remaining "Web Tools" in src/**

Run: `grep -rn "Web Tools\|web-tools" src/`
Expected: no matches.

- [ ] **Step 4: Type check and lint**

Run: `pnpm type-check && pnpm lint`
Expected: both pass with zero warnings.

- [ ] **Step 5: Commit**

```bash
git add src/content.ts src/injected.ts
git commit -m "chore: replace Web Tools with Request Interceptor in source"
```

---

### Task 4: Update docs

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md` (if it exists and mentions Web Tools)

- [ ] **Step 1: Find all Web Tools mentions in docs**

Run: `grep -n "Web Tools" CLAUDE.md README.md 2>/dev/null`
Note each line.

- [ ] **Step 2: Replace in CLAUDE.md**

In `CLAUDE.md`, replace every occurrence of "Web Tools" with "Request Interceptor". The "Project" section currently reads `Chrome extension (Manifest V3) — **Web Tools** —`; change to `Chrome extension (Manifest V3) — **Request Interceptor** —`. Replace any other mentions found in Step 1.

- [ ] **Step 3: Replace in README.md (if applicable)**

If README.md contains "Web Tools", replace with "Request Interceptor".

- [ ] **Step 4: Verify**

Run: `grep -rn "Web Tools" .  --include="*.md" --include="*.json" --include="*.ts" --include="*.tsx" 2>/dev/null`
Expected: no matches anywhere in the project (excluding `node_modules` and `dist`).

- [ ] **Step 5: Build and load smoke test**

Run: `pnpm build`
Expected: succeeds.

Open `dist/manifest.json`, confirm `"name": "Request Interceptor"`.

(Manual: load `dist/` in chrome://extensions and confirm the extension card shows "Request Interceptor". This step does not need to gate the commit.)

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: update name references to Request Interceptor"
```

---

## Phase 2 — Events fix

### Task 5: Extract serializeEventData into a pure core module

**Files:**
- Create: `src/core/event-serialization.ts`
- Create: `src/core/__tests__/event-serialization.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/core/__tests__/event-serialization.test.ts` with the full content:

```typescript
import { describe, it, expect } from 'vitest';
import { serializeEventData } from '../event-serialization';

describe('serializeEventData', () => {
  it('returns primitives unchanged', () => {
    expect(serializeEventData(42)).toBe(42);
    expect(serializeEventData('hi')).toBe('hi');
    expect(serializeEventData(true)).toBe(true);
    expect(serializeEventData(null)).toBe(null);
    expect(serializeEventData(undefined)).toBe(undefined);
  });

  it('serializes a CustomEvent with detail', () => {
    const evt = new CustomEvent('demo', { detail: { msg: 'hello' }, bubbles: true });
    const out = serializeEventData(evt) as Record<string, unknown>;
    expect(out._type).toBe('Event');
    expect(out.type).toBe('demo');
    expect(out.bubbles).toBe(true);
    expect(out.detail).toEqual({ msg: 'hello' });
  });

  it('serializes a plain Event without detail', () => {
    const evt = new Event('plain');
    const out = serializeEventData(evt) as Record<string, unknown>;
    expect(out._type).toBe('Event');
    expect(out.type).toBe('plain');
    expect(out.detail).toBe(null);
  });

  it('caps arrays at 50 items', () => {
    const arr = Array.from({ length: 100 }, (_, i) => i);
    const out = serializeEventData(arr) as number[];
    expect(out).toHaveLength(50);
    expect(out[0]).toBe(0);
    expect(out[49]).toBe(49);
  });

  it('serializes Map as { _type, entries }', () => {
    const m = new Map<string, number>([['a', 1], ['b', 2]]);
    const out = serializeEventData(m) as Record<string, unknown>;
    expect(out).toEqual({ a: 1, b: 2 });
  });

  it('serializes Set as { _type: "Set", values: [...] }', () => {
    const s = new Set([1, 2, 3]);
    const out = serializeEventData(s) as Record<string, unknown>;
    expect(out._type).toBe('Set');
    expect(out.values).toEqual([1, 2, 3]);
  });

  it('caps object keys at 50', () => {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 100; i++) obj[`k${i}`] = i;
    const out = serializeEventData(obj) as Record<string, number>;
    expect(Object.keys(out)).toHaveLength(50);
  });

  it('truncates at max depth without throwing on cycles', () => {
    const a: Record<string, unknown> = { name: 'a' };
    const b: Record<string, unknown> = { name: 'b', a };
    a.b = b;
    expect(() => serializeEventData(a)).not.toThrow();
  });

  it('serializes functions as a string marker', () => {
    const out = serializeEventData(() => 1) as string;
    expect(out).toBe('[Function]');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run src/core/__tests__/event-serialization.test.ts`
Expected: FAIL — `Cannot find module '../event-serialization'`.

- [ ] **Step 3: Implement event-serialization.ts**

Create `src/core/event-serialization.ts`:

```typescript
/**
 * Serialize arbitrary event data into a JSON-safe shape with depth and width caps.
 * Pure function — no DOM dependencies beyond the `Event` global (jsdom-compatible).
 */
const MAX_DEPTH = 5;
const MAX_ITEMS = 50;

export function serializeEventData(data: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[MaxDepth]';
  if (data === null || data === undefined) return data;

  const t = typeof data;
  if (t === 'string' || t === 'number' || t === 'boolean') return data;
  if (t === 'function') return '[Function]';

  if (typeof Event !== 'undefined' && data instanceof Event) {
    const detail = (data as CustomEvent).detail;
    return {
      _type: 'Event',
      type: data.type,
      bubbles: data.bubbles,
      cancelable: data.cancelable,
      detail: detail !== undefined && detail !== null
        ? serializeEventData(detail, depth + 1)
        : null,
    };
  }

  if (Array.isArray(data)) {
    return data.slice(0, MAX_ITEMS).map(item => serializeEventData(item, depth + 1));
  }

  if (data instanceof Map) {
    const obj: Record<string, unknown> = {};
    let i = 0;
    for (const [k, v] of data) {
      if (i++ >= MAX_ITEMS) break;
      obj[String(k)] = serializeEventData(v, depth + 1);
    }
    return obj;
  }

  if (data instanceof Set) {
    return {
      _type: 'Set',
      values: [...data].slice(0, MAX_ITEMS).map(v => serializeEventData(v, depth + 1)),
    };
  }

  if (t === 'object') {
    const result: Record<string, unknown> = {};
    const keys = Object.keys(data as object).slice(0, MAX_ITEMS);
    for (const key of keys) {
      result[key] = serializeEventData((data as Record<string, unknown>)[key], depth + 1);
    }
    return result;
  }

  return String(data);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run src/core/__tests__/event-serialization.test.ts`
Expected: PASS — 9 tests passing.

- [ ] **Step 5: Replace the inlined serializer in injected.ts**

In `src/injected.ts`:

Add this import at the top of the file (after existing imports):
```typescript
import { serializeEventData } from './core/event-serialization';
```

Then delete the local `function serializeEventData(data: any, depth = 0): any { ... }` definition (lines around 179–209). The existing call sites (`serializeEventData(event)`, `serializeEventData(message)`, `serializeEventData(args.length === 1 ? args[0] : args)`, `serializeEventData(event.detail, depth + 1)`) keep working because the imported function has the same signature.

- [ ] **Step 6: Type check and full test run**

Run: `pnpm type-check && pnpm test:run`
Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add src/core/event-serialization.ts src/core/__tests__/event-serialization.test.ts src/injected.ts
git commit -m "refactor: extract serializeEventData to core/event-serialization with tests"
```

---

### Task 6: Add pipeline instrumentation (EVT-1 through EVT-4)

**Files:**
- Modify: `src/injected.ts`
- Modify: `src/content.ts`
- Modify: `src/background.ts`

- [ ] **Step 1: Add EVT_DEBUG flag and EVT-1, EVT-2 logs in injected.ts**

In `src/injected.ts`, immediately after the IIFE opens (just inside `(function() {`), add:

```typescript
const EVT_DEBUG = true;
```

Then update the patched `dispatchEvent` (around line 211) to log EVT-1 before the active check. Replace the existing `EventTarget.prototype.dispatchEvent = function(event: Event) { ... }` block with:

```typescript
EventTarget.prototype.dispatchEvent = function(event: Event) {
  if (EVT_DEBUG) console.log('[EVT-1] injected:dispatch', { trigger: 'dispatchEvent', type: event.type, active: eventMonitorActive });
  if (event instanceof CustomEvent ||
      (event.type && !event.type.startsWith('mouse') && !event.type.startsWith('key') &&
       !event.type.startsWith('pointer') && !event.type.startsWith('focus') &&
       !event.type.startsWith('blur') && !event.type.startsWith('scroll') &&
       !event.type.startsWith('touch'))) {
    sendEventToExtension({
      id: generateEventId(),
      timestamp: Date.now(),
      category: 'CustomEvent',
      eventType: event.type,
      data: serializeEventData(event),
      target: this === window ? 'window' : this === document ? 'document' : ((this as any).tagName || 'unknown'),
      stack: getEventStackTrace(),
    });
  }
  return originalDispatchEvent.call(this, event);
};
```

Update the patched `(window as any).postMessage` to log EVT-1 too. At the start of that function body (right after the function signature `function(message: any, optionsOrOrigin?: any, transfer?: any) {`), add:
```typescript
if (EVT_DEBUG) console.log('[EVT-1] injected:dispatch', { trigger: 'postMessage', type: message?.type, active: eventMonitorActive });
```

Update `hookEventEmitter` similarly — inside the wrapped `function(eventName: string, ...args: any[])`, add as the first line:
```typescript
if (EVT_DEBUG) console.log('[EVT-1] injected:dispatch', { trigger: 'EventEmitter', type: eventName, active: eventMonitorActive });
```

Update `sendEventToExtension` to log EVT-2 after the active check. Replace the function body:
```typescript
function sendEventToExtension(data: any) {
  if (!eventMonitorActive) return;
  if (EVT_DEBUG) {
    let bytes = 0;
    try { bytes = JSON.stringify(data).length; } catch {}
    console.log('[EVT-2] injected:send', { category: data.category, eventType: data.eventType, payloadBytes: bytes });
  }
  originalWindowPostMessage.call(window, { type: EVENTBUS_CHANNEL, payload: data }, { targetOrigin: '*' });
}
```

- [ ] **Step 2: Add EVT-3 log in content.ts**

In `src/content.ts`, replace the existing eventbus-monitor-channel branch:

```typescript
if (event.data.type === 'eventbus-monitor-channel') {
  chrome.runtime.sendMessage({
    type: 'EVENT_CAPTURED',
    payload: event.data.payload,
    tabUrl: window.location.href,
  });
}
```

with:

```typescript
if (event.data.type === 'eventbus-monitor-channel') {
  console.log('[EVT-3] content:relay', {
    sourceMatchesWindow: event.source === window,
    eventType: event.data.payload?.eventType,
  });
  chrome.runtime.sendMessage({
    type: 'EVENT_CAPTURED',
    payload: event.data.payload,
    tabUrl: window.location.href,
  });
}
```

- [ ] **Step 3: Add EVT-4 log in background.ts**

In `src/background.ts`, in the `EVENT_CAPTURED` case (around line 197), replace:

```typescript
case 'EVENT_CAPTURED': {
  if (!sender.tab?.id) break;
  const tid = sender.tab.id;
  if (!tabEvents.has(tid)) tabEvents.set(tid, []);
  const events = tabEvents.get(tid)!;
  events.push({ ...message.payload, tabUrl: message.tabUrl });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  chrome.runtime.sendMessage({ type: 'NEW_EVENT', tabId: tid, event: message.payload }).catch(() => {});
  break;
}
```

with:

```typescript
case 'EVENT_CAPTURED': {
  if (!sender.tab?.id) {
    console.log('[EVT-4] background:store SKIPPED — no sender tab id');
    break;
  }
  const tid = sender.tab.id;
  if (!tabEvents.has(tid)) tabEvents.set(tid, []);
  const events = tabEvents.get(tid)!;
  events.push({ ...message.payload, tabUrl: message.tabUrl });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  console.log('[EVT-4] background:store', { tabId: tid, totalForTab: events.length, eventType: message.payload?.eventType });
  chrome.runtime.sendMessage({ type: 'NEW_EVENT', tabId: tid, event: message.payload }).catch(() => {});
  break;
}
```

- [ ] **Step 4: Type check, lint, build**

Run: `pnpm type-check && pnpm lint && pnpm build`
Expected: all pass.

- [ ] **Step 5: Manual reproduction (capture findings)**

This is the diagnostic step. Do NOT implement fixes yet — only observe.

1. Load `dist/` in `chrome://extensions` (reload if already loaded).
2. Open `chrome://extensions`, click the extension's "Inspect views: service worker" link to open the background console.
3. Open a fresh tab on a simple HTTPS page (e.g. `https://example.com`).
4. Open the side panel, master-toggle the extension ON, and toggle the events monitor ON.
5. Open the page's DevTools console.
6. Paste and run this fixture in the page console:

   ```javascript
   document.dispatchEvent(new CustomEvent('plan-test-1', { detail: { hello: 'world' } }));
   window.postMessage({ kind: 'plan-test-2', n: 1 }, '*');
   window.EventBus = { emit(name, data) { console.log('emit', name, data); } };
   setTimeout(() => window.EventBus.emit('plan-test-3', { msg: 'hi' }), 500);
   ```

7. Note for each of the 3 triggers: the highest `EVT-N` log seen in the appropriate console (page console for EVT-1/EVT-2, content-script context console — same page console — for EVT-3, service-worker console for EVT-4). Also check if the events appear in the side panel's Events tab.

8. Hard-reload the page (Ctrl/Cmd+Shift+R) without re-toggling. Re-run the fixture. Note again whether EVT-1 fires and whether the toggle still says "Monitoring."

Record findings in a temporary scratchpad (do not commit). Example:

```
A (fresh page, monitor toggled ON):
  trigger1 (CustomEvent): EVT-1 ✓ (active=true), EVT-2 ✓, EVT-3 ✓, EVT-4 ✓, in UI ✓
  trigger2 (postMessage):  EVT-1 ✓ (active=true), EVT-2 ✓, EVT-3 ✗
  trigger3 (EventEmitter): EVT-1 ✗  (hook never installed because EventBus assigned after scan)
B (after reload):
  trigger1: EVT-1 ✓ (active=FALSE), EVT-2 ✗, …
```

- [ ] **Step 6: Commit instrumentation as a separate commit**

```bash
git add src/injected.ts src/content.ts src/background.ts
git commit -m "chore(events): add EVT-1..4 pipeline instrumentation for diagnosis"
```

(This commit gets reverted or has the flag flipped at the end of the phase. Keeping it isolated makes that easy.)

---

### Task 7: Persist eventMonitorEnabled in background and broadcast toggle

**This is Fix A — implement unconditionally. Findings from Task 6 may add Tasks 8 / 9 / 10 below.**

**Files:**
- Modify: `src/background.ts`
- Modify: `src/content.ts`
- Modify: `src/components/events/EventsTab.tsx`
- Modify: `src/stores/app-store.ts`

- [ ] **Step 1: Extend background AppState and persistence**

In `src/background.ts`, find the `AppState` interface (around line 16) and add `eventMonitorEnabled`:

```typescript
interface AppState {
  enabled: boolean;
  routes: Record<string, any>;
  eventMonitorEnabled: boolean;
}
```

Update the StateManager initial state (around line 27):

```typescript
private state: AppState = {
  enabled: false,
  routes: {},
  eventMonitorEnabled: false,
};
```

Update `loadState` to read the new key — replace:

```typescript
const storedState = await chrome.storage.local.get(['enabled', 'routes']);
this.state.enabled = storedState.enabled || false;
this.state.routes = storedState.routes || {};
```

with:

```typescript
const storedState = await chrome.storage.local.get(['enabled', 'routes', 'eventMonitorEnabled']);
this.state.enabled = storedState.enabled || false;
this.state.routes = storedState.routes || {};
this.state.eventMonitorEnabled = storedState.eventMonitorEnabled || false;
```

`saveState` already writes the whole `this.state` via `chrome.storage.local.set(this.state)`, so no change there.

- [ ] **Step 2: Add `setEventMonitorEnabled` action in background**

In `src/background.ts`, in the `handleMessage` switch on `message.action`, add a new case before `default`:

```typescript
case 'setEventMonitorEnabled': {
  this.state.eventMonitorEnabled = !!message.enabled;
  await this.saveState();
  // Broadcast to all tabs so each content script can enable/disable the monitor
  this.notifyAllTabs({
    action: 'toggleEventMonitor',
    enabled: this.state.eventMonitorEnabled,
  });
  sendResponse({ success: true });
  break;
}
```

Also update `setupTabHandlers` so newly-loaded tabs receive the current monitor state. In `setupTabHandlers` (around line 113), inside the `chrome.tabs.onUpdated` listener, after the existing `stateChanged` send, add:

```typescript
if (this.state.eventMonitorEnabled) {
  chrome.tabs.sendMessage(tabId, {
    action: 'toggleEventMonitor',
    enabled: true,
  }).catch(() => {});
}
```

The full block becomes:

```typescript
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    chrome.tabs.sendMessage(tabId, {
      action: 'stateChanged',
      enabled: this.state.enabled,
      routes: this.state.routes,
    }).catch(() => {
      console.log(`[Background] Could not send initial state to tab ${tabId}`);
    });
    if (this.state.eventMonitorEnabled) {
      chrome.tabs.sendMessage(tabId, {
        action: 'toggleEventMonitor',
        enabled: true,
      }).catch(() => {});
    }
  }
});
```

- [ ] **Step 3: Include eventMonitorEnabled in getState response**

The existing `case 'getState'` returns `this.state` directly via `sendResponse(this.state)`. Since `this.state` now includes `eventMonitorEnabled`, no code change is needed — but verify by reading the case.

- [ ] **Step 4: Update content script to apply persisted monitor state on load**

In `src/content.ts`, replace the existing `chrome.runtime.sendMessage({ action: 'getState' }, ...)` block (around line 107) with:

```typescript
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
```

`sendCommand` already queues commands until the injected script is ready, so this works even if `enableEventMonitor` is sent before `injected.js` finishes loading.

- [ ] **Step 5: Route the UI toggle through background**

In `src/components/events/EventsTab.tsx`, replace the `handleToggleMonitor` function:

```typescript
const handleToggleMonitor = useCallback((on: boolean) => {
  setEventMonitorEnabled(on);
  chrome.runtime.sendMessage({ action: 'setEventMonitorEnabled', enabled: on });
}, [setEventMonitorEnabled]);
```

This sends a single message to background, which persists state and broadcasts to all tabs.

- [ ] **Step 6: Initialize app-store from background**

In `src/stores/app-store.ts`, no constructor change is needed (Zustand stores can't easily be initialized async at module load). Instead, add a hydration helper. At the bottom of the file, after the `export const useAppStore`, add:

```typescript
// Hydrate eventMonitorEnabled from background state on first load
if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
  chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
    if (response?.eventMonitorEnabled !== undefined) {
      useAppStore.getState().setEventMonitorEnabled(response.eventMonitorEnabled);
    }
  });
}
```

This runs once when the side panel loads the store module, syncing the UI toggle to the persisted value.

Also remove the lines in `setEnabled` that force `eventMonitorEnabled` off when `enabled` is false (around lines 71–74). Replace:

```typescript
setEnabled: (enabled) => {
  set({ enabled });
  // Master off → disable all features
  if (!enabled) {
    set({ eventMonitorEnabled: false });
  }
},
```

with:

```typescript
setEnabled: (enabled) => {
  set({ enabled });
  if (!enabled) {
    set({ eventMonitorEnabled: false });
    chrome.runtime.sendMessage({ action: 'setEventMonitorEnabled', enabled: false });
  }
},
```

This way the master-off cascade also persists.

- [ ] **Step 7: Type check, lint, build**

Run: `pnpm type-check && pnpm lint && pnpm build`
Expected: all pass.

- [ ] **Step 8: Manual verification**

Repeat the Task 6 Step 5 procedure:
- Toggle monitor ON, fire all three triggers — events appear in side panel, EVT-4 log shows store ✓.
- Reload the page — toggle still shows "Monitoring", fire triggers, events appear (EVT-1 shows `active=true` post-reload).
- Switch to a second tab, open monitor in side panel, fire triggers in that tab — events appear scoped to that tab.

If any of the three doesn't work, capture the EVT-N gap and proceed to Task 8 (else skip).

- [ ] **Step 9: Commit**

```bash
git add src/background.ts src/content.ts src/components/events/EventsTab.tsx src/stores/app-store.ts
git commit -m "fix(events): persist monitor toggle state and broadcast to all tabs"
```

---

### Task 8 (conditional): Repair injected→content transport

**Run only if EVT-2 fires but EVT-3 does not, for any trigger.**

**Files:**
- Modify: `src/content.ts`

- [ ] **Step 1: Inspect the EVT-3 gap**

Re-read the Task 6 reproduction findings. The most likely cause is `event.source !== window` returning early before the `eventbus-monitor-channel` check.

- [ ] **Step 2: Move the channel check before the source guard**

In `src/content.ts`, find the `window.addEventListener('message', (event) => { ... })` block (around line 155). Replace:

```typescript
window.addEventListener('message', (event) => {
  if (!event.data || event.source !== window) return;

  if (event.data.type === 'REQUEST_INTERCEPTOR_LOG') {
    console.log(`[Request Interceptor] ${event.data.message}`);
  }

  if (event.data.type === 'eventbus-monitor-channel') {
    console.log('[EVT-3] content:relay', {
      sourceMatchesWindow: event.source === window,
      eventType: event.data.payload?.eventType,
    });
    chrome.runtime.sendMessage({
      type: 'EVENT_CAPTURED',
      payload: event.data.payload,
      tabUrl: window.location.href,
    });
  }
});
```

with:

```typescript
window.addEventListener('message', (event) => {
  if (!event.data) return;

  // EventBus messages — no source guard (the injected script's postMessage
  // may arrive with a source that doesn't strictly === window in some realms).
  if (event.data.type === 'eventbus-monitor-channel') {
    console.log('[EVT-3] content:relay', {
      sourceMatchesWindow: event.source === window,
      eventType: event.data.payload?.eventType,
    });
    chrome.runtime.sendMessage({
      type: 'EVENT_CAPTURED',
      payload: event.data.payload,
      tabUrl: window.location.href,
    });
    return;
  }

  // Other channels still require same-window source
  if (event.source !== window) return;

  if (event.data.type === 'REQUEST_INTERCEPTOR_LOG') {
    console.log(`[Request Interceptor] ${event.data.message}`);
  }
});
```

- [ ] **Step 3: Build and re-verify**

Run: `pnpm build`. Reload the extension. Repeat Task 6 Step 5 procedure — confirm EVT-3 now fires for all triggers that previously reached EVT-2.

- [ ] **Step 4: Commit**

```bash
git add src/content.ts
git commit -m "fix(events): scope source guard to non-eventbus channels"
```

---

### Task 9 (conditional): Capture filter audit

**Run only if EVT-1 does not fire for a trigger that should clearly be captured (i.e., a non-mouse/key/etc. CustomEvent), or if a known-good event type is filtered out.**

**Files:**
- Modify: `src/injected.ts`

- [ ] **Step 1: Identify the filtered type**

From Task 6 findings, identify which event type's EVT-1 didn't fire. Confirm it begins with one of: `mouse`, `key`, `pointer`, `focus`, `blur`, `scroll`, `touch`. If so, that prefix is being used for a legitimate custom event name (rare, but possible — e.g., a custom event named `scrollIntoView`).

- [ ] **Step 2: Narrow the filter**

In `src/injected.ts`'s patched `dispatchEvent`, restrict the exclusion list to only the prefix that's actually noisy. Default safe set: keep `mouse`, `key`, `pointer`, `touch`. Drop `scroll`, `focus`, `blur` if they're blocking legitimate events — but only drop the specific prefix the diagnosis identified. Update the condition accordingly. Add a comment explaining the choice with reference to the EVT-1 finding.

- [ ] **Step 3: Build and re-verify**

Run: `pnpm build`. Reload, repeat the trigger, confirm EVT-1 now fires.

- [ ] **Step 4: Commit**

```bash
git add src/injected.ts
git commit -m "fix(events): narrow dispatchEvent capture filter (<finding>)"
```

(Replace `<finding>` with a one-word description of what changed, e.g. `allow-scroll-prefix`.)

---

### Task 10: Disable instrumentation and final verification

**Files:**
- Modify: `src/injected.ts`
- Modify: `src/content.ts`
- Modify: `src/background.ts`

- [ ] **Step 1: Flip EVT_DEBUG to false in injected.ts**

In `src/injected.ts`, change `const EVT_DEBUG = true;` to `const EVT_DEBUG = false;`.

- [ ] **Step 2: Remove EVT-3 log in content.ts**

In `src/content.ts`, remove the `console.log('[EVT-3] content:relay', ...)` line. Keep the rest of the channel handling. The relevant block becomes:

```typescript
if (event.data.type === 'eventbus-monitor-channel') {
  chrome.runtime.sendMessage({
    type: 'EVENT_CAPTURED',
    payload: event.data.payload,
    tabUrl: window.location.href,
  });
  return;
}
```

(If Task 8 was applied, keep the `return;` and the source-guard restructure. Otherwise restore the original simpler shape.)

- [ ] **Step 3: Remove EVT-4 logs in background.ts**

In `src/background.ts`, in the `EVENT_CAPTURED` case, remove the two `console.log('[EVT-4] ...')` lines but keep the `if (!sender.tab?.id) break;` guard.

- [ ] **Step 4: Type check, lint, build, test**

Run: `pnpm type-check && pnpm lint && pnpm build && pnpm test:run`
Expected: all pass with zero warnings, all tests green.

- [ ] **Step 5: Final smoke test**

Reload the extension. On a fresh `https://example.com`:
1. Toggle monitor ON, fire the three triggers from Task 6 Step 5 — events appear in the Events tab.
2. Hard-reload the page — toggle still shows "Monitoring", events appear without re-toggling.
3. Open a second tab, fire triggers there — events scoped per tab.
4. Master-toggle the extension OFF — events monitor toggle goes off too. Reload — both stay off.
5. Master-toggle ON, monitor toggle ON, reload — both restore.

All five must pass.

- [ ] **Step 6: Commit**

```bash
git add src/injected.ts src/content.ts src/background.ts
git commit -m "chore(events): disable EVT_DEBUG instrumentation"
```

---

### Task 11: Update CLAUDE.md events section

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Document the new event-serialization core module**

In `CLAUDE.md`, in the "Core modules (`src/core/`)" section, add a bullet for `event-serialization.ts`:

```
- `event-serialization.ts` — Pure serializer for event data with depth/width caps. Used by `injected.ts` to safely stringify CustomEvent details, postMessage payloads, and EventEmitter args.
```

In the "Testing" section, add `event-serialization.test.ts` to the listed test files.

In the "State management" section, update the app-store bullet to mention that `eventMonitorEnabled` is hydrated from background state on load.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document event-serialization core module and persistence"
```

---

## Final verification (run after all tasks)

- [ ] `pnpm type-check` — zero errors
- [ ] `pnpm lint` — zero warnings
- [ ] `pnpm test:run` — all tests pass
- [ ] `pnpm build` — produces `dist/`
- [ ] Manual: extension named "Request Interceptor" in chrome://extensions
- [ ] Manual: Events tab captures CustomEvent / postMessage / EventEmitter triggers
- [ ] Manual: Monitor state survives page reload
- [ ] Manual: Monitor state survives master-toggle off/on
- [ ] No `EVT-1`..`EVT-4` logs in production console
- [ ] `grep -rn "Web Tools\|web-tools" src/ public/ *.md` returns nothing
