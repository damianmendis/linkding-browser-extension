import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  mapApiBookmark,
  fetchBookmarksModifiedSince,
  fetchAllArchivedBookmarks,
  fetchArchivedBookmarksModifiedSince,
} from '../../src/lib/api';
import type { ApiBookmark, ApiPaginatedResponse } from '../../src/lib/types';

function apiBookmark(overrides: Partial<ApiBookmark> = {}): ApiBookmark {
  return {
    id: 1,
    url: 'https://example.com',
    title: 'Example',
    description: '',
    notes: '',
    tag_names: [],
    is_archived: false,
    unread: false,
    shared: false,
    is_owner: true,
    date_added: '2024-01-01T00:00:00Z',
    date_modified: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('mapApiBookmark', () => {
  it('maps basic fields', () => {
    const result = mapApiBookmark(apiBookmark({ title: 'Test', url: 'https://test.com' }));
    expect(result.title).toBe('Test');
    expect(result.url).toBe('https://test.com');
    expect(result.id).toBe(1);
  });

  it('falls back to website_title when title is empty', () => {
    const result = mapApiBookmark(apiBookmark({ title: '', website_title: 'Fallback' }));
    expect(result.title).toBe('Fallback');
  });

  it('falls back to url when title and website_title are empty', () => {
    const result = mapApiBookmark(apiBookmark({ title: '', website_title: undefined }));
    expect(result.title).toBe('https://example.com');
  });

  it('maps tag_names to tagNames', () => {
    const result = mapApiBookmark(apiBookmark({ tag_names: ['docker', 'linux'] }));
    expect(result.tagNames).toEqual(['docker', 'linux']);
  });

  it('maps date fields', () => {
    const result = mapApiBookmark(
      apiBookmark({ date_added: '2024-06-01T10:00:00Z', date_modified: '2024-06-02T10:00:00Z' })
    );
    expect(result.created).toBe('2024-06-01T10:00:00Z');
    expect(result.updated).toBe('2024-06-02T10:00:00Z');
  });

  it('maps empty notes to undefined', () => {
    const result = mapApiBookmark(apiBookmark({ notes: '' }));
    expect(result.notes).toBeUndefined();
  });

  it('maps unread/shared/is_archived flags', () => {
    const result = mapApiBookmark(apiBookmark({ unread: true, shared: true, is_archived: true }));
    expect(result.isUnread).toBe(true);
    expect(result.isShared).toBe(true);
    expect(result.isArchived).toBe(true);
  });
});

function paginatedResponse(results: ApiBookmark[], next: string | null = null): ApiPaginatedResponse<ApiBookmark> {
  return { count: results.length, next, previous: null, results };
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

describe('fetchBookmarksModifiedSince', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('includes modified_since in the request URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(paginatedResponse([])));
    vi.stubGlobal('fetch', fetchMock);

    await fetchBookmarksModifiedSince('https://links.example.com', 'tok', '2024-06-01T00:00:00Z');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('modified_since=2024-06-01T00%3A00%3A00Z');
  });

  it('follows pagination via next until exhausted', async () => {
    const page1 = paginatedResponse(
      [apiBookmark({ id: 1 })],
      'https://links.example.com/api/bookmarks/?limit=100&offset=100'
    );
    const page2 = paginatedResponse([apiBookmark({ id: 2 })], null);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(page1))
      .mockResolvedValueOnce(jsonResponse(page2));
    vi.stubGlobal('fetch', fetchMock);

    const bookmarks = await fetchBookmarksModifiedSince('https://links.example.com', 'tok', '2024-06-01T00:00:00Z');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bookmarks.map((b) => b.id)).toEqual([1, 2]);
  });

  it('throws a descriptive error on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response));

    await expect(
      fetchBookmarksModifiedSince('https://links.example.com', 'tok', '2024-06-01T00:00:00Z')
    ).rejects.toThrow(/500/);
  });
});

describe('archived bookmark endpoints', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetchAllArchivedBookmarks hits the /bookmarks/archived/ collection', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(paginatedResponse([apiBookmark({ id: 5, is_archived: true })])));
    vi.stubGlobal('fetch', fetchMock);

    const bookmarks = await fetchAllArchivedBookmarks('https://links.example.com', 'tok');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/bookmarks/archived/');
    expect(bookmarks[0].isArchived).toBe(true);
  });

  it('fetchArchivedBookmarksModifiedSince combines the archived path with modified_since', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(paginatedResponse([])));
    vi.stubGlobal('fetch', fetchMock);

    await fetchArchivedBookmarksModifiedSince('https://links.example.com', 'tok', '2024-06-01T00:00:00Z');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/bookmarks/archived/');
    expect(url).toContain('modified_since=2024-06-01T00%3A00%3A00Z');
  });
});
