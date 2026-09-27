import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import { Tooltip } from '@/ui';
import type { NavGroup, NavItem, NavLink } from '@/navigation/useNavigation';
import s from './Shell.module.css';

type Loc = { pathname: string; search: string };

type NavTreeProps = {
  items: NavItem[];
  loc: Loc;
  expanded: string[];
  onToggle: (groupId: string) => void;
  /** Called after a link is followed (closes the phone menu). */
  onNavigate?: () => void;
  loading?: boolean;
};

/** Full navigation: top-level links and expandable groups with headed sections. */
export function NavTree({ items, loc, expanded, onToggle, onNavigate, loading }: NavTreeProps) {
  return (
    <ul className={s.navList}>
      {items.map(item =>
        item.kind === 'link' ? (
          <li key={item.id}>
            <TopLink item={item} active={item.isActive(loc)} onNavigate={onNavigate} />
          </li>
        ) : (
          <li key={item.id}>
            <Group group={item} loc={loc} open={expanded.includes(item.id)} onToggle={() => onToggle(item.id)} onNavigate={onNavigate} />
          </li>
        ),
      )}
      {loading && [0, 1, 2].map(i => <li key={i} className={clsx('skeleton', s.navSkeleton)} aria-hidden="true" />)}
    </ul>
  );
}

function TopLink({ item, active, onNavigate }: { item: NavLink; active: boolean; onNavigate?: () => void }) {
  return (
    <Link to={item.to} className={clsx(s.navItem, active && s.navItemActive)} aria-current={active ? 'page' : undefined} onClick={onNavigate}>
      <span className={s.navIcon} aria-hidden="true">{item.icon}</span>
      <span className={s.navLabel}>{item.label}</span>
    </Link>
  );
}

function Group({ group, loc, open, onToggle, onNavigate }: { group: NavGroup; loc: Loc; open: boolean; onToggle: () => void; onNavigate?: () => void }) {
  const active = group.isActive(loc);
  const panelId = `nav-${group.id}`;
  return (
    <>
      <button
        type="button"
        className={clsx(s.navItem, active && !open && s.navItemActive, active && open && s.navGroupActive)}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className={s.navIcon} aria-hidden="true">{group.icon}</span>
        <span className={s.navLabel}>{group.label}</span>
        <ChevronRight className={clsx(s.chevron, open && s.chevronOpen)} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className={s.navPanel}>
          {group.sections.map((section, i) => (
            // A heading-less run after a headed section (e.g. HR "Announcements" after "Talent") gets a divider.
            <div key={section.id} className={clsx(s.navSection, !section.label && i > 0 && s.navSectionBreak)}>
              {section.label && <div className={s.navSectionLabel}>{section.label}</div>}
              <ul>
                {section.items.map(link => {
                  const isActive = link.isActive(loc);
                  return (
                    <li key={link.id}>
                      <Link
                        to={link.to}
                        className={clsx(s.subItem, isActive && s.subItemActive)}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={onNavigate}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Collapsed sidebar: one icon per top-level item, labels in tooltips. */
export function NavRail({ items, loc }: { items: NavItem[]; loc: Loc }) {
  return (
    <ul className={s.navList}>
      {items.map(item => {
        const active = item.isActive(loc);
        return (
          <li key={item.id}>
            <Tooltip content={item.label} side="right">
              <Link
                to={item.to}
                className={clsx(s.navItem, s.railItem, active && s.navItemActive)}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <span className={s.navIcon} aria-hidden="true">{item.icon}</span>
              </Link>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}
