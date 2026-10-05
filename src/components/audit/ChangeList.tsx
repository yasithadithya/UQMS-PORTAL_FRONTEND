import type { ApiAuditChange } from '@/api';
import s from './Audit.module.css';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Formats one audited value for display. */
export const showAuditValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && ISO_DATE.test(value)) return new Date(value).toLocaleString();
  if (Array.isArray(value)) return value.length ? value.map(showAuditValue).join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

/** `visitDetails[0].surveyorAssignments[1].surveyorId` → `Visit details 1 › Surveyor assignments 2 › Surveyor id`. */
export const humanizeAuditPath = (path: string): string =>
  path
    .split('.')
    .map((part) => {
      const m = part.match(/^([^[]+)((?:\[[^\]]*\])*)$/);
      const name = (m?.[1] ?? part).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
      const indexes = [...(m?.[2] ?? '').matchAll(/\[([^\]]*)\]/g)].map(([, i]) => (/^\d+$/.test(i) ? String(Number(i) + 1) : i));
      return indexes.length ? `${name} ${indexes.join(' › ')}` : name;
    })
    .join(' › ');

type Props = {
  changes: ApiAuditChange[];
  /** Show at most this many (the rest are summarised); omit for all. */
  limit?: number;
};

/** Field-by-field list of what changed: field, old value → new value. */
export function ChangeList({ changes, limit }: Props) {
  if (changes.length === 0) return <>—</>;
  const shown = limit ? changes.slice(0, limit) : changes;
  return (
    <ul className={s.changes}>
      {shown.map((c, i) => (
        <li key={`${c.field}-${i}`}>
          <span className={s.field} title={c.field}>{c.label || humanizeAuditPath(c.field)}</span>
          <span className={s.from}>{showAuditValue(c.from)}</span>
          <span className={s.arrow} aria-label="changed to">→</span>
          <span className={s.to}>{showAuditValue(c.to)}</span>
        </li>
      ))}
      {limit && changes.length > limit && <li className={s.more}>+{changes.length - limit} more</li>}
    </ul>
  );
}
