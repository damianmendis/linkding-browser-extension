/**
 * Linkding REST API client.
 *
 * All network calls go through this module. The API token is never
 * logged or exposed outside extension storage.
 */
import type {
  ApiBookmark,
  ApiTag,
  ApiPaginatedResponse,
  Bookmark,
  BookmarkCreateInput,
  BookmarkUpdateInput,
} from './types';

const API_TIMEOUT_MS = 5000;

// ─── Response mapping ─────────────────────────────────────────────────────────

export function mapApiBookmark(b: ApiBookmark): Bookmark {
  return {
    id: b.id,
    url: b.url,
    title: b.title || b.website_title || b.url,
    description: b.description || undefined,
    notes: b.notes || undefined,
    tagNames: b.tag_names ?? [],
    isFavorite: false, // Linkding doesn't have a favorites field in its REST API
    created: b.date_added,
    updated: b.date_modified,
  };
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function buildHeaders(apiToken: string): HeadersInit {
  return {
    Authorization: `Token ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeBase(serverUrl: string): string {
  return serverUrl.replace(/\/$/, '');
}

// ─── Public API functions ─────────────────────────────────────────────────────

export async function testConnection(
  serverUrl: string,
  apiToken: string
): Promise<void> {
  const base = normalizeBase(serverUrl);
  let resp: Response;

  try {
    resp = await fetchWithTimeout(`${base}/api/bookmarks/?limit=1`, {
      method: 'GET',
      headers: buildHeaders(apiToken),
    });
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') {
      throw new Error('Connection timed out. Check the server URL.');
    }
    throw new Error(`Cannot reach server. Check the URL and your network.`);
  }

  if (resp.status === 401 || resp.status === 403) {
    throw new Error('Invalid API token. Check your token in Linkding settings.');
  }
  if (!resp.ok) {
    throw new Error(`Server returned ${resp.status}. Is the URL a Linkding instance?`);
  }

  // Verify it's actually a Linkding response
  const ct = resp.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    throw new Error('Response is not JSON. Verify the server URL points to a Linkding instance.');
  }
}

export async function fetchAllBookmarks(
  serverUrl: string,
  apiToken: string
): Promise<Bookmark[]> {
  const base = normalizeBase(serverUrl);
  const headers = buildHeaders(apiToken);
  const bookmarks: Bookmark[] = [];
  let url: string | null = `${base}/api/bookmarks/?limit=100`;

  while (url) {
    const resp = await fetchWithTimeout(url, { method: 'GET', headers });
    if (!resp.ok) throw new Error(`Fetch bookmarks failed: ${resp.status}`);
    const data: ApiPaginatedResponse<ApiBookmark> = await resp.json();
    bookmarks.push(...data.results.map(mapApiBookmark));
    url = data.next;
  }

  return bookmarks;
}

export async function fetchAllTags(
  serverUrl: string,
  apiToken: string
): Promise<string[]> {
  const base = normalizeBase(serverUrl);
  const headers = buildHeaders(apiToken);
  const tags: string[] = [];
  let url: string | null = `${base}/api/tags/?limit=100`;

  while (url) {
    const resp = await fetchWithTimeout(url, { method: 'GET', headers });
    if (!resp.ok) throw new Error(`Fetch tags failed: ${resp.status}`);
    const data: ApiPaginatedResponse<ApiTag> = await resp.json();
    tags.push(...data.results.map((t) => t.name));
    url = data.next;
  }

  return tags;
}

export async function createBookmark(
  serverUrl: string,
  apiToken: string,
  input: BookmarkCreateInput
): Promise<Bookmark> {
  const base = normalizeBase(serverUrl);
  const resp = await fetchWithTimeout(`${base}/api/bookmarks/`, {
    method: 'POST',
    headers: buildHeaders(apiToken),
    body: JSON.stringify(input),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to save bookmark: ${resp.status} ${body}`);
  }
  const data: ApiBookmark = await resp.json();
  return mapApiBookmark(data);
}

export async function updateBookmark(
  serverUrl: string,
  apiToken: string,
  id: number,
  input: BookmarkUpdateInput
): Promise<Bookmark> {
  const base = normalizeBase(serverUrl);
  const resp = await fetchWithTimeout(`${base}/api/bookmarks/${id}/`, {
    method: 'PATCH',
    headers: buildHeaders(apiToken),
    body: JSON.stringify(input),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to update bookmark: ${resp.status} ${body}`);
  }
  const data: ApiBookmark = await resp.json();
  return mapApiBookmark(data);
}

export async function deleteBookmark(
  serverUrl: string,
  apiToken: string,
  id: number
): Promise<void> {
  const base = normalizeBase(serverUrl);
  const resp = await fetchWithTimeout(`${base}/api/bookmarks/${id}/`, {
    method: 'DELETE',
    headers: buildHeaders(apiToken),
  });
  if (resp.status !== 204 && !resp.ok) {
    throw new Error(`Failed to delete bookmark: ${resp.status}`);
  }
}
