# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Chrome extension (Manifest V3) — **Request Interceptor** — a developer toolkit for intercepting API responses, monitoring events, and inspecting browser storage. Built with React 18, TypeScript, Zustand, TailwindCSS 4, and ExtForge.

## Commands

```bash
pnpm dev              # ExtForge dev server with HMR
pnpm build            # ExtForge build → dist/<browser>/ for chrome and edge
pnpm type-check       # Type check only (no emit)
pnpm lint             # ESLint (zero warnings allowed)
pnpm test             # Vitest watch mode
pnpm test:run         # Vitest single run
pnpm test:coverage    # Vitest with coverage
```

Load the `dist/chrome/` folder as an unpacked extension in `chrome://extensions` (or `dist/edge/` in `edge://extensions`). Firefox/Safari are intentionally unsupported (`chrome.debugger`).

## Architecture

**Extension entry points** (each is a separate ExtForge entry):
- `src/background.ts` — Service worker composition root: one `MessageRouter` shared by `src/sw/state.ts` (enabled flag, routes, event-monitor flag; persisted), `src/sw/events.ts` (per-tab event buffer), `src/sw/storage.ts` (cookies, web storage, IndexedDB via `chrome.scripting`) and `src/sw/network/manager.ts` (network capture via `chrome.debugger`; pure request-state reducer, HAR and replay building live in `src/core/network/`).
- `src/content.ts` — Content script injected at `document_start`. Relays messages between page and background. Uses `src/core/url-matching.ts` for injection route matching. Forwards EventBus monitor events.
- `src/injected.ts` — Thin IIFE shell injected into page context. Delegates to `src/core/interceptors/` for fetch, XHR, and WebSocket interception. Also patches `dispatchEvent`, `postMessage`, and EventEmitter patterns for event monitoring.
- `src/ui/sidepanel/index.tsx` — Side panel React app (main UI). HTML at `src/ui/sidepanel/index.html`.
- `src/ui/popup/index.tsx` — Popup React app. HTML at `src/ui/popup/index.html`.

**Messaging** — every request and broadcast is declared in `src/core/messaging/protocol.ts` (`Requests`, `Events`). Requests are `{ type, payload }` answered with `{ ok, data | error }` by `src/core/messaging/router.ts`; UI and content scripts call `request(type, payload)` from `src/lib/messaging.ts` (throws `MessageError` on failure/timeout) and subscribe with `onEvent(type, cb)`. The background broadcasts with `emit` / `emitToTabs`. Add a message by extending the protocol, then registering a handler — never call `chrome.runtime.sendMessage` directly.

**Core modules** (`src/core/`) — Pure, testable functions with no browser API dependencies:
- `route-keys.ts` — Single source of truth for route key parsing/creation (HTTP, WS, INJ formats).
- `url-matching.ts` — URL pattern matching (exact, regex, wildcard, contains). Used by interceptors and content script.
- `query-params.ts` — Query parameter manipulation (add/remove/modify).
- `graphql.ts` — GraphQL operation name matching.
- `route-validation.ts` — Config validation for HTTP, WebSocket, and injection routes.
- `route-migration.ts` — Schema migration for old route configs (e.g., `headersOnly` → `interceptionMode`).
- `route-export.ts` — Route serialization for export/import.
- `route-conflicts.ts` — Conflict detection when enabling/adding routes with the same method+URL.
- `event-serialization.ts` — Pure serializer for event data with depth/width caps. Used by `injected.ts` to safely stringify CustomEvent details, postMessage payloads, and EventEmitter args.

**Interceptor modules** (`src/core/interceptors/`) — Interception logic extracted from the injected script:
- `fetch-interceptor.ts` — `fetch()` wrapper supporting mock, passthrough, block, and redirect modes.
- `xhr-interceptor.ts` — `XMLHttpRequest` wrapper with the same modes.
- `ws-interceptor.ts` — `WebSocket` wrapper with message rule processing (replace, block, inject).
- `interceptor-helpers.ts` — Shared helpers: `shouldIntercept`, `createMockResponse`, header modification, route key parsing for injected context.

**Message flow:** Injected script ↔ Content script (postMessage/DOM) ↔ Background (chrome.runtime) ↔ Side panel UI.

**State management:** Four Zustand stores:
- `src/stores/app-store.ts` — Routes, enabled state, active tab, notifications, filters. `eventMonitorEnabled` is persisted in background state and hydrated from `getState` on side panel load.
- `src/stores/network-store.ts` — Captured network requests, filters, selected request (500 request limit).
- `src/stores/events-store.ts` — Captured events, filters, bookmarks, compare mode (1000 event limit).
- `src/stores/storage-store.ts` — localStorage, sessionStorage, cookies, IndexedDB state and filters.

**Route keys:** HTTP routes use `METHOD:URL` or `METHOD:URL|NAME` format (e.g., `GET:/api/users`). WebSocket routes use `WS:URL` or `WS:URL|NAME`. Injection routes use `INJ:URL` or `INJ:URL|NAME`. All parsing is centralized in `src/core/route-keys.ts`.

**Key types** in `src/types/index.ts`, `src/types/network.ts`, `src/types/events.ts`, and `src/types/storage.ts`: `RouteConfig`, `WebSocketConfig`, `InjectionConfig`, `WebSocketRule`, `NetworkRequest`, `MatchType`, `CapturedEvent`, `StorageItem`, `CookieItem`.

**UI Tabs:** Routes, Add Route, Templates, Network, Events, Storage — configured in `src/config/tabs.ts`.

**Compatibility layer:** `src/lib/chrome-api.ts` and `src/lib/utils.ts` re-export from `src/core/` modules. Existing consumers continue to work without changes.

## Testing

Tests use Vitest with jsdom environment. All core modules have unit tests in `src/core/__tests__/`:
- `route-keys.test.ts`, `url-matching.test.ts`, `query-params.test.ts`, `graphql.test.ts`
- `route-validation.test.ts`, `route-migration.test.ts`, `route-export.test.ts`, `route-conflicts.test.ts`, `event-serialization.test.ts`
- Shared fixtures in `src/core/__tests__/fixtures.ts`

## Path Aliases

Configured in `tsconfig.json` and `vitest.config.ts`: `@` → `src/`. Other prefixed aliases were collapsed during the ExtForge migration.

## Conventions

- ESLint warns on `any` but doesn't error. Unused vars must be prefixed with `_`.
- Dark theme using CSS custom properties in `src/styles/design-system.css`.
- Chrome APIs wrapped in `src/lib/chrome-api.ts`.
- Pure business logic belongs in `src/core/`. Entry points (`background.ts`, `injected.ts`, `content.ts`) should be thin shells that wire up core modules.
- New logic that doesn't depend on browser APIs should be added to `src/core/` with corresponding tests.
