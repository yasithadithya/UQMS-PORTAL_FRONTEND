import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { firstEntryService } from '@/api';
import type { ApiFirstEntry, ApiFirstEntrySurveyBooking, ApiFirstEntrySurveyReport, ApiSCCCOS } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/utils/date';
import ScccosModal from '@/components/ScccosModal';
import Pagination from '@/components/Pagination';
import ConfirmModal from '@/components/ConfirmModal';
import SignableDocumentModal from '@/components/ESignature/SignableDocumentModal';

export type MarineTab = 'first-entry' | 'survey' | 'reports' | 'certificates';
const MARINE_TABS: { id: MarineTab; label: string }[] = [
  { id: 'first-entry', label: 'First Entry' },
  { id: 'survey', label: 'Surveys' },
  { id: 'reports', label: 'Survey Reports' },
  { id: 'certificates', label: 'Certificates' },
];

type PendingDelete = { kind: MarineTab; id: string; title: string; message: string } | null;

export default function MarineModulePage() {
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('Marine', 'delete') || hasPermission('First Entry', 'delete');
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
  const activeTab: MarineTab = MARINE_TABS.some(t => t.id === tabParam) ? (tabParam as MarineTab) : 'first-entry';
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

  useEffect(() => {
    loadTab(activeTab, page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, limit]);

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
      const blob = await firstEntryService.getScccosFinalBlob(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scc_certificate_${certificateNumber.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('Failed to download certificate: ' + err.message);
    }
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

  return (
    <div className="animate-in" style={{ padding: '4px' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="greeting" style={{ animation: 'fadeUp .4s ease both' }}>First Entry Operations</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
            Manage first entries, survey details, and Schedule II attachments.
          </p>
        </div>
        <div>
          {activeTab === 'first-entry' ? (
            <Link to={`${basePath}/create`} style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', height: 'auto', marginBottom: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create First Entry
              </button>
            </Link>
          ) : activeTab === 'survey' ? (
            <Link to={`${basePath}/survey-booking/create`} style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', height: 'auto', marginBottom: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Book Survey
              </button>
            </Link>
          ) : activeTab === 'reports' ? (
            <Link to={`${basePath}/survey-report/create`} style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', height: 'auto', marginBottom: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create Survey Report
              </button>
            </Link>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="First Entry sections" style={{ display: 'flex', borderBottom: '1px solid var(--separator)', marginBottom: '24px', gap: '20px', overflowX: 'auto' }}>
        {MARINE_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--label)' : 'var(--muted)',
              fontSize: '14px',
              fontWeight: 600,
              padding: '12px 4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all var(--transition)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'first-entry' && (
        <div>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
              <p style={{ fontSize: '14px' }}>Loading First Entries...</p>
            </div>
          ) : error ? (
            <div className="card" style={{ padding: '24px', textAlign: 'center', borderColor: 'var(--red)' }}>
              <p style={{ color: 'var(--red)', fontSize: '14px', fontWeight: 500 }}>{error}</p>
              <button className="btn-secondary" onClick={reloadActiveTab} style={{ marginTop: '12px', minWidth: '120px' }}>Retry</button>
            </div>
          ) : entries.length === 0 ? (
            <div className="card animate-in" style={{ padding: '60px 40px', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px', background: 'transparent' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.6 }}>🚢</div>
              <h3 style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '8px' }}>No First Entries Found</h3>
              <p style={{ color: 'var(--muted)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5', fontSize: '13px', marginBottom: '20px' }}>
                There are no First Entry records created yet. Get started by registering a new vessel and request association.
              </p>
              <Link to={`${basePath}/create`} style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', height: 'auto', width: 'auto', minWidth: 0, marginBottom: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add First Entry
                </button>
              </Link>
            </div>
          ) : (
            <div className="card animate-in" style={{ overflowX: 'auto', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--separator)' }}>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Vessel Name</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Request No</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>UQMS Number</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Quote Status</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Schedule II Docs</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const vessel = typeof entry.vessel === 'object' && entry.vessel ? entry.vessel : null;
                    const request = typeof entry.request === 'object' && entry.request ? entry.request : null;
                    const schedule = typeof entry.scheduleII === 'object' && entry.scheduleII ? entry.scheduleII : null;
                    const uqms = vessel?.uqmsNumber;

                    return (
                      <tr key={entry._id} style={{ borderBottom: '1px solid var(--separator)', transition: 'background var(--transition)' }} className="table-row-hover">
                        <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--label)', fontSize: '14px' }}>
                          {vessel?.vesselName || 'Unknown Vessel'}
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', fontWeight: 400, marginTop: '2px' }}>
                            IMO: {vessel?.imoNumber || 'N/A'} | MMSI: {vessel?.mmsiNumber || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--secondary)', fontSize: '13px' }}>
                          {request?.requestNumber || 'N/A'}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                          {uqms ? (
                            <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '6px', background: 'var(--green-subtle)', color: 'var(--green)', fontWeight: 600, fontSize: '12px' }}>
                              {uqms}
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '6px', background: 'var(--orange-subtle)', color: 'var(--orange)', fontWeight: 500, fontSize: '12px' }} title="Pending Schedule II Documents">
                              Pending
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                          {entry.isQuoted ? (
                            <div>
                              <span style={{ display: 'inline-flex', padding: '3px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', fontWeight: 600, fontSize: '11px', marginBottom: '4px' }}>
                                Quoted
                              </span>
                              <span style={{ display: 'block', fontSize: '11px', color: 'var(--secondary)' }}>
                                No: {entry.quotationNumber || 'N/A'}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span style={{ display: 'inline-flex', padding: '3px 6px', borderRadius: '4px', background: 'rgba(148, 163, 184, 0.1)', color: 'var(--muted)', fontWeight: 500, fontSize: '11px', marginBottom: '4px' }}>
                                Not Quoted
                              </span>
                              <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }} title={entry.quotationComments}>
                                {entry.quotationComments || 'No comment'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                          {schedule && schedule.documents && schedule.documents.length > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                              </svg>
                              <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: '13px' }}>
                                {schedule.documents.length} File(s)
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                              </svg>
                              <span style={{ fontSize: '13px' }}>None</span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <Link to={`${basePath}/edit/${entry._id}`} style={{ textDecoration: 'none' }}>
                              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', minWidth: '60px', marginBottom: 0 }}>
                                Edit
                              </button>
                            </Link>
                            <button
                              onClick={() => handleDelete(entry._id)}
                              className="btn-secondary"
                              disabled={!canDelete}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                borderRadius: '8px',
                                minWidth: '60px',
                                color: 'var(--red)',
                                borderColor: 'rgba(239, 68, 68, .2)',
                                background: 'transparent',
                                marginBottom: 0,
                                opacity: canDelete ? 1 : 0.4,
                                cursor: canDelete ? 'pointer' : 'not-allowed',
                                pointerEvents: canDelete ? 'auto' : 'none'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--red-subtle)'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Surveys Tab Content */}
      {activeTab === 'survey' && (
        <div>
          {surveyLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
              <p style={{ fontSize: '14px' }}>Loading Survey Bookings...</p>
            </div>
          ) : surveyError ? (
            <div className="card" style={{ padding: '24px', textAlign: 'center', borderColor: 'var(--red)' }}>
              <p style={{ color: 'var(--red)', fontSize: '14px', fontWeight: 500 }}>{surveyError}</p>
              <button className="btn-secondary" onClick={reloadActiveTab} style={{ marginTop: '12px', minWidth: '120px' }}>Retry</button>
            </div>
          ) : surveyBookings.length === 0 ? (
            <div className="card animate-in" style={{ padding: '60px 40px', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px', background: 'transparent' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.6 }}>📅</div>
              <h3 style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '8px' }}>No Survey Bookings Found</h3>
              <p style={{ color: 'var(--muted)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5', fontSize: '13px', marginBottom: '20px' }}>
                There are no surveys booked for first entry vessels yet. Click the button below to book a new survey visit.
              </p>
              <Link to={`${basePath}/survey-booking/create`} style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', height: 'auto', width: 'auto', minWidth: 0, marginBottom: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Book A Survey
                </button>
              </Link>
            </div>
          ) : (
            <div className="card animate-in" style={{ overflowX: 'auto', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--separator)' }}>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Ship Name</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>UQMS No.</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Requested Date</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Society</th>
                    {/* <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Surveys Requested</th> */}
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Planned Visits</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {surveyBookings.map((booking) => {
                    const reqDate = booking.requestedDate ? formatDate(booking.requestedDate) : 'N/A';
                    return (
                      <tr key={booking._id} style={{ borderBottom: '1px solid var(--separator)', transition: 'background var(--transition)' }} className="table-row-hover">
                        <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--label)', fontSize: '14px' }}>
                          {booking.shipName}
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', fontWeight: 400, marginTop: '2px' }}>
                            Type: {booking.shipType || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                          {booking.uqmsNo ? (
                            <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '6px', background: 'var(--green-subtle)', color: 'var(--green)', fontWeight: 600, fontSize: '12px' }}>
                              {booking.uqmsNo}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--secondary)', fontSize: '13px' }}>
                          {reqDate}
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--secondary)', fontSize: '13px' }}>
                          {booking.society || '—'}
                        </td>
                        {/* <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                            {booking.surveysRequested && booking.surveysRequested.length > 0 ? (
                              booking.surveysRequested.map((code, idx) => (
                                <span key={idx} style={{ display: 'inline-flex', padding: '2px 6px', borderRadius: '4px', background: 'var(--primary-subtle)', color: 'var(--primary)', fontWeight: 600, fontSize: '10px' }}>
                                  {code}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: 'var(--muted)', fontSize: '11px' }}>None</span>
                            )}
                          </div>
                        </td> */}
                        <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                          {booking.visitDetails && booking.visitDetails.length > 0 ? (
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--label)' }}>
                                {booking.visitDetails.length} Visit(s)
                              </span>
                              {(booking.lastVisitDate || booking.lastVisit) && (
                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--primary)', fontWeight: 600, marginTop: '4px' }}>
                                  Last: {formatDate(booking.lastVisitDate || booking.lastVisit)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>No visits planned</span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <Link to={`${basePath}/survey-booking/edit/${booking._id}`} style={{ textDecoration: 'none' }}>
                              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', minWidth: '60px', marginBottom: 0 }}>
                                Edit
                              </button>
                            </Link>
                            <button
                              onClick={() => handleDeleteSurveyBooking(booking._id)}
                              className="btn-secondary"
                              disabled={!canDelete}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                borderRadius: '8px',
                                minWidth: '60px',
                                color: 'var(--red)',
                                borderColor: 'rgba(239, 68, 68, .2)',
                                background: 'transparent',
                                marginBottom: 0,
                                opacity: canDelete ? 1 : 0.4,
                                cursor: canDelete ? 'pointer' : 'not-allowed',
                                pointerEvents: canDelete ? 'auto' : 'none'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--red-subtle)'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Survey Reports Tab Content */}
      {activeTab === 'reports' && (
        <div>
          {reportsLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
              <p style={{ fontSize: '14px' }}>Loading Survey Reports...</p>
            </div>
          ) : reportsError ? (
            <div className="card" style={{ padding: '24px', textAlign: 'center', borderColor: 'var(--red)' }}>
              <p style={{ color: 'var(--red)', fontSize: '14px', fontWeight: 500 }}>{reportsError}</p>
              <button className="btn-secondary" onClick={reloadActiveTab} style={{ marginTop: '12px', minWidth: '120px' }}>Retry</button>
            </div>
          ) : reports.length === 0 ? (
            <div className="card animate-in" style={{ padding: '60px 40px', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px', background: 'transparent' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.6 }}>📝</div>
              <h3 style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '8px' }}>No Survey Reports Found</h3>
              <p style={{ color: 'var(--muted)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5', fontSize: '13px', marginBottom: '20px' }}>
                There are no survey reports generated yet. Click the button below to generate a new report.
              </p>
              <Link to={`${basePath}/survey-report/create`} style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', height: 'auto', width: 'auto', minWidth: 0, marginBottom: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Generate Survey Report
                </button>
              </Link>
            </div>
          ) : (
            <div className="card animate-in" style={{ overflowX: 'auto', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--separator)' }}>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Report No.</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Ship Name</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>UQMS No.</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Port of Survey</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>1st Survey Date</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Last Survey Date</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => {
                    const firstDate = report.firstSurveyDate ? formatDate(report.firstSurveyDate) : 'N/A';
                    const lastDate = report.lastSurveyDate ? formatDate(report.lastSurveyDate) : 'N/A';
                    return (
                      <tr key={report._id} style={{ borderBottom: '1px solid var(--separator)', transition: 'background var(--transition)' }} className="table-row-hover">
                        <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--primary)', fontSize: '13px', fontFamily: 'monospace' }}>
                          {report.reportNo}
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--label)', fontSize: '14px' }}>
                          {report.shipName}
                          {report.managedBy && (
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', fontWeight: 400, marginTop: '2px' }}>
                              Managed by: {report.managedBy}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                          {report.uqmsNo ? (
                            <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '6px', background: 'var(--green-subtle)', color: 'var(--green)', fontWeight: 600, fontSize: '12px' }}>
                              {report.uqmsNo}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--secondary)', fontSize: '13px' }}>
                          {report.portOfSurvey || '—'}
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--secondary)', fontSize: '13px' }}>
                          {firstDate}
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--secondary)', fontSize: '13px' }}>
                          {lastDate}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                          <span style={{
                            display: 'inline-flex',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: report.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.15)',
                            color: report.status === 'Approved' ? 'var(--green)' : 'var(--muted)',
                            fontWeight: 600,
                            fontSize: '11px'
                          }}>
                            {report.status || 'Draft'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <Link to={`${basePath}/survey-report/full/${report._id}`} style={{ textDecoration: 'none' }}>
                              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', minWidth: '65px', marginBottom: 0, color: 'var(--primary)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                                Full Report
                              </button>
                            </Link>
                            {(() => {
                              const vessel = typeof report.vesselId === 'object' && report.vesselId ? report.vesselId : null;
                              const booking = typeof report.bookingId === 'object' && report.bookingId ? report.bookingId : null;
                              const isScccosEligible = !!(
                                vessel &&
                                vessel.vesselCode === 'SSC' &&
                                booking &&
                                (booking.lastVisitDate || booking.lastVisit || booking.visitDetails?.some((v: any) => v.isLastVist || v.isLastVisitDate))
                              );
                              if (report.status === 'COS Generated') {
                                return (
                                  <button
                                    onClick={() => handleViewCos(report._id)}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', minWidth: '65px', marginBottom: 0, color: 'var(--primary)', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                                  >
                                    View COS
                                  </button>
                                );
                              }
                              if (isScccosEligible && booking) {
                                return (
                                  <button
                                    onClick={() => handleOpenScccosModal(booking, report._id)}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', minWidth: '65px', marginBottom: 0, color: 'var(--green)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                                  >
                                    SSC COS
                                  </button>
                                );
                              }
                              return null;
                            })()}
                            <Link to={`${basePath}/survey-report/edit/${report._id}`} style={{ textDecoration: 'none' }}>
                              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', minWidth: '60px', marginBottom: 0 }}>
                                Edit
                              </button>
                            </Link>
                            <button
                              onClick={() => handleDeleteReport(report._id)}
                              className="btn-secondary"
                              disabled={!canDelete}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                borderRadius: '8px',
                                minWidth: '60px',
                                color: 'var(--red)',
                                borderColor: 'rgba(239, 68, 68, .2)',
                                background: 'transparent',
                                marginBottom: 0,
                                opacity: canDelete ? 1 : 0.4,
                                cursor: canDelete ? 'pointer' : 'not-allowed',
                                pointerEvents: canDelete ? 'auto' : 'none'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--red-subtle)'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Certificates Tab Content */}
      {activeTab === 'certificates' && (
        <div>
          {certificatesLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
              <p style={{ fontSize: '14px' }}>Loading Certificates...</p>
            </div>
          ) : certificatesError ? (
            <div className="card" style={{ padding: '24px', textAlign: 'center', borderColor: 'var(--red)' }}>
              <p style={{ color: 'var(--red)', fontSize: '14px', fontWeight: 500 }}>{certificatesError}</p>
              <button className="btn-secondary" onClick={reloadActiveTab} style={{ marginTop: '12px', minWidth: '120px' }}>Retry</button>
            </div>
          ) : certificates.length === 0 ? (
            <div className="card animate-in" style={{ padding: '60px 40px', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px', background: 'transparent' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.6 }}>📜</div>
              <h3 style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '8px' }}>No Certificates Found</h3>
              <p style={{ color: 'var(--muted)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5', fontSize: '13px', marginBottom: '20px' }}>
                There are no Small Craft Code Certificates of Survey generated yet. You can generate a certificate from the Survey Reports tab for eligible SSC vessels.
              </p>
            </div>
          ) : (
            <div className="card animate-in" style={{ overflowX: 'auto', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--separator)' }}>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Certificate No.</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Vessel Name</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Date of Issue</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Issued By</th>
                    <th style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert) => {
                    const vessel = typeof cert.vesselId === 'object' && cert.vesselId ? cert.vesselId : null;
                    const issuedBy = typeof cert.issuedBy === 'object' && cert.issuedBy ? cert.issuedBy : null;
                    return (
                      <tr key={cert._id} style={{ borderBottom: '1px solid var(--separator)', transition: 'background var(--transition)' }} className="table-row-hover">
                        <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--primary)', fontSize: '13px', fontFamily: 'monospace' }}>
                          {cert.certificateNumber}
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--label)', fontSize: '14px' }}>
                          {vessel?.vesselName || 'Unknown Vessel'}
                          {vessel?.uqmsNumber && (
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', fontWeight: 400, marginTop: '2px' }}>
                              UQMS: {vessel.uqmsNumber}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--secondary)', fontSize: '13px' }}>
                          {formatDate(cert.dateOfIssue)}
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--secondary)', fontSize: '13px' }}>
                          {issuedBy?.username || issuedBy?.email || 'System'}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              onClick={() => setViewingCertificate(cert)}
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', minWidth: '65px', marginBottom: 0 }}
                            >
                              {cert.eSignature ? 'View Signed' : 'View & Sign'}
                            </button>
                            <button
                              onClick={() => handleDownloadCertificate(cert._id, cert.certificateNumber)}
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', minWidth: '65px', marginBottom: 0, color: 'var(--primary)', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                            >
                              Download PDF
                            </button>
                            <button
                              onClick={() => handleDeleteCertificate(cert._id)}
                              className="btn-secondary"
                              disabled={!canDelete}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                borderRadius: '8px',
                                minWidth: '60px',
                                color: 'var(--red)',
                                borderColor: 'rgba(239, 68, 68, .2)',
                                background: 'transparent',
                                marginBottom: 0,
                                opacity: canDelete ? 1 : 0.4,
                                cursor: canDelete ? 'pointer' : 'not-allowed',
                                pointerEvents: canDelete ? 'auto' : 'none'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--red-subtle)'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!(activeTab === 'first-entry' ? loading : activeTab === 'survey' ? surveyLoading : activeTab === 'reports' ? reportsLoading : certificatesLoading) && (
        <Pagination
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      {/* Scccos Modal */}
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

      <ConfirmModal
        isOpen={!!pendingDelete}
        title={pendingDelete?.title || ''}
        message={pendingDelete?.message || ''}
        confirmText="Delete"
        isDestructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
