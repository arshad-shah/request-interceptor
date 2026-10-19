# Contributing

Thanks for taking the time to contribute. This document covers how to get the project running locally, how the codebase is laid out, and what we expect from pull requests.

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`npm install -g pnpm`)
- A Chromium-based browser for testing (Chrome, Edge, Brave, etc.)

## Setup

```bash
git clone https://github.com/arshad-shah/request-interceptor.git
cd request-interceptor
pnpm install
pnpm build
```

Then load `dist/chrome/` as an unpacked extension from `chrome://extensions`.

For iterative development:

```bash
pnpm dev
```

ExtForge will rebuild on change. Reload the extension from `chrome://extensions` to pick up background/content-script changes; UI changes hot-reload.

## Codebase layout

See [CLAUDE.md](CLAUDE.md) for the full architecture tour. The short version:

- `src/background.ts`, `src/content.ts`, `src/injected.ts` — extension entry points. Keep these as thin shells.
- `src/core/` — pure, testable business logic. **New logic that doesn't depend on browser APIs belongs here**, with tests in `src/core/__tests__/`.
- `src/ui/` — React side panel and popup.
- `src/stores/` — Zustand stores.
- `src/types/` — shared TypeScript types.

## Before opening a PR

```bash
pnpm type-check
pnpm lint
pnpm test:run
pnpm build
```

All four must pass. CI runs the same commands.

## Pull request guidelines

- **One topic per PR.** Refactors, features, and unrelated fixes should be separate.
- **Tests for new core logic.** Anything added to `src/core/` should have unit tests.
- **Commit messages** use conventional prefixes when possible (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `build:`).
- **Manually verify the UX.** If you change extension behavior, load the unpacked build and confirm the feature works end-to-end. Mention in the PR description what you tested.
- **Update docs** (README, CLAUDE.md) when you change public-facing behavior or architecture.

## Reporting bugs and requesting features

Use the issue templates under [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE). For security vulnerabilities, see [SECURITY.md](SECURITY.md) — do not file public issues for security problems.

## Code of Conduct

By participating, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).
