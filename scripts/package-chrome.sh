#!/usr/bin/env bash
# Build and package the extension for Chrome/Edge.
set -euo pipefail

echo "Building for Chrome/Edge…"
npm run build:chrome

echo "Zipping to linkding-chrome.zip…"
cd dist-chrome
zip -r ../linkding-chrome.zip . -x '*.DS_Store'
cd ..

echo "Done: linkding-chrome.zip"
