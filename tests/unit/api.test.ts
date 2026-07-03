import { describe, it, expect } from 'vitest';
import { mapApiBookmark } from '../../src/lib/api';
import type { ApiBookmark } from '../../src/lib/types';

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
});
