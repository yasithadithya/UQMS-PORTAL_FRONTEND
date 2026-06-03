import { useParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import NewRequestPage from './NewRequest';
import CreateRequestPage from './CreateRequest';
import RequestDetailsPage from './RequestDetails';
import MarineModulePage from './MarineModulePage';

export default function GenericModulePage() {
    const { module } = useParams();
    const location = useLocation();
    const { modules, user } = useAuth();

    const formatName = (name: string | undefined) => {
        if (!name) return '';
        return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    // --- Helper to get parentId consistently ---
    const getParentId = (mod: any): string | null => {
        if (!mod.parentId) return null;
        return typeof mod.parentId === 'object' ? mod.parentId._id : mod.parentId;
    };

    // Parse all path segments after the first /
    const pathSegments = location.pathname.split('/').filter(Boolean);
    // e.g. /reporting/marine/inspections => ['reporting', 'marine', 'inspections']

    const normalizedModule = module?.toLowerCase() || '';

    // --- Special case: New Request routes ---
    if (normalizedModule === 'new-request') {
        if (pathSegments.length >= 2 && pathSegments[1] === 'create') {
            return <CreateRequestPage />;
        }
        if (pathSegments.length >= 2 && pathSegments[1] !== 'create') {
            return <RequestDetailsPage />;
        }
        return <NewRequestPage />;
    }

    // --- Walk the module tree based on path segments ---
    // Start by finding the root module matching the first segment
    let currentModule = modules.find(m => {
        return !getParentId(m) && m.name.toLowerCase().replace(/\s+/g, '-') === pathSegments[0]?.toLowerCase();
    });

    // Walk deeper for each subsequent path segment
    const breadcrumbs: { name: string; href: string }[] = [];
    if (currentModule) {
        breadcrumbs.push({ name: currentModule.name, href: `/${pathSegments[0]}` });

        for (let i = 1; i < pathSegments.length; i++) {
            const segment = pathSegments[i].toLowerCase();
            const childModule = modules.find(m => {
                return getParentId(m) === currentModule!._id && m.name.toLowerCase().replace(/\s+/g, '-') === segment;
            });
            if (childModule) {
                currentModule = childModule;
                breadcrumbs.push({
                    name: childModule.name,
                    href: '/' + pathSegments.slice(0, i + 1).join('/')
                });
            } else {
                // Segment doesn't match any child module — could be a special route
                break;
            }
        }
    }

    // --- Special case: First Entry sub-sub-module (under Marine) renders the tab-based page ---
    if (currentModule && currentModule.name.toLowerCase() === 'first entry') {
        return <MarineModulePage />;
    }

    // --- Access control ---
    const hasAccess = (moduleName: string) => {
        if (!user || !user.role || typeof user.role !== 'object') return false;
        if (user.role.roleName.toLowerCase() === 'admin') return true;
        
        const rolePerms = user.role.permissions || [];
        const mod = modules.find(m => m.name.toLowerCase() === moduleName.toLowerCase());
        if (!mod) return false;
        
        const perm = rolePerms.find((p: any) => p.module === mod._id || (p.module && p.module._id === mod._id));
        return !!(perm && perm.actions && perm.actions.includes('read'));
    };

    // --- Find children of the current module ---
    let subModulesToDisplay: { name: string, href: string, desc?: string }[] = [];
    
    if (currentModule) {
        const children = modules.filter(m => getParentId(m) === currentModule!._id);
        children.sort((a, b) => (a.order || 0) - (b.order || 0));

        children.forEach(child => {
            if (hasAccess(child.name)) {
                const childSlug = child.name.toLowerCase().replace(/\s+/g, '-');
                const currentPath = breadcrumbs[breadcrumbs.length - 1]?.href || `/${normalizedModule}`;
                subModulesToDisplay.push({
                    name: child.name,
                    href: `${currentPath}/${childSlug}`,
                    desc: child.description || `Access the ${child.name} features`
                });
            }
        });
    }

    // Handle Admin static sub-pages
    if (normalizedModule === 'admin' && user?.role && (user.role as any).roleName?.toLowerCase() === 'admin' && pathSegments.length === 1) {
        subModulesToDisplay.push(
            { name: 'User Management', href: '/users', desc: 'Manage system users and assignments' },
            { name: 'Role Management', href: '/roles', desc: 'Configure granular module permissions' },
            { name: 'Module Management', href: '/modules', desc: 'Create and edit system modules' }
        );
    }

    const displayTitle = breadcrumbs.map(b => b.name).join(' / ') || formatName(module);

    return (
        <div className="animate-in">
            {/* Breadcrumb navigation */}
            {breadcrumbs.length > 1 && (
                <nav style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    {breadcrumbs.map((crumb, i) => (
                        <span key={crumb.href} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {i > 0 && <span style={{ color: 'var(--muted)', opacity: 0.5 }}>›</span>}
                            {i < breadcrumbs.length - 1 ? (
                                <Link to={crumb.href} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                                    {crumb.name}
                                </Link>
                            ) : (
                                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{crumb.name}</span>
                            )}
                        </span>
                    ))}
                </nav>
            )}

            <h2 className="section-header" style={{ marginBottom: '8px' }}>{displayTitle}</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>
                {subModulesToDisplay.length > 0
                    ? `Select a sub-module below to access ${currentModule?.name || formatName(module)} features.`
                    : `This is a dynamically generated page for the ${displayTitle} module.`}
            </p>

            {subModulesToDisplay.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {subModulesToDisplay.map(sub => (
                        <Link key={sub.href} to={sub.href} style={{ textDecoration: 'none' }}>
                            <div className="card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
                                 onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)'; }}
                                 onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05), 0 10px 20px -5px rgba(0,0,0,0.04)'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-subtle)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="9" y1="3" x2="9" y2="21"></line>
                                        </svg>
                                    </div>
                                    <h3 style={{ fontSize: '16px', color: 'var(--text)', margin: 0, fontWeight: 600 }}>{sub.name}</h3>
                                </div>
                                <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: '1.5', margin: 0, flex: 1 }}>
                                    {sub.desc}
                                </p>
                                <div style={{ marginTop: '16px', color: 'var(--primary)', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                                    Open Module 
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                        <polyline points="12 5 19 12 12 19"></polyline>
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: '60px 40px', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px', background: 'transparent' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🚧</div>
                    <h3 style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '8px' }}>Module Under Construction</h3>
                    <p style={{ color: 'var(--muted)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5' }}>
                        The features and interfaces for this module are currently being developed. Please check back later.
                    </p>
                </div>
            )}
        </div>
    );
}

