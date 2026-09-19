#!/usr/bin/env bash
# Build and package the extension for Firefox (manifest v3).
set -euo pipefail

echo "Building for Firefox…"
npm run build:firefox

echo "Copying Firefox manifest override…"
# Firefox requires browser_specific_settings, a background.scripts fallback
# alongside background.service_worker, and (as of Firefox 128) supports
# optional_host_permissions -- so strict_min_version must be at least 128.
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('dist-firefox/manifest.json', 'utf8'));
manifest.background.scripts = [manifest.background.service_worker];
manifest.browser_specific_settings = {
  gecko: {
    id: 'linkding-toolbar-companion@example.com',
    strict_min_version: '128.0',
    data_collection_permissions: { none: true }
  }
};
fs.writeFileSync('dist-firefox/manifest.json', JSON.stringify(manifest, null, 2));
"

echo "Zipping to linkding-toolbar-companion-firefox.zip…"
cd dist-firefox
zip -r ../linkding-toolbar-companion-firefox.zip . -x '*.DS_Store'
cd ..

echo "Done: linkding-toolbar-companion-firefox.zip"
