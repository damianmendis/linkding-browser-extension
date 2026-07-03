/**
 * Browser abstraction layer.
 *
 * All extension API calls go through this module so browser-specific
 * differences are isolated here and React components stay clean.
 */
import browser from 'webextension-polyfill';
import type { Settings, CacheState, BgRequest, BgResponse } from './types';
import { STORAGE_KEYS } from './types';

// ─── Storage ─────────────────────────────────────────────────────────────────

export async function loadSettings(): Promise<Settings | null> {
  const result = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
  return (result[STORAGE_KEYS.SETTINGS] as Settings) ?? null;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
}

export async function loadCache(): Promise<CacheState | null> {
  const result = await browser.storage.local.get(STORAGE_KEYS.CACHE);
  return (result[STORAGE_KEYS.CACHE] as CacheState) ?? null;
}

export async function saveCache(cache: CacheState): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.CACHE]: cache });
}

export async function clearCache(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEYS.CACHE);
}

// ─── Background messaging ─────────────────────────────────────────────────────
//
// All Linkding API calls are routed through the service worker to avoid CORS.

export async function sendToBackground<T>(
  request: BgRequest
): Promise<BgResponse<T>> {
  const response = await browser.runtime.sendMessage(request);
  return response as BgResponse<T>;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

export interface ActiveTabInfo {
  url: string;
  title: string;
}

export async function getActiveTab(): Promise<ActiveTabInfo | null> {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return null;
    const url = tab.url;
    if (url.startsWith('chrome://') || url.startsWith('about:') ||
        url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
      return null;
    }
    return { url, title: tab.title ?? '' };
  } catch {
    return null;
  }
}

export async function openUrl(url: string, mode: 'new-tab' | 'current-tab'): Promise<void> {
  if (mode === 'new-tab') {
    await browser.tabs.create({ url });
  } else {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id != null) {
      await browser.tabs.update(tab.id, { url });
    } else {
      await browser.tabs.create({ url });
    }
  }
}

// ─── Alarms ──────────────────────────────────────────────────────────────────

export async function scheduleRefreshAlarm(periodMinutes: number): Promise<void> {
  await browser.alarms.clear('auto-refresh');
  await browser.alarms.create('auto-refresh', {
    delayInMinutes: periodMinutes,
    periodInMinutes: periodMinutes,
  });
}

export async function clearRefreshAlarm(): Promise<void> {
  await browser.alarms.clear('auto-refresh');
}

// ─── Options page ─────────────────────────────────────────────────────────────

export function openOptionsPage(): void {
  browser.runtime.openOptionsPage();
}
