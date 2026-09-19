import { defineConfig } from '@playwright/test';

// Tests load the real built extension via a custom `context` fixture
// (tests/e2e/fixtures/extension.ts) using chromium.launchPersistentContext
// with --load-extension, so there's no `projects`/`devices` matrix here --
// Playwright's supported extension-loading mechanism is Chromium-only, and
// the default browser/context/page fixtures are unused. Headed mode is
// forced in the fixture itself (needs a display -- `xvfb-run` in CI/Docker).
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  // Each test launches its own persistent Chromium context (extensions
  // can't share a browser instance the way normal pages can) -- running
  // many of those concurrently is unstable/resource-heavy, so tests run
  // one at a time.
  workers: 1,
});
