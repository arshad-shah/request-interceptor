# Design: Rename, Fix Events, Migrate to ExtForge

**Date:** 2026-04-30
**Status:** Approved for implementation planning
**Branch:** `claude/refactor-interceptor-design-buZnt`

## Goal

Three sequential changes to the extension:

1. Rename the user-facing product back to **Request Interceptor** (currently labeled "Web Tools").
2. Fix the events monitoring system so events are reliably captured and surfaced in the side panel.
3. Migrate the build pipeline from Vite to **ExtForge** (`Documents/practice/extforge`).

Each phase ships as its own commit (or commit series) and is verified before the next begins.

---

## Phase 1 — Rename to Request Interceptor

### Scope

Mechanical string replacement. No functional changes, no version bump.

### Files to update

| File | Change |
|---|---|
| `public/manifest.json` | `name`: `"Request Interceptor"`. `description`: keep current wording but ensure no "Web Tools" references. |
| `package.json` | `name`: `"request-interceptor"` (kebab-case). |
| `CLAUDE.md` | Replace "Web Tools" references with "Request Interceptor". |
| `src/content.ts` | `[Web Tools]` log prefix → `[Request Interceptor]`. `SCRIPT_ID = 'web-tools-injected'` → `'request-interceptor-injected'`. `data-injected-by="web-tools"` → `"request-interceptor"`. |
| `src/injected.ts` | `console.log('[Web Tools] …')` → `'[Request Interceptor] …'`. |
| `README.md` (if present) | Update name references. |

### Out of scope

- Icon changes
- Existing internal log prefix `[Request Interceptor]` inside `injected.ts`'s `log()` is already correct — leave it.
- Existing constant strings used as message types (`REQUEST_INTERCEPTOR_COMMAND`, `REQUEST_INTERCEPTOR_LOG`) are wire-protocol identifiers; do not change.

### Verification

- `pnpm type-check` passes
- `pnpm lint` passes
- `pnpm build` produces a `dist/` whose `manifest.json` shows the new name
- Loading `dist/` in `chrome://extensions` shows "Request Interceptor"

---

## Phase 2 — Fix Events System (Approach B: diagnose-then-fix)

### Symptom

Reproduces in two cases:
- **A.** Fresh page, monitor toggle ON, page dispatches CustomEvent / postMessage — Events tab stays empty.
- **B.** Monitor ON, then page reload — events stop arriving even though UI still says "Monitoring."

### Hypotheses (to be confirmed by instrumentation, not assumed)

1. **Toggle state is not persisted.** `eventMonitorEnabled` lives only in the side panel's app-store. After a page reload, the new content + injected scripts come up with `eventMonitorActive = false` and are never told to enable. (Explains B; may also explain A if the toggle message races with injected-script readiness.)
2. **Toggle is delivered only to the active tab.** `chrome.tabs.sendMessage` is called for the active tab only — switching tabs leaves them unmonitored.
3. **postMessage transport mismatch.** `originalWindowPostMessage.call(window, msg, { targetOrigin: '*' })` — verify the receiving content-script `message` listener actually fires (the `event.source !== window` early-return is suspect for cross-context cases).
4. **Capture filter too narrow.** The `dispatchEvent` patch filters out events whose type starts with `mouse|key|pointer|focus|blur|scroll|touch`, but otherwise should capture. Confirm via instrumentation.

### Step 1: Instrument the pipeline

Add a single boolean `EVT_DEBUG` per module (default `true` for the duration of the fix; flipped to `false` before merge). When true, emit four checkpoint logs:

| Marker | Location | Logs |
|---|---|---|
| `[EVT-1] injected:dispatch` | Inside patched `dispatchEvent`/`postMessage`/EventEmitter `emit`, **before** the `eventMonitorActive` check | `{ trigger, type, active }` |
| `[EVT-2] injected:send` | Inside `sendEventToExtension`, **after** the active check | `{ category, eventType, payloadBytes }` |
| `[EVT-3] content:relay` | In `content.ts`'s `window` message listener when `event.data.type === 'eventbus-monitor-channel'` | `{ size, sourceMatchesWindow }` |
| `[EVT-4] background:store` | In `EVENT_CAPTURED` handler in `background.ts` | `{ tabId, totalForTab }` |

These logs reveal exactly where the chain breaks.

### Step 2: Reproduce

Create a minimal HTML fixture (not committed; use a local file or `about:blank` script):

```html
<script>
  // Trigger 1: CustomEvent
  document.addEventListener('test-event', () => {});
  document.dispatchEvent(new CustomEvent('test-event', { detail: { hello: 'world' } }));

  // Trigger 2: postMessage
  window.postMessage({ kind: 'demo', n: 1 }, '*');

  // Trigger 3: EventEmitter pattern
  window.EventBus = { emit(name, data) { console.log('emit', name, data); } };
  setTimeout(() => window.EventBus.emit('greeting', { msg: 'hi' }), 1500);
</script>
```

Procedure:
1. Build, load in chrome://extensions
2. Open the fixture, open side panel, toggle event monitor ON
3. Reload the fixture
4. Read DevTools console for the page (EVT-1, EVT-2), the content-script console (EVT-3), and the service-worker console (EVT-4)
5. Note the highest `EVT-N` reached for each trigger

### Step 3: Apply fixes

Apply each fix only if its hypothesis is confirmed by missing markers:

#### Fix A — Persist and restore toggle state

- Add `eventMonitorEnabled: boolean` to background's persisted state (chrome.storage.local), default `false`
- Include `eventMonitorEnabled` in the `getState` response
- In `content.ts`, after the existing `getState` round-trip and after `flushPendingCommands`, if `eventMonitorEnabled === true` send `enableEventMonitor` to the injected script
- When the user toggles in the UI, send a new background action `setEventMonitorEnabled` that updates background state and broadcasts to all tabs (`chrome.tabs.query({})` + `sendMessage`), replacing the current direct active-tab-only `toggleEventMonitor` call
- Update `app-store.ts` to read initial `eventMonitorEnabled` from background's state response

#### Fix B — Repair transport (only if EVT-3 doesn't fire when EVT-2 does)

- Most likely culprit: the `event.source !== window` guard in `content.ts`'s message listener. If injected's `originalWindowPostMessage.call(window, …)` produces a message whose `source` differs (rare but possible across edge realms), relax the guard to `event.source && event.source !== window` or scope the channel-type check to run before the source check.
- Alternative: switch the injected→content channel from `window.postMessage` to a `CustomEvent` dispatched on `document`, with content listening via `document.addEventListener` (avoids the postMessage envelope entirely).
- Pick whichever the instrumentation justifies; do not pre-emptively change both.

#### Fix C — Capture filter audit (only if EVT-1 doesn't fire for known-good triggers)

- Re-examine the `dispatchEvent` filter. If a legitimate event type is being filtered, narrow the exclusion list (e.g., remove `scroll` if needed) — but do not relax to capture every event, since that floods the bus.

### Step 4: Regression coverage

- **Unit:** `src/core/__tests__/event-serialization.test.ts` — covers `serializeEventData` with circular refs, Maps, Sets, Events, deep nesting, and the array/object 50-item caps. (Extract `serializeEventData` from `src/injected.ts` into `src/core/event-serialization.ts` for testability — pure function, no browser deps once extracted.)
- **Manual:** Test plan in spec — three triggers above, expected behavior on a fresh page and after reload.

### Step 5: Cleanup

- Set `EVT_DEBUG = false` (or wrap with a build-time `import.meta.env.DEV` flag if convenient)
- Commit fix(es) + tests as a clean series:
  1. `refactor: extract serializeEventData to core/event-serialization`
  2. `fix(events): persist monitor toggle state across reloads` (Fix A)
  3. (only if needed) `fix(events): <transport or filter fix>` (Fix B / C)
  4. `test: add event serialization unit tests`

### Verification

- All three triggers produce events visible in the Events tab on a fresh page
- After a hard page reload, monitoring continues without re-toggling
- Switching tabs and triggering events on a non-active tab still records events for that tab
- `pnpm test:run` passes
- `pnpm lint` and `pnpm type-check` pass

---

## Phase 3 — Migrate Build to ExtForge (outline)

> This phase will get its own design pass before implementation. The outline below is a placeholder so we know the shape.

### Known constraints

- ExtForge is a local package at `Documents/practice/extforge` (not yet published)
- It uses esbuild internally, supports React + Tailwind, MV3, chrome+firefox, and provides HMR
- Configuration via `extforge.config.ts` exporting `defineConfig({...})`
- Manifest authored inline in the config rather than `public/manifest.json`

### Migration tasks (to be detailed in Phase 3 spec)

1. Install ExtForge as a workspace dependency (file:../extforge or similar)
2. Author `extforge.config.ts` mirroring current Vite config:
   - `framework: 'react'`, `css: 'tailwind'`
   - `browsers: ['chrome']` initially; firefox if extforge supports MV3 there
   - Inline manifest with the five entry points: background (service worker), content scripts, web-accessible injected.js, side panel, popup
3. Reorganize `src/` if extforge expects a specific layout for entries
4. Replace package scripts: `pnpm dev` → `extforge dev`, `pnpm build` → `extforge build`
5. Verify HMR works for the side panel React app
6. Verify content/injected scripts rebuild on change
7. Confirm Tailwind CSS pipeline survives migration
8. Keep Vitest unchanged
9. Remove `vite.config.ts` and Vite deps once green

### Open questions for Phase 3 brainstorming

- Local link strategy: `file:` protocol, `pnpm link`, or workspace?
- Does ExtForge currently support all five MV3 entry-point types this extension needs (service worker module, content script at `document_start`, web-accessible script, side panel, popup)? Read source first.
- Does ExtForge handle `web_accessible_resources` for the injected script?
- HMR for content/injected scripts — supported, or full reload?
- Path aliases (`@`, `@components`, etc.) — does ExtForge config respect `tsconfig.json` paths or need its own?
- Fallback plan if a blocker emerges mid-migration: keep Vite, file an issue against ExtForge, retry later.

### Verification

- `extforge build` produces a `dist/` that loads in chrome://extensions
- All features (routes, network, events, storage, side panel, popup) work post-migration
- `pnpm test:run`, `pnpm lint`, `pnpm type-check` all pass

---

## Sequencing and risks

1. **Rename first** — fully isolated, low risk, gives a clean baseline for the events fix.
2. **Events fix second** — diagnostic-driven, scope contained to `injected.ts` + `content.ts` + `background.ts` + `events-store.ts`. No build-system entanglement.
3. **ExtForge migration last** — biggest unknown. Doing it after the events fix means the regression test surface is stable; we'll know if the migration breaks the events pipeline rather than chasing a phantom regression.

If Phase 2 instrumentation reveals systemic issues (multiple stages broken with no shared root cause), revisit whether Approach B is sufficient or whether we escalate to Approach C (full subsystem rewrite). Decision point is between Step 2 and Step 3.
