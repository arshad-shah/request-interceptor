# ExtForge Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Vite with ExtForge as the extension build tool. Produce a `dist/chrome/` folder that loads as an unpacked Chrome extension and behaves identically to the pre-migration build.

**Architecture:** Eight sequential tasks, one commit each. Source restructure → alias rewrite → manifest translation → config + script swap → verification + cleanup.

**Tech Stack:** ExtForge (local link to `../../extforge`), TypeScript, React, TailwindCSS 4, Vitest.

**Spec reference:** `docs/superpowers/specs/2026-04-30-extforge-migration-design.md`

---

## File map (high-level)

- Move: `src/popup/main.tsx` → `src/ui/popup/index.tsx`
- Move: `popup.html` → `src/ui/popup/index.html`
- Move: `src/sidepanel/main.tsx` → `src/ui/sidepanel/index.tsx`
- Move: `sidepanel.html` → `src/ui/sidepanel/index.html`
- Modify: every file under `src/**/*.{ts,tsx}` referencing `@components`, `@lib`, `@hooks`, `@stores`, `@types`, `@styles`, `@popup`, `@sidepanel`, `@assets` (alias rewrite)
- Modify: `tsconfig.json`, `vitest.config.ts`
- Create: `extforge.config.ts`
- Modify: `package.json`
- Delete (post-verification): `vite.config.ts`, `public/manifest.json`

---

## Task 1: Path alias rewrite

**Files:** every TypeScript/TSX file under `src/`, plus `tsconfig.json` and `vitest.config.ts`.

- [ ] **Step 1: Inventory current alias usage**

Run: `grep -rEn "from '@(components|lib|hooks|stores|types|styles|popup|sidepanel|assets)/" src/`
Save the count. This is the baseline — every match must be rewritten.

- [ ] **Step 2: Rewrite imports — non-popup/sidepanel aliases**

For each of `components`, `lib`, `hooks`, `stores`, `types`, `styles`, `assets`, run a project-wide find/replace via `sed` (BSD sed on macOS uses `-i ''`):

```bash
for alias in components lib hooks stores types styles assets; do
  find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' "s|from '@${alias}/|from '@/${alias}/|g" {} +
done
```

- [ ] **Step 3: Rewrite `@popup` and `@sidepanel` to new locations**

These move to `@/ui/popup` and `@/ui/sidepanel` (the directory move happens in Task 2; the imports are updated in advance):

```bash
find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' "s|from '@popup/|from '@/ui/popup/|g" {} +
find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec sed -i '' "s|from '@sidepanel/|from '@/ui/sidepanel/|g" {} +
```

- [ ] **Step 4: Update `tsconfig.json` paths**

Read `tsconfig.json`. Replace the `paths` block currently shaped like:

```json
"paths": {
  "@/*": ["src/*"],
  "@components/*": ["src/components/*"],
  "@lib/*": ["src/lib/*"],
  "@hooks/*": ["src/hooks/*"],
  "@stores/*": ["src/stores/*"],
  "@types/*": ["src/types/*"],
  "@styles/*": ["src/styles/*"],
  "@popup/*": ["src/popup/*"],
  "@sidepanel/*": ["src/sidepanel/*"],
  "@assets/*": ["src/assets/*"]
}
```

with just:

```json
"paths": {
  "@/*": ["src/*"]
}
```

- [ ] **Step 5: Update `vitest.config.ts` aliases**

Read `vitest.config.ts`. The current alias config likely uses the same 9-key map. Replace it with `'@': resolve(__dirname, './src')` only.

- [ ] **Step 6: Verify**

Run: `grep -rEn "from '@(components|lib|hooks|stores|types|styles|popup|sidepanel|assets)/" src/`
Expected: zero matches.

Run: `pnpm type-check`
Expected: PASS.

Run: `pnpm test:run`
Expected: all tests green.

- [ ] **Step 7: Commit**

`git add -A`
`git commit -m "refactor: collapse path aliases to @ only"`

No `Co-Authored-By` trailer.

---

## Task 2: Move popup and sidepanel into `src/ui/`

**Files:**
- Move: `src/popup/main.tsx` → `src/ui/popup/index.tsx`
- Move: `popup.html` → `src/ui/popup/index.html`
- Move: `src/sidepanel/main.tsx` → `src/ui/sidepanel/index.tsx`
- Move: `sidepanel.html` → `src/ui/sidepanel/index.html`

- [ ] **Step 1: Create new directory structure**

```bash
mkdir -p src/ui/popup src/ui/sidepanel
```

- [ ] **Step 2: Move popup**

```bash
git mv src/popup/main.tsx src/ui/popup/index.tsx
git mv popup.html src/ui/popup/index.html
```

If `src/popup/` contains other files (e.g., `App.tsx`, CSS, helper files), `git mv src/popup/* src/ui/popup/` to move all of them, then `rmdir src/popup` if empty. Inspect first with `ls src/popup/`.

- [ ] **Step 3: Move sidepanel**

```bash
git mv src/sidepanel/main.tsx src/ui/sidepanel/index.tsx
git mv sidepanel.html src/ui/sidepanel/index.html
```

Same caveat as above for additional files in `src/sidepanel/`.

- [ ] **Step 4: Update HTML script references**

Read each new HTML. Find the `<script>` tag that references the moved entrypoint. Update its `src` to a same-directory relative path: `./index.tsx`. Example before/after:

Before (in old `popup.html` at root):
```html
<script type="module" src="/src/popup/main.tsx"></script>
```

After (in `src/ui/popup/index.html`):
```html
<script type="module" src="./index.tsx"></script>
```

Apply the same change to `src/ui/sidepanel/index.html`.

- [ ] **Step 5: Update intra-popup/sidepanel imports**

Some `index.tsx` files import sibling files (`App`, `styles.css`, etc.). Those stay relative (`./App`) and need no change. But any that referenced `@popup/...` or `@sidepanel/...` were updated in Task 1; verify with grep:

```bash
grep -rEn "from '@(popup|sidepanel)/" src/
```

Expected: zero.

- [ ] **Step 6: Verify**

`pnpm type-check`
Expected: PASS.

`pnpm test:run`
Expected: all tests green.

- [ ] **Step 7: Commit**

`git add -A`
`git commit -m "refactor: move popup and sidepanel into src/ui/ for extforge convention"`

No `Co-Authored-By` trailer.

---

## Task 3: Create `extforge.config.ts` with translated manifest

**Files:**
- Create: `extforge.config.ts`

- [ ] **Step 1: Write the config**

Create `extforge.config.ts` at repo root:

```typescript
import { defineConfig } from 'extforge';

export default defineConfig({
  browsers: ['chrome'],
  framework: 'react',
  css: 'tailwind',
  manifest: {
    manifestVersion: 3,
    name: 'Request Interceptor',
    version: '3.1.0',
    description: 'Developer toolkit for intercepting API responses, monitoring events, and inspecting browser storage',
    icons: {
      '16': 'icons/icon-16.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
      '512': 'icons/icon-512.png',
    },
    action: {
      defaultPopup: 'ui/popup/index.html',
      defaultIcon: {
        '16': 'icons/icon-16.png',
        '48': 'icons/icon-48.png',
        '128': 'icons/icon-128.png',
        '512': 'icons/icon-512.png',
      },
    },
    background: { entrypoint: 'background/index.js' },
    contentScripts: [
      { matches: ['<all_urls>'], js: ['content/index.js'], runAt: 'document_start' },
    ],
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
  },
});
```

- [ ] **Step 2: Cannot type-check yet**

`pnpm type-check` will fail because `extforge` is not yet in `node_modules`. This is expected — it gets installed in Task 4. Skip type-check this step.

- [ ] **Step 3: Commit**

`git add extforge.config.ts`
`git commit -m "feat(build): add extforge.config.ts with translated manifest"`

No `Co-Authored-By` trailer.

---

## Task 4: Swap dependencies and scripts in package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update scripts**

In `package.json`, update the `"scripts"` block:

- `"dev": "vite"` → `"dev": "extforge dev"`
- `"build": "vite build"` (or current equivalent — read first) → `"build": "extforge build"`
- Leave `"type-check"`, `"lint"`, `"test"`, `"test:run"`, `"test:coverage"` unchanged.

- [ ] **Step 2: Remove Vite dev dependencies**

In `package.json`'s `"devDependencies"`, remove:
- `"vite"`
- `"@vitejs/plugin-react"`
- `"@tailwindcss/vite"`
- `"vite-plugin-static-copy"`
- `"rollup-plugin-visualizer"`

Keep `tailwindcss` (the npm package itself). ExtForge invokes its CLI directly.

- [ ] **Step 3: Add extforge as a local file dep**

Add to `"devDependencies"`:

```json
"extforge": "file:../../extforge"
```

(Path is relative to this repo's root: `Documents/practice/extensions/request-intercepter` up two levels to `Documents/practice/`, then into `extforge/`.)

- [ ] **Step 4: Install**

```bash
pnpm install
```

Expected: succeeds. The lockfile updates with the new `file:` link and removes Vite-related transitive deps.

If install fails with a `file:` resolution error, fallback: from the extforge repo run `pnpm link --global`, then from this repo run `pnpm link --global extforge`. Note this in the report.

- [ ] **Step 5: Verify ExtForge is callable**

```bash
pnpm exec extforge --help
```

Expected: prints CLI help (subcommands: `init`, `dev`, `build`, etc.).

- [ ] **Step 6: Type-check**

`pnpm type-check`
Expected: PASS (now that `extforge` types resolve from `node_modules`).

- [ ] **Step 7: Commit**

`git add package.json pnpm-lock.yaml`
`git commit -m "build: swap vite for extforge in dependencies and scripts"`

No `Co-Authored-By` trailer.

---

## Task 5: First end-to-end build

**Files:** none (verification)

- [ ] **Step 1: Build**

```bash
pnpm build
```

Expected: completes without errors, prints a "Built chrome → dist/chrome/" success message.

If the build fails, capture the error and the offending step. Common failure modes and fixes:

- "No entry points found" — `src/` layout problem from Task 2; verify `src/background.ts`, `src/content.ts`, `src/injected.ts`, `src/ui/popup/index.tsx`, `src/ui/sidepanel/index.tsx` all exist.
- "Cannot resolve `@/...`" — Task 1 alias rewrite incomplete; grep for stragglers.
- "TailwindCSS CLI failed" — Tailwind v4 CLI wiring issue; check `tailwind.config.ts` is at repo root and `npx tailwindcss --help` works in this repo.

- [ ] **Step 2: Inspect dist**

Verify the produced tree:

```bash
find dist/chrome -type f | sort
```

Expected files (presence, not exhaustive list):
- `dist/chrome/manifest.json`
- `dist/chrome/background/index.js`
- `dist/chrome/content/index.js`
- `dist/chrome/injected.js`
- `dist/chrome/ui/popup/index.html`
- `dist/chrome/ui/popup/index.js`
- `dist/chrome/ui/sidepanel/index.html`
- `dist/chrome/ui/sidepanel/index.js`
- `dist/chrome/icons/icon-16.png` (and other sizes)

- [ ] **Step 3: Diff manifests**

Compare `dist/chrome/manifest.json` against the pre-migration `public/manifest.json`. Read both and verify semantic equivalence:

- `name`, `version`, `description` match exactly.
- `manifest_version: 3`.
- `permissions` array matches.
- `host_permissions: ["<all_urls>"]` matches.
- `background.service_worker` points to `background/index.js` (vs old `background.js` — the path differs because of ExtForge's per-entry subdir convention; this is expected and the manifest reference is correct).
- `content_scripts[0].js[0]` is `content/index.js` (vs old `content.js` — same expected path change).
- `web_accessible_resources` includes both `injected.js` and `icons/*`.
- `side_panel.default_path` is `ui/sidepanel/index.html`.
- `action.default_popup` is `ui/popup/index.html`.

If `content_security_policy` is missing from the produced manifest but was present in the original, decide whether the implicit MV3 default (`script-src 'self'; object-src 'self'`) is sufficient (it should be — that's what the original specified). If the verification later finds a CSP-related runtime issue, raise as a follow-up.

- [ ] **Step 4: No commit (verification only)**

If everything looks good, proceed to Task 6.

---

## Task 6: Manual extension load and smoke test

**Files:** none (manual verification)

This task requires a real Chrome browser and a real test page. The implementer cannot fully automate this; they execute the steps below and report findings.

- [ ] **Step 1: Load the extension**

In Chrome: `chrome://extensions` → enable "Developer mode" → "Load unpacked" → select `dist/chrome/`.

Expected: card appears with name "Request Interceptor". No manifest errors.

- [ ] **Step 2: Open the side panel and verify routes UI**

Click the extension's side-panel toggle (or right-click the action icon and choose "Open side panel"). Expected: the React app renders the Routes tab with no console errors. Switch tabs (Routes, Add Route, Templates, Network, Events, Storage) — each renders.

- [ ] **Step 3: Smoke-test a route mock**

Add a route, e.g. `GET https://httpbin.org/get` returning a mock JSON body. Visit `https://httpbin.org/get` in a tab. Expected: the response in DevTools Network shows the mocked body, not the real httpbin response.

- [ ] **Step 4: Smoke-test events monitor**

Open `https://example.com`, toggle the events monitor on in the side panel, and run in the page console:

```javascript
document.dispatchEvent(new CustomEvent('migration-smoke', { detail: { ok: true } }));
```

Expected: the event appears in the side panel's Events tab.

- [ ] **Step 5: Smoke-test network capture**

On any HTTPS page, open the Network tab in the side panel and trigger a fetch (e.g., reload the page). Expected: requests appear.

- [ ] **Step 6: Smoke-test storage**

Open the Storage tab. Expected: localStorage / sessionStorage / cookies populated for the active tab.

- [ ] **Step 7: Capture findings**

If any test fails, note the exact failure (UI behavior, console error, manifest issue). Do NOT proceed to Task 7 if any failure is observed — return to the offending earlier task.

If all tests pass, proceed.

---

## Task 7: Delete obsolete Vite files

**Files:**
- Delete: `vite.config.ts`
- Delete: `public/manifest.json`

- [ ] **Step 1: Confirm no remaining Vite references**

```bash
grep -rln "vite\|Vite" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" src/ public/ extforge.config.ts package.json tsconfig.json
```

Acceptable matches: `vitest.config.ts` (still in use), `vitest` references in `package.json` scripts, doc files mentioning the migration. Inspect remaining matches and confirm they're expected.

- [ ] **Step 2: Delete Vite config**

```bash
rm vite.config.ts
```

- [ ] **Step 3: Delete inlined manifest**

```bash
rm public/manifest.json
```

If `public/` is now empty except for `icons/`, leave it — `public/icons/` is still copied to `dist/chrome/icons/` by ExtForge.

- [ ] **Step 4: Verify build still passes after deletions**

```bash
pnpm build
```

Expected: still produces `dist/chrome/manifest.json` (now sourced entirely from `extforge.config.ts`).

- [ ] **Step 5: Verify post-build manifest unchanged**

Re-run the diff from Task 5 Step 3. Expected: identical output.

- [ ] **Step 6: Commit**

`git add -A`
`git commit -m "build: remove vite config and inlined manifest"`

No `Co-Authored-By` trailer.

---

## Task 8: Final verification

**Files:** none

- [ ] **Step 1: Run all verification commands**

```bash
pnpm type-check
pnpm lint
pnpm test:run
pnpm build
```

All must pass.

- [ ] **Step 2: Repeat the manual smoke test from Task 6**

Tasks 7's deletions could in principle break something. Reload the unpacked extension from `dist/chrome/` and re-run smoke steps 2-6.

- [ ] **Step 3: Update CLAUDE.md**

Read `CLAUDE.md`. Update the references to Vite:

- "Built with React 18, TypeScript, Zustand, TailwindCSS 4, and Vite." → "Built with React 18, TypeScript, Zustand, TailwindCSS 4, and ExtForge."
- "TypeScript compile + Vite build → dist/" → "ExtForge build → dist/chrome/"
- "Vite dev server" → "ExtForge dev server"
- "Configured in both `vite.config.ts` and `tsconfig.json`: `@` → `src/`, `@components`, `@lib`, …" → "Configured in `tsconfig.json`: `@` → `src/`. Other prefixed aliases removed during ExtForge migration."
- The "Extension entry points (each is a separate Vite entry):" line → "Extension entry points:" (drop the Vite reference).

- [ ] **Step 4: Commit docs update**

`git add CLAUDE.md`
`git commit -m "docs: update CLAUDE.md for extforge migration"`

No `Co-Authored-By` trailer.

- [ ] **Step 5: Done**

The migration is complete. The branch is ready for merge or PR. Tasks 1-8 each landed as a discrete commit so the history is bisectable.
