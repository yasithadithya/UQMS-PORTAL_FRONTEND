import { useEffect, useRef, useState } from 'react';
import { PREVIEW_ONLY_HINT, previewPdfInNewTab, saveBlob } from '@/utils/pdfDelivery';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Award, CalendarCheck, Download, Eye, FileCheck2, FileText, PenLine, Pencil, Plus, Ship, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { firstEntryService } from '@/api';
import type { ApiFirstEntry, ApiFirstEntrySurveyBooking, ApiFirstEntrySurveyReport, ApiSCCCOS } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { AccessDenied } from '@/components/StatusPage';
import { MARINE_TABS, TAB_MODULE, type MarineTab } from './marineTabs';
import { formatDate } from '@/utils/date';
import ScccosModal from '@/components/ScccosModal';
import Pagination from '@/components/Pagination';
import { resolveModuleTrail } from '@/utils/modules';
import { Badge, Button, ButtonLink, ConfirmDialog, DataTable, Menu, PageHeader, StatusBadge, Tabs, type Column, type MenuItem } from '@/ui';
import s from './MarineModulePage.module.css';
import SignableDocumentModal from '@/components/ESignature/SignableDocumentModal';

type PendingDelete = { kind: MarineTab; id: string; title: string; message: string } | null;

export default function MarineModulePage() {
  const { can, modules } = useAuth();
  const navigate = useNavigate();
  const canOnTab = (tab: MarineTab, action: string) => can(TAB_MODULE[tab], action);
  const visibleTabs = MARINE_TABS.filter(t => canOnTab(t.id, 'read'));
  const { module } = useParams<{ module?: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // Derive the base path for this First Entry module from the URL
  // e.g., /reporting/marine/first-entry => basePath = /reporting/marine/first-entry
  const basePath = (() => {
    const segments = location.pathname.split('/').filter(Boolean);
    // Find 'first-entry' segment and use everything up to and including it
    const feIndex = segments.findIndex(s => s === 'first-entry');
    if (feIndex >= 0) return '/' + segments.slice(0, feIndex + 1).join('/');
    // Fallback to /:module/marine/first-entry
    return `/${module || 'reporting'}/marine/first-entry`;
  })();
  const [entries, setEntries] = useState<ApiFirstEntry[]>([]);
  const [surveyBookings, setSurveyBookings] = useState<ApiFirstEntrySurveyBooking[]>([]);
  const [reports, setReports] = useState<ApiFirstEntrySurveyReport[]>([]);
  const [certificates, setCertificates] = useState<ApiSCCCOS[]>([]);
  const [viewingCertificate, setViewingCertificate] = useState<ApiSCCCOS | null>(null);

  const [loading, setLoading] = useState(true);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [certificatesLoading, setCertificatesLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [surveyError, setSurveyError] = useState<string | null>(null);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [certificatesError, setCertificatesError] = useState<string | null>(null);

  // The active tab lives in the URL so returning from a create/edit page lands on the right list.
  const tabParam = searchParams.get('tab');
  const activeTab: MarineTab = visibleTabs.some(t => t.id === tabParam) ? (tabParam as MarineTab) : (visibleTabs[0]?.id ?? 'first-entry');
  const setActiveTab = (tab: MarineTab) => setSearchParams({ tab }, { replace: true });

  // Pagination states. The page belongs to the tab it was set on; switching to another tab (including via back/forward) shows page 1.
  const [pageState, setPageState] = useState<{ tab: MarineTab; page: number }>({ tab: activeTab, page: 1 });
  const page = pageState.tab === activeTab ? pageState.page : 1;
  const setPage = (p: number) => setPageState({ tab: activeTab, page: p });
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Every fetch takes a sequence number; responses from superseded requests are dropped.
  const requestSeq = useRef(0);

  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  // Scccos Modal States
  const [isScccosModalOpen, setIsScccosModalOpen] = useState(false);
  const [selectedBookingForScccos, setSelectedBookingForScccos] = useState<ApiFirstEntrySurveyBooking | null>(null);
  const [selectedReportIdForScccos, setSelectedReportIdForScccos] = useState<string>('');

  const loadTab = async (tab: MarineTab, currentPage: number, currentLimit: number) => {
    const seq = ++requestSeq.current;
    const isCurrent = () => seq === requestSeq.current;

    const setTabLoading = { 'first-entry': setLoading, survey: setSurveyLoading, reports: setReportsLoading, certificates: setCertificatesLoading }[tab];
    const setTabError = { 'first-entry': setError, survey: setSurveyError, reports: setReportsError, certificates: setCertificatesError }[tab];
    const failMessage = {
      'first-entry': 'Failed to fetch entries',
      survey: 'Failed to fetch survey bookings',
      reports: 'Failed to fetch survey reports',
      certificates: 'Failed to fetch certificates',
    }[tab];

    try {
      setTabLoading(true);
      setTabError(null);
      const params = { page: currentPage, limit: currentLimit };
      const res =
        tab === 'first-entry' ? await firstEntryService.getFirstEntries(params)
        : tab === 'survey' ? await firstEntryService.getFirstEntrySurveyBookings(params)
        : tab === 'reports' ? await firstEntryService.getFirstEntrySurveyReports(params)
        : await firstEntryService.getScccosCertificates(params);
      if (!isCurrent()) return;

      if (res.success) {
        if (tab === 'first-entry') setEntries(res.data as ApiFirstEntry[]);
        else if (tab === 'survey') setSurveyBookings(res.data as ApiFirstEntrySurveyBooking[]);
        else if (tab === 'reports') setReports(res.data as ApiFirstEntrySurveyReport[]);
        else setCertificates(res.data as ApiSCCCOS[]);
        setTotal(res.count || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      } else {
        setTabError(failMessage);
      }
    } catch (err: any) {
      if (isCurrent()) setTabError(err.message || failMessage);
    } finally {
      if (isCurrent()) setTabLoading(false);
    }
  };

  const reloadActiveTab = () => loadTab(activeTab, page, limit);

  const hasAnyTab = visibleTabs.length > 0;
  const canDeleteEntry = canOnTab('first-entry', 'delete');
  const canDeleteBooking = canOnTab('survey', 'delete');
  const canDeleteReport = canOnTab('reports', 'delete');
  const canDeleteCertificate = canOnTab('certificates', 'delete');

  useEffect(() => {
    if (hasAnyTab) loadTab(activeTab, page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, limit, hasAnyTab]);

  const DELETE_ACTIONS: Record<MarineTab, { run: (id: string) => Promise<{ success: boolean; message?: string }>; done: string }> = {
    'first-entry': { run: firstEntryService.deleteFirstEntry, done: 'First Entry deleted.' },
    survey: { run: firstEntryService.deleteFirstEntrySurveyBooking, done: 'Survey booking deleted.' },
    reports: { run: firstEntryService.deleteFirstEntrySurveyReport, done: 'Survey report deleted.' },
    certificates: { run: firstEntryService.deleteScccosCertificate, done: 'Certificate deleted.' },
  };

  const rowsOnPage = { 'first-entry': entries.length, survey: surveyBookings.length, reports: reports.length, certificates: certificates.length };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { kind, id } = pendingDelete;
    setPendingDelete(null);
    try {
      const res = await DELETE_ACTIONS[kind].run(id);
      if (!res.success) {
        toast.error(res.message || 'Delete failed.');
        return;
      }
      toast.success(DELETE_ACTIONS[kind].done);
      // Step back a page if this removed the last row, otherwise refetch so counts stay correct.
      if (kind === activeTab && rowsOnPage[kind] <= 1 && page > 1) setPage(page - 1);
      else reloadActiveTab();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed.');
    }
  };

  const handleDelete = (id: string) => setPendingDelete({
    kind: 'first-entry', id, title: 'Delete First Entry?',
    message: 'This will also delete any associated Schedule II documents. This cannot be undone.',
  });

  const handleDeleteSurveyBooking = (id: string) => setPendingDelete({
    kind: 'survey', id, title: 'Delete Survey Booking?', message: 'This cannot be undone.',
  });

  const handleDeleteReport = (id: string) => setPendingDelete({
    kind: 'reports', id, title: 'Delete Survey Report?', message: 'This cannot be undone.',
  });

  const handleDeleteCertificate = (id: string) => setPendingDelete({
    kind: 'certificates', id, title: 'Delete SCCCOS Certificate?', message: 'This cannot be undone.',
  });

  const handleDownloadCertificate = async (id: string, certificateNumber: string) => {
    try {
      saveBlob(await firstEntryService.getScccosFinalBlob(id), `scc_certificate_${certificateNumber.replace(/\s+/g, '_')}.pdf`);
    } catch (err: any) {
      toast.error('Failed to download certificate: ' + err.message);
    }
  };

  const handlePreviewCertificate = (id: string) => {
    previewPdfInNewTab(() => firstEntryService.getScccosFinalBlob(id))
      .catch((err: any) => toast.error('Failed to open certificate: ' + err.message));
  };

  const handleViewCos = async (reportId: string) => {
    try {
      const res = await firstEntryService.getScccosCertificateBySurveyReportId(reportId);
      if (res.success && res.data) {
        setViewingCertificate(res.data);
      } else {
        toast.error('Could not find the certificate record for this Survey Report.');
      }
    } catch (err: any) {
      toast.error('Failed to retrieve certificate: ' + err.message);
    }
  };

  const handleOpenScccosModal = (booking: ApiFirstEntrySurveyBooking, reportId: string) => {
    setSelectedBookingForScccos(booking);
    setSelectedReportIdForScccos(reportId);
    setIsScccosModalOpen(true);
  };

  if (!hasAnyTab) return <AccessDenied />;

  const breadcrumbs = (() => {
    const segments = basePath.split('/').filter(Boolean);
    const { trail } = resolveModuleTrail(modules, segments);
    return trail.map((m, i) => ({ label: m.name, href: i < trail.length - 1 ? '/' + segments.slice(0, i + 1).join('/') : undefined }));
  })();

  const noDelete = 'Your role cannot delete these records';

  const CREATE: Partial<Record<MarineTab, { label: string; to: string }>> = {
    'first-entry': { label: 'Create first entry', to: `${basePath}/create` },
    survey: { label: 'Book survey', to: `${basePath}/survey-booking/create` },
    reports: { label: 'Create survey report', to: `${basePath}/survey-report/create` },
  };
  const create = canOnTab(activeTab, 'create') ? CREATE[activeTab] : undefined;
  const createButton = create && (
    <ButtonLink to={create.to} variant="primary" icon={<Plus />}>{create.label}</ButtonLink>
  );

  const DESCRIPTIONS: Record<MarineTab, string> = {
    'first-entry': 'Vessels registered against accepted requests, with quotations and Schedule II documents.',
    survey: 'Survey bookings, planned visits and surveyor assignments.',
    reports: 'Survey reports, full reports and certificates of survey.',
    certificates: 'Small Craft Code Certificates of Survey issued for SSC vessels.',
  };

  const isTabLoading = { 'first-entry': loading, survey: surveyLoading, reports: reportsLoading, certificates: certificatesLoading }[activeTab];

  const pagination = (
    <Pagination page={page} limit={limit} total={total} totalPages={totalPages} onPageChange={setPage} onLimitChange={setLimit} />
  );

  const vesselOf = (entry: ApiFirstEntry) => (typeof entry.vessel === 'object' && entry.vessel ? entry.vessel : null);

  const deleteItem = (allowed: boolean, onSelect: () => void): MenuItem => ({
    label: 'Delete', icon: <Trash2 />, danger: true, disabled: !allowed, hint: allowed ? undefined : noDelete, onSelect,
  });

  /* ---------- First entries ---------- */
  const entryColumns: Column<ApiFirstEntry>[] = [
    {
      key: 'vessel', header: 'Vessel', primary: true,
      cell: entry => {
        const vessel = vesselOf(entry);
        return (
          <div className={s.stack}>
            <span>{vessel?.vesselName || 'Unknown vessel'}</span>
            <span className={s.sub}>IMO {vessel?.imoNumber || '—'} · MMSI {vessel?.mmsiNumber || '—'}</span>
          </div>
        );
      },
    },
    {
      key: 'request', header: 'Request no.', nowrap: true,
      cell: entry => (typeof entry.request === 'object' && entry.request ? entry.request.requestNumber : null) || '—',
    },
    {
      key: 'uqms', header: 'UQMS no.', nowrap: true,
      cell: entry => {
        const uqms = vesselOf(entry)?.uqmsNumber;
        return uqms
          ? <Badge tone="success">{uqms}</Badge>
          : <Badge tone="warning" dot title="Schedule II documents not attached yet">No Schedule II</Badge>;
      },
    },
    {
      key: 'quote', header: 'Quotation',
      cell: entry => (
        <div className={s.stack}>
          <span>{entry.isQuoted ? <Badge tone="accent">Quoted</Badge> : <Badge>Not quoted</Badge>}</span>
          <span className={s.sub} title={entry.isQuoted ? undefined : entry.quotationComments}>
            {entry.isQuoted ? `No. ${entry.quotationNumber || '—'}` : entry.quotationComments || 'No comment'}
          </span>
        </div>
      ),
    },
    {
      key: 'schedule', header: 'Schedule II', nowrap: true,
      cell: entry => {
        const schedule = typeof entry.scheduleII === 'object' && entry.scheduleII ? entry.scheduleII : null;
        const count = schedule?.documents?.length ?? 0;
        return count > 0
          ? <span className={s.files}><FileCheck2 aria-hidden="true" />{count} {count === 1 ? 'file' : 'files'}</span>
          : <span className={s.sub}>None</span>;
      },
    },
  ];

  /* ---------- Survey bookings ---------- */
  const bookingColumns: Column<ApiFirstEntrySurveyBooking>[] = [
    {
      key: 'ship', header: 'Ship', primary: true,
      cell: b => (
        <div className={s.stack}>
          <span>{b.shipName}</span>
          <span className={s.sub}>{b.shipType || 'Type not set'}</span>
        </div>
      ),
    },
    { key: 'uqms', header: 'UQMS no.', nowrap: true, cell: b => (b.uqmsNo ? <Badge tone="success">{b.uqmsNo}</Badge> : '—') },
    { key: 'requested', header: 'Requested', nowrap: true, cell: b => (b.requestedDate ? formatDate(b.requestedDate) : '—') },
    { key: 'society', header: 'Society', cell: b => b.society || '—' },
    {
      key: 'visits', header: 'Visits',
      cell: b => {
        const visits = b.visitDetails?.length ?? 0;
        if (!visits) return <span className={s.sub}>None planned</span>;
        const last = b.lastVisitDate || b.lastVisit;
        return (
          <div className={s.stack}>
            <span>{visits} {visits === 1 ? 'visit' : 'visits'}</span>
            {last && <span className={s.sub}>Last {formatDate(last)}</span>}
          </div>
        );
      },
    },
  ];

  /* ---------- Survey reports ---------- */
  const reportCertificateAction = (report: ApiFirstEntrySurveyReport): MenuItem | null => {
    const vessel = typeof report.vesselId === 'object' && report.vesselId ? report.vesselId : null;
    const booking = typeof report.bookingId === 'object' && report.bookingId ? report.bookingId : null;
    const isScccosEligible = !!(
      vessel &&
      vessel.vesselCode === 'SSC' &&
      booking &&
      (booking.lastVisitDate || booking.lastVisit || booking.visitDetails?.some((v: any) => v.isLastVist || v.isLastVisitDate))
    );
    if (report.status === 'COS Generated' && canOnTab('certificates', 'read')) {
      return { label: 'View COS', icon: <Award />, onSelect: () => handleViewCos(report._id) };
    }
    if (isScccosEligible && booking && canOnTab('certificates', 'create')) {
      return { label: 'Generate SSC COS', icon: <Award />, onSelect: () => handleOpenScccosModal(booking, report._id) };
    }
    return null;
  };

  const reportColumns: Column<ApiFirstEntrySurveyReport>[] = [
    { key: 'no', header: 'Report no.', nowrap: true, cell: r => <span className={s.mono}>{r.reportNo}</span> },
    {
      key: 'ship', header: 'Ship', primary: true,
      cell: r => (
        <div className={s.stack}>
          <span>{r.shipName}</span>
          {r.managedBy && <span className={s.sub}>Managed by {r.managedBy}</span>}
        </div>
      ),
    },
    { key: 'uqms', header: 'UQMS no.', nowrap: true, cell: r => (r.uqmsNo ? <Badge tone="success">{r.uqmsNo}</Badge> : '—') },
    { key: 'port', header: 'Port', cell: r => r.portOfSurvey || '—' },
    {
      key: 'dates', header: 'Survey dates', nowrap: true,
      cell: r => (
        <div className={s.stack}>
          <span>{r.firstSurveyDate ? formatDate(r.firstSurveyDate) : '—'}</span>
          {r.lastSurveyDate && <span className={s.sub}>to {formatDate(r.lastSurveyDate)}</span>}
        </div>
      ),
    },
    { key: 'status', header: 'Status', nowrap: true, cell: r => <StatusBadge status={r.status || 'Draft'} /> },
  ];

  /* ---------- Certificates ---------- */
  const certificateColumns: Column<ApiSCCCOS>[] = [
    { key: 'no', header: 'Certificate no.', nowrap: true, cell: c => <span className={s.mono}>{c.certificateNumber}</span> },
    {
      key: 'vessel', header: 'Vessel', primary: true,
      cell: c => {
        const vessel = typeof c.vesselId === 'object' && c.vesselId ? c.vesselId : null;
        return (
          <div className={s.stack}>
            <span>{vessel?.vesselName || 'Unknown vessel'}</span>
            {vessel?.uqmsNumber && <span className={s.sub}>{vessel.uqmsNumber}</span>}
          </div>
        );
      },
    },
    { key: 'issued', header: 'Issued', nowrap: true, cell: c => formatDate(c.dateOfIssue) },
    {
      key: 'by', header: 'Issued by',
      cell: c => {
        const issuedBy = typeof c.issuedBy === 'object' && c.issuedBy ? c.issuedBy : null;
        return issuedBy?.username || issuedBy?.email || 'System';
      },
    },
    {
      key: 'signed', header: 'Signature', nowrap: true,
      cell: c => (c.eSignature ? <StatusBadge status="Signed" /> : <StatusBadge status="Pending signature" label="Not signed" />),
    },
  ];

  return (
    <div className="animate-in">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title="First Entry"
        description={DESCRIPTIONS[activeTab]}
        actions={createButton}
      />

      <Tabs
        label="First Entry sections"
        value={activeTab}
        onValueChange={setActiveTab}
        items={visibleTabs.map(t => ({ value: t.id, label: t.navLabel, count: t.id === activeTab && !isTabLoading ? total : undefined }))}
      />

      {activeTab === 'first-entry' && (
        <DataTable
          caption="First entries"
          columns={entryColumns}
          rows={entries}
          getRowId={e => e._id}
          loading={loading}
          error={error}
          onRetry={reloadActiveTab}
          onRowClick={e => navigate(`${basePath}/edit/${e._id}`)}
          empty={{
            icon: <Ship />,
            title: 'No first entries yet',
            description: 'Register a vessel against an accepted request to get started.',
            action: createButton,
          }}
          rowActions={e => (
            <>
              <ButtonLink to={`${basePath}/edit/${e._id}`} size="sm" variant="secondary">Edit</ButtonLink>
              <Menu label={`More actions for ${vesselOf(e)?.vesselName || 'entry'}`} items={[deleteItem(canDeleteEntry, () => handleDelete(e._id))]} />
            </>
          )}
          footer={pagination}
        />
      )}

      {activeTab === 'survey' && (
        <DataTable
          caption="Survey bookings"
          columns={bookingColumns}
          rows={surveyBookings}
          getRowId={b => b._id}
          loading={surveyLoading}
          error={surveyError}
          onRetry={reloadActiveTab}
          onRowClick={b => navigate(`${basePath}/survey-booking/edit/${b._id}`)}
          empty={{
            icon: <CalendarCheck />,
            title: 'No survey bookings yet',
            description: 'Book a survey visit for a registered first entry vessel.',
            action: createButton,
          }}
          rowActions={b => (
            <>
              <ButtonLink to={`${basePath}/survey-booking/edit/${b._id}`} size="sm" variant="secondary">Edit</ButtonLink>
              <Menu label={`More actions for ${b.shipName}`} items={[deleteItem(canDeleteBooking, () => handleDeleteSurveyBooking(b._id))]} />
            </>
          )}
          footer={pagination}
        />
      )}

      {activeTab === 'reports' && (
        <DataTable
          caption="Survey reports"
          columns={reportColumns}
          rows={reports}
          getRowId={r => r._id}
          loading={reportsLoading}
          error={reportsError}
          onRetry={reloadActiveTab}
          onRowClick={r => navigate(`${basePath}/survey-report/full/${r._id}`)}
          empty={{
            icon: <FileText />,
            title: 'No survey reports yet',
            description: 'Create a survey report from a completed survey booking.',
            action: createButton,
          }}
          rowActions={r => (
            <>
              <ButtonLink to={`${basePath}/survey-report/full/${r._id}`} size="sm" variant="secondary">Full report</ButtonLink>
              <Menu
                label={`More actions for ${r.reportNo}`}
                items={[
                  reportCertificateAction(r),
                  { label: 'Edit report', icon: <Pencil />, onSelect: () => navigate(`${basePath}/survey-report/edit/${r._id}`) },
                  'separator',
                  deleteItem(canDeleteReport, () => handleDeleteReport(r._id)),
                ]}
              />
            </>
          )}
          footer={pagination}
        />
      )}

      {activeTab === 'certificates' && (
        <DataTable
          caption="Certificates"
          columns={certificateColumns}
          rows={certificates}
          getRowId={c => c._id}
          loading={certificatesLoading}
          error={certificatesError}
          onRetry={reloadActiveTab}
          onRowClick={c => setViewingCertificate(c)}
          empty={{
            icon: <Award />,
            title: 'No certificates yet',
            description: 'Generate a Small Craft Code Certificate of Survey from the Survey Reports tab for eligible SSC vessels.',
          }}
          rowActions={c => (
            <>
              <Button size="sm" variant={c.eSignature ? 'secondary' : 'primary'} icon={c.eSignature ? undefined : <PenLine />} onClick={() => setViewingCertificate(c)}>
                {c.eSignature ? 'View' : 'View & sign'}
              </Button>
              <Menu
                label={`More actions for ${c.certificateNumber}`}
                items={[
                  c.eSignature
                    ? { label: 'Download PDF', icon: <Download />, onSelect: () => handleDownloadCertificate(c._id, c.certificateNumber) }
                    : { label: 'Preview PDF', icon: <Eye />, hint: PREVIEW_ONLY_HINT, onSelect: () => handlePreviewCertificate(c._id) },
                  'separator',
                  deleteItem(canDeleteCertificate, () => handleDeleteCertificate(c._id)),
                ]}
              />
            </>
          )}
          footer={pagination}
        />
      )}

      <ScccosModal
        isOpen={isScccosModalOpen}
        onClose={() => {
          setIsScccosModalOpen(false);
          setSelectedBookingForScccos(null);
          setSelectedReportIdForScccos('');
        }}
        booking={selectedBookingForScccos}
        surveyReportId={selectedReportIdForScccos}
        onSuccess={reloadActiveTab}
      />

      {viewingCertificate && (
        <SignableDocumentModal
          key={viewingCertificate._id}
          isOpen
          onClose={() => setViewingCertificate(null)}
          title={`SSC Certificate of Survey — ${viewingCertificate.certificateNumber}`}
          docType="scccos"
          docId={viewingCertificate._id}
          fetchPdf={() => firstEntryService.getScccosFinalBlob(viewingCertificate._id)}
          downloadFileName={`scc_certificate_${viewingCertificate.certificateNumber.replace(/\s+/g, '_')}.pdf`}
          onStatusChange={(status) => {
            setCertificates((prev) => prev.map((c) => (
              c._id === viewingCertificate._id ? { ...c, eSignature: status.eSignature || undefined } : c
            )));
          }}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={pendingDelete?.title || ''}
        message={pendingDelete?.message || ''}
        confirmText="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
