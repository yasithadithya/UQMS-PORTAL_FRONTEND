import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Award, CalendarCheck, CalendarClock, ChevronRight, FilePlus2, FileText, Inbox, Plus, Ship, UserCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import { firstEntryService, hrService, requestsService, type ApiFirstEntry, type ApiRequest } from '@/api';
import { useNavigation } from '@/navigation/useNavigation';
import Pagination from '@/components/Pagination';
import { formatDate } from '@/utils/date';
import {
  Badge, Button, ButtonLink, Card, ConfirmDialog, DataTable, EmptyState, ErrorState, PageHeader, Section, Skeleton,
  StatCard, StatGrid, type Column, type Tone,
} from '@/ui';
import s from './Dashboard.module.css';

/* ------------------------------------------------------------------ data helper */

type Load<T> = { data?: T; loading: boolean; error?: string; reload: () => void };

/** Runs `load` when `enabled` (and again on reload); ignores responses that arrive after unmount. */
function useLoad<T>(load: () => Promise<T>, enabled: boolean): Load<T> {
  const [state, setState] = useState<{ data?: T; loading: boolean; error?: string }>({ loading: enabled });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState(prev => ({ ...prev, loading: true, error: undefined }));
    load()
      .then(data => { if (alive) setState({ data, loading: false }); })
      .catch((err: any) => { if (alive) setState({ loading: false, error: err?.message || 'Failed to load' }); });
    return () => { alive = false; };
    // `load` is a fresh closure every render; re-run only on enable/reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce]);

  return { ...state, reload: () => setNonce(n => n + 1) };
}

const countOf = (res: { count?: number } | undefined) => res?.count ?? 0;

const greetingForHour = (hour: number) => (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');

/* ------------------------------------------------------------------ page */

/**
 * Home: what needs attention now (website requests to review, leave to approve), the survey pipeline at a glance,
 * and the most recent work. Everything is limited to what the user's role can see.
 */
export default function DashboardPage() {
  const { user, can } = useAuth();
  const nav = useNavigation();
  const fe = nav.firstEntryPath;
  const leavesLink = nav.links.find(l => l.to.endsWith('tab=leaves'))?.to;
  const myHrLink = nav.links.find(l => l.to.endsWith('tab=myhr'))?.to;
  const attendanceLink = nav.links.find(l => l.to.endsWith('tab=attendance'))?.to;

  const canRequests = can(MODULE_KEYS.newRequest);
  const canLeave = can(MODULE_KEYS.hrLeave) && !!leavesLink;
  const canEntries = !!fe && can(MODULE_KEYS.marineEntries);

  // Stat cards in priority order; only the first four the user may see are shown (and fetched).
  const cardKeys = ([
    canRequests && 'requests',
    canLeave && 'leaves',
    canEntries && 'entries',
    !!fe && can(MODULE_KEYS.marineBookings) && 'bookings',
    !!fe && can(MODULE_KEYS.marineReports) && 'reports',
    !!fe && can(MODULE_KEYS.marineCertificates) && 'certificates',
    can(MODULE_KEYS.hrAttendance) && !!attendanceLink && 'attendance',
  ].filter(Boolean) as string[]).slice(0, 4);
  const shows = (key: string) => cardKeys.includes(key);

  const [webTotal, setWebTotal] = useState<number | null>(null);
  const entries = useLoad(() => firstEntryService.getFirstEntries({ page: 1, limit: 5 }), canEntries);
  const leaves = useLoad(() => hrService.getLeaveRequests({ status: 'Pending', page: 1, limit: 5 }), canLeave);
  const bookings = useLoad(() => firstEntryService.getFirstEntrySurveyBookings({ page: 1, limit: 1 }), shows('bookings'));
  const reports = useLoad(() => firstEntryService.getFirstEntrySurveyReports({ page: 1, limit: 1 }), shows('reports'));
  const certificates = useLoad(() => firstEntryService.getScccosCertificates({ page: 1, limit: 1 }), shows('certificates'));
  const hrStats = useLoad(() => hrService.getDashboardStats(), shows('attendance'));
  const attendanceToday = hrStats.data?.data?.attendanceToday;

  const pendingLeaves: any[] = leaves.data?.data?.requests ?? [];
  const pendingLeaveTotal: number = leaves.data?.data?.total ?? 0;

  const now = new Date();
  const today = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const cards: Record<string, ReactNode> = {
    requests: (
      <StatCard key="requests" label="Website requests" icon={<Inbox />} loading={webTotal === null}
        value={webTotal ?? 0} tone={webTotal ? 'warning' : 'success'} hint={webTotal ? 'Waiting for review' : 'All reviewed'} />
    ),
    leaves: (
      <StatCard key="leaves" label="Leave requests" icon={<CalendarClock />} loading={leaves.loading}
        value={leaves.error ? '—' : pendingLeaveTotal} tone={pendingLeaveTotal ? 'warning' : 'success'}
        hint={pendingLeaveTotal ? 'Waiting for approval' : 'Nothing to approve'} href={leavesLink} />
    ),
    entries: (
      <StatCard key="entries" label="First entries" icon={<Ship />} tone="accent" loading={entries.loading}
        value={entries.error ? '—' : countOf(entries.data)} hint="On record" href={`${fe}?tab=first-entry`} />
    ),
    bookings: (
      <StatCard key="bookings" label="Survey bookings" icon={<CalendarCheck />} tone="info" loading={bookings.loading}
        value={bookings.error ? '—' : countOf(bookings.data)} hint="On record" href={`${fe}?tab=survey`} />
    ),
    reports: (
      <StatCard key="reports" label="Survey reports" icon={<FileText />} tone="info" loading={reports.loading}
        value={reports.error ? '—' : countOf(reports.data)} hint="On record" href={`${fe}?tab=reports`} />
    ),
    attendance: (
      <StatCard key="attendance" label="Present today" icon={<UserCheck />} tone="info" loading={hrStats.loading}
        value={hrStats.error ? '—' : attendanceToday?.Present ?? 0}
        hint={attendanceToday ? `${attendanceToday.OnLeave || 0} on leave · ${attendanceToday.Absent || 0} absent` : 'Attendance'} href={attendanceLink} />
    ),
    certificates: (
      <StatCard key="certificates" label="Certificates" icon={<Award />} tone="success" loading={certificates.loading}
        value={certificates.error ? '—' : countOf(certificates.data)} hint="Issued" href={`${fe}?tab=certificates`} />
    ),
  };

  const quickActions = (
    <>
      {can(MODULE_KEYS.newRequest, 'create') && (
        <ButtonLink to="/new-request/create" icon={<FilePlus2 />}>New request</ButtonLink>
      )}
      {fe && can(MODULE_KEYS.marineEntries, 'create') && (
        <ButtonLink to={`${fe}/create`} variant="primary" icon={<Plus />}>Create first entry</ButtonLink>
      )}
    </>
  );

  const hasSide = canEntries || canLeave;
  const hasAnything = canRequests || hasSide || cardKeys.length > 0;

  return (
    <div className="animate-in">
      <PageHeader
        title={`${greetingForHour(now.getHours())}, ${user?.username || 'there'}`}
        description={today}
        actions={quickActions}
      />

      {cardKeys.length > 0 && <StatGrid>{cardKeys.map(k => cards[k])}</StatGrid>}

      {hasAnything ? (
        <div className={hasSide && canRequests ? s.columns : s.single}>
          {canRequests && <WebsiteRequestsQueue onTotalChange={setWebTotal} />}

          {hasSide && (
            <div className={s.side}>
              {canEntries && <RecentFirstEntries load={entries} basePath={fe!} />}
              {canLeave && <PendingLeaves load={leaves} rows={pendingLeaves} total={pendingLeaveTotal} href={leavesLink!} />}
            </div>
          )}
        </div>
      ) : (
        <Card padding="none">
          <EmptyState
            title="Welcome to UQMS"
            description="Use the menu to open the areas your role gives you access to."
            action={myHrLink ? <ButtonLink to={myHrLink} variant="primary">Open My HR</ButtonLink> : <ButtonLink to="/profile">View your profile</ButtonLink>}
          />
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ website requests */

const surveySummary = (request: ApiRequest) => {
  const names = (request.surveyTypes || []).map(survey => (typeof survey === 'string' ? survey : survey.name));
  if (names.length <= 2) return names.join(', ') || '—';
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
};

type PendingReview = { request: ApiRequest; decision: 'accept' | 'reject' };

/** Requests submitted through the website, waiting for staff to accept (→ New Request) or reject. */
function WebsiteRequestsQueue({ onTotalChange }: { onTotalChange: (total: number) => void }) {
  const { can } = useAuth();
  const navigate = useNavigate();
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
      onTotalChange(res.count || 0);
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

  // Kept to three stacked columns so the table fits beside the side panel on laptop screens.
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
        <div>
          <div className={s.queueTitleRow}>
            <h2 id="web-requests-title" className={s.queueTitle}>Website requests</h2>
            {total > 0 && <Badge tone="warning">{total} waiting</Badge>}
          </div>
          <p className={s.queueDescription}>Accepted requests get a job number and move to New Request.</p>
        </div>
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

/* ------------------------------------------------------------------ side lists */

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

function RecentFirstEntries({ load, basePath }: { load: Load<{ data: ApiFirstEntry[] }>; basePath: string }) {
  const rows = load.data?.data ?? [];
  return (
    <Section
      title="Recent first entries"
      padding="none"
      actions={<ButtonLink to={`${basePath}?tab=first-entry`} size="sm" variant="ghost" iconRight={<ChevronRight />}>View all</ButtonLink>}
    >
      {load.loading && rows.length === 0 ? <ListSkeleton />
        : load.error ? <ErrorState compact message={load.error} onRetry={load.reload} />
        : rows.length === 0 ? <EmptyState compact icon={<Ship />} title="No first entries yet" />
        : (
          <ul className={s.list}>
            {rows.map(entry => {
              const vessel = typeof entry.vessel === 'object' ? entry.vessel : null;
              const request = typeof entry.request === 'object' ? entry.request : null;
              const uqms = vessel?.uqmsNumber;
              const tone: Tone = uqms ? 'success' : 'warning';
              return (
                <li key={entry._id}>
                  <Link to={`${basePath}/edit/${entry._id}`} className={s.row}>
                    <span className={s.rowMain}>
                      <span className={s.rowTitle}>{vessel?.vesselName || 'Unknown vessel'}</span>
                      <span className={s.rowSub}>{[request?.requestNumber, formatDate(entry.createdAt)].filter(Boolean).join(' · ')}</span>
                    </span>
                    <Badge tone={tone} dot title={uqms ? undefined : 'Schedule II documents not attached yet'}>{uqms || 'No Schedule II'}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
    </Section>
  );
}

function PendingLeaves({ load, rows, total, href }: { load: Load<unknown>; rows: any[]; total: number; href: string }) {
  return (
    <Section
      title="Leave to approve"
      padding="none"
      actions={<ButtonLink to={href} size="sm" variant="ghost" iconRight={<ChevronRight />}>{total > rows.length ? `All ${total}` : 'Open leaves'}</ButtonLink>}
    >
      {load.loading && rows.length === 0 ? <ListSkeleton />
        : load.error ? <ErrorState compact message={load.error} onRetry={load.reload} />
        : rows.length === 0 ? <EmptyState compact icon={<CalendarClock />} title="Nothing to approve" />
        : (
          <ul className={s.list}>
            {rows.map(req => (
              <li key={req._id}>
                <Link to={href} className={s.row}>
                  <span className={s.rowMain}>
                    <span className={s.rowTitle}>{[req.employee?.firstName, req.employee?.lastName].filter(Boolean).join(' ') || 'Employee'}</span>
                    <span className={s.rowSub}>
                      {req.leaveType?.name || 'Leave'} · {formatDate(req.startDate)}
                      {req.endDate && req.endDate !== req.startDate ? ` – ${formatDate(req.endDate)}` : ''}
                    </span>
                  </span>
                  <Badge className="tabular">{req.totalDays} {req.totalDays === 1 ? 'day' : 'days'}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </Section>
  );
}
