import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import s from './PageHeader.module.css';

export type Crumb = { label: string; href?: string };

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Trail above the title; the last item is the current page (not a link). */
  breadcrumbs?: Crumb[];
  /** "Back" link shown above the title (for detail/edit pages). */
  back?: { href: string; label?: string };
  /** Status badges etc. next to the title. */
  meta?: ReactNode;
  /** Page-level buttons, right-aligned; they wrap under the title on phones. */
  actions?: ReactNode;
};

/** The one header every page uses: breadcrumbs or back link, title, description, actions. */
export function PageHeader({ title, description, breadcrumbs, back, meta, actions }: PageHeaderProps) {
  return (
    <header className={s.header}>
      {back ? (
        <Link to={back.href} className={s.back}>
          <ArrowLeft aria-hidden="true" />
          {back.label ?? 'Back'}
        </Link>
      ) : breadcrumbs && breadcrumbs.length > 1 ? (
        <nav aria-label="Breadcrumb">
          <ol className={s.crumbs}>
            {breadcrumbs.map((c, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <li key={`${c.label}-${i}`} className={s.crumb}>
                  {i > 0 && <ChevronRight className={s.sep} aria-hidden="true" />}
                  {c.href && !last ? (
                    <Link to={c.href} className={s.crumbLink}>{c.label}</Link>
                  ) : (
                    <span aria-current={last ? 'page' : undefined} className={last ? s.crumbCurrent : undefined}>{c.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <div className={s.row}>
        <div className={s.text}>
          <div className={s.titleRow}>
            <h1 className={s.title}>{title}</h1>
            {meta}
          </div>
          {description && <p className={s.description}>{description}</p>}
        </div>
        {actions && <div className={s.actions}>{actions}</div>}
      </div>
    </header>
  );
}
