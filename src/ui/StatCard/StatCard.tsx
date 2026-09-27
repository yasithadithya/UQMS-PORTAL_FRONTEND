import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowUpRight } from 'lucide-react';
import type { Tone } from '../Badge/status';
import { Skeleton } from '../Feedback/Feedback';
import s from './StatCard.module.css';

type StatCardProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** Colors the icon chip; use 'warning' for queues that need action. */
  tone?: Tone;
  /** Small line under the value, e.g. "3 overdue". */
  hint?: ReactNode;
  /** Makes the whole card a link to the filtered list. */
  href?: string;
  loading?: boolean;
};

export function StatCard({ label, value, icon, tone = 'neutral', hint, href, loading }: StatCardProps) {
  const content = (
    <>
      <div className={s.top}>
        <span className={s.label}>{label}</span>
        {icon && <span className={clsx(s.icon, s[tone])} aria-hidden="true">{icon}</span>}
      </div>
      <div className={s.value}>{loading ? <Skeleton width={56} height={28} /> : value}</div>
      {hint && <div className={s.hint}>{hint}</div>}
      {href && <ArrowUpRight className={s.arrow} aria-hidden="true" />}
    </>
  );

  return href ? (
    <Link to={href} className={clsx(s.card, s.link)}>{content}</Link>
  ) : (
    <div className={s.card}>{content}</div>
  );
}

/** Responsive row of StatCards (2 per row on phones, up to 4 on desktop). */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={s.grid}>{children}</div>;
}
