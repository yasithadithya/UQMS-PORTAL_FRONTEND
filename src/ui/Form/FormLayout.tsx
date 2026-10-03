import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import s from './Form.module.css';

/** Responsive grid for fields: 1 column on phones, `columns` from tablet up. */
export function FormGrid({ columns = 2, children, className }: { columns?: 1 | 2 | 3; children: ReactNode; className?: string }) {
  return <div className={clsx(s.grid, s[`cols${columns}`], className)}>{children}</div>;
}

type FormSectionProps = {
  /** Also the anchor for SectionNav. */
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

/** A titled group of fields inside a long form. */
export function FormSection({ id, title, description, actions, children }: FormSectionProps) {
  return (
    <section id={id} className={s.section} aria-labelledby={id ? `${id}-title` : undefined}>
      <header className={s.sectionHeader}>
        <div className={s.sectionHeading}>
          <h2 id={id ? `${id}-title` : undefined} className={s.sectionTitle}>{title}</h2>
          {description && <p className={s.sectionDescription}>{description}</p>}
        </div>
        {actions && <div className={s.sectionActions}>{actions}</div>}
      </header>
      <div className={s.sectionBody}>{children}</div>
    </section>
  );
}

type StickyActionBarProps = {
  children: ReactNode;
  /** Shows "Unsaved changes" on the left. */
  dirty?: boolean;
  /** Extra status text on the left (e.g. "Saved 2 min ago"). */
  status?: ReactNode;
};

/** Save/Cancel bar pinned to the bottom of the viewport on long forms. */
export function StickyActionBar({ children, dirty, status }: StickyActionBarProps) {
  return (
    <div className={s.actionBar}>
      <div className={s.actionBarStatus} aria-live="polite">
        {dirty ? <><span className={s.dirtyDot} aria-hidden="true" />Unsaved changes</> : status}
      </div>
      <div className={s.actionBarButtons}>{children}</div>
    </div>
  );
}

type SectionNavProps = { sections: { id: string; label: string; invalid?: boolean }[] };

/** In-page table of contents for long forms; highlights the section in view. Desktop only. */
export function SectionNav({ sections }: SectionNavProps) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const els = sections.map((sec) => document.getElementById(sec.id)).filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className={s.sectionNav} aria-label="Form sections">
      <ol>
        {sections.map((sec) => (
          <li key={sec.id}>
            <a
              href={`#${sec.id}`}
              className={clsx(s.sectionNavLink, active === sec.id && s.sectionNavActive, sec.invalid && s.sectionNavInvalid)}
              aria-current={active === sec.id ? 'location' : undefined}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActive(sec.id);
              }}
            >
              {sec.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Two-column layout for long forms: SectionNav on the left (desktop), form on the right. */
export function FormWithNav({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <div className={s.withNav}>
      <aside className={s.withNavAside}>{nav}</aside>
      <div className={s.withNavMain}>{children}</div>
    </div>
  );
}
