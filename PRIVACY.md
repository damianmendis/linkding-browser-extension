# Privacy Policy — Linkding Toolbar Companion

_Last updated: 2026-09-19_

Linkding Toolbar Companion is an unofficial browser extension that acts as a
client for a [Linkding](https://github.com/sissbruecker/linkding) server you
run and control. This policy explains what data the extension handles and
where it goes.

## What the extension stores

The extension stores the following locally, in your browser's extension
storage (`chrome.storage.local`), on your device only:

- Your Linkding server URL
- Your Linkding API token
- A local cache of your bookmarks (titles, URLs, descriptions, tags, notes)
- Extension settings (sync interval, theme, etc.)

This data never leaves your device except as described below.

## Where data is sent

The extension communicates with exactly one destination: **the Linkding
server URL you enter in Settings.** Every request — searching, saving,
editing, deleting, and syncing bookmarks — goes directly from your browser to
that server, using the API token you provide, over whatever protocol your
server URL specifies (HTTP or HTTPS).

The extension does not contact the developer, an analytics provider, a CDN,
or any other third-party service. There is no telemetry, no crash reporting,
and no remote logging.

## What the developer receives

Nothing. The developer of this extension has no server, backend, or
analytics endpoint that the extension talks to, and receives no data of any
kind from installs of this extension.

## Data retention and deletion

All data is removed when you uninstall the extension. You can also clear it
at any time without uninstalling:

- Clear your server URL and API token from the extension's **Settings** page, or
- Clear the extension's storage via your browser's own extension management
  settings (e.g. `chrome://extensions` → Linkding Toolbar Companion → details
  → clear data, where offered by your browser).

## Permissions

See the [README's Permissions section](README.md#permissions) for a plain-
language explanation of what each requested browser permission is used for
and why.

## Children's privacy

This extension is a developer/productivity tool for accessing a self-hosted
service and is not directed at children.

## Changes to this policy

If this policy changes, the updated version will be posted at this same
location in the extension's source repository, with a new "last updated"
date above.

## Contact

This is an independent, unofficial project — not affiliated with, endorsed
by, or sponsored by the Linkding project. For questions about this policy or
the extension, open an issue at:
https://github.com/damianmendis/linkding-browser-extension/issues
