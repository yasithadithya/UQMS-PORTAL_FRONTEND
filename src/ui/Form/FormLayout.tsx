import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import s from './Form.module.css';

/** Responsive grid for fields: 1 column on phones, `columns` from tablet up. */
export function FormGrid({ columns = 2, children, className }: { columns?: 1 | 2 | 3 | 4 | 6; children: ReactNode; className?: string }) {
  return <div className={clsx(s.grid, s[`cols${columns}`], className)}>{children}</div>;
}

type FormSectionProps = {
  /** Also the anchor for SectionNav. */
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Lets the user expand/collapse the section by clicking its header. */
  collapsible?: boolean;
  /** Starting state when collapsible. */
  defaultOpen?: boolean;
};

/** Event SectionNav fires so a collapsed section opens before it's scrolled to. */
const OPEN_SECTION_EVENT = 'formsection:open';

/** A titled group of fields inside a long form. */
export function FormSection({ id, title, description, actions, children, collapsible, defaultOpen = true }: FormSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = !collapsible || open;
  const bodyId = useId();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!collapsible || !el) return;
    const onOpen = () => setOpen(true);
    el.addEventListener(OPEN_SECTION_EVENT, onOpen);
    return () => el.removeEventListener(OPEN_SECTION_EVENT, onOpen);
  }, [collapsible]);


  return (
    <section
      id={id}
      className={clsx(s.section, collapsible && !isOpen && s.sectionCollapsed)}
      aria-labelledby={id ? `${id}-title` : undefined}
      ref={ref}
      // A hidden field that fails validation opens its section so the error is visible.
      onInvalidCapture={collapsible ? () => setOpen(true) : undefined}
    >
      <header className={s.sectionHeader}>
        <div className={s.sectionHeading}>
          <h2 id={id ? `${id}-title` : undefined} className={s.sectionTitle}>
            {collapsible ? (
              <button type="button" className={s.sectionToggle} aria-expanded={isOpen} aria-controls={bodyId} onClick={() => setOpen(o => !o)}>
                <ChevronDown className={clsx(s.sectionChevron, isOpen && s.sectionChevronOpen)} aria-hidden="true" />
                {title}
              </button>
            ) : title}
          </h2>
          {description && <p className={clsx(s.sectionDescription, collapsible && s.sectionDescriptionIndent)}>{description}</p>}
        </div>
        {actions && isOpen && <div className={s.sectionActions}>{actions}</div>}
      </header>
      {/* Kept mounted when collapsed so field state and validation still work. */}
      <div id={bodyId} className={s.sectionBody} hidden={!isOpen}>{children}</div>
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
                const target = document.getElementById(sec.id);
                target?.dispatchEvent(new CustomEvent(OPEN_SECTION_EVENT));
                target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
