#!/usr/bin/env bash
# Build and package the extension for Chrome/Edge.
set -euo pipefail

echo "Building for Chrome/Edge…"
npm run build:chrome

echo "Zipping to linkding-toolbar-companion-chrome.zip…"
cd dist-chrome
zip -r ../linkding-toolbar-companion-chrome.zip . -x '*.DS_Store'
cd ..

echo "Done: linkding-toolbar-companion-chrome.zip"
