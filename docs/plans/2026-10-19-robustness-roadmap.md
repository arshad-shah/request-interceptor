# Request Interceptor: roadmap to a robust, polished extension

Date: 2026-10-19. Baseline is `fix/network-memory` (PR #18, stacked on #15).

## Where things stand (measured)

| Area | Today |
|---|---|
| Bundle | Side panel `index.js` **1.86 MB**; popup 170 KB |
| Editors | Ace (`ace-builds` + `react-ace`) in 6 places; `react-syntax-highlighter` (Prism) in 2 |
| Types | 160 `any` uses; `NetworkRequest` defined twice; `shortUrl` duplicated in fetch/XHR interceptors |
| Messaging | Two message styles (28 `action:` + 38 `type:` messages) with stringly-typed handlers in two listeners |
| Large files | `NetworkRequestDetails.tsx` 1,559 · `network-background.ts` 1,085 · `network/components.tsx` 888 · `JsonTreeViewer.tsx` 866 · `network/utils.ts` 781 |
| Tests | 120 tests, all in `src/core`; **none** for stores, `lib/`, UI components, background, content, injected |
| Errors | 1 app-level `ErrorBoundary` per surface; 44 empty/silent `catch`es; 35 stray `console.*` |
| Settings | None. Behavior is hardcoded (toasts always on and fixed in place, all sites, capture limits) |
| Brand | New mark on the toolbar icon, header and popup only. Not used on: page toasts (text glyphs), panel/popup favicons, enabled vs disabled toolbar state (`updateIcon` sets the same icon for both) |
| **Cross-browser** | **`chrome.debugger` is used unguarded at service-worker startup.** Firefox/Safari have no `chrome.debugger`, so their background script likely crashes on load. Must verify. |

## Phase 0: land and stabilize (small)
1. Merge #15, then #18 (CI runs once #18 targets `main`). Make CI run on PRs to any branch.
2. **P0:** feature-detect `chrome.debugger`. Disable the Network tab with an explanation on Firefox/Safari instead of crashing the service worker. Smoke-load all four builds.
3. Upgrade extforge to 1.4 (1.0 had no breaking changes from 0.6; recheck `browserOverrides` and the generated manifests). This uses your local `^0.5.0` bump.

## Phase 1: one brand mark everywhere
- `icons/icon.svg` stays the single source. One script generates every PNG, plus a `brand:check` CI gate like Prism's.
- Toolbar: distinct **enabled / disabled** icon variants, plus an optional badge (intercept count).
- Side panel and popup favicons; `BrandMark` in empty states, the error-boundary fallback and the about/settings header.
- Page toasts: replace the ✓ ℹ ↻ ✕ glyphs with the mark plus SVG status icons, injected via shadow DOM so pages can't restyle them.
- README hero and store screenshots regenerated from the real UI with synthetic data.

## Phase 2: simplify and consolidate
- **CodeMirror 6 replaces Ace and react-syntax-highlighter.** One `<CodeEditor>` component (editable or `readOnly`), with lazy-loaded language packs (`@codemirror/lang-json`, `-javascript`, `-css`, `-html`; currently `@codemirror/view` 6.43, `state` 6.7). It covers all 8 call sites: BodySection, InjectionSection, TemplatesTab, StorageEditor, CookieEditor, EventCard, the network response viewer and Codehighlighter. It also handles large-body viewing better than Prism, which re-renders the full body. **Target: side panel under 900 KB** (budget enforced in CI).
- **Typed message protocol.** One discriminated union of all messages and responses in `src/core/messages.ts`, one router in background (or `extforge/messaging` `defineHandler`), and a typed client with timeouts. This replaces the `action`/`type` split and the two-listener design (whose response race caused real bugs in #18).
- Delete duplicates: one `NetworkRequest` type, shared `shortUrl`/toast helpers, shared header-rule logic for fetch and XHR.
- Split the 800–1,500-line files into feature folders, e.g. `network/details/{Headers,Payload,Response,Timing,Frames}.tsx`, and move the `NetworkManager` event handlers into pure reducers that can be tested without Chrome.
- Get `any` to 0 in `core/` and `lib/`, with a lint rule ratchet elsewhere. Remove the debug HTML pages from `src/tests/`. Lint warnings to 0.
- Evaluate `detent-react` `useResizable` for the network pane splitter, which would replace the hand-rolled mouse listeners.

## Phase 3: error handling and resilience
- **Interceptors fail open.** Every fetch/XHR/WebSocket path is wrapped so an internal error falls back to the native call and reports once. The extension must never break a page's requests.
- **Error boundaries per tab and per details pane**, reset when you switch tabs, with "copy diagnostics" and "reload panel" actions. Background `error`/`unhandledrejection` hooks go through log-kit.
- Message client returns `Result` values with timeouts. Every tab gets loading, empty and error states (e.g. debugger already attached by DevTools, storage quota, restricted pages like `chrome://`).
- Persisted state gets schema validation, migration and corrupt-data recovery, for routes and the new settings.
- Service-worker restart safety: a test that kills the worker mid-session and verifies state, ports and debugger flags recover.

## Phase 4: settings (new Settings tab)
Typed schema with versioned migrations, stored in `chrome.storage` and applied live.
- **Notifications:** on-page toasts on/off and per event kind (mock, block, redirect, header change, WebSocket); position (four corners); duration; max visible; panel notifications; toolbar badge.
- **Site behavior:** global on/off; allow/deny site patterns; per-site pause from the popup; inject at `document_start` vs on demand; skip incognito; restricted origins.
- **Network capture:** auto-attach when the panel opens, preserve log, max requests, body cache size, prefetch policy, WebSocket frame cap.
- **Event monitor:** categories, ignored event types, rate limit.
- **Appearance:** theme (system/dark/light), density, default tab.
- **Data:** export/import routes and settings, reset to defaults. **Diagnostics:** log level.

## Phase 5: complete testing
- **Unit:** settings schema and migrations, stores, `lib/` clients, message router (with a chrome fake, e.g. `extforge/testing`).
- **Component (RTL):** every tab's loading, empty, error and happy states; CodeEditor; error boundaries.
- **Integration:** background handlers end to end with the fake; content↔injected command flow.
- **E2E (Playwright, real Chromium loading `dist/chrome`, local fixture server):** fetch/XHR/WebSocket mock, block, redirect and header rules; injection runs once; Network tab capture plus HAR export; settings take effect; plus a **memory soak** (busy page and WebSocket feed for N minutes, service-worker heap stays under budget).
- Coverage thresholds in CI (core ≥ 95%, overall ≥ 80%). Firefox gets its own smoke run; a Chromium pass is never claimed as Firefox/Safari readiness.

## Phase 6: release
Bundle and performance budgets checked in CI, store assets, privacy notes (debugger and cookies permissions justified), changelog, versioned release.

## Decisions needed
1. Browser scope: Chrome/Edge only for v1, or ship Firefox/Safari with a reduced Network tab?
2. Settings sync: `chrome.storage.sync` (follows your profile) or `local` only?
3. Default toast behavior: on for every intercept, or errors/blocks only?
4. Site default: active on all sites (today) or opt-in per site?
