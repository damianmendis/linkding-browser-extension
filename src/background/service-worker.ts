/**
 * Background service worker.
 *
 * This is the ONLY place that calls the Linkding REST API.
 * Popup and options pages send messages here; we execute the fetch and
 * return the result. This sidesteps CORS entirely because service-worker
 * fetches carry no page origin.
 */
import browser from 'webextension-polyfill';
import { loadSettings, saveCache, loadCache } from '../lib/browser';
import {
  testConnection as apiTestConnection,
  fetchAllBookmarks,
  fetchAllTags,
  createBookmark as apiCreateBookmark,
  updateBookmark as apiUpdateBookmark,
  deleteBookmark as apiDeleteBookmark,
} from '../lib/api';
import { setCacheFromSync, setCacheError, upsertBookmarkInCache, removeBookmarkFromCache } from '../lib/cache';
import type { BgRequest, BgResponse, CacheState, Bookmark } from '../lib/types';
import { EMPTY_CACHE } from '../lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok<T>(data: T): BgResponse<T> {
  return { ok: true, data };
}

function fail(error: string): BgResponse<never> {
  return { ok: false, error };
}

// ─── Full sync ────────────────────────────────────────────────────────────────

async function runSync(): Promise<CacheState> {
  const settings = await loadSettings();
  if (!settings?.serverUrl || !settings?.apiToken) {
    throw new Error('Not configured. Open settings to connect your Linkding server.');
  }

  const [bookmarks, tags] = await Promise.all([
    fetchAllBookmarks(settings.serverUrl, settings.apiToken),
    fetchAllTags(settings.serverUrl, settings.apiToken),
  ]);

  return setCacheFromSync(bookmarks, tags);
}

// ─── Message handler ──────────────────────────────────────────────────────────

browser.runtime.onMessage.addListener(
  (rawMessage: unknown, _sender: browser.Runtime.MessageSender) => {
    const msg = rawMessage as BgRequest;

    switch (msg.type) {

      case 'TEST_CONNECTION':
        return apiTestConnection(msg.serverUrl, msg.apiToken)
          .then(() => ok(null))
          .catch((e: Error) => fail(e.message));

      case 'SYNC_BOOKMARKS':
        return runSync()
          .then((cache) => ok(cache))
          .catch(async (e: Error) => {
            await setCacheError(e.message);
            return fail(e.message);
          });

      case 'GET_CACHE': {
        return loadCache()
          .then((c) => ok(c ?? { ...EMPTY_CACHE }))
          .catch((e: Error) => fail(e.message));
      }

      case 'CLEAR_CACHE':
        return saveCache({ ...EMPTY_CACHE })
          .then(() => ok(null))
          .catch((e: Error) => fail(e.message));

      case 'CREATE_BOOKMARK':
        return loadSettings().then(async (settings) => {
          if (!settings?.serverUrl || !settings?.apiToken) {
            return fail('Not configured.');
          }
          const bookmark: Bookmark = await apiCreateBookmark(
            settings.serverUrl, settings.apiToken, msg.input
          );
          await upsertBookmarkInCache(bookmark);
          return ok(bookmark);
        }).catch((e: Error) => fail(e.message));

      case 'UPDATE_BOOKMARK':
        return loadSettings().then(async (settings) => {
          if (!settings?.serverUrl || !settings?.apiToken) {
            return fail('Not configured.');
          }
          const bookmark: Bookmark = await apiUpdateBookmark(
            settings.serverUrl, settings.apiToken, msg.id, msg.input
          );
          await upsertBookmarkInCache(bookmark);
          return ok(bookmark);
        }).catch((e: Error) => fail(e.message));

      case 'DELETE_BOOKMARK':
        return loadSettings().then(async (settings) => {
          if (!settings?.serverUrl || !settings?.apiToken) {
            return fail('Not configured.');
          }
          await apiDeleteBookmark(settings.serverUrl, settings.apiToken, msg.id);
          await removeBookmarkFromCache(msg.id);
          return ok(null);
        }).catch((e: Error) => fail(e.message));

      default:
        return undefined;
    }
  }
);

// ─── Alarm handler ────────────────────────────────────────────────────────────

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'auto-refresh') {
    try {
      await runSync();
    } catch {
      // Silently record error in cache state; popup will show it on next open
    }
  }
});

// ─── Startup ──────────────────────────────────────────────────────────────────

async function initializeAlarm(): Promise<void> {
  const settings = await loadSettings();
  if (!settings?.autoRefreshEnabled) return;
  const existing = await browser.alarms.get('auto-refresh');
  if (!existing) {
    await browser.alarms.create('auto-refresh', {
      delayInMinutes: settings.autoRefreshMinutes,
      periodInMinutes: settings.autoRefreshMinutes,
    });
  }
}

browser.runtime.onStartup.addListener(initializeAlarm);

browser.runtime.onInstalled.addListener(async () => {
  await initializeAlarm();
  // Attempt initial sync (will no-op if not yet configured)
  try { await runSync(); } catch { /* not configured yet */ }
});
