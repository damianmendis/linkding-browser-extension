#!/usr/bin/env bash
# Build and package the extension for Firefox (manifest v3).
set -euo pipefail

echo "Building for Firefox…"
npm run build:firefox

echo "Copying Firefox manifest override…"
# Firefox requires browser_specific_settings
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('dist-firefox/manifest.json', 'utf8'));
manifest.browser_specific_settings = {
  gecko: {
    id: 'linkding-toolbar-companion@example.com',
    strict_min_version: '109.0'
  }
};
fs.writeFileSync('dist-firefox/manifest.json', JSON.stringify(manifest, null, 2));
"

echo "Zipping to linkding-toolbar-companion-firefox.zip…"
cd dist-firefox
zip -r ../linkding-toolbar-companion-firefox.zip . -x '*.DS_Store'
cd ..

echo "Done: linkding-toolbar-companion-firefox.zip"
