/**
 * Local client-side search over cached bookmarks.
 *
 * Scoring strategy (higher = better match):
 * 1. Exact prefix match on title (+4)
 * 2. Substring match on title (+3)
 * 3. Tag exact match (+2)
 * 4. URL hostname/substring match (+1)
 * 5. Notes and description substring match (+0.5)
 *
 * Returns results sorted by score descending, capped at 50 items.
 */
import type { Bookmark } from './types';

const MAX_RESULTS = 50;

interface ScoredBookmark {
  bookmark: Bookmark;
  score: number;
  /** Start index of title match for highlight, or -1 */
  titleMatchIndex: number;
  /** Length of matched fragment in title */
  titleMatchLength: number;
}

export interface SearchResult {
  bookmark: Bookmark;
  titleMatchIndex: number;
  titleMatchLength: number;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function searchBookmarks(
  bookmarks: Bookmark[],
  query: string
): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const lower = q.toLowerCase();
  const scored: ScoredBookmark[] = [];

  for (const bm of bookmarks) {
    const title = (bm.title || '').toLowerCase();
    const url = (bm.url || '').toLowerCase();
    const notes = (bm.notes || '').toLowerCase();
    const desc = (bm.description || '').toLowerCase();
    const tags = bm.tagNames.map((t) => t.toLowerCase());

    let score = 0;
    let titleMatchIndex = -1;
    let titleMatchLength = 0;

    // 1. Exact prefix match on title
    if (title.startsWith(lower)) {
      score += 4;
      titleMatchIndex = 0;
      titleMatchLength = lower.length;
    } else {
      // 2. Substring match on title
      const ti = title.indexOf(lower);
      if (ti !== -1) {
        score += 3;
        titleMatchIndex = ti;
        titleMatchLength = lower.length;
      }
    }

    // 3. Tag exact match
    if (tags.some((t) => t === lower || t.startsWith(lower))) {
      score += 2;
    }

    // 4. URL match
    const host = hostname(url);
    if (host.includes(lower) || url.includes(lower)) {
      score += 1;
    }

    // 5. Notes / description
    if (notes.includes(lower) || desc.includes(lower)) {
      score += 0.5;
    }

    if (score > 0) {
      scored.push({ bookmark: bm, score, titleMatchIndex, titleMatchLength });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map(({ bookmark, titleMatchIndex, titleMatchLength }) => ({
      bookmark,
      titleMatchIndex,
      titleMatchLength,
    }));
}

/** Filter bookmarks to those tagged with an exact tag name */
export function filterByTag(bookmarks: Bookmark[], tag: string): Bookmark[] {
  const lower = tag.toLowerCase();
  return bookmarks.filter((b) =>
    b.tagNames.some((t) => t.toLowerCase() === lower)
  );
}

/** Get the N most recently added bookmarks */
export function getRecent(bookmarks: Bookmark[], count: number): Bookmark[] {
  return [...bookmarks]
    .sort((a, b) => {
      const at = a.created ?? '';
      const bt = b.created ?? '';
      return bt.localeCompare(at);
    })
    .slice(0, count);
}
