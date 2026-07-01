interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Wraps an async fetcher with in-memory caching and in-flight deduplication.
 *
 * - If valid cached data exists (within TTL), returns it immediately.
 * - If the same key is already being fetched (in-flight), shares that promise
 *   instead of making a duplicate request.
 * - Otherwise, calls the fetcher and caches the result.
 *
 * @param key     Unique cache key for this request
 * @param fetcher Async function that performs the actual API call
 * @param ttlMs   Time-to-live in milliseconds (default: 5 minutes)
 */
export async function cachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000
): Promise<T> {
  // 1. Return cached data if still valid
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.data;
  }

  // 2. If an identical request is already in-flight, share its promise
  const inFlight = inFlightRequests.get(key);
  if (inFlight) {
    return inFlight;
  }

  // 3. Fetch, cache, and return
  const promise = fetcher()
    .then((data) => {
      cache.set(key, { data, timestamp: Date.now() });
      inFlightRequests.delete(key);
      return data;
    })
    .catch((err) => {
      inFlightRequests.delete(key);
      throw err;
    });

  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Invalidate a specific cache entry by key.
 * Call this after a mutation (create/update/delete) to ensure
 * the next read fetches fresh data.
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache entries matching a prefix.
 * Useful for invalidating all entries under a service namespace.
 * e.g., invalidateCacheByPrefix('users') clears 'users:list', 'users:byId:123', etc.
 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear the entire cache. Useful on logout.
 */
export function invalidateAll(): void {
  cache.clear();
  inFlightRequests.clear();
}

// Well-known cache keys used across services
export const CACHE_KEYS = {
  VESSEL_TYPES: 'operations:vesselTypes',
  SURVEY_TYPES: 'operations:surveyTypes',
  AREA_OPERATIONS: 'operations:areaOperations',
  VESSEL_CODES: 'vesselCodes:list',
  VESSELS: 'vessels:list',
  USERS: 'users:list',
  ROLES: 'roles:list',
  MODULES: 'modules:list',
  HR_EMPLOYEES: 'hr:employees',
  HR_DEPARTMENTS: 'hr:departments',
  HR_JOB_TITLES: 'hr:jobTitles',
  HR_LEAVE_TYPES: 'hr:leaveTypes',
  HR_HOLIDAYS: 'hr:holidays',
} as const;

// TTL presets (in milliseconds)
export const TTL = {
  /** For data that almost never changes (vessel types, survey types, area ops, vessel codes) */
  STATIC: 5 * 60 * 1000, // 5 minutes
  /** For data that changes infrequently (vessels, users, roles, modules, employees) */
  SEMI_DYNAMIC: 3 * 60 * 1000, // 3 minutes
} as const;
