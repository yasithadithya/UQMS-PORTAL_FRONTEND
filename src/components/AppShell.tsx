import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronsLeft, ChevronsRight, ChevronsUpDown, Home, LogOut, Menu as MenuIcon, Moon, Search, Sun, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Drawer, IconButton, Menu, Tooltip } from '@/ui';
import { useNavigation, useNavLocation } from '@/navigation/useNavigation';
import { NavRail, NavTree } from './shell/NavTree';
import { CommandPalette } from './shell/CommandPalette';
import { toggleTheme, usePersisted, useTheme } from './shell/useTheme';
import s from './shell/Shell.module.css';

// Phones get a bottom tab bar: Home + this many top-level sections + "Menu".
const PHONE_TABS = 3;

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const SHORTCUT = isMac ? '⌘K' : 'Ctrl K';

export default function AppShell({ children }: { children: ReactNode }) {
  const nav = useNavigation();
  const loc = useNavLocation();
  const { modulesLoaded } = useAuth();

  const [collapsed, setCollapsed] = usePersisted('uqms.sidebar.collapsed', false);
  const [expanded, setExpanded] = usePersisted<string[]>('uqms.nav.expanded', []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Open the group that contains the current page (e.g. after following a link from elsewhere).
  const activeGroupId = nav.items.find(i => i.kind === 'group' && i.isActive(loc))?.id;
  useEffect(() => {
    if (activeGroupId && !expanded.includes(activeGroupId)) setExpanded([...expanded, activeGroupId]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupId]);

  // Close the phone menu whenever the page changes.
  useEffect(() => { setMenuOpen(false); }, [loc]);

  // Ctrl/⌘+K opens the command palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleGroup = (id: string) =>
    setExpanded(expanded.includes(id) ? expanded.filter(x => x !== id) : [...expanded, id]);

  const phoneTabs = nav.items.filter(i => i.id !== 'dashboard').slice(0, PHONE_TABS);
  const dashboard = nav.items[0];

  return (
    <div className={clsx(s.shell, collapsed && s.collapsed)}>
      <a href="#main" className={s.skipLink}>Skip to content</a>

      {/* ===== Sidebar (≥1024px) ===== */}
      <aside className={s.sidebar} aria-label="Sidebar">
        <Link to="/" className={s.brand} aria-label="UQMS home">
          <img src="/logo-mark.png" alt="" className={s.brandLogo} />
          <span className={s.brandText}>
            <span className={s.brandName}>UQMS</span>
            <span className={s.brandSub}>Management System</span>
          </span>
        </Link>

        <div className={s.searchWrap}>
          {collapsed ? (
            <IconButton label={`Search (${SHORTCUT})`} icon={<Search />} onClick={() => setPaletteOpen(true)} className={s.railSearch} />
          ) : (
            <button type="button" className={s.searchButton} onClick={() => setPaletteOpen(true)}>
              <Search aria-hidden="true" />
              <span>Search or jump to…</span>
              <kbd>{SHORTCUT}</kbd>
            </button>
          )}
        </div>

        <nav className={s.sidebarNav} aria-label="Main">
          {collapsed
            ? <NavRail items={nav.items} loc={loc} />
            : <NavTree items={nav.items} loc={loc} expanded={expanded} onToggle={toggleGroup} loading={!modulesLoaded} />}
        </nav>

        <div className={s.sidebarFooter}>
          <UserMenu compact={collapsed} />
          <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
            <button
              type="button"
              className={s.collapseBtn}
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-pressed={collapsed}
            >
              {collapsed ? <ChevronsRight aria-hidden="true" /> : <ChevronsLeft aria-hidden="true" />}
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* ===== Main column ===== */}
      <div className={s.main}>
        {/* Top bar (<1024px): menu, brand, search, account */}
        <header className={s.topbar}>
          <IconButton label="Open menu" icon={<MenuIcon />} onClick={() => setMenuOpen(true)} noTooltip className={s.topbarMenu} />
          <Link to="/" className={s.topbarBrand} aria-label="UQMS home">
            <img src="/logo-mark.png" alt="" className={s.brandLogo} />
            <span className={s.brandName}>UQMS</span>
          </Link>
          <div className={s.topbarEnd}>
            <IconButton label="Search" icon={<Search />} onClick={() => setPaletteOpen(true)} noTooltip />
            <UserMenu compact />
          </div>
        </header>

        <main id="main" className={s.content} tabIndex={-1}>
          <div className={s.contentInner}>{children}</div>
        </main>
      </div>

      {/* ===== Bottom tab bar (<768px) ===== */}
      <nav className={s.tabBar} aria-label="Quick navigation">
        <Link to="/" className={clsx(s.tab, dashboard?.isActive(loc) && s.tabActive)} aria-current={dashboard?.isActive(loc) ? 'page' : undefined}>
          <Home aria-hidden="true" />
          <span>Home</span>
        </Link>
        {phoneTabs.map(item => {
          const active = item.isActive(loc);
          return (
            <Link key={item.id} to={item.to} className={clsx(s.tab, active && s.tabActive)} aria-current={active ? 'page' : undefined}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button type="button" className={clsx(s.tab, menuOpen && s.tabActive)} onClick={() => setMenuOpen(true)} aria-haspopup="dialog">
          <MenuIcon aria-hidden="true" />
          <span>Menu</span>
        </button>
      </nav>

      {/* ===== Phone/tablet menu ===== */}
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" side="left" width={320}>
        <nav aria-label="Main" className={s.drawerNav}>
          <NavTree items={nav.items} loc={loc} expanded={expanded} onToggle={toggleGroup} onNavigate={() => setMenuOpen(false)} loading={!modulesLoaded} />
        </nav>
      </Drawer>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} nav={nav} />
    </div>
  );
}

/** Account menu: profile, theme, sign out. Full row in the sidebar, avatar-only when compact. */
function UserMenu({ compact }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const name = user?.username || 'User';
  const role = user?.role?.roleName || 'User';

  const trigger = compact ? (
    <button type="button" className={s.avatarButton} aria-label={`Account: ${name}`}>
      <span className={s.avatar} aria-hidden="true">{user?.initials || 'U'}</span>
    </button>
  ) : (
    <button type="button" className={s.userButton} aria-label={`Account: ${name}`}>
      <span className={s.avatar} aria-hidden="true">{user?.initials || 'U'}</span>
      <span className={s.userText}>
        <span className={s.userName}>{name}</span>
        <span className={s.userRole}>{role}</span>
      </span>
      <ChevronsUpDown className={s.userChevron} aria-hidden="true" />
    </button>
  );

  return (
    <Menu
      trigger={trigger}
      side={compact ? 'bottom' : 'top'}
      align={compact ? 'end' : 'start'}
      items={[
        { label: 'My profile', icon: <UserRound />, onSelect: () => navigate('/profile') },
        { label: theme === 'dark' ? 'Light theme' : 'Dark theme', icon: theme === 'dark' ? <Sun /> : <Moon />, onSelect: toggleTheme },
        'separator',
        { label: 'Sign out', icon: <LogOut />, danger: true, onSelect: logout },
      ]}
    />
  );
}
