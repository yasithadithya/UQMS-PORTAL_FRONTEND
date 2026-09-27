import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Blocks, Briefcase, ClipboardList, Factory, FileBarChart, FilePlus2, LayoutDashboard, LayoutGrid, ListChecks, Settings2, ShieldCheck, Ship,
  UserCog, Users, Wallet,
} from 'lucide-react';
import type { ApiModule } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { getParentId, toSlug } from '@/utils/modules';
import { HR_KEYS, MODULE_KEYS, isNavigable, type ModuleKey } from '@/utils/permissions';
import { MARINE_TABS, TAB_MODULE, marineTabForPath } from '@/pages/marineTabs';
import { resolveHrTab, visibleHrGroups } from '@/pages/hr/hrTabs';
import { FINANCE_TABS } from '@/pages/finance/financeTabs';

/* ------------------------------------------------------------------ types */

type Loc = { pathname: string; search: string };

export type NavLink = {
  kind: 'link';
  id: string;
  label: string;
  to: string;
  icon?: ReactNode;
  /** Where the link sits, e.g. ["Reporting", "Marine"]; shown in the command palette. */
  trail: string[];
  isActive: (loc: Loc) => boolean;
};

/** A run of links inside a group, optionally under a small heading. */
export type NavSection = { id: string; label?: string; items: NavLink[] };

export type NavGroup = {
  kind: 'group';
  id: string;
  label: string;
  icon: ReactNode;
  /** Where the group's icon goes in the collapsed rail / phone tab bar: its first link. */
  to: string;
  sections: NavSection[];
  isActive: (loc: Loc) => boolean;
};

export type NavItem = NavLink | NavGroup;

/** Admin pages live at top-level URLs but belong to the Admin group. */
export const ADMIN_PAGES: { name: string; navLabel: string; href: string; desc: string; module: ModuleKey; icon: ReactNode }[] = [
  { name: 'User Management', navLabel: 'Users', href: '/users', desc: 'Manage system users and assignments', module: MODULE_KEYS.adminUsers, icon: <UserCog /> },
  { name: 'Role Management', navLabel: 'Roles & permissions', href: '/roles', desc: 'Configure granular module permissions', module: MODULE_KEYS.adminRoles, icon: <ShieldCheck /> },
  { name: 'Module Management', navLabel: 'Modules', href: '/modules', desc: 'Create and edit system modules', module: MODULE_KEYS.adminModules, icon: <Blocks /> },
  { name: 'Checklist Management', navLabel: 'Checklists', href: '/checklist-management', desc: 'Manage survey checklist questions and criteria', module: MODULE_KEYS.adminMasterData, icon: <ListChecks /> },
];

/* ------------------------------------------------------------------ icons */

const ICONS: Record<string, ReactNode> = {
  dashboard: <LayoutDashboard />,
  reporting: <FileBarChart />,
  marine: <Ship />,
  'marine.first-entry': <ClipboardList />,
  'new-request': <FilePlus2 />,
  hr: <Users />,
  admin: <Settings2 />,
  finance: <Wallet />,
  industrial: <Factory />,
  checklists: <ClipboardList />,
  jobs: <Briefcase />,
};

/** Icon for a module: by stable key first, then by name, then a generic grid. */
export const moduleIcon = (mod: Pick<ApiModule, 'key' | 'name'>): ReactNode =>
  (mod.key && ICONS[mod.key]) || ICONS[toSlug(mod.name)] || <LayoutGrid />;

/* ------------------------------------------------------------------ helpers */

const params = (search: string) => new URLSearchParams(search);
const underPath = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

/* ------------------------------------------------------------------ hook */

export type Navigation = {
  items: NavItem[];
  /** Flat list of every link, for search. */
  links: NavLink[];
  /** Base path of the First Entry page, if the user can see it (for quick actions). */
  firstEntryPath: string | null;
};

/**
 * The app's navigation, built from the database module tree and filtered by the user's permissions.
 * One source for the sidebar, the phone menu and the command palette.
 */
export function useNavigation(): Navigation {
  const { modules, modulesLoaded, canAccessModule, can, canAny, isSuperAdmin } = useAuth();

  return useMemo(() => {
    let firstEntryPath: string | null = null;

    const childrenOf = (id: string) =>
      modules
        .filter(m => isNavigable(m) && getParentId(m) === id && canAccessModule(m._id))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    /** Links for a module's own in-page tabs (First Entry, HR), or null when it has none. */
    const tabLinks = (mod: ApiModule, path: string, trail: string[]): NavSection[] | null => {
      if (mod.key === MODULE_KEYS.firstEntry) {
        firstEntryPath = path;
        const tabs = MARINE_TABS.filter(t => can(TAB_MODULE[t.id]));
        if (tabs.length === 0) return [];
        const activeTab = (loc: Loc) => {
          const fromPath = marineTabForPath(loc.pathname, path);
          if (fromPath) return fromPath;
          const requested = params(loc.search).get('tab');
          return tabs.some(t => t.id === requested) ? requested : tabs[0].id;
        };
        return [{
          id: mod._id,
          items: tabs.map(t => ({
            kind: 'link' as const,
            id: `${path}?tab=${t.id}`,
            label: t.navLabel,
            to: `${path}?tab=${t.id}`,
            trail,
            isActive: (loc: Loc) => underPath(loc.pathname, path) && activeTab(loc) === t.id,
          })),
        }];
      }

      if (mod.key === MODULE_KEYS.hr) {
        const isHrAdmin = canAny(HR_KEYS);
        const groups = visibleHrGroups(key => can(key), isHrAdmin);
        const isOn = (tabId: string) => (loc: Loc) =>
          loc.pathname === path && resolveHrTab(groups, params(loc.search).get('tab'), isHrAdmin).tab === tabId;
        const link = (id: string, label: string, sectionTrail: string[]): NavLink => ({
          kind: 'link', id: `${path}?tab=${id}`, label, to: `${path}?tab=${id}`, trail: sectionTrail, isActive: isOn(id),
        });

        // Single views ("Dashboard", "My HR") are grouped into unlabeled runs; groups with sub-tabs get a heading.
        const sections: NavSection[] = [];
        for (const g of groups) {
          if (g.subTabs) {
            sections.push({ id: g.id, label: g.label, items: g.subTabs.map(st => link(st.id, st.label, [...trail, g.label])) });
          } else {
            const last = sections[sections.length - 1];
            const item = link(g.id, g.label, trail);
            if (last && !last.label) last.items.push(item);
            else sections.push({ id: `${g.id}-run`, items: [item] });
          }
        }
        return sections;
      }

      if (mod.key === MODULE_KEYS.finance) {
        const tabs = FINANCE_TABS.filter(t => can(t.module));
        if (tabs.length === 0) return [];
        const activeTab = (loc: Loc) => {
          // Quotation pages (/finance/quotations/...) belong to the Quotations tab.
          if (underPath(loc.pathname, `${path}/quotations`)) return 'quotations';
          const requested = params(loc.search).get('tab');
          return tabs.some(t => t.id === requested) ? requested : tabs[0].id;
        };
        return [{
          id: mod._id,
          items: tabs.map(t => ({
            kind: 'link' as const,
            id: `${path}?tab=${t.id}`,
            label: t.label,
            to: `${path}?tab=${t.id}`,
            trail,
            isActive: (loc: Loc) => underPath(loc.pathname, path) && activeTab(loc) === t.id,
          })),
        }];
      }

      return null;
    };

    /**
     * Sections under a module. Leaf children become links; a child with its own children becomes a
     * headed section (single-child chains like Marine > First Entry keep the outer name, "Marine").
     */
    const sectionsFor = (mod: ApiModule, path: string, trail: string[]): NavSection[] => {
      const own = tabLinks(mod, path, trail);
      if (own) return own;

      const sections: NavSection[] = [];
      const leaves: NavLink[] = [];
      for (const child of childrenOf(mod._id)) {
        const childPath = `${path}/${toSlug(child.name)}`;
        const childTrail = [...trail, child.name];
        const nested = sectionsFor(child, childPath, childTrail);
        if (nested.length === 0) {
          leaves.push({
            kind: 'link', id: child._id, label: child.name, to: childPath, trail,
            isActive: loc => underPath(loc.pathname, childPath),
          });
        } else {
          // One nested section: head it with the child's name. Several: keep them apart with "Child · Inner".
          nested.forEach(sec => sections.push({
            ...sec,
            label: nested.length === 1 || !sec.label ? child.name : `${child.name} · ${sec.label}`,
          }));
        }
      }
      return leaves.length ? [{ id: `${mod._id}-leaves`, items: leaves }, ...sections] : sections;
    };

    const items: NavItem[] = [{
      kind: 'link', id: 'dashboard', label: 'Dashboard', to: '/', icon: ICONS.dashboard, trail: [],
      isActive: loc => loc.pathname === '/',
    }];

    if (modulesLoaded) {
      const top = modules
        .filter(m => !getParentId(m) && isNavigable(m) && canAccessModule(m._id))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      for (const mod of top) {
        const path = `/${toSlug(mod.name)}`;
        const trail = [mod.name];
        const sections = sectionsFor(mod, path, trail);

        if (mod.key === MODULE_KEYS.admin) {
          const adminLinks: NavLink[] = ADMIN_PAGES.filter(p => can(p.module)).map(p => ({
            kind: 'link', id: p.href, label: p.navLabel, to: p.href, trail,
            isActive: loc => underPath(loc.pathname, p.href),
          }));
          if (isSuperAdmin) {
            adminLinks.push({ kind: 'link', id: '/dev/ui', label: 'UI kit', to: '/dev/ui', trail, isActive: loc => loc.pathname === '/dev/ui' });
          }
          if (adminLinks.length) sections.unshift({ id: 'admin-pages', items: adminLinks });
        }

        const allLinks = sections.flatMap(s => s.items);
        if (allLinks.length === 0) {
          items.push({ kind: 'link', id: mod._id, label: mod.name, to: path, icon: moduleIcon(mod), trail: [], isActive: loc => underPath(loc.pathname, path) });
        } else {
          items.push({
            kind: 'group', id: mod._id, label: mod.name, icon: moduleIcon(mod), to: allLinks[0].to, sections,
            isActive: loc => underPath(loc.pathname, path) || allLinks.some(l => l.isActive(loc)),
          });
        }
      }
    }

    const links = items.flatMap(i => (i.kind === 'link' ? [i] : i.sections.flatMap(s => s.items)));
    return { items, links, firstEntryPath };
  }, [modules, modulesLoaded, canAccessModule, can, canAny, isSuperAdmin]);
}

/** The current location in the shape NavLink.isActive expects. */
export function useNavLocation(): Loc {
  const { pathname, search } = useLocation();
  return useMemo(() => ({ pathname, search }), [pathname, search]);
}
