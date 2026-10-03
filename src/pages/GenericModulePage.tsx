import { useParams, useLocation, Link } from 'react-router-dom';
import { ChevronRight, Construction } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '@/ui';
import { ADMIN_PAGES, moduleIcon } from '@/navigation/useNavigation';
import { useAuth } from '@/context/AuthContext';
import { AccessDenied, NotFound } from '@/components/StatusPage';
import { getParentId, resolveModuleTrail, toSlug } from '@/utils/modules';
import { MODULE_KEYS, isNavigable } from '@/utils/permissions';
import NewRequestPage from './NewRequest';
import CreateRequestPage from './CreateRequest';
import RequestDetailsPage from './RequestDetails';
import MarineModulePage from './MarineModulePage';
import HRModulePage from './hr/HRModulePage';
import FinanceModulePage from './finance/FinanceModulePage';
import s from './GenericModulePage.module.css';

export function ModulesLoading() {
    return (
        <div aria-busy="true" aria-label="Loading">
            <Skeleton width={220} height={28} />
            <Skeleton width={340} height={14} className={s.skeletonLine} />
            <Card padding="none">
                {[0, 1, 2].map(i => (
                    <div key={i} className={s.row}>
                        <Skeleton width={36} height={36} radius="var(--radius-md)" />
                        <Skeleton width="40%" height={16} />
                    </div>
                ))}
            </Card>
        </div>
    );
}

export default function GenericModulePage() {
    const { module } = useParams();
    const location = useLocation();
    const { modules, modulesLoaded, modulesError, refreshModules, can, canAccessModule } = useAuth();

    // Parse all path segments after the first /
    const pathSegments = location.pathname.split('/').filter(Boolean);
    // e.g. /reporting/marine/inspections => ['reporting', 'marine', 'inspections']

    const normalizedModule = module?.toLowerCase() || '';

    // Until the module tree loads we can't tell a real page from a 404, so don't guess.
    if (!modulesLoaded) {
        return <ModulesLoading />;
    }

    if (modulesError && modules.length === 0) {
        return <ErrorState title="Couldn't load modules" message={modulesError} onRetry={refreshModules} />;
    }

    // --- Special case: New Request routes ---
    if (normalizedModule === 'new-request') {
        if (!can(MODULE_KEYS.newRequest)) {
            return <AccessDenied />;
        }
        if (pathSegments.length >= 2 && pathSegments[1] === 'create') {
            return can(MODULE_KEYS.newRequest, 'override') ? <CreateRequestPage /> : <AccessDenied />;
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
    if (currentModule.key === MODULE_KEYS.firstEntry) {
        return <MarineModulePage />;
    }

    // --- Special case: HR Module renders the custom HR page ---
    if (currentModule.key === MODULE_KEYS.hr) {
        return <HRModulePage currentModule={currentModule} />;
    }

    // --- Special case: Finance Module renders the Quotations / Fee structure page ---
    if (currentModule.key === MODULE_KEYS.finance) {
        return <FinanceModulePage currentModule={currentModule} />;
    }

    // --- Find children of the current module ---
    const subModulesToDisplay: { name: string; href: string; desc?: string; icon?: React.ReactNode }[] = [];

    const children = modules.filter(m => isNavigable(m) && getParentId(m) === currentModule._id);
    children.sort((a, b) => (a.order || 0) - (b.order || 0));

    children.forEach(child => {
        if (canAccessModule(child._id)) {
            const currentPath = breadcrumbs[breadcrumbs.length - 1]?.href || `/${normalizedModule}`;
            subModulesToDisplay.push({
                name: child.name,
                href: `${currentPath}/${toSlug(child.name)}`,
                desc: child.description,
                icon: moduleIcon(child),
            });
        }
    });

    // Handle Admin static sub-pages
    if (currentModule.key === MODULE_KEYS.admin && pathSegments.length === 1) {
        subModulesToDisplay.push(...ADMIN_PAGES.filter(page => can(page.module)));
    }

    return (
        <div className="animate-in">
            <PageHeader
                breadcrumbs={breadcrumbs.map(b => ({ label: b.name, href: b.href }))}
                title={currentModule.name}
                description={currentModule.description}
            />

            {subModulesToDisplay.length > 0 ? (
                <Card padding="none">
                    <ul className={s.list}>
                        {subModulesToDisplay.map(sub => (
                            <li key={sub.href}>
                                <Link to={sub.href} className={s.row}>
                                    <span className={s.icon} aria-hidden="true">{sub.icon ?? moduleIcon({ name: sub.name })}</span>
                                    <span className={s.text}>
                                        <span className={s.name}>{sub.name}</span>
                                        {sub.desc && <span className={s.desc}>{sub.desc}</span>}
                                    </span>
                                    <ChevronRight className={s.chevron} aria-hidden="true" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Card>
            ) : (
                <Card padding="none">
                    <EmptyState
                        icon={<Construction />}
                        title="Nothing here yet"
                        description={`The ${currentModule.name} module has no screens yet. They'll appear here once they're built.`}
                        action={<Button onClick={() => window.history.back()}>Go back</Button>}
                    />
                </Card>
            )}
        </div>
    );
}
