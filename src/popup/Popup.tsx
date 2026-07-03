/**
 * Popup root component.
 *
 * No Linkding API calls here — everything goes through sendToBackground()
 * so the service worker handles them (avoids CORS).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './Popup.module.css';
import { Button } from '../components/Button';
import { BookmarkRow } from '../components/BookmarkRow';
import { StatusBar } from '../components/StatusBar';
import { EditModal } from '../components/EditModal';
import {
  loadSettings,
  openOptionsPage,
  openUrl,
  sendToBackground,
  getActiveTab,
} from '../lib/browser';
import { searchBookmarks, getRecent } from '../lib/search';
import type {
  Bookmark,
  CacheState,
  Settings,
  BookmarkCreateInput,
  BookmarkUpdateInput,
  GetCacheResponse,
  SyncResponse,
  BookmarkResponse,
  DeleteResponse,
} from '../lib/types';
import { EMPTY_CACHE } from '../lib/types';

type View = 'unconfigured' | 'main' | 'add' | 'edit';

export function Popup() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [cache, setCache] = useState<CacheState | null>(null);
  const [view, setView] = useState<View>('main');
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [editTarget, setEditTarget] = useState<Bookmark | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add form state
  const [addUrl, setAddUrl] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [addTags, setAddTags] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addError, setAddError] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // ─── Load on mount ───────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const s = await loadSettings();
      setSettings(s);

      if (!s?.serverUrl || !s?.apiToken) {
        setView('unconfigured');
        return;
      }

      // Load cache from background (instant, no network)
      const resp = await sendToBackground<CacheState>({ type: 'GET_CACHE' });
      setCache(resp.ok ? resp.data : { ...EMPTY_CACHE });
    }
    init();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-focus search when on main view
  useEffect(() => {
    if (view === 'main') {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [view]);

  // ─── Computed results ────────────────────────────────────────────────────

  const displayResults = React.useMemo(() => {
    if (!cache) return [];
    if (!query.trim()) {
      const recentCount = settings?.recentCount ?? 20;
      return getRecent(cache.bookmarks, recentCount).map((bm) => ({
        bookmark: bm,
        titleMatchIndex: -1,
        titleMatchLength: 0,
      }));
    }
    return searchBookmarks(cache.bookmarks, query);
  }, [cache, query, settings?.recentCount]);

  useEffect(() => { setActiveIndex(0); }, [displayResults]);

  // ─── Sync ────────────────────────────────────────────────────────────────

  const handleSync = useCallback(async () => {
    if (isSyncing || isOffline) return;
    setIsSyncing(true);
    try {
      const resp = await sendToBackground<CacheState>({ type: 'SYNC_BOOKMARKS' }) as SyncResponse;
      if (resp.ok) setCache(resp.data);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOffline]);

  // ─── Open ─────────────────────────────────────────────────────────────────

  function handleOpen(bm: Bookmark) {
    if (!settings) return;
    openUrl(bm.url, settings.openMode);
    window.close();
  }

  // ─── Edit ─────────────────────────────────────────────────────────────────

  function handleEdit(bm: Bookmark) {
    setEditTarget(bm);
    setView('edit');
  }

  async function handleSaveEdit(updates: Partial<Bookmark>) {
    if (!editTarget) return;
    setSaveLoading(true);
    try {
      const input: BookmarkUpdateInput = {
        title: updates.title,
        url: updates.url,
        notes: updates.notes,
        tag_names: updates.tagNames,
      };
      const resp = await sendToBackground<Bookmark>({
        type: 'UPDATE_BOOKMARK',
        id: editTarget.id,
        input,
      }) as BookmarkResponse;

      if (!resp.ok) throw new Error(resp.error);

      // Refresh cache display
      const cacheResp = await sendToBackground<CacheState>({ type: 'GET_CACHE' }) as GetCacheResponse;
      if (cacheResp.ok) setCache(cacheResp.data);

      setView('main');
      setEditTarget(null);
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleDelete() {
    if (!editTarget) return;
    setDeleteLoading(true);
    try {
      const resp = await sendToBackground<null>({
        type: 'DELETE_BOOKMARK',
        id: editTarget.id,
      }) as DeleteResponse;

      if (!resp.ok) throw new Error(resp.error);

      const cacheResp = await sendToBackground<CacheState>({ type: 'GET_CACHE' }) as GetCacheResponse;
      if (cacheResp.ok) setCache(cacheResp.data);

      setView('main');
      setEditTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  // ─── Add current page ─────────────────────────────────────────────────────

  async function openAddView() {
    const tab = await getActiveTab();
    setAddUrl(tab?.url ?? '');
    setAddTitle(tab?.title ?? '');
    setAddTags('');
    setAddNotes('');
    setAddError('');
    setView('add');
  }

  async function handleAddSave(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    setAddSaving(true);
    try {
      const input: BookmarkCreateInput = {
        url: addUrl.trim(),
        title: addTitle.trim() || undefined,
        notes: addNotes.trim() || undefined,
        tag_names: addTags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      const resp = await sendToBackground<Bookmark>({
        type: 'CREATE_BOOKMARK',
        input,
      }) as BookmarkResponse;

      if (!resp.ok) throw new Error(resp.error);

      const cacheResp = await sendToBackground<CacheState>({ type: 'GET_CACHE' }) as GetCacheResponse;
      if (cacheResp.ok) setCache(cacheResp.data);

      setView('main');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setAddSaving(false);
    }
  }

  // ─── Keyboard navigation ──────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent) {
    if (view !== 'main') return;

    if (e.key === '/') {
      if (document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (query) { setQuery(''); }
      else { window.close(); }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(activeIndex + 1, displayResults.length - 1);
      setActiveIndex(next);
      rowRefs.current.get(displayResults[next]?.bookmark.id)?.scrollIntoView({ block: 'nearest' });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(activeIndex - 1, 0);
      setActiveIndex(prev);
      rowRefs.current.get(displayResults[prev]?.bookmark.id)?.scrollIntoView({ block: 'nearest' });
      return;
    }

    if (e.key === 'Enter' && displayResults[activeIndex]) {
      e.preventDefault();
      handleOpen(displayResults[activeIndex].bookmark);
    }
  }

  // ─── Tag filter ───────────────────────────────────────────────────────────

  function handleFilterTag(tag: string) {
    setQuery(tag);
    searchRef.current?.focus();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (view === 'unconfigured') {
    return (
      <div className={styles.centered} role="main">
        <div className={styles.setupBox}>
          <div className={styles.logo}>🔖</div>
          <h1 className={styles.setupTitle}>Welcome to Linkding</h1>
          <p className={styles.setupText}>Connect your Linkding server to get started.</p>
          <Button variant="primary" onClick={() => openOptionsPage()}>Open settings</Button>
        </div>
      </div>
    );
  }

  if (view === 'edit' && editTarget) {
    return (
      <div onKeyDown={handleKeyDown} className={styles.root}>
        <EditModal
          bookmark={editTarget}
          onSave={handleSaveEdit}
          onDelete={handleDelete}
          onCancel={() => { setView('main'); setEditTarget(null); }}
          saving={saveLoading}
          deleting={deleteLoading}
        />
      </div>
    );
  }

  if (view === 'add') {
    return (
      <div className={styles.root}>
        <header className={styles.topBar}>
          <button type="button" className={styles.backBtn} onClick={() => setView('main')} aria-label="Back">
            ← Back
          </button>
          <span className={styles.topBarTitle}>Save bookmark</span>
        </header>

        <form onSubmit={handleAddSave} className={styles.addForm}>
          <div className={styles.addField}>
            <label htmlFor="add-url">URL</label>
            <input id="add-url" type="url" value={addUrl} onChange={(e) => setAddUrl(e.target.value)} required autoFocus />
          </div>
          <div className={styles.addField}>
            <label htmlFor="add-title">Title</label>
            <input id="add-title" type="text" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder="Page title" />
          </div>
          <div className={styles.addField}>
            <label htmlFor="add-tags">Tags</label>
            <input id="add-tags" type="text" value={addTags} onChange={(e) => setAddTags(e.target.value)} placeholder="docker, linux (comma-separated)" />
          </div>
          <div className={styles.addField}>
            <label htmlFor="add-notes">Notes</label>
            <textarea id="add-notes" value={addNotes} onChange={(e) => setAddNotes(e.target.value)} rows={3} placeholder="Optional notes…" />
          </div>

          {addError && <p className={styles.addError} role="alert">{addError}</p>}

          <div className={styles.addActions}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setView('main')}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" loading={addSaving} disabled={isOffline}>Save</Button>
          </div>
          {isOffline && <p className={styles.offlineNote}>Cannot save while offline.</p>}
        </form>
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────

  return (
    <div className={styles.root} onKeyDown={handleKeyDown} tabIndex={-1} role="application" aria-label="Linkding bookmarks">
      <div className={styles.topBar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon} aria-hidden="true">🔍</span>
          <input
            ref={searchRef}
            type="search"
            className={styles.searchInput}
            placeholder="Search bookmarks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search bookmarks"
            aria-controls="bookmark-list"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button type="button" className={styles.clearBtn} onClick={() => { setQuery(''); searchRef.current?.focus(); }} aria-label="Clear search">✕</button>
          )}
        </div>
        <button type="button" className={styles.iconBtn} onClick={handleSync} disabled={isSyncing || isOffline} aria-label="Refresh bookmarks" title="Refresh">↻</button>
        <button type="button" className={styles.iconBtn} onClick={() => openOptionsPage()} aria-label="Open settings" title="Settings">⚙</button>
      </div>

      <div className={styles.sectionLabel} aria-live="polite">
        {query
          ? `${displayResults.length} result${displayResults.length !== 1 ? 's' : ''}`
          : 'Recent bookmarks'}
      </div>

      <div id="bookmark-list" className={styles.list} role="listbox" aria-label="Bookmarks">
        {cache === null && (
          <div className={styles.placeholder}>
            <span className={styles.spinner} aria-label="Loading…" />
          </div>
        )}

        {cache !== null && displayResults.length === 0 && (
          <div className={styles.placeholder}>
            {query
              ? <p>No results for &ldquo;{query}&rdquo;</p>
              : <><p>No bookmarks yet.</p><p className={styles.hintText}>Save a page to get started.</p></>
            }
          </div>
        )}

        {displayResults.map((result, idx) => (
          <BookmarkRow
            key={result.bookmark.id}
            ref={(el) => {
              if (el) rowRefs.current.set(result.bookmark.id, el);
              else rowRefs.current.delete(result.bookmark.id);
            }}
            bookmark={result.bookmark}
            isActive={idx === activeIndex}
            titleMatchIndex={result.titleMatchIndex}
            titleMatchLength={result.titleMatchLength}
            onOpen={handleOpen}
            onEdit={handleEdit}
            onFilterTag={handleFilterTag}
          />
        ))}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={`${styles.addBtn} ${isOffline ? styles.disabled : ''}`}
          onClick={isOffline ? undefined : openAddView}
          disabled={isOffline}
          aria-label="Save current page to Linkding"
        >
          + Save current page
        </button>
        <StatusBar cache={cache} isSyncing={isSyncing} isOffline={isOffline} />
      </div>
    </div>
  );
}
