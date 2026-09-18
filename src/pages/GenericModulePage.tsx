import { useParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AccessDenied, NotFound } from '@/components/StatusPage';
import { getParentId, resolveModuleTrail, toSlug } from '@/utils/modules';
import NewRequestPage from './NewRequest';
import CreateRequestPage from './CreateRequest';
import RequestDetailsPage from './RequestDetails';
import MarineModulePage from './MarineModulePage';
import HRModulePage from './hr/HRModulePage';

export function ModulesLoading() {
    return (
        <div aria-busy="true" aria-label="Loading">
            <div className="skeleton" style={{ width: '220px', height: '28px', marginBottom: '12px' }} />
            <div className="skeleton" style={{ width: '340px', maxWidth: '100%', height: '14px', marginBottom: '28px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: '150px', borderRadius: 'var(--radius-lg)' }} />)}
            </div>
        </div>
    );
}

export default function GenericModulePage() {
    const { module } = useParams();
    const location = useLocation();
    const { modules, modulesLoaded, modulesError, refreshModules, isAdmin, canAccessModule } = useAuth();

    // Parse all path segments after the first /
    const pathSegments = location.pathname.split('/').filter(Boolean);
    // e.g. /reporting/marine/inspections => ['reporting', 'marine', 'inspections']

    const normalizedModule = module?.toLowerCase() || '';

    // Until the module tree loads we can't tell a real page from a 404, so don't guess.
    if (!modulesLoaded) {
        return <ModulesLoading />;
    }

    if (modulesError && modules.length === 0) {
        return (
            <div className="card" role="alert" style={{ padding: '24px', textAlign: 'center', borderColor: 'var(--red)' }}>
                <p style={{ color: 'var(--red)', fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Couldn't load modules: {modulesError}</p>
                <button type="button" className="btn-secondary btn-inline" onClick={refreshModules}>Retry</button>
            </div>
        );
    }

    // --- Special case: New Request routes ---
    if (normalizedModule === 'new-request') {
        const newRequestModule = modules.find(m => !getParentId(m) && toSlug(m.name) === 'new-request');
        if (newRequestModule && !canAccessModule(newRequestModule._id)) {
            return <AccessDenied />;
        }
        if (pathSegments.length >= 2 && pathSegments[1] === 'create') {
            return <CreateRequestPage />;
        }
        if (pathSegments.length >= 2 && pathSegments[1] !== 'create') {
            return <RequestDetailsPage />;
        }
        return <NewRequestPage />;
    }

    // --- Walk the module tree based on path segments ---
    const { trail, matched } = resolveModuleTrail(modules, pathSegments);
    if (matched === 0 || matched < pathSegments.length) {
        return <NotFound />;
    }
    const currentModule = trail[trail.length - 1];
    const breadcrumbs = trail.map((m, i) => ({
        name: m.name,
        href: '/' + pathSegments.slice(0, i + 1).join('/')
    }));

    // Every level of the path must be readable, not just the page itself (URLs can be typed directly).
    if (trail.some(m => !canAccessModule(m._id))) {
        return <AccessDenied />;
    }

    // --- Special case: First Entry sub-sub-module (under Marine) renders the tab-based page ---
    if (currentModule.name.toLowerCase() === 'first entry') {
        return <MarineModulePage />;
    }

    // --- Special case: HR Module renders the custom HR page ---
    if (currentModule.name.toLowerCase() === 'hr') {
        return <HRModulePage currentModule={currentModule} />;
    }

    // --- Find children of the current module ---
    const subModulesToDisplay: { name: string, href: string, desc?: string }[] = [];

    const children = modules.filter(m => getParentId(m) === currentModule._id);
    children.sort((a, b) => (a.order || 0) - (b.order || 0));

    children.forEach(child => {
        if (canAccessModule(child._id)) {
            const currentPath = breadcrumbs[breadcrumbs.length - 1]?.href || `/${normalizedModule}`;
            subModulesToDisplay.push({
                name: child.name,
                href: `${currentPath}/${toSlug(child.name)}`,
                desc: child.description || `Access the ${child.name} features`
            });
        }
    });

    // Handle Admin static sub-pages
    if (normalizedModule === 'admin' && isAdmin && pathSegments.length === 1) {
        subModulesToDisplay.push(
            { name: 'User Management', href: '/users', desc: 'Manage system users and assignments' },
            { name: 'Role Management', href: '/roles', desc: 'Configure granular module permissions' },
            { name: 'Module Management', href: '/modules', desc: 'Create and edit system modules' },
            { name: 'Checklist Management', href: '/checklist-management', desc: 'Manage survey checklist questions and criteria' }
        );
    }

    const displayTitle = breadcrumbs.map(b => b.name).join(' / ');

    return (
        <div className="animate-in">
            {/* Breadcrumb navigation */}
            {breadcrumbs.length > 1 && (
                <nav aria-label="Breadcrumb" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', flexWrap: 'wrap' }}>
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
                    ? `Select a sub-module below to access ${currentModule.name} features.`
                    : `This is a dynamically generated page for the ${displayTitle} module.`}
            </p>

            {subModulesToDisplay.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {subModulesToDisplay.map(sub => (
                        <Link key={sub.href} to={sub.href} className="module-card-link">
                            <div className="card module-card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
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

