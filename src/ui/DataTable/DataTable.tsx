import type { KeyboardEvent, ReactNode } from 'react';
import clsx from 'clsx';
import { EmptyState, ErrorState, Skeleton } from '../Feedback/Feedback';
import { useIsMobile } from '../hooks';
import s from './DataTable.module.css';

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** CSS width, e.g. 120 or '20%'. */
  width?: number | string;
  /** Phones: the card's title (exactly one column should set this). */
  primary?: boolean;
  /** Phones: leave this column out of the card. */
  hideOnMobile?: boolean;
  /** Phones: label used in the card instead of `header` (when header isn't plain text). */
  mobileLabel?: string;
  /** Keep the cell on one line (IDs, dates, amounts). */
  nowrap?: boolean;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Makes whole rows clickable (and keyboard-activatable with Enter). */
  onRowClick?: (row: T) => void;
  /** Per-row action buttons, right-aligned (typically one Button + a Menu). */
  rowActions?: (row: T) => ReactNode;
  loading?: boolean;
  /** Skeleton row count while loading. */
  loadingRows?: number;
  error?: string | null;
  onRetry?: () => void;
  /** What to show when there are no rows (EmptyState props or any node). */
  empty?: { title: string; description?: ReactNode; action?: ReactNode; icon?: ReactNode } | ReactNode;
  /** Rendered under the table inside the same card (e.g. <Pagination/>). */
  footer?: ReactNode;
  /** Tighter rows for dense office screens. */
  density?: 'comfortable' | 'compact';
  /** Accessible table name. */
  caption?: string;
  /** Visually attach to a toolbar above (removes top radius). */
  attached?: boolean;
};

const isEmptyConfig = (e: unknown): e is { title: string } =>
  !!e && typeof e === 'object' && 'title' in (e as object) && !('$$typeof' in (e as object));

/**
 * The one table for list screens. Desktop: a horizontally scrollable table. Phones: a stacked card list built from
 * the same column config (primary column = card title, others = label/value rows).
 */
export function DataTable<T>({
  columns, rows, getRowId, onRowClick, rowActions, loading, loadingRows = 5, error, onRetry, empty, footer,
  density = 'comfortable', caption, attached,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();
  const showSkeleton = loading && rows.length === 0;

  let body: ReactNode;
  if (error && rows.length === 0) {
    body = <ErrorState compact message={error} onRetry={onRetry} />;
  } else if (!loading && rows.length === 0) {
    body = isEmptyConfig(empty)
      ? <EmptyState compact {...empty} />
      : empty ?? <EmptyState compact title="Nothing here yet" />;
  } else if (isMobile) {
    body = <MobileList columns={columns} rows={rows} getRowId={getRowId} onRowClick={onRowClick} rowActions={rowActions} skeleton={showSkeleton} loadingRows={loadingRows} />;
  } else {
    body = (
      <div className={s.scroll}>
        <table className={clsx(s.table, density === 'compact' && s.compact)} aria-busy={loading || undefined}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" style={{ width: c.width, textAlign: c.align }}>{c.header}</th>
              ))}
              {rowActions && <th scope="col" className={s.actionsCol}><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {showSkeleton
              ? Array.from({ length: loadingRows }, (_, i) => (
                  <tr key={`sk-${i}`} className={s.skeletonRow}>
                    {columns.map((c) => <td key={c.key}><Skeleton width={c.primary ? '70%' : '50%'} /></td>)}
                    {rowActions && <td />}
                  </tr>
                ))
              : rows.map((row) => {
                  const clickable = !!onRowClick;
                  return (
                    <tr
                      key={getRowId(row)}
                      className={clsx(clickable && s.clickable)}
                      onClick={clickable ? () => onRowClick!(row) : undefined}
                      onKeyDown={clickable ? (e: KeyboardEvent) => { if (e.key === 'Enter' && e.target === e.currentTarget) onRowClick!(row); } : undefined}
                      tabIndex={clickable ? 0 : undefined}
                    >
                      {columns.map((c) => (
                        <td key={c.key} className={clsx(c.nowrap && s.nowrap, c.primary && s.primaryCell)} style={{ textAlign: c.align }}>
                          {c.cell(row)}
                        </td>
                      ))}
                      {rowActions && (
                        <td className={s.actionsCell} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                          <div className={s.actions}>{rowActions(row)}</div>
                        </td>
                      )}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={clsx(s.wrap, attached && s.attached, loading && rows.length > 0 && s.refreshing)}>
      {body}
      {footer && rows.length > 0 && <div className={s.footer}>{footer}</div>}
    </div>
  );
}

function MobileList<T>({ columns, rows, getRowId, onRowClick, rowActions, skeleton, loadingRows }: {
  columns: Column<T>[]; rows: T[]; getRowId: (r: T) => string; onRowClick?: (r: T) => void;
  rowActions?: (r: T) => ReactNode; skeleton?: boolean; loadingRows: number;
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);

  if (skeleton) {
    return (
      <ul className={s.cards} aria-busy="true">
        {Array.from({ length: Math.min(loadingRows, 4) }, (_, i) => (
          <li key={i} className={s.card}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" style={{ marginTop: 10 }} />
            <Skeleton width="50%" style={{ marginTop: 6 }} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={s.cards}>
      {rows.map((row) => (
        <li key={getRowId(row)} className={s.card}>
          {onRowClick ? (
            <button type="button" className={s.cardMain} onClick={() => onRowClick(row)}>
              <CardContent primary={primary} rest={rest} row={row} />
            </button>
          ) : (
            <div className={s.cardMain}>
              <CardContent primary={primary} rest={rest} row={row} />
            </div>
          )}
          {rowActions && <div className={s.cardActions}>{rowActions(row)}</div>}
        </li>
      ))}
    </ul>
  );
}

function CardContent<T>({ primary, rest, row }: { primary: Column<T>; rest: Column<T>[]; row: T }) {
  return (
    <>
      <div className={s.cardTitle}>{primary.cell(row)}</div>
      {rest.length > 0 && (
        <dl className={s.cardFields}>
          {rest.map((c) => (
            <div key={c.key} className={s.cardField}>
              <dt>{c.mobileLabel ?? c.header}</dt>
              <dd>{c.cell(row)}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}
