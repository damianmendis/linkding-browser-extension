# Linkding Browser Extension

A cross-browser WebExtension for [Linkding](https://github.com/sissbruecker/linkding) that lets you search, open, and save bookmarks directly from the toolbar — without opening the Linkding web app.

## Features (v1)

- Search bookmarks instantly from the toolbar popup (local cache, no round-trip)
- Browse recent bookmarks when search is empty
- Save the current page to Linkding with title, tags, and notes
- Edit bookmarks (title, URL, tags, notes)
- Delete bookmarks with confirmation
- Offline read/search from local cache
- Full keyboard navigation
- Auto-refresh cache in the background
- Firefox, Chrome, and Edge support from a single codebase

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Build

```bash
# Chrome/Edge
npm run build:chrome

# Firefox
npm run build:firefox
```

### 3. Load in browser

**Chrome/Edge (developer mode)**

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist-chrome/` folder

**Firefox**

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file inside `dist-firefox/`

### 4. Configure

1. Click the Linkding toolbar icon
2. Click "Open settings" (shown on first run)
3. Enter your Linkding server URL and API token
   - Find your token in Linkding → Settings → Integrations → REST API
4. Click "Test connection" to verify
5. Click "Save settings" — the extension will sync your bookmarks immediately

## Usage

| Action | How |
|---|---|
| Open popup | Click toolbar icon or `Ctrl+Shift+L` (`Cmd+Shift+L` on Mac) |
| Search | Type in the search bar — results filter instantly |
| Navigate results | `↑` `↓` arrow keys |
| Open bookmark | `Enter` or click |
| Clear search | `Esc` or click ✕ |
| Focus search | `/` key |
| Save current page | Click "+ Save current page" at the bottom |
| Edit a bookmark | Click the ✏ icon on any row |
| Refresh cache | Click ↻ button in the top bar or go to Settings |

## Architecture

```
src/
  background/
    service-worker.ts     # Periodic sync, alarm management
  popup/
    Popup.tsx             # Main popup UI
    popup.css
  options/
    Options.tsx           # Settings page
    options.css
  components/             # Shared React components
    BookmarkRow.tsx
    Button.tsx
    EditModal.tsx
    ConfirmDialog.tsx
    StatusBar.tsx
    TagChip.tsx
  lib/
    api.ts                # Linkding REST API client
    browser.ts            # Browser abstraction layer
    cache.ts              # Local cache management
    search.ts             # Client-side search
    validators.ts         # URL/token validation, escaping
    types.ts              # Shared TypeScript types
  assets/
    globals.css           # CSS reset and design tokens
public/
  manifest.json           # MV3 manifest
tests/
  unit/                   # Vitest unit tests
  e2e/                    # Playwright smoke tests
```

## Design decisions

| Area | Decision | Reason |
|---|---|---|
| Manifest | V3 | Required for Chrome/Edge, supported in Firefox 109+ |
| UI | React + TypeScript | Type safety and component reuse |
| Styling | Plain CSS Modules | Minimal footprint, no utility framework needed in v1 |
| Search | Local cache only | Instant response; no keystroke-level API calls |
| Storage | `browser.storage.local` | Accessible only to the extension; never exposed to page context |
| Browser adapter | `webextension-polyfill` | Single API surface across Firefox and Chromium |

## Permissions

| Permission | Why |
|---|---|
| `storage` | Store settings and bookmark cache locally |
| `activeTab` | Read URL and title of current tab for "Save current page" |
| `tabs` | Open bookmarks in new or current tab |
| `alarms` | Schedule periodic background cache refresh |
| Host permission | Dynamically granted for the user-configured Linkding origin only |

No `<all_urls>` permission. No telemetry. No third-party tracking.

## Running tests

```bash
# Unit tests (Vitest)
npm test

# Unit tests in watch mode
npm run test:watch

# E2E smoke tests (Playwright)
npm run test:e2e
```

## Packaging for stores

```bash
# Firefox (produces linkding-firefox.zip)
bash scripts/package-firefox.sh

# Chrome/Edge (produces linkding-chrome.zip)
bash scripts/package-chrome.sh
```

## v1 scope

Included: settings, connection test, cache sync, toolbar popup, search, recent bookmarks, save page, edit, delete, offline read mode, keyboard navigation, auto-refresh.

Excluded (planned for later): favorites view, tag tree, fuzzy ranking, command palette, theme customization, multiple accounts, browser bookmark sync, AI search, import/export.

## License

MIT
