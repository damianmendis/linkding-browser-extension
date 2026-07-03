/**
 * Cache management module.
 * Wraps browser storage with typed accessors for bookmarks and sync state.
 */
import { loadCache, saveCache, clearCache as browserClearCache } from './browser';
import type { Bookmark, CacheState } from './types';
import { EMPTY_CACHE } from './types';

export async function getCache(): Promise<CacheState> {
  const stored = await loadCache();
  if (!stored || stored.schemaVersion !== 1) return { ...EMPTY_CACHE };
  return stored;
}

export async function updateCacheBookmarks(
  updater: (bookmarks: Bookmark[]) => Bookmark[],
  tags?: string[]
): Promise<CacheState> {
  const current = await getCache();
  const next: CacheState = {
    ...current,
    bookmarks: updater(current.bookmarks),
    tags: tags ?? current.tags,
    lastSyncAt: new Date().toISOString(),
    lastSyncStatus: 'success',
    lastError: undefined,
  };
  await saveCache(next);
  return next;
}

export async function setCacheFromSync(
  bookmarks: Bookmark[],
  tags: string[]
): Promise<CacheState> {
  const next: CacheState = {
    bookmarks,
    tags,
    lastSyncAt: new Date().toISOString(),
    lastSyncStatus: 'success',
    lastError: undefined,
    schemaVersion: 1,
  };
  await saveCache(next);
  return next;
}

export async function setCacheError(message: string): Promise<void> {
  const current = await getCache();
  await saveCache({
    ...current,
    lastSyncStatus: 'error',
    lastError: message,
  });
}

export async function upsertBookmarkInCache(bookmark: Bookmark): Promise<void> {
  const current = await getCache();
  const idx = current.bookmarks.findIndex((b) => b.id === bookmark.id);
  let next: Bookmark[];
  if (idx === -1) {
    next = [bookmark, ...current.bookmarks];
  } else {
    next = current.bookmarks.map((b) => (b.id === bookmark.id ? bookmark : b));
  }
  await saveCache({ ...current, bookmarks: next });
}

export async function removeBookmarkFromCache(id: number): Promise<void> {
  const current = await getCache();
  await saveCache({
    ...current,
    bookmarks: current.bookmarks.filter((b) => b.id !== id),
  });
}

export { browserClearCache as clearCache };
