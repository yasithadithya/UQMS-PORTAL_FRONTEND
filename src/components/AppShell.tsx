import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getParentId, toSlug } from '@/utils/modules';
import s from './AppShell.module.css';

const defaultIcon = (
    <svg viewBox="0 0 26 26" fill="none">
        <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="15" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="4" y="15" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="15" y="15" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
);

const iconMap: Record<string, React.ReactNode> = {
    'dashboard': (
        <svg viewBox="0 0 26 26" fill="none">
            <path d="M4 12.5L13 4l9 8.5V22a1 1 0 01-1 1H5a1 1 0 01-1-1V12.5z" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <rect x="10" y="16" width="6" height="7" rx=".5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    ),
    'reporting': (
        <svg viewBox="0 0 26 26" fill="none">
            <rect x="4" y="3" width="18" height="20" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9 9h8M9 13h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="19" cy="19" r="5" fill="currentColor" stroke="none" opacity=".2" />
            <path d="M19 17v4M17 19h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    ),
    'hr': (
        <svg viewBox="0 0 26 26" fill="none">
            <circle cx="13" cy="10" r="4" stroke="currentColor" strokeWidth="1.8" />
            <path d="M5 22c0-4 3.5-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    ),
    'admin': (
        <svg viewBox="0 0 26 26" fill="none">
            <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),
    'finance': (
        <svg viewBox="0 0 26 26" fill="none">
            <path d="M12 4v18M8 8h6a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),
    'new-request': (
        <svg viewBox="0 0 26 26" fill="none">
            <rect x="4" y="4" width="18" height="20" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 10h10M8 14h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="18.5" cy="18.5" r="4" fill="currentColor" opacity=".18" />
            <path d="M18.5 16.8v3.4M16.8 18.5h3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    )
};

const sunIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
);

const moonIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
);

const logoutIcon = (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M6 15H4a1 1 0 01-1-1V4a1 1 0 011-1h2M12 12l3-3-3-3M7 9h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const moreIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
    </svg>
);

// The bottom tab bar fits about five items on a phone; anything beyond goes into a "More" sheet.
const MAX_MOBILE_TABS = 4;

// Admin tools live at top-level URLs but belong to the Admin section.
const ADMIN_PAGES = ['/users', '/roles', '/modules', '/checklist-management'];

type Theme = 'light' | 'dark';

/** index.html applies the saved (or system) theme before first paint; start from what it chose. */
const currentTheme = (): Theme =>
    document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

type NavTab = { label: string; href: string; icon: React.ReactNode };

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { pathname } = useLocation();
    const { user, logout, modules, modulesLoaded, canAccessModule } = useAuth();

    const displayName = user?.username || 'User';
    const displayRole = user?.role?.roleName || 'User';
    const displayInitials = user?.initials || 'U';

    const [theme, setTheme] = useState<Theme>(currentTheme);
    const [moreOpen, setMoreOpen] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Close the mobile "More" sheet whenever the route changes.
    useEffect(() => { setMoreOpen(false); }, [pathname]);

    const toggleTheme = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        try { localStorage.setItem('theme', next); } catch { /* storage unavailable */ }
    };

    // Dynamically build tabs from modules DB
    const topModules = modules.filter(m => !getParentId(m)).sort((a, b) => (a.order || 0) - (b.order || 0));
    const visibleTabs: NavTab[] = [
        { label: 'Dashboard', href: '/', icon: iconMap['dashboard'] },
        ...topModules
            .filter(mod => canAccessModule(mod._id))
            .map(mod => {
                const slug = toSlug(mod.name);
                return { label: mod.name, href: `/${slug}`, icon: iconMap[slug] || defaultIcon };
            }),
    ];

    // A section stays highlighted on its nested pages, e.g. /reporting/marine/first-entry highlights Reporting.
    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        if (href === '/admin' && ADMIN_PAGES.some(p => pathname === p || pathname.startsWith(`${p}/`))) return true;
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    const mobileNeedsMore = visibleTabs.length > MAX_MOBILE_TABS;
    const mobileTabs = mobileNeedsMore ? visibleTabs.slice(0, MAX_MOBILE_TABS - 1) : visibleTabs;
    const overflowTabs = mobileNeedsMore ? visibleTabs.slice(MAX_MOBILE_TABS - 1) : [];
    const overflowActive = overflowTabs.some(t => isActive(t.href));

    const themeLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

    return (
        <div className={s.shell}>
            {/* ===== SIDEBAR (visible on desktop) ===== */}
            <aside className={s.sidebar}>
                <div className={s.sidebarBrand}>
                    <div className={s.sidebarTitle}>UQMS</div>
                    <div className={s.sidebarSub}>UQMS Management System</div>
                </div>

                <nav className={s.sidebarNav} aria-label="Main">
                    {visibleTabs.map((tab) => (
                        <Link
                            key={tab.href}
                            to={tab.href}
                            className={`${s.sidebarTab} ${isActive(tab.href) ? s.sidebarTabActive : ''}`}
                            aria-current={isActive(tab.href) ? 'page' : undefined}
                        >
                            {tab.icon}
                            {tab.label}
                        </Link>
                    ))}
                    {!modulesLoaded && [0, 1, 2].map(i => (
                        <div key={i} className="skeleton" style={{ height: '36px', margin: '6px 4px' }} aria-hidden="true" />
                    ))}
                </nav>

                <div className={s.sidebarFooter}>
                    <div className={s.sidebarUser}>
                        <Link to="/profile" className={s.sidebarUserLink} title="View Profile">
                            <div className={s.sidebarAvatar}>{displayInitials}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className={s.sidebarUserName}>{displayName}</div>
                                <div className={s.sidebarUserRole}>{displayRole}</div>
                            </div>
                        </Link>
                        <button type="button" className={s.themeBtn} onClick={toggleTheme} title={themeLabel} aria-label={themeLabel}>
                            {theme === 'dark' ? sunIcon : moonIcon}
                        </button>
                        <button type="button" className={s.logoutBtn} onClick={logout} title="Sign out" aria-label="Sign out">
                            {logoutIcon}
                        </button>
                    </div>
                </div>
            </aside>

            {/* ===== MAIN CONTENT ===== */}
            <div className={s.main}>
                {/* Mobile top bar: the sidebar (with theme + sign out) is hidden on phones */}
                <header className={s.mobileHeader}>
                    <div className={s.sidebarTitle}>UQMS</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button type="button" className={s.themeBtn} onClick={toggleTheme} aria-label={themeLabel}>
                            {theme === 'dark' ? sunIcon : moonIcon}
                        </button>
                        <button type="button" className={s.logoutBtn} onClick={logout} aria-label="Sign out">
                            {logoutIcon}
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className={s.content}>
                    {children}
                </main>
            </div>

            {/* ===== BOTTOM TAB BAR (visible on mobile) ===== */}
            {moreOpen && (
                <>
                    <div className={s.moreBackdrop} onClick={() => setMoreOpen(false)} aria-hidden="true" />
                    <div className={s.moreSheet} role="menu" aria-label="More sections">
                        {overflowTabs.map(tab => (
                            <Link
                                key={tab.href}
                                to={tab.href}
                                role="menuitem"
                                className={`${s.moreItem} ${isActive(tab.href) ? s.tabActive : ''}`}
                            >
                                {tab.icon}
                                {tab.label}
                            </Link>
                        ))}
                    </div>
                </>
            )}
            <nav className={s.tabBar} aria-label="Main">
                {mobileTabs.map((tab) => (
                    <Link
                        key={tab.href}
                        to={tab.href}
                        className={`${s.tab} ${isActive(tab.href) ? s.tabActive : ''}`}
                        aria-current={isActive(tab.href) ? 'page' : undefined}
                    >
                        {tab.icon}
                        <span className={s.tabLabel}>{tab.label}</span>
                    </Link>
                ))}
                {mobileNeedsMore && (
                    <button
                        type="button"
                        className={`${s.tab} ${overflowActive || moreOpen ? s.tabActive : ''}`}
                        onClick={() => setMoreOpen(o => !o)}
                        aria-expanded={moreOpen}
                        aria-haspopup="menu"
                    >
                        {moreIcon}
                        <span className={s.tabLabel}>More</span>
                    </button>
                )}
                <Link
                    to="/profile"
                    className={`${s.tab} ${isActive('/profile') ? s.tabActive : ''} ${s.mobileOnlyTab}`}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span className={s.tabLabel}>Profile</span>
                </Link>
            </nav>
        </div>
    );
}
