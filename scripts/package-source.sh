#!/usr/bin/env bash
# Produce a source-code archive for Mozilla AMO's "source code" submission
# requirement (required because the build pipeline bundles/minifies via
# Vite). Archives exactly what's tracked in git at the current commit --
# no node_modules, build output, or local artifacts -- since reviewers need
# to reproduce the submitted extension build from this archive.
set -euo pipefail

VERSION=$(node -p "require('./package.json').version")
OUT="linkding-toolbar-companion-source-v${VERSION}.zip"

echo "Archiving source at $(git rev-parse --short HEAD) as ${OUT}…"
git archive --format=zip --output "${OUT}" HEAD

echo "Done: ${OUT}"
echo
echo "Reviewer build instructions (also in CONTRIBUTING.md):"
echo "  npm ci"
echo "  npm run build:firefox"
echo "  node scripts/firefox-manifest-override.js"
echo "Output lands in dist-firefox/, matching the submitted extension .zip."
