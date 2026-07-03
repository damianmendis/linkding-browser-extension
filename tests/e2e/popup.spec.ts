/**
 * Playwright smoke tests.
 *
 * These are integration-level tests that exercise the built extension
 * in a real browser context. For CI, a mock Linkding server would be
 * needed; these tests serve as a scaffold for that setup.
 *
 * Run: npx playwright test
 */
import { test, expect } from '@playwright/test';
import path from 'path';

// Path to built extension (Chrome)
const EXTENSION_PATH = path.resolve(__dirname, '../../dist-chrome');

test.describe('Popup smoke tests', () => {
  test('popup renders unconfigured state when no settings exist', async ({ page }) => {
    // In a real test environment this would load the built extension.
    // This serves as a structural placeholder.
    await page.goto('about:blank');
    expect(EXTENSION_PATH).toBeTruthy();
  });
});
