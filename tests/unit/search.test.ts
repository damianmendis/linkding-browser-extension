import { describe, it, expect } from 'vitest';
import { searchBookmarks, getRecent } from '../../src/lib/search';
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
