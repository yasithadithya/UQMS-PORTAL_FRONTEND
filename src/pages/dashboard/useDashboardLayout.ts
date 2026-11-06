import { useCallback, useEffect, useState } from 'react';
import { dashboardService, type DashboardWidgetPlacement } from '@/api';

type Saved = DashboardWidgetPlacement[] | null;

const cacheKey = (userId: string) => `uqms_dashboard_${userId}`;

/** Last layout seen for this user, so the dashboard draws straight away while the server copy loads. */
const readCache = (userId: string | undefined): Saved | undefined => {
  if (!userId) return undefined;
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.widgets) || parsed?.widgets === null ? parsed.widgets : undefined;
  } catch {
    return undefined;
  }
};

const writeCache = (userId: string, widgets: Saved) => {
  try { localStorage.setItem(cacheKey(userId), JSON.stringify({ widgets })); } catch { /* storage unavailable */ }
};

/**
 * The user's saved dashboard layout (stored on their account).
 * `saved`: undefined = not known yet, null = they use the default layout.
 */
export function useDashboardLayout(userId: string | undefined) {
  const [saved, setSaved] = useState<Saved | undefined>(() => readCache(userId));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    dashboardService.getMyLayout()
      .then(res => {
        if (!alive) return;
        setSaved(res.data.widgets);
        writeCache(userId, res.data.widgets);
      })
      // Fall back to the cached copy (or the default layout) if the server can't be reached.
      .catch(() => { if (alive) setSaved(prev => (prev === undefined ? null : prev)); })
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [userId]);

  /** Saves the layout; `null` resets to the default. Throws if the server rejects it. */
  const save = useCallback(async (widgets: Saved) => {
    const res = await dashboardService.saveMyLayout(widgets);
    setSaved(res.data.widgets);
    if (userId) writeCache(userId, res.data.widgets);
  }, [userId]);

  return { saved, loaded, save };
}
