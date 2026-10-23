import { createContext, useContext, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Award, BadgeCheck, Briefcase, Cake, CalendarCheck, CalendarClock, CheckSquare, ChevronRight, FilePlus2, FileSearch, FileText,
  FileWarning, Inbox, Megaphone, PieChart, Plus, ReceiptText, Ship, User, UserCheck, Users, Wallet, Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/navigation/useNavigation';
import { HR_KEYS, MODULE_KEYS, type ModuleKey } from '@/utils/permissions';
import {
  approvalsService, quotationsService, firstEntryService, hrService, jobsService, requestsService,
  type ApiApprovalRequest, type ApiFirstEntry, type ApiJob, type ApiQuotation, type ApiRequest, type DashboardWidgetSize,
} from '@/api';
import Pagination from '@/components/Pagination';
import { formatDate } from '@/utils/date';
import {
  Badge, Button, ButtonLink, ConfirmDialog, DataTable, EmptyState, ErrorState, Section, Skeleton, StatCard, StatusBadge,
  type Column, type Tone,
} from '@/ui';
import { JobStatusBadge, mainTypeLabel, useModulePath } from '../v2/shared';
import { formatMoney } from '../hr/hrShared';
import { useInvalidate, useSharedLoad, type Load } from './data';
import s from '../Dashboard.module.css';

/* ------------------------------------------------------------------ catalogue types */

export type WidgetGroup = 'Survey jobs' | 'Requests' | 'Marine' | 'HR' | 'Finance' | 'General';

/** Display order of groups in the "Add widgets" panel. */
export const WIDGET_GROUPS: WidgetGroup[] = ['General', 'Survey jobs', 'Requests', 'Marine', 'HR', 'Finance'];

export type WidgetAccess = {
  can: (key: ModuleKey, action?: string) => boolean;
  canAny: (keys: ModuleKey[], actions?: string[]) => boolean;
  links: DashboardLinks;
};

export type WidgetDef = {
  id: string;
  title: string;
  description: string;
  group: WidgetGroup;
  icon: ReactNode;
  /** Sizes the widget supports; the first is its default. sm = a quarter row, md = half, lg = full width. */
  sizes: DashboardWidgetSize[];
  /** Whether this user may add the widget (its module permission). */
  available: (access: WidgetAccess) => boolean;
  Component: ComponentType;
};

/* ------------------------------------------------------------------ links */

export type DashboardLinks = {
  firstEntry: string | null;
  leaves?: string;
  attendance?: string;
  myHr?: string;
  hrDashboard?: string;
  employees?: string;
  module: (key: ModuleKey) => string;
};

const DashboardLinksContext = createContext<DashboardLinks | null>(null);
export const DashboardLinksProvider = DashboardLinksContext.Provider;

/** Links for widgets, from the page's DashboardLinksProvider. */
function useDashboardLinks(): DashboardLinks {
  const links = useContext(DashboardLinksContext);
  if (!links) throw new Error('Dashboard widgets must be rendered inside DashboardLinksProvider.');
  return links;
}

/** Where widgets link to: built from the user's navigation, so links only point at pages they can open. */
export function useBuildDashboardLinks(): DashboardLinks {
  const nav = useNavigation();
  const modulePath = useModulePath();
  return useMemo(() => {
    const tab = (id: string) => nav.links.find(l => l.to.endsWith(`tab=${id}`))?.to;
    return {
      firstEntry: nav.firstEntryPath,
      leaves: tab('leaves'),
      attendance: tab('attendance'),
      myHr: tab('myhr'),
      hrDashboard: tab('dashboard'),
      employees: tab('employees'),
      module: modulePath,
    };
    // modulePath is rebuilt every render but only depends on the module list, which nav already tracks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav]);
}

/* ------------------------------------------------------------------ shared loads (one request per dashboard) */

const countOf = (res: { count?: number } | undefined) => res?.count ?? 0;
const LIST_LIMIT = 5;

const useMyJobs = (enabled = true) => useSharedLoad('jobs-mine', () => jobsService.getJobs({ scope: 'mine', page: 1, limit: LIST_LIMIT }), enabled);
const useAuthorizationJobs = () => useSharedLoad('jobs-authorization', () => jobsService.getJobs({ scope: 'authorization', page: 1, limit: LIST_LIMIT }));
const useCompletedJobs = () => useSharedLoad('jobs-completed', () => jobsService.getJobs({ scope: 'completed', page: 1, limit: LIST_LIMIT }));
const usePendingApprovals = () => useSharedLoad('approvals-pending', () => approvalsService.getApprovals({ status: 'pending', page: 1, limit: LIST_LIMIT }));
const useFirstEntries = () => useSharedLoad('fe-entries', () => firstEntryService.getFirstEntries({ page: 1, limit: LIST_LIMIT }));
const usePendingLeaves = () => useSharedLoad('hr-pending-leaves', () => hrService.getLeaveRequests({ status: 'Pending', page: 1, limit: LIST_LIMIT }));
const useHrStats = () => useSharedLoad('hr-stats', () => hrService.getDashboardStats());
const useRecentQuotations = () => useSharedLoad('quotations-recent', () => quotationsService.getQuotations({ page: 1, limit: LIST_LIMIT }));

/* ------------------------------------------------------------------ building blocks */

function ListSkeleton() {
  return (
    <ul className={s.list} aria-busy="true">
      {[0, 1, 2].map(i => (
        <li key={i} className={s.row}>
          <span className={s.rowMain}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="35%" height={12} style={{ marginTop: 6 }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Loading / error / empty / rows for a list widget. */
function ListBody<T>({ load, rows, empty, emptyIcon, children }: {
  load: Load<unknown>; rows: T[]; empty: string; emptyIcon: ReactNode; children: (row: T) => ReactNode;
}) {
  if (load.loading && rows.length === 0) return <ListSkeleton />;
  if (load.error) return <ErrorState compact message={load.error} onRetry={load.reload} />;
  if (rows.length === 0) return <EmptyState compact icon={emptyIcon} title={empty} />;
  return <ul className={s.list}>{rows.map(children)}</ul>;
}

function RowLink({ to, title, sub, end }: { to: string; title: ReactNode; sub?: ReactNode; end?: ReactNode }) {
  return (
    <Link to={to} className={s.row}>
      <span className={s.rowMain}>
        <span className={s.rowTitle}>{title}</span>
        {sub && <span className={s.rowSub}>{sub}</span>}
      </span>
      {end}
    </Link>
  );
}

const viewAll = (to: string | undefined, label = 'View all') =>
  to ? <ButtonLink to={to} size="sm" variant="ghost" iconRight={<ChevronRight />}>{label}</ButtonLink> : undefined;

/** A stat tile that shows "—" when its request failed. */
function Stat({ load, value, ...props }: { load: Load<unknown>; value: number | string } & Omit<Parameters<typeof StatCard>[0], 'value' | 'loading'>) {
  return <StatCard {...props} loading={load.loading && load.data === undefined} value={load.error ? '—' : value} />;
}

/* ------------------------------------------------------------------ survey jobs (V2) */

function MyOpenJobsStat() {
  const { module } = useDashboardLinks();
  const load = useMyJobs();
  const n = countOf(load.data);
  return <Stat load={load} label="My open jobs" icon={<Briefcase />} tone="accent" value={n} hint={n ? 'In progress or waiting' : 'Nothing open'} href={module(MODULE_KEYS.jobs)} />;
}

function JobRows({ load, basePath, empty }: { load: Load<{ data: ApiJob[] }>; basePath: string; empty: string }) {
  return (
    <ListBody load={load} rows={load.data?.data ?? []} empty={empty} emptyIcon={<Briefcase />}>
      {job => (
        <li key={job._id}>
          <RowLink
            to={`${basePath}/${job._id}`}
            title={job.vesselName || 'Unknown vessel'}
            sub={[job.jobNumber || job.requestNumber, mainTypeLabel(job.mainSurveyType)].filter(Boolean).join(' · ')}
            end={<JobStatusBadge status={job.status} />}
          />
        </li>
      )}
    </ListBody>
  );
}

function MyOpenJobsList() {
  const { module } = useDashboardLinks();
  const load = useMyJobs();
  const base = module(MODULE_KEYS.jobs);
  return (
    <Section title="My open jobs" padding="none" actions={viewAll(base)}>
      <JobRows load={load} basePath={base} empty="No open jobs" />
    </Section>
  );
}

function JobsByTypeWidget() {
  const { module } = useDashboardLinks();
  const load = useSharedLoad('jobs-counts', () => jobsService.getCounts());
  const rows = Object.entries(load.data?.data ?? {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(r => r[1]));
  return (
    <Section title="Open jobs by survey type" padding="md" actions={viewAll(module(MODULE_KEYS.jobs))}>
      {load.loading && !load.data ? <Skeleton height={60} />
        : load.error ? <ErrorState compact message={load.error} onRetry={load.reload} />
        : rows.length === 0 ? <EmptyState compact icon={<PieChart />} title="No open jobs" />
        : rows.map(([type, count]) => (
          <div key={type} className={s.bar}>
            <div className={s.barHead}>
              <span>{mainTypeLabel(type)}</span>
              <span className={`${s.cellStrong} tabular`}>{count}</span>
            </div>
            <div className={s.barTrack}><div className={s.barFill} style={{ width: `${(count / max) * 100}%` }} /></div>
          </div>
        ))}
    </Section>
  );
}

function AuthorizationStat() {
  const { module } = useDashboardLinks();
  const load = useAuthorizationJobs();
  const n = countOf(load.data);
  return <Stat load={load} label="Awaiting authorization" icon={<BadgeCheck />} tone={n ? 'warning' : 'success'} value={n} hint={n ? 'Signed, waiting for approval' : 'Nothing waiting'} href={module(MODULE_KEYS.authorization)} />;
}

function AuthorizationList() {
  const { module } = useDashboardLinks();
  const load = useAuthorizationJobs();
  const base = module(MODULE_KEYS.authorization);
  return (
    <Section title="Awaiting authorization" padding="none" actions={viewAll(base)}>
      <JobRows load={load} basePath={base} empty="Nothing to authorize" />
    </Section>
  );
}

function CompletedReportsList() {
  const { module } = useDashboardLinks();
  const load = useCompletedJobs();
  const base = module(MODULE_KEYS.viewReport);
  return (
    <Section title="Recently completed reports" padding="none" actions={viewAll(base)}>
      <JobRows load={load} basePath={base} empty="No completed reports yet" />
    </Section>
  );
}

function AllocationStat() {
  const { module } = useDashboardLinks();
  const load = useSharedLoad('allocation-queue', () => jobsService.getAllocationQueue());
  const n = countOf(load.data);
  return <Stat load={load} label="Waiting for allocation" icon={<UserCheck />} tone={n ? 'warning' : 'success'} value={n} hint={n ? 'Accepted quotations' : 'All allocated'} href={module(MODULE_KEYS.surveyorAllocation)} />;
}

function ApprovalsStat() {
  const { module } = useDashboardLinks();
  const load = usePendingApprovals();
  const n = countOf(load.data);
  return <Stat load={load} label="Pending approvals" icon={<CheckSquare />} tone={n ? 'warning' : 'success'} value={n} hint={n ? 'Changes to review' : 'Nothing to review'} href={module(MODULE_KEYS.approvals)} />;
}

function ApprovalsList() {
  const { module } = useDashboardLinks();
  const load = usePendingApprovals();
  const base = module(MODULE_KEYS.approvals);
  return (
    <Section title="Pending approvals" padding="none" actions={viewAll(base)}>
      <ListBody<ApiApprovalRequest> load={load} rows={load.data?.data ?? []} empty="Nothing to review" emptyIcon={<CheckSquare />}>
        {a => (
          <li key={a._id}>
            <RowLink to={base} title={a.summary} sub={[a.requestedByName, formatDate(a.createdAt)].filter(Boolean).join(' · ')}
              end={<StatusBadge status={a.operation} />} />
          </li>
        )}
      </ListBody>
    </Section>
  );
}

/* ------------------------------------------------------------------ website requests */

function WebRequestsStat() {
  const load = useSharedLoad('web-requests', () => requestsService.getPendingWebRequests({ page: 1, limit: 1 }));
  const n = countOf(load.data);
  return <Stat load={load} label="Website requests" icon={<Inbox />} tone={n ? 'warning' : 'success'} value={n} hint={n ? 'Waiting for review' : 'All reviewed'} />;
}

const surveySummary = (request: ApiRequest) => {
  const names = (request.surveyTypes || []).map(survey => (typeof survey === 'string' ? survey : survey.name));
  if (names.length <= 2) return names.join(', ') || '—';
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
};

type PendingReview = { request: ApiRequest; decision: 'accept' | 'reject' };

/** Requests submitted through the website, waiting for staff to accept (→ New Request) or reject. */
function WebRequestsQueue() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const canReview = can(MODULE_KEYS.newRequest, 'update');

  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const loadRequests = async (currentPage = page, currentLimit = limit) => {
    try {
      setLoading(true);
      setError('');
      const res = await requestsService.getPendingWebRequests({ page: currentPage, limit: currentLimit });
      setRequests(res.data);
      setTotal(res.count || 0);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load website requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const handleReview = async ({ request, decision }: PendingReview) => {
    setReviewingId(request._id);
    try {
      if (decision === 'accept') {
        const res = await requestsService.acceptWebRequest(request._id);
        toast.success(`${request.requestNumber} accepted as job ${res.data.jobNumber}. It is now in New Request.`);
      } else {
        await requestsService.rejectWebRequest(request._id);
        toast.info(`${request.requestNumber} rejected.`);
      }
      // Keep the "Website requests" tile in step.
      invalidate('web-requests');
      // Step back a page if the last row on this page was just removed.
      if (requests.length === 1 && page > 1) setPage(page - 1);
      else await loadRequests();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${decision} request.`);
      await loadRequests();
    } finally {
      setReviewingId(null);
    }
  };

  const noPermission = canReview ? undefined : 'You do not have permission to review requests';

  const columns: Column<ApiRequest>[] = [
    {
      key: 'number', header: 'Request', primary: true, nowrap: true,
      cell: r => (
        <div className={s.cellStack}>
          <span>{r.requestNumber}</span>
          <span className={s.cellSub}>Received {formatDate(r.createdAt)}</span>
        </div>
      ),
    },
    {
      key: 'vessel', header: 'Vessel',
      cell: r => (
        <div className={s.cellStack}>
          <span className={s.cellStrong}>{r.vesselName || '—'}</span>
          <span className={s.cellSub}>{surveySummary(r)}</span>
        </div>
      ),
    },
    {
      key: 'company', header: 'Company',
      cell: r => (
        <div className={s.cellStack}>
          <span>{r.companyName || '—'}</span>
          {r.companyEmail && <span className={s.cellSub}>{r.companyEmail}</span>}
        </div>
      ),
    },
  ];

  return (
    <section className={s.queue} aria-labelledby="web-requests-title">
      <div className={s.queueHeader}>
        <div className={s.queueTitleRow}>
          <h2 id="web-requests-title" className={s.queueTitle}>Website requests</h2>
          {total > 0 && <Badge tone="warning">{total} waiting</Badge>}
        </div>
        <p className={s.queueDescription}>Accepted requests get a job number and move to New Request.</p>
      </div>

      <DataTable
        caption="Website requests awaiting review"
        columns={columns}
        rows={requests}
        getRowId={r => r._id}
        loading={loading}
        error={error}
        onRetry={() => loadRequests()}
        onRowClick={r => navigate(`/new-request/${r._id}`)}
        empty={{ title: 'All caught up', description: 'No website requests are waiting for review.', icon: <Inbox /> }}
        rowActions={r => {
          const busy = reviewingId === r._id;
          return (
            <>
              <Button size="sm" variant="dangerGhost" disabled={!canReview || busy} title={noPermission}
                onClick={() => setPendingReview({ request: r, decision: 'reject' })}>
                Reject
              </Button>
              <Button size="sm" variant="primary" disabled={!canReview} loading={busy} title={noPermission}
                onClick={() => setPendingReview({ request: r, decision: 'accept' })}>
                Accept
              </Button>
            </>
          );
        }}
        footer={
          <Pagination
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onLimitChange={value => { setLimit(value); setPage(1); }}
          />
        }
      />

      <ConfirmDialog
        open={!!pendingReview}
        title={pendingReview?.decision === 'accept' ? 'Accept website request?' : 'Reject website request?'}
        message={
          pendingReview?.decision === 'accept'
            ? `${pendingReview.request.requestNumber} (${pendingReview.request.vesselName}) will be given a job number and moved to New Request.`
            : `${pendingReview?.request.requestNumber} (${pendingReview?.request.vesselName}) will be rejected and removed from this list.`
        }
        confirmText={pendingReview?.decision === 'accept' ? 'Accept' : 'Reject'}
        destructive={pendingReview?.decision === 'reject'}
        onConfirm={() => {
          const review = pendingReview;
          setPendingReview(null);
          if (review) handleReview(review);
        }}
        onCancel={() => setPendingReview(null)}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ marine (first entry) */

function FirstEntriesStat() {
  const { firstEntry } = useDashboardLinks();
  const load = useFirstEntries();
  return <Stat load={load} label="First entries" icon={<Ship />} tone="accent" value={countOf(load.data)} hint="On record" href={`${firstEntry}?tab=first-entry`} />;
}

function BookingsStat() {
  const { firstEntry } = useDashboardLinks();
  const load = useSharedLoad('fe-bookings', () => firstEntryService.getFirstEntrySurveyBookings({ page: 1, limit: 1 }));
  return <Stat load={load} label="Survey bookings" icon={<CalendarCheck />} tone="info" value={countOf(load.data)} hint="On record" href={`${firstEntry}?tab=survey`} />;
}

function ReportsStat() {
  const { firstEntry } = useDashboardLinks();
  const load = useSharedLoad('fe-reports', () => firstEntryService.getFirstEntrySurveyReports({ page: 1, limit: 1 }));
  return <Stat load={load} label="Survey reports" icon={<FileText />} tone="info" value={countOf(load.data)} hint="On record" href={`${firstEntry}?tab=reports`} />;
}

function CertificatesStat() {
  const { firstEntry } = useDashboardLinks();
  const load = useSharedLoad('fe-certificates', () => firstEntryService.getScccosCertificates({ page: 1, limit: 1 }));
  return <Stat load={load} label="Certificates" icon={<Award />} tone="success" value={countOf(load.data)} hint="Issued" href={`${firstEntry}?tab=certificates`} />;
}

function RecentFirstEntries() {
  const { firstEntry } = useDashboardLinks();
  const load = useFirstEntries();
  return (
    <Section title="Recent first entries" padding="none" actions={viewAll(`${firstEntry}?tab=first-entry`)}>
      <ListBody<ApiFirstEntry> load={load} rows={load.data?.data ?? []} empty="No first entries yet" emptyIcon={<Ship />}>
        {entry => {
          const vessel = typeof entry.vessel === 'object' ? entry.vessel : null;
          const request = typeof entry.request === 'object' ? entry.request : null;
          const uqms = vessel?.uqmsNumber;
          const tone: Tone = uqms ? 'success' : 'warning';
          return (
            <li key={entry._id}>
              <RowLink
                to={`${firstEntry}/edit/${entry._id}`}
                title={vessel?.vesselName || 'Unknown vessel'}
                sub={[request?.requestNumber, formatDate(entry.createdAt)].filter(Boolean).join(' · ')}
                end={<Badge tone={tone} dot title={uqms ? undefined : 'Schedule II documents not attached yet'}>{uqms || 'No Schedule II'}</Badge>}
              />
            </li>
          );
        }}
      </ListBody>
    </Section>
  );
}

/* ------------------------------------------------------------------ HR */

const personOf = (p: any) => [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Employee';
/** 4825000 -> "4.83M": keeps large amounts inside a stat tile; the exact figure goes in the hint. */
const compactNumber = (v?: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(v ?? 0);

function PendingLeaveStat() {
  const { leaves } = useDashboardLinks();
  const load = usePendingLeaves();
  const n: number = load.data?.data?.total ?? 0;
  return <Stat load={load} label="Leave requests" icon={<CalendarClock />} tone={n ? 'warning' : 'success'} value={n} hint={n ? 'Waiting for approval' : 'Nothing to approve'} href={leaves} />;
}

function PendingLeaveList() {
  const { leaves } = useDashboardLinks();
  const load = usePendingLeaves();
  const rows: any[] = load.data?.data?.requests ?? [];
  const total: number = load.data?.data?.total ?? 0;
  return (
    <Section title="Leave to approve" padding="none" actions={viewAll(leaves, total > rows.length ? `All ${total}` : 'Open leaves')}>
      <ListBody load={load} rows={rows} empty="Nothing to approve" emptyIcon={<CalendarClock />}>
        {req => (
          <li key={req._id}>
            <RowLink
              to={leaves || '#'}
              title={personOf(req.employee)}
              sub={`${req.leaveType?.name || 'Leave'} · ${formatDate(req.startDate)}${req.endDate && req.endDate !== req.startDate ? ` – ${formatDate(req.endDate)}` : ''}`}
              end={<Badge className="tabular">{req.totalDays} {req.totalDays === 1 ? 'day' : 'days'}</Badge>}
            />
          </li>
        )}
      </ListBody>
    </Section>
  );
}

function PresentTodayStat() {
  const { attendance } = useDashboardLinks();
  const load = useHrStats();
  const today = load.data?.data?.attendanceToday;
  return (
    <Stat load={load} label="Present today" icon={<UserCheck />} tone="info" value={today?.Present ?? 0}
      hint={today ? `${today.OnLeave || 0} on leave · ${today.Absent || 0} absent` : 'Attendance'} href={attendance} />
  );
}

function HeadcountStat() {
  const { employees } = useDashboardLinks();
  const load = useHrStats();
  const h = load.data?.data?.headcount;
  return (
    <Stat load={load} label="Headcount" icon={<Users />} tone="accent" value={h?.total ?? 0}
      hint={`${h?.byStatus?.Active ?? 0} active · ${h?.byStatus?.OnProbation ?? 0} on probation`} href={employees} />
  );
}

function PayrollStat() {
  const load = useHrStats();
  const p = load.data?.data?.payrollSummary;
  return (
    <Stat load={load} label="Payroll this month" icon={<Wallet />} tone="neutral" value={`Rs. ${compactNumber(p?.totalNetSalary)}`}
      hint={`${formatMoney(p?.totalNetSalary)} · ${p?.totalEmployees ?? 0} records`} />
  );
}

/** A titled list from the HR stats (departments, birthdays, …). */
function HrStatsList({ title, pick, empty, icon, children }: {
  title: string; pick: (stats: any) => any[] | undefined; empty: string; icon: ReactNode; children: (row: any) => ReactNode;
}) {
  const { hrDashboard } = useDashboardLinks();
  const load = useHrStats();
  const rows = pick(load.data?.data) ?? [];
  return (
    <Section title={title} padding="none" actions={viewAll(hrDashboard, 'HR overview')}>
      <ListBody load={load} rows={rows} empty={empty} emptyIcon={icon}>
        {row => <li key={row._id ?? row.department} className={s.row}>{children(row)}</li>}
      </ListBody>
    </Section>
  );
}

function DepartmentsWidget() {
  const { hrDashboard } = useDashboardLinks();
  const load = useHrStats();
  const rows: any[] = load.data?.data?.departmentDistribution ?? [];
  const max = Math.max(1, ...rows.map(d => d.count));
  return (
    <Section title="Department distribution" padding="md" actions={viewAll(hrDashboard, 'HR overview')}>
      {load.loading && !load.data ? <Skeleton height={60} />
        : load.error ? <ErrorState compact message={load.error} onRetry={load.reload} />
        : rows.length === 0 ? <EmptyState compact icon={<Users />} title="No employees yet" />
        : rows.map(d => (
          <div key={d.department} className={s.bar}>
            <div className={s.barHead}>
              <span>{d.department}</span>
              <span className={`${s.cellStrong} tabular`}>{d.count}</span>
            </div>
            <div className={s.barTrack}><div className={s.barFill} style={{ width: `${(d.count / max) * 100}%` }} /></div>
          </div>
        ))}
    </Section>
  );
}

function AnnouncementsWidget() {
  return (
    <HrStatsList title="Announcements" pick={st => st?.announcements} empty="No active announcements" icon={<Megaphone />}>
      {a => (
        <span className={s.rowMain}>
          <span className={s.rowTitle}>{a.title}</span>
          <span className={s.rowSubWrap}>{a.body?.length > 140 ? `${a.body.slice(0, 140)}…` : a.body}</span>
        </span>
      )}
    </HrStatsList>
  );
}

function BirthdaysWidget() {
  return (
    <HrStatsList title="Birthdays · next 30 days" pick={st => st?.upcomingBirthdays} empty="None in the next 30 days" icon={<Cake />}>
      {b => (
        <>
          <span className={s.rowMain}><span className={s.rowTitle}>{personOf(b)}</span></span>
          <span className={s.rowSub}>{b.inDays === 0 ? 'Today' : `in ${b.inDays}d (${formatDate(b.date)})`}</span>
        </>
      )}
    </HrStatsList>
  );
}

function ExpiringDocumentsWidget() {
  return (
    <HrStatsList title="Documents expiring · next 60 days" pick={st => st?.expiringDocuments} empty="Nothing expiring soon" icon={<FileWarning />}>
      {doc => (
        <>
          <span className={s.rowMain}>
            <span className={s.rowTitle}>{doc.title}</span>
            <span className={s.rowSub}>{personOf(doc.employee)} · {doc.category}</span>
          </span>
          <Badge tone="danger">{formatDate(doc.expiryDate)}</Badge>
        </>
      )}
    </HrStatsList>
  );
}

/* ------------------------------------------------------------------ finance */

function DraftQuotationsStat() {
  const { module } = useDashboardLinks();
  const load = useSharedLoad('quotations-draft', () => quotationsService.getQuotations({ status: 'draft', page: 1, limit: 1 }));
  const n = countOf(load.data);
  return <Stat load={load} label="Draft quotations" icon={<ReceiptText />} tone={n ? 'warning' : 'success'} value={n} hint={n ? 'Not sent yet' : 'All sent'} href={`${module(MODULE_KEYS.finance)}?tab=quotations`} />;
}

function RecentQuotations() {
  const { module } = useDashboardLinks();
  const load = useRecentQuotations();
  const base = module(MODULE_KEYS.finance);
  return (
    <Section title="Recent quotations" padding="none" actions={viewAll(`${base}?tab=quotations`)}>
      <ListBody<ApiQuotation> load={load} rows={load.data?.data ?? []} empty="No quotations yet" emptyIcon={<ReceiptText />}>
        {q => (
          <li key={q._id}>
            <RowLink
              to={`${base}/quotations/${q._id}`}
              title={q.vesselName || q.client?.companyName || q.quotationNumber}
              sub={[q.quotationNumber, formatDate(q.quotationDate)].filter(Boolean).join(' · ')}
              end={<StatusBadge status={q.status} />}
            />
          </li>
        )}
      </ListBody>
    </Section>
  );
}

/* ------------------------------------------------------------------ general */

function QuickActionsWidget() {
  const { can } = useAuth();
  const links = useDashboardLinks();
  const actions = [
    can(MODULE_KEYS.newRequest, 'override') && { to: '/new-request/create', label: 'New request', icon: <FilePlus2 /> },
    links.firstEntry && can(MODULE_KEYS.marineEntries, 'create') && { to: `${links.firstEntry}/create`, label: 'Create first entry', icon: <Plus /> },
    can(MODULE_KEYS.surveyorAllocation) && { to: links.module(MODULE_KEYS.surveyorAllocation), label: 'Allocate surveyors', icon: <UserCheck /> },
    can(MODULE_KEYS.financeQuotations, 'create') && { to: `${links.module(MODULE_KEYS.finance)}/quotations/new`, label: 'New quotation', icon: <ReceiptText /> },
    can(MODULE_KEYS.viewReport) && { to: links.module(MODULE_KEYS.viewReport), label: 'View reports', icon: <FileSearch /> },
    links.myHr && { to: links.myHr, label: 'My HR', icon: <CalendarClock /> },
    { to: '/profile', label: 'My profile', icon: <User /> },
  ].filter(Boolean) as { to: string; label: string; icon: ReactNode }[];

  return (
    <Section title="Quick actions" padding="md">
      <div className={s.actions}>
        {actions.map(a => <ButtonLink key={a.to} to={a.to} icon={a.icon} size="sm">{a.label}</ButtonLink>)}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ catalogue */

const hasFirstEntry = (a: WidgetAccess) => !!a.links.firstEntry;

/** Every widget a user can put on their dashboard. Ids are stored in users' saved layouts: don't rename them. */
export const WIDGETS: WidgetDef[] = [
  // General
  { id: 'general.quick-actions', title: 'Quick actions', description: 'Shortcuts to the things you create most.', group: 'General', icon: <Zap />,
    sizes: ['md', 'lg'], available: () => true, Component: QuickActionsWidget },

  // Survey jobs (V2)
  { id: 'jobs.open-count', title: 'My open jobs (count)', description: 'How many survey jobs are open for you.', group: 'Survey jobs', icon: <Briefcase />,
    sizes: ['sm'], available: a => a.can(MODULE_KEYS.jobs), Component: MyOpenJobsStat },
  { id: 'jobs.open-list', title: 'My open jobs', description: 'Your most recently updated open jobs and their status.', group: 'Survey jobs', icon: <Briefcase />,
    sizes: ['md', 'lg'], available: a => a.can(MODULE_KEYS.jobs), Component: MyOpenJobsList },
  { id: 'jobs.by-type', title: 'Open jobs by survey type', description: 'Open jobs split by main survey type.', group: 'Survey jobs', icon: <PieChart />,
    sizes: ['md', 'lg'], available: a => a.can(MODULE_KEYS.jobs), Component: JobsByTypeWidget },
  { id: 'jobs.allocation-count', title: 'Waiting for allocation', description: 'Accepted quotations that still need a surveyor.', group: 'Survey jobs', icon: <UserCheck />,
    sizes: ['sm'], available: a => a.can(MODULE_KEYS.surveyorAllocation), Component: AllocationStat },
  { id: 'jobs.authorization-count', title: 'Awaiting authorization (count)', description: 'Signed jobs waiting for manager approval.', group: 'Survey jobs', icon: <BadgeCheck />,
    sizes: ['sm'], available: a => a.can(MODULE_KEYS.authorization), Component: AuthorizationStat },
  { id: 'jobs.authorization-list', title: 'Awaiting authorization', description: 'The jobs waiting for your authorization.', group: 'Survey jobs', icon: <BadgeCheck />,
    sizes: ['md', 'lg'], available: a => a.can(MODULE_KEYS.authorization), Component: AuthorizationList },
  { id: 'jobs.completed-list', title: 'Recently completed reports', description: 'The latest completed, approved survey reports.', group: 'Survey jobs', icon: <FileSearch />,
    sizes: ['md', 'lg'], available: a => a.can(MODULE_KEYS.viewReport), Component: CompletedReportsList },
  { id: 'approvals.pending-count', title: 'Pending approvals (count)', description: 'Checklist changes waiting for review.', group: 'Survey jobs', icon: <CheckSquare />,
    sizes: ['sm'], available: a => a.can(MODULE_KEYS.approvals), Component: ApprovalsStat },
  { id: 'approvals.pending-list', title: 'Pending approvals', description: 'The latest changes waiting for review.', group: 'Survey jobs', icon: <CheckSquare />,
    sizes: ['md', 'lg'], available: a => a.can(MODULE_KEYS.approvals), Component: ApprovalsList },

  // Requests
  { id: 'requests.web-count', title: 'Website requests (count)', description: 'Website requests waiting for review.', group: 'Requests', icon: <Inbox />,
    sizes: ['sm'], available: a => a.can(MODULE_KEYS.newRequest), Component: WebRequestsStat },
  { id: 'requests.web-queue', title: 'Website requests', description: 'Review website requests: accept them into New Request or reject them.', group: 'Requests', icon: <Inbox />,
    sizes: ['lg', 'md'], available: a => a.can(MODULE_KEYS.newRequest), Component: WebRequestsQueue },

  // Marine (first entry)
  { id: 'marine.entries-count', title: 'First entries (count)', description: 'First entries on record.', group: 'Marine', icon: <Ship />,
    sizes: ['sm'], available: a => hasFirstEntry(a) && a.can(MODULE_KEYS.marineEntries), Component: FirstEntriesStat },
  { id: 'marine.recent-entries', title: 'Recent first entries', description: 'The latest first entries and their Schedule II status.', group: 'Marine', icon: <Ship />,
    sizes: ['md', 'lg'], available: a => hasFirstEntry(a) && a.can(MODULE_KEYS.marineEntries), Component: RecentFirstEntries },
  { id: 'marine.bookings-count', title: 'Survey bookings (count)', description: 'Survey bookings on record.', group: 'Marine', icon: <CalendarCheck />,
    sizes: ['sm'], available: a => hasFirstEntry(a) && a.can(MODULE_KEYS.marineBookings), Component: BookingsStat },
  { id: 'marine.reports-count', title: 'Survey reports (count)', description: 'Survey reports on record.', group: 'Marine', icon: <FileText />,
    sizes: ['sm'], available: a => hasFirstEntry(a) && a.can(MODULE_KEYS.marineReports), Component: ReportsStat },
  { id: 'marine.certificates-count', title: 'Certificates (count)', description: 'Certificates issued.', group: 'Marine', icon: <Award />,
    sizes: ['sm'], available: a => hasFirstEntry(a) && a.can(MODULE_KEYS.marineCertificates), Component: CertificatesStat },

  // HR
  { id: 'hr.leave-count', title: 'Leave requests (count)', description: 'Leave requests waiting for approval.', group: 'HR', icon: <CalendarClock />,
    sizes: ['sm'], available: a => a.can(MODULE_KEYS.hrLeave) && !!a.links.leaves, Component: PendingLeaveStat },
  { id: 'hr.leave-list', title: 'Leave to approve', description: 'The latest leave requests waiting for approval.', group: 'HR', icon: <CalendarClock />,
    sizes: ['md', 'lg'], available: a => a.can(MODULE_KEYS.hrLeave) && !!a.links.leaves, Component: PendingLeaveList },
  { id: 'hr.present-today', title: 'Present today', description: "Today's attendance: present, on leave and absent.", group: 'HR', icon: <UserCheck />,
    sizes: ['sm'], available: a => a.can(MODULE_KEYS.hrAttendance), Component: PresentTodayStat },
  { id: 'hr.headcount', title: 'Headcount', description: 'Employees on record, active and on probation.', group: 'HR', icon: <Users />,
    sizes: ['sm'], available: a => a.can(MODULE_KEYS.hrEmployees), Component: HeadcountStat },
  { id: 'hr.payroll', title: 'Payroll this month', description: "This month's total net salary.", group: 'HR', icon: <Wallet />,
    sizes: ['sm'], available: a => a.can(MODULE_KEYS.hrPayroll), Component: PayrollStat },
  { id: 'hr.departments', title: 'Department distribution', description: 'Employees per department.', group: 'HR', icon: <Users />,
    sizes: ['md', 'lg'], available: a => a.can(MODULE_KEYS.hrEmployees), Component: DepartmentsWidget },
  { id: 'hr.announcements', title: 'Announcements', description: 'Active HR announcements.', group: 'HR', icon: <Megaphone />,
    sizes: ['md', 'lg'], available: a => a.canAny(HR_KEYS), Component: AnnouncementsWidget },
  { id: 'hr.birthdays', title: 'Upcoming birthdays', description: 'Birthdays in the next 30 days.', group: 'HR', icon: <Cake />,
    sizes: ['md', 'lg'], available: a => a.canAny(HR_KEYS), Component: BirthdaysWidget },
  { id: 'hr.expiring-documents', title: 'Documents expiring', description: 'Employee documents expiring in the next 60 days.', group: 'HR', icon: <FileWarning />,
    sizes: ['md', 'lg'], available: a => a.can(MODULE_KEYS.hrEmployees), Component: ExpiringDocumentsWidget },

  // Finance
  { id: 'finance.draft-count', title: 'Draft quotations (count)', description: 'Quotations not yet sent to the client.', group: 'Finance', icon: <ReceiptText />,
    sizes: ['sm'], available: a => a.can(MODULE_KEYS.financeQuotations), Component: DraftQuotationsStat },
  { id: 'finance.recent-quotations', title: 'Recent quotations', description: 'The latest quotations and their status.', group: 'Finance', icon: <ReceiptText />,
    sizes: ['md', 'lg'], available: a => a.can(MODULE_KEYS.financeQuotations), Component: RecentQuotations },
];

export const WIDGETS_BY_ID: Record<string, WidgetDef> = Object.fromEntries(WIDGETS.map(w => [w.id, w]));

/** Tiles first (in this priority, at most four), then lists: the layout a user gets until they customize it. */
const DEFAULT_TILES = [
  'requests.web-count', 'jobs.open-count', 'jobs.authorization-count', 'hr.leave-count', 'jobs.allocation-count',
  'approvals.pending-count', 'marine.entries-count', 'marine.bookings-count', 'marine.reports-count', 'marine.certificates-count', 'hr.present-today',
];
const DEFAULT_LISTS = [
  'requests.web-queue', 'jobs.open-list', 'jobs.authorization-list', 'approvals.pending-list', 'marine.recent-entries', 'hr.leave-list',
];

export function defaultLayout(access: WidgetAccess): { id: string; size: DashboardWidgetSize }[] {
  const allowed = (id: string) => WIDGETS_BY_ID[id]?.available(access);
  const tiles = DEFAULT_TILES.filter(allowed).slice(0, 4);
  const lists = DEFAULT_LISTS.filter(allowed);
  const ids = [...tiles, ...(lists.length ? lists : ['general.quick-actions'])];
  return ids.map(id => ({ id, size: WIDGETS_BY_ID[id].sizes[0] }));
}
