import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
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

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { pathname } = useLocation();
    const { user, logout, modules } = useAuth();

    const displayName = user?.username || 'User';
    const displayRole = typeof user?.role === 'object' && user.role
        ? user.role.roleName
        : (user?.role as unknown as string) || 'User';
    const displayInitials = user?.initials || 'U';

    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    const hasAccess = (moduleName: string) => {
        if (!user || !user.role || typeof user.role !== 'object') return false;
        if (user.role.roleName.toLowerCase() === 'admin') return true;
        if (moduleName === 'Dashboard') return true;
        
        const rolePerms = user.role.permissions || [];
        // Map moduleName to actual module ID from `modules` list
        const mod = modules.find(m => m.name.toLowerCase() === moduleName.toLowerCase());
        if (!mod) return false;
        
        const perm = rolePerms.find((p: any) => p.module === mod._id || (p.module && p.module._id === mod._id));
        return !!(perm && perm.actions && perm.actions.includes('read'));
    };

    // Dynamically build tabs from modules DB
    const buildSidebar = () => {
        const dynamicTabs = [
            {
                label: 'Dashboard',
                href: '/',
                icon: iconMap['dashboard'],
            }
        ];

        // Top level modules
        const topModules = modules.filter(m => !m.parentId);
        topModules.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        for (const mod of topModules) {
            if (hasAccess(mod.name)) {
                const modNameLower = mod.name.toLowerCase().replace(/\s+/g, '-');
                dynamicTabs.push({
                    label: mod.name,
                    href: `/${modNameLower}`,
                    icon: iconMap[modNameLower] || defaultIcon,
                });
            }
        }

        return dynamicTabs;
    };

    const visibleTabs = buildSidebar();

    return (
        <div className={s.shell}>
            {/* ===== SIDEBAR (visible on desktop) ===== */}
            <aside className={s.sidebar}>
                <div className={s.sidebarBrand}>
                    <div className={s.sidebarTitle}>UQMS</div>
                    <div className={s.sidebarSub}>UQMS Management System</div>
                </div>

                <nav className={s.sidebarNav}>
                    {visibleTabs.map((tab) => (
                        <Link
                            key={tab.href}
                            to={tab.href}
                            className={`${s.sidebarTab} ${pathname === tab.href ? s.sidebarTabActive : ''}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </Link>
                    ))}
                </nav>

                <div className={s.sidebarFooter}>
                    <div className={s.sidebarUser}>
                        <div className={s.sidebarAvatar}>{displayInitials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className={s.sidebarUserName}>{displayName}</div>
                            <div className={s.sidebarUserRole}>{displayRole}</div>
                        </div>
                        <button className={s.themeBtn} onClick={toggleTheme} title="Toggle theme">
                            {theme === 'dark' ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                                </svg>
                            )}
                        </button>
                        <button className={s.logoutBtn} onClick={logout} title="Sign out">
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M6 15H4a1 1 0 01-1-1V4a1 1 0 011-1h2M12 12l3-3-3-3M7 9h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* ===== MAIN CONTENT ===== */}
            <div className={s.main}>
                {/* Page Content */}
                <main className={s.content}>
                    {children}
                </main>
            </div>

            {/* ===== BOTTOM TAB BAR (visible on mobile) ===== */}
            <nav className={s.tabBar}>
                {visibleTabs.map((tab) => (
                    <Link
                        key={tab.href}
                        to={tab.href}
                        className={`${s.tab} ${pathname === tab.href ? s.tabActive : ''}`}
                    >
                        {tab.icon}
                        <span className={s.tabLabel}>{tab.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}
