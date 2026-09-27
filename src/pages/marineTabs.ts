import { MODULE_KEYS, type ModuleKey } from '@/utils/permissions';

export type MarineTab = 'first-entry' | 'survey' | 'reports' | 'certificates';

/** The First Entry page's tabs; `navLabel` is the wording used in the sidebar and command palette. */
export const MARINE_TABS: { id: MarineTab; label: string; navLabel: string }[] = [
  { id: 'first-entry', label: 'First Entry', navLabel: 'First entries' },
  { id: 'survey', label: 'Surveys', navLabel: 'Survey bookings' },
  { id: 'reports', label: 'Survey Reports', navLabel: 'Survey reports' },
  { id: 'certificates', label: 'Certificates', navLabel: 'Certificates' },
];

/** The permission sub-module behind each tab. */
export const TAB_MODULE: Record<MarineTab, ModuleKey> = {
  'first-entry': MODULE_KEYS.marineEntries,
  survey: MODULE_KEYS.marineBookings,
  reports: MODULE_KEYS.marineReports,
  certificates: MODULE_KEYS.marineCertificates,
};

/**
 * Which tab a First Entry URL belongs to, e.g. .../survey-booking/edit/1 -> "survey".
 * Returns null for the list page itself (the tab then comes from ?tab=).
 */
export function marineTabForPath(pathname: string, basePath: string): MarineTab | null {
  const rest = pathname.slice(basePath.length);
  if (!rest || rest === '/') return null;
  if (rest.startsWith('/survey-report/final/')) return 'certificates';
  if (rest.startsWith('/survey-report')) return 'reports';
  if (rest.startsWith('/survey-booking')) return 'survey';
  return 'first-entry';
}
