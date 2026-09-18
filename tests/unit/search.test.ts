import { describe, it, expect } from 'vitest';
import { searchBookmarks, getRecent, isTagQuery } from '../../src/lib/search';
import type { Bookmark } from '../../src/lib/types';

function bm(id: number, overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id,
    url: `https://example.com/page-${id}`,
    title: `Bookmark ${id}`,
    tagNames: [],
    created: new Date(1000 * id).toISOString(),
    ...overrides,
  };
}

describe('searchBookmarks', () => {
  const bookmarks: Bookmark[] = [
    bm(1, { title: 'Docker guide', url: 'https://docs.docker.com', tagNames: ['docker', 'containers'] }),
    bm(2, { title: 'Linux kernel', url: 'https://kernel.org', tagNames: ['linux'] }),
    bm(3, { title: 'Python docs', url: 'https://docs.python.org', tagNames: ['python'] }),
    bm(4, { title: 'Networking basics', notes: 'docker network explained', tagNames: [] }),
  ];

  it('returns empty array for empty query', () => {
    expect(searchBookmarks(bookmarks, '')).toHaveLength(0);
    expect(searchBookmarks(bookmarks, '   ')).toHaveLength(0);
  });

  it('matches title prefix with highest score', () => {
    const results = searchBookmarks(bookmarks, 'Docker');
    expect(results[0].bookmark.id).toBe(1);
  });

  it('matches tag', () => {
    const results = searchBookmarks(bookmarks, 'linux');
    expect(results.some((r) => r.bookmark.id === 2)).toBe(true);
  });

  it('matches URL substring', () => {
    const results = searchBookmarks(bookmarks, 'kernel.org');
    expect(results.some((r) => r.bookmark.id === 2)).toBe(true);
  });

  it('matches notes', () => {
    const results = searchBookmarks(bookmarks, 'docker network');
    expect(results.some((r) => r.bookmark.id === 4)).toBe(true);
  });

  it('returns titleMatchIndex for title match', () => {
    const results = searchBookmarks(bookmarks, 'Docker');
    const first = results[0];
    expect(first.titleMatchIndex).toBe(0);
    expect(first.titleMatchLength).toBeGreaterThan(0);
  });

  it('caps results at 50', () => {
    const many = Array.from({ length: 100 }, (_, i) =>
      bm(i, { title: `test item ${i}` })
    );
    const results = searchBookmarks(many, 'test');
    expect(results.length).toBeLessThanOrEqual(50);
  });

  it('#tag filters to exact tag matches only, excluding text/notes hits', () => {
    const results = searchBookmarks(bookmarks, '#docker');
    // bookmark 4 mentions "docker" in its notes but isn't tagged -- must be excluded.
    expect(results.map((r) => r.bookmark.id)).toEqual([1]);
  });

  it('#tag matching is case-insensitive', () => {
    const results = searchBookmarks(bookmarks, '#DOCKER');
    expect(results.map((r) => r.bookmark.id)).toEqual([1]);
  });

  it('#tag with no matches returns empty array', () => {
    expect(searchBookmarks(bookmarks, '#nonexistent')).toHaveLength(0);
  });

  it('bare "#" with no tag name returns empty array', () => {
    expect(searchBookmarks(bookmarks, '#')).toHaveLength(0);
    expect(searchBookmarks(bookmarks, '#  ')).toHaveLength(0);
  });

  it('#tag results have no title highlight', () => {
    const results = searchBookmarks(bookmarks, '#docker');
    expect(results[0].titleMatchIndex).toBe(-1);
    expect(results[0].titleMatchLength).toBe(0);
  });
});

describe('isTagQuery', () => {
  it('detects # prefix', () => {
    expect(isTagQuery('#docker')).toBe(true);
    expect(isTagQuery('  #docker')).toBe(true);
  });

  it('rejects plain text queries', () => {
    expect(isTagQuery('docker')).toBe(false);
    expect(isTagQuery('')).toBe(false);
  });
});

describe('getRecent', () => {
  it('returns most recent N bookmarks', () => {
    const bookmarks = Array.from({ length: 10 }, (_, i) =>
      bm(i, { created: new Date(i * 10000).toISOString() })
    );
    const recent = getRecent(bookmarks, 3);
    expect(recent).toHaveLength(3);
    // Newest first (highest id has latest date)
    expect(recent[0].id).toBe(9);
  });

  it('handles count larger than available', () => {
    const bookmarks = [bm(1), bm(2)];
    expect(getRecent(bookmarks, 100)).toHaveLength(2);
  });
});
