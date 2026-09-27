import type { ReactNode } from 'react';
import clsx from 'clsx';
import s from './Toolbar.module.css';

type ToolbarProps = {
  /** Usually a SearchInput. */
  search?: ReactNode;
  /** Filter selects/segmented controls next to the search. */
  filters?: ReactNode;
  /** Right-aligned (e.g. result count, export). */
  end?: ReactNode;
  /** Sit flush on top of a DataTable with `attached`. */
  attached?: boolean;
};

/** Search + filters row above a list. */
export function Toolbar({ search, filters, end, attached }: ToolbarProps) {
  return (
    <div className={clsx(s.toolbar, attached && s.attached)}>
      {search && <div className={s.search}>{search}</div>}
      {filters && <div className={s.filters}>{filters}</div>}
      {end && <div className={s.end}>{end}</div>}
    </div>
  );
}
