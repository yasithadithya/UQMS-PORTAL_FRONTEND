import { useParams, useLocation, Link, Navigate } from 'react-router-dom';
import type { Sector } from '@/config/surveyCategories';
import { ChevronRight, Construction, History } from 'lucide-react';
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
import ChecklistManagement from './ChecklistManagement';
import SurveyorAllocationPage from './v2/SurveyorAllocationPage';
import MyJobsPage from './v2/MyJobsPage';
import JobListPage from './v2/JobListPage';
import JobPage, { type JobPageMode } from './v2/JobPage';
import ApprovalsPage from './v2/ApprovalsPage';
import PreviousDocsPage from './v2/PreviousDocsPage';
import QmsRevisionHistoryPage from './v2/QmsRevisionHistoryPage';
import { QMS_HISTORY_SLUG } from '@/navigation/useNavigation';
import s from './GenericModulePage.module.css';

/** My Jobs sector sub-modules. */
const SECTOR_BY_MODULE_KEY: Record<string, Sector> = {
    [MODULE_KEYS.jobsMarine]: 'marine',
    [MODULE_KEYS.jobsIndustrial]: 'industrial',
};

/** V2 top-level screens by module key; `job` = how /<module>/<jobId> opens a job. My Jobs is routed separately. */
const V2_SCREENS: Record<string, { list: (basePath: string) => React.ReactElement; job?: JobPageMode }> = {
    [MODULE_KEYS.surveyorAllocation]: { list: () => <SurveyorAllocationPage /> },
    [MODULE_KEYS.jobs]: { list: () => <></>, job: 'work' },
    [MODULE_KEYS.viewReport]: {
        list: basePath => <JobListPage scope="completed" basePath={basePath} title="View Report" description="Completed, manager-approved survey reports. Read only." />,
        job: 'view',
    },
    [MODULE_KEYS.authorization]: {
        list: basePath => <JobListPage scope="authorization" basePath={basePath} title="Authorization" description="Signed jobs waiting for manager approval." />,
        job: 'authorize',
    },
    [MODULE_KEYS.approvals]: { list: () => <ApprovalsPage /> },
    [MODULE_KEYS.previousDocs]: { list: () => <PreviousDocsPage /> },
};

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

    // --- V2 survey workflow screens (top-level modules, some with a job id after the module) ---
    const v2Module = modules.find(m => m.key && V2_SCREENS[m.key] && toSlug(m.name) === normalizedModule);
    if (v2Module?.key) {
        if (!canAccessModule(v2Module._id)) return <AccessDenied />;

        // My Jobs: one sub-module per sector (/my-jobs/<sector>[/<jobId>]), each gated by its own permission.
        if (v2Module.key === MODULE_KEYS.jobs) {
            const sectorModules = modules
                .filter(m => getParentId(m) === v2Module._id && m.key && SECTOR_BY_MODULE_KEY[m.key])
                .sort((a, b) => (a.order || 0) - (b.order || 0));
            const sectorModule = sectorModules.find(m => toSlug(m.name) === pathSegments[1]);
            if (!sectorModule) {
                if (pathSegments.length === 1) {
                    const first = sectorModules.find(m => canAccessModule(m._id));
                    if (!first) return <AccessDenied />;
                    return <Navigate to={`/${normalizedModule}/${toSlug(first.name)}${location.search}`} replace />;
                }
                // Older links: /my-jobs/<jobId>
                if (pathSegments.length > 2) return <NotFound />;
                return <JobPage key={pathSegments[1]} jobId={pathSegments[1]} backHref={`/${normalizedModule}`} backLabel={v2Module.name} mode="work" />;
            }
            if (!canAccessModule(sectorModule._id)) return <AccessDenied />;
            const sectorPath = `/${normalizedModule}/${pathSegments[1]}`;
            const jobId = pathSegments[2];
            if (pathSegments.length > 3) return <NotFound />;
            if (jobId) return <JobPage key={jobId} jobId={jobId} backHref={sectorPath} backLabel={sectorModule.name} mode="work" />;
            return <MyJobsPage key={sectorPath} basePath={sectorPath} sector={SECTOR_BY_MODULE_KEY[sectorModule.key!]} sectorLabel={sectorModule.name} />;
        }

        const screen = V2_SCREENS[v2Module.key];
        const basePath = `/${normalizedModule}`;
        const sub = pathSegments[1];
        if (sub) {
            if (!screen.job || pathSegments.length > 2) return <NotFound />;
            return <JobPage key={sub} jobId={sub} backHref={basePath} backLabel={v2Module.name} mode={screen.job} />;
        }
        return screen.list(basePath);
    }

    // --- QMS → Revision history (not a module of its own; readable by anyone who can open QMS) ---
    const qmsModule = modules.find(m => m.key === MODULE_KEYS.qms);
    if (qmsModule && toSlug(qmsModule.name) === normalizedModule && pathSegments[1] === QMS_HISTORY_SLUG) {
        if (pathSegments.length > 2) return <NotFound />;
        if (!canAccessModule(qmsModule._id)) return <AccessDenied />;
        return <QmsRevisionHistoryPage basePath={`/${normalizedModule}`} />;
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

    // --- V2: QMS → Checklist (changes go to Approvals) ---
    if (currentModule.key === MODULE_KEYS.qmsChecklist) {
        return <ChecklistManagement qms />;
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

    if (currentModule.key === MODULE_KEYS.qms && pathSegments.length === 1) {
        subModulesToDisplay.push({
            name: 'Revision history',
            href: `/${normalizedModule}/${QMS_HISTORY_SLUG}`,
            desc: 'Every QMS change: request comments, approvals, acceptances, request and effective dates',
            icon: <History />,
        });
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
