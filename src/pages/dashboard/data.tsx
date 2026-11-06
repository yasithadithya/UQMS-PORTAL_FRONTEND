import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type Load<T> = { data?: T; loading: boolean; error?: string; reload: () => void };

type Store = {
  versions: Record<string, number>;
  get: <T>(key: string, version: number, load: () => Promise<T>) => Promise<T>;
  invalidate: (key: string) => void;
};

const DashboardDataContext = createContext<Store | null>(null);

/**
 * Lets widgets share requests: two widgets asking for the same key (e.g. the HR stats) make one call,
 * and reloading a key refreshes every widget that uses it.
 */
export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const cache = useRef(new Map<string, { version: number; promise: Promise<unknown> }>());
  const [versions, setVersions] = useState<Record<string, number>>({});

  const get = useCallback(<T,>(key: string, version: number, load: () => Promise<T>): Promise<T> => {
    const hit = cache.current.get(key);
    if (hit && hit.version === version) return hit.promise as Promise<T>;
    const promise = load();
    // A failed request isn't kept, so the next widget (or a retry) asks again.
    promise.catch(() => { if (cache.current.get(key)?.promise === promise) cache.current.delete(key); });
    cache.current.set(key, { version, promise });
    return promise;
  }, []);

  const invalidate = useCallback((key: string) => setVersions(v => ({ ...v, [key]: (v[key] ?? 0) + 1 })), []);

  const value = useMemo(() => ({ versions, get, invalidate }), [versions, get, invalidate]);
  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

/** Reloads every widget that loads `key` (e.g. after accepting a request). */
export function useInvalidate() {
  return useContext(DashboardDataContext)?.invalidate ?? (() => undefined);
}

/** Loads `key` once per dashboard (shared between widgets); ignores responses that arrive after unmount. */
export function useSharedLoad<T>(key: string, load: () => Promise<T>, enabled = true): Load<T> {
  const store = useContext(DashboardDataContext);
  const version = store?.versions[key] ?? 0;
  const [state, setState] = useState<{ data?: T; loading: boolean; error?: string }>({ loading: enabled });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState(prev => ({ ...prev, loading: true, error: undefined }));
    (store ? store.get(key, version, load) : load())
      .then(data => { if (alive) setState({ data, loading: false }); })
      .catch((err: any) => { if (alive) setState({ loading: false, error: err?.message || 'Failed to load' }); });
    return () => { alive = false; };
    // `load` is a fresh closure every render; re-run only when the key's version changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, version, retry]);

  return {
    ...state,
    reload: () => (store ? store.invalidate(key) : setRetry(n => n + 1)),
  };
}
