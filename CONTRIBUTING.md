# Contributing & Development

This document covers how to build the extension from source, run tests, and contribute changes.

---

## Contents

- [Prerequisites](#prerequisites)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Development workflow](#development-workflow)
- [Building for production](#building-for-production)
- [Packaging for distribution](#packaging-for-distribution)
- [Running tests](#running-tests)
- [Architecture notes](#architecture-notes)
- [Design decisions](#design-decisions)
- [v1 scope and what's deferred](#v1-scope-and-whats-deferred)
- [Submitting changes](#submitting-changes)

---

## Prerequisites

- **Node.js** 18+
- **npm** 9+
- A running [Linkding](https://github.com/sissbruecker/linkding) instance for manual testing

---

## Project structure

```
linkding-browser-extension/
├── public/
│   └── manifest.json          # MV3 manifest (source — do not edit dist directly)
├── src/
│   ├── background/
│   │   └── service-worker.ts  # All network calls, alarm management, message handling
│   ├── popup/
│   │   ├── Popup.tsx          # Main popup UI
│   │   └── popup.css
│   ├── options/
│   │   ├── Options.tsx        # Settings page
│   │   └── options.css
│   ├── components/            # Shared React components
│   │   ├── BookmarkRow.tsx
│   │   ├── Button.tsx
│   │   ├── EditModal.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── StatusBar.tsx
│   │   └── TagChip.tsx
│   └── lib/
│       ├── api.ts             # Linkding REST API client
│       ├── browser.ts         # Browser abstraction (webextension-polyfill wrapper)
│       ├── cache.ts           # Local cache management
│       ├── search.ts          # Client-side search with deterministic scorer
│       ├── validators.ts      # URL/token validation
│       └── types.ts           # Shared TypeScript types + message protocol
├── tests/
│   └── unit/                  # Vitest unit tests
├── scripts/
│   ├── package-chrome.sh      # Produces linkding-chrome.zip
│   └── package-firefox.sh     # Produces linkding-firefox.zip
├── vite.config.chrome.ts
├── vite.config.firefox.ts
├── tsconfig.json
└── package.json
```

---

## Getting started

```bash
# Clone the repository
git clone https://github.com/damianmendis/linkding-browser-extension.git
cd linkding-browser-extension

# Install dependencies
npm install
```

---

## Development workflow

### Build for Chrome (watch mode)

```bash
npm run dev:chrome
```

Vite watches for file changes and rebuilds into `dist-chrome/` automatically.

**Load in Chrome:**
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `dist-chrome/`
4. After each rebuild, click the ↻ icon on the extension card to reload it

### Build for Firefox (watch mode)

```bash
npm run dev:firefox
```

Rebuilds into `dist-firefox/` on file changes.

**Load in Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select any file inside `dist-firefox/`
4. Firefox reloads the extension automatically on rebuild (in most cases)

---

## Building for production

```bash
# Chrome / Edge
npm run build:chrome   # outputs to dist-chrome/

# Firefox
npm run build:firefox  # outputs to dist-firefox/
```

Both targets use tree-shaking and minification. The output is ready to load unpacked or package for distribution.

---

## Packaging for distribution

```bash
# Produces linkding-chrome.zip (from dist-chrome/)
bash scripts/package-chrome.sh

# Produces linkding-firefox.zip (from dist-firefox/)
bash scripts/package-firefox.sh
```

Or manually:

```bash
# Chrome
cd dist-chrome && zip -r ../linkding-chrome.zip . -x '*.DS_Store'

# Firefox
cd dist-firefox && zip -r ../linkding-firefox.zip . -x '*.DS_Store'
```

---

## Running tests

```bash
# Run all unit tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch
```

The test suite uses **Vitest** and covers:

| Module | What's tested |
|---|---|
| `src/lib/search.ts` | Search scoring, ranking, edge cases |
| `src/lib/validators.ts` | URL validation, token format checks |
| `src/lib/api.ts` | API response mapping, error handling |

There are **26 unit tests** in the current suite. All must pass before submitting a PR.

---

## Architecture notes

### All network calls live in the service worker

Every fetch to the Linkding API goes through `src/background/service-worker.ts`. The popup and options page never call `fetch()` directly — they send messages to the background and await a response.

This is required for Manifest V3 correctness and is what resolves the CORS issue that affects direct extension-page fetches.

### Message protocol

Messages between the popup/options and the service worker use a typed protocol defined in `src/lib/types.ts`:

| Message type | Direction | Purpose |
|---|---|---|
| `TEST_CONNECTION` | popup/options → SW | Verify server URL and token |
| `SYNC_BOOKMARKS` | popup/options → SW | Trigger a full cache refresh |
| `GET_CACHE` | popup → SW | Retrieve cached bookmarks for display |
| `CLEAR_CACHE` | options → SW | Wipe local bookmark cache |
| `CREATE_BOOKMARK` | popup → SW | Add a new bookmark to Linkding |
| `UPDATE_BOOKMARK` | popup → SW | Edit an existing bookmark |
| `DELETE_BOOKMARK` | popup → SW | Remove a bookmark |

Use `sendToBackground()` from `src/lib/browser.ts` to send messages — it wraps the polyfill and handles response typing.

### Local cache

Bookmarks are stored in `browser.storage.local` under a single key. The cache is populated on sync and updated optimistically on create/edit/delete. It is the sole source of truth for popup rendering — the popup never waits for a network call to display content.

### Browser abstraction

`src/lib/browser.ts` wraps `webextension-polyfill` to provide a consistent API surface. Import from here rather than using `chrome.*` or `browser.*` directly — this is what keeps the codebase single-source for both targets.

---

## Design decisions

| Area | Decision | Reason |
|---|---|---|
| Manifest | V3 | Required for Chrome/Edge; supported in Firefox 109+ |
| UI framework | React 18 + TypeScript | Type safety, component reuse, familiar ecosystem |
| Styling | Plain CSS Modules | Minimal footprint; no utility framework needed at v1 scale |
| Search | Client-side, cache-only | Instant response with no keystroke-level API calls |
| Storage | `browser.storage.local` | Extension-scoped; never accessible to page context |
| Browser adapter | `webextension-polyfill` | Single API surface across Firefox and Chromium targets |
| Build tool | Vite 5 | Fast HMR, first-class MV3 support, easy multi-target config |

---

## v1 scope and what's deferred

**Included in v1:**
Settings, connection test, cache sync, toolbar popup, instant search, recent bookmarks, save current page, edit, delete, offline read, keyboard navigation, auto-refresh, Chrome + Firefox packaging.

**Deliberately excluded (planned for later iterations):**

| Feature | Notes |
|---|---|
| Favorites / starred view | Linkding API supports it; UI deferred |
| Tag tree / hierarchy | Complex UI, deferred |
| Fuzzy / ranked search | Current scorer is deterministic and exact-match weighted |
| Command palette | Nice-to-have; out of v1 scope |
| Theme customisation | Light/dark toggle deferred |
| Multiple Linkding accounts | Single-account only in v1 |
| Browser bookmark sync | Bidirectional sync with native bookmarks |
| AI-assisted search | Deferred |
| Import / export | Deferred |

---

## Submitting changes

1. Fork the repository and create a branch from `main`
2. Make your changes — keep PRs focused on a single concern
3. Run `npm test` and ensure all 26 tests pass
4. Build for both targets (`npm run build:chrome && npm run build:firefox`) and test manually
5. Open a pull request with a clear description of what changed and why

Please do not add dependencies, new permissions, or features outside the v1 scope without opening an issue for discussion first.
