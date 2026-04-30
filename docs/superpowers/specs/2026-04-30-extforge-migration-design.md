# Design: Migrate Request Interceptor Build to ExtForge

**Date:** 2026-04-30
**Status:** Approved for implementation planning
**Repo:** `Documents/practice/extensions/request-intercepter`
**Depends on:** ExtForge features `2026-04-30-injected-script-support` and `2026-04-30-content-script-iife` (both shipped on `extforge:main`)

## Goal

Replace the current Vite-based build pipeline with ExtForge. After migration, `pnpm build` runs `extforge build`; the produced `dist/chrome/` loads as an unpacked extension and behaves identically to the current Vite output. Vite-specific config and dependencies are removed.

## Non-goals

- Multi-browser builds (Firefox, Safari) — Chrome only.
- Changes to runtime behavior. The migration is build-only.
- Replacing Vitest (ExtForge does not include a test runner).
- Fixing pre-existing ExtForge ESLint 9 flat-config issue — separate concern.
- Refactoring the source code beyond what migration requires (no opportunistic cleanups).

---

## Source restructuring

| Current | New |
|---|---|
| `src/popup/main.tsx` | `src/ui/popup/index.tsx` |
| `popup.html` (repo root) | `src/ui/popup/index.html` |
| `src/sidepanel/main.tsx` | `src/ui/sidepanel/index.tsx` |
| `sidepanel.html` (repo root) | `src/ui/sidepanel/index.html` |
| `src/background.ts` | unchanged |
| `src/content.ts` | unchanged |
| `src/injected.ts` | unchanged |
| `public/manifest.json` | inlined into `extforge.config.ts`; file deleted post-migration |
| `public/icons/` | unchanged (ExtForge `copyPublic` walks it) |

The popup HTML and sidepanel HTML each currently contain a `<script src="/src/popup/main.tsx">` (or similar) reference. After the move, the script reference becomes `./index.tsx` (same directory).

The popup and sidepanel `index.tsx` entrypoints retain their existing imports — only the file's location and name change.

## Path alias rewrite

Current `tsconfig.json` declares 9 aliases (`@`, `@components`, `@lib`, `@hooks`, `@stores`, `@types`, `@styles`, `@popup`, `@sidepanel`, `@assets`). ExtForge supports only `@` → `src/`.

Mechanical rewrite:

- `@components/<path>` → `@/components/<path>`
- `@lib/<path>` → `@/lib/<path>`
- `@hooks/<path>` → `@/hooks/<path>`
- `@stores/<path>` → `@/stores/<path>`
- `@types/<path>` → `@/types/<path>`
- `@styles/<path>` → `@/styles/<path>`
- `@assets/<path>` → `@/assets/<path>`
- `@popup/<path>` → `@/ui/popup/<path>` (note: directory moved)
- `@sidepanel/<path>` → `@/ui/sidepanel/<path>` (note: directory moved)
- Bare `@` imports (e.g., `from '@'`) — none expected; verify with grep.

After the rewrite:

- `tsconfig.json` `paths` shrinks to `"@/*": ["src/*"]`.
- `vitest.config.ts` (which ExtForge does not own) keeps its alias config so tests continue to resolve. But the test alias config also collapses to `@`-only.
- `pnpm type-check` and `pnpm test:run` both pass.

## Manifest translation

The current `public/manifest.json` (excerpted):

```json
{
  "manifest_version": 3,
  "name": "Request Interceptor",
  "version": "3.1.0",
  "description": "Developer toolkit for intercepting API responses, monitoring events, and inspecting browser storage",
  "icons": { "16": "icons/icon-16.png", ... },
  "action": { "default_popup": "popup.html", "default_icon": {...} },
  "permissions": ["storage", "activeTab", "sidePanel", "debugger", "tabs", "cookies", "scripting"],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background.js", "type": "module" },
  "content_scripts": [{ "matches": ["<all_urls>"], "js": ["content.js"], "run_at": "document_start" }],
  "web_accessible_resources": [
    { "resources": ["injected.js"], "matches": ["<all_urls>"] },
    { "resources": ["icons/*"], "matches": ["<all_urls>"] }
  ],
  "side_panel": { "default_path": "sidepanel.html" },
  "content_security_policy": { "extension_pages": "script-src 'self'; object-src 'self'" }
}
```

Translates to `extforge.config.ts`'s `manifest` field:

```typescript
manifest: {
  manifestVersion: 3,
  name: 'Request Interceptor',
  version: '3.1.0',
  description: 'Developer toolkit for intercepting API responses, monitoring events, and inspecting browser storage',
  icons: { '16': 'icons/icon-16.png', '48': 'icons/icon-48.png', '128': 'icons/icon-128.png', '512': 'icons/icon-512.png' },
  action: {
    defaultPopup: 'ui/popup/index.html',
    defaultIcon: { '16': 'icons/icon-16.png', '48': 'icons/icon-48.png', '128': 'icons/icon-128.png', '512': 'icons/icon-512.png' },
  },
  background: { entrypoint: 'background/index.js' },
  contentScripts: [{ matches: ['<all_urls>'], js: ['content/index.js'], runAt: 'document_start' }],
  sidePanel: { defaultPath: 'ui/sidepanel/index.html' },
  permissions: {
    required: ['storage', 'activeTab', 'sidePanel', 'debugger', 'tabs', 'cookies', 'scripting'],
    optional: [],
    host: ['<all_urls>'],
  },
  webAccessibleResources: [
    { resources: ['injected.js'], matches: ['<all_urls>'] },
    { resources: ['icons/*'], matches: ['<all_urls>'] },
  ],
}
```

Note: the user explicitly declares `webAccessibleResources` (because we need both `injected.js` AND `icons/*`). ExtForge's auto-population would only emit `injected.js`, so the explicit declaration is required to also expose icons.

The `content_security_policy` block has no direct ExtForge config field. Two options:

- Default ExtForge manifest output omits CSP — Chrome MV3 default CSP is already `script-src 'self'; object-src 'self'`. Acceptable to drop the field entirely if behavior matches the implicit default.
- If verification shows the implicit default differs, raise as an open question during implementation. Implementation may need an ExtForge follow-up to support custom CSP.

Implementation will verify by diffing the post-build manifest against the pre-migration manifest.

The output filenames in the manifest (`background/index.js`, `content/index.js`, `ui/popup/index.html`, `ui/sidepanel/index.html`) reflect ExtForge's flat-with-subdirs convention.

## Build pipeline

### `extforge.config.ts` (new file at repo root)

```typescript
import { defineConfig } from 'extforge';

export default defineConfig({
  browsers: ['chrome'],
  framework: 'react',
  css: 'tailwind',
  manifest: { /* see "Manifest translation" above */ },
});
```

### `package.json` script changes

| Before | After |
|---|---|
| `"dev": "vite"` | `"dev": "extforge dev"` |
| `"build": "vite build"` (or current equivalent) | `"build": "extforge build"` |
| `"type-check"`, `"lint"`, `"test*"` | unchanged |

### Dependency changes

Remove (devDependencies):

- `vite`
- `@vitejs/plugin-react`
- `@tailwindcss/vite`
- `vite-plugin-static-copy`
- `rollup-plugin-visualizer`

Add (devDependencies):

- `extforge` via `file:../../extforge` (local protocol; PNPM rebuilds on each ExtForge change).

Keep:

- All runtime dependencies (`react`, `react-dom`, `zustand`, `@radix-ui/*`, etc.).
- `tailwindcss` (ExtForge invokes `npx tailwindcss` directly; the npm package needs to be present).
- `tailwind.config.ts`.
- `tsconfig.json`, `vitest.config.ts`.

### File deletions (post-verification)

- `vite.config.ts`
- `popup.html` (repo root)
- `sidepanel.html` (repo root)
- `public/manifest.json` (now inlined into config)

## Risks and verification

### Risks

1. **TailwindCSS 4 CLI compatibility.** ExtForge invokes `npx tailwindcss --help` / `npx tailwindcss -i ... -o ... --minify`. Tailwind v4 ships with a CLI that supports those flags. Verify by running `npx tailwindcss --help` in this repo before migration starts; if it fails, the install or config needs adjustment.
2. **`file:../../extforge` resolution.** PNPM with the `file:` protocol creates a symlink. Some build setups don't follow it cleanly. Fallback: `pnpm link --global` from extforge, then `pnpm link --global extforge` from this repo. Decision made during implementation.
3. **CSP semantic drift.** Current manifest declares an explicit CSP. ExtForge's manifest config has no CSP field. Verification step diffs the produced manifest's effective CSP against the original.
4. **Output path mismatches in manifest.** ExtForge produces files at `dist/chrome/{background,content,injected,ui/...}/`. Manifest references must match exactly (e.g., `background.entrypoint: 'background/index.js'`, NOT `'background.js'`). The migration's manifest translation is the single source of truth here; a smoke test confirms each path resolves at extension load.
5. **Vitest path alias.** `vitest.config.ts` independently maintains alias config. After the alias rewrite, both `tsconfig.json` and `vitest.config.ts` collapse to `@`-only.
6. **HMR scope.** ExtForge HMR works for UI but reloads the extension for background/content/injected changes. This is the same DX as the current Vite setup, which also requires extension reload for service-worker changes. No regression.

### Verification

After migration:

1. `pnpm install` succeeds and ExtForge is resolvable.
2. `pnpm build` produces `dist/chrome/` containing:
   - `manifest.json` with all expected keys
   - `background/index.js` (ESM, service-worker-style)
   - `content/index.js` (IIFE)
   - `injected.js` (IIFE)
   - `ui/popup/index.html` + `ui/popup/index.js` + matching CSS
   - `ui/sidepanel/index.html` + `ui/sidepanel/index.js` + matching CSS
   - `icons/` (copied from `public/icons/`)
3. `dist/chrome/manifest.json` parses cleanly and matches the pre-migration manifest semantically (paths normalized).
4. Loading `dist/chrome/` as an unpacked extension in `chrome://extensions` shows "Request Interceptor" with no manifest errors.
5. Manual smoke test in a real page: routes, network, events, and storage tabs all work; events monitoring (the Phase 2 fix) still captures and surfaces events.
6. `pnpm type-check`, `pnpm lint`, `pnpm test:run` all green.
7. `pnpm dev` starts the ExtForge dev server, watches `src/`, and reloads the extension on changes.

## Sequencing

1. Branch off `claude/refactor-interceptor-design-buZnt` (current branch with rename + events fix). Migration starts from a green baseline.
2. Path alias rewrite (mechanical, large diff but isolated).
3. Source restructuring (move popup/sidepanel directories and HTMLs).
4. Manifest translation (write `extforge.config.ts`).
5. `package.json` and dependency swap; `pnpm install`.
6. Verify build, then delete obsolete files (`vite.config.ts`, root HTMLs, `public/manifest.json`).
7. Manual smoke test — final gate.

Each step is its own commit so a regression can be bisected cleanly.
