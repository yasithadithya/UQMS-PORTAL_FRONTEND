import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

// index.html applies the saved (or system) theme before first paint; this store starts from what it chose.
const listeners = new Set<() => void>();
const read = (): Theme => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

export function setTheme(next: Theme) {
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch { /* storage unavailable */ }
  listeners.forEach(l => l());
}

export const toggleTheme = () => setTheme(read() === 'dark' ? 'light' : 'dark');

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    read,
  );
}

/** Small persisted UI preference (sidebar collapsed, expanded groups). Never throws. */
export function usePersisted<T>(key: string, fallback: T): [T, (v: T) => void] {
  const get = (): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  };
  const value = useSyncExternalStore(
    (cb) => {
      const onStorage = (e: StorageEvent) => { if (e.key === key) { cache.delete(key); cb(); } };
      window.addEventListener('storage', onStorage);
      persistedListeners.add(cb);
      return () => { window.removeEventListener('storage', onStorage); persistedListeners.delete(cb); };
    },
    () => cacheFor(key, get),
  );
  const set = (v: T) => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ }
    cache.delete(key);
    persistedListeners.forEach(l => l());
  };
  return [value, set];
}

// useSyncExternalStore needs a stable snapshot per key; cache the parsed value until it's written.
const cache = new Map<string, unknown>();
const persistedListeners = new Set<() => void>();
function cacheFor<T>(key: string, get: () => T): T {
  if (!cache.has(key)) cache.set(key, get());
  return cache.get(key) as T;
}
