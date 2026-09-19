#!/usr/bin/env bash
# Build and package the extension for Firefox (manifest v3).
set -euo pipefail

echo "Building for Firefox…"
npm run build:firefox

echo "Applying Firefox manifest override…"
node scripts/firefox-manifest-override.js

echo "Zipping to linkding-toolbar-companion-firefox.zip…"
cd dist-firefox
zip -r ../linkding-toolbar-companion-firefox.zip . -x '*.DS_Store'
cd ..

echo "Done: linkding-toolbar-companion-firefox.zip"
