# Request Interceptor

[![CI](https://github.com/arshad-shah/request-interceptor/actions/workflows/ci.yml/badge.svg)](https://github.com/arshad-shah/request-interceptor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

A developer toolkit browser extension for intercepting API responses, monitoring DOM/runtime events, and inspecting browser storage. Built for the inner loop: mock backends without touching server code, watch what the page actually emits, and inspect every cookie, storage entry, and IndexedDB record in one panel.

Manifest V3 · React 18 · TypeScript · Zustand · TailwindCSS 4 · [ExtForge](https://github.com/arshad-shah/extforge).

## Features

- **HTTP interception** — Mock, block, redirect, or pass through `fetch` and `XMLHttpRequest` requests. Match by URL (exact, regex, wildcard, contains), method, and GraphQL operation name.
- **WebSocket interception** — Replace, block, or inject messages on the fly. Per-route rules.
- **Script injection** — Inject custom scripts on matching pages at `document_start`.
- **Event monitor** — Capture `CustomEvent` dispatches, `postMessage` traffic, and `EventEmitter`-style emissions with safe depth/width-capped serialization.
- **Network panel** — Tail captured requests with filters and per-request inspection.
- **Storage inspector** — Browse and edit `localStorage`, `sessionStorage`, cookies, and IndexedDB.
- **Templates** — Save common route configs and apply them with one click.
- **Cross-browser** — Builds for Chrome, Firefox, Safari, and Edge from a single source.

## Install

### From source

```bash
git clone https://github.com/arshad-shah/request-interceptor.git
cd request-interceptor
pnpm install
pnpm build
```

Then load the unpacked extension:

- **Chrome / Edge** — `chrome://extensions` → enable Developer Mode → "Load unpacked" → select `dist/chrome/` (or `dist/edge/`).
- **Firefox** — `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on…" → select `dist/firefox/manifest.json`.
- **Safari** — Convert `dist/safari/` via `xcrun safari-web-extension-converter` and run from Xcode.

## Usage

1. Open the extension's side panel (Chrome/Edge) or popup.
2. Go to **Add Route**, define a URL pattern + method, choose a mode (mock / passthrough / block / redirect), and save.
3. Toggle interception on. Reload the target page — matching requests are intercepted.
4. Use **Network**, **Events**, and **Storage** tabs to inspect runtime behavior.
5. Save frequently-used configurations as **Templates**.

A demo page at [`test-page.html`](test-page.html) and a sample config at [`test-routes.json`](test-routes.json) are included for trying it out.

## Development

```bash
pnpm dev              # ExtForge dev server with HMR
pnpm build            # Build all browser targets → dist/<browser>/
pnpm type-check       # tsc --noEmit
pnpm lint             # ESLint
pnpm test             # Vitest watch mode
pnpm test:run         # Vitest single run
pnpm test:coverage    # Coverage report
```

### Architecture

The extension has the standard four entry points (`background`, `content`, `injected`, `ui`) plus a `src/core/` layer of pure, testable modules with no browser-API dependencies (route matching, validation, migration, serialization, interceptor implementations). Entry points are thin shells that wire core modules to Chrome APIs.

See [CLAUDE.md](CLAUDE.md) for a deeper architectural tour and contributor-oriented codebase map.

## Contributing

Pull requests welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, testing, and PR guidelines, and the [Code of Conduct](CODE_OF_CONDUCT.md). For security issues, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Arshad Shah
