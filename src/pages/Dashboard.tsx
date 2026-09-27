import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import { requestsService, type ApiRequest } from '@/api';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import { formatDate } from '@/utils/date';
import s from './NewRequest.module.css';

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const surveySummary = (request: ApiRequest) => {
  const names = (request.surveyTypes || []).map((survey) =>
    typeof survey === 'string' ? survey : survey.name
  );
  if (names.length <= 2) return names.join(', ') || '-';
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
};

type PendingReview = { request: ApiRequest; decision: 'accept' | 'reject' };

/** Requests submitted through the website, waiting for staff to accept (→ New Request) or reject. */
function WebsiteRequestsPanel() {
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
      if (requests.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await loadRequests();
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to ${decision} request.`);
      await loadRequests();
    } finally {
      setReviewingId(null);
    }
  };

  const renderActions = (request: ApiRequest) => {
    const busy = reviewingId === request._id;
    return (
      <div className={s.reviewActions} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`${s.reviewBtn} ${s.viewBtn}`}
          onClick={() => navigate(`/new-request/${request._id}`)}
        >
          View
        </button>
        <button
          type="button"
          className={`${s.reviewBtn} ${s.rejectBtn}`}
          onClick={() => setPendingReview({ request, decision: 'reject' })}
          disabled={!canReview || busy}
          title={canReview ? undefined : 'You do not have permission to review requests'}
        >
          Reject
        </button>
        <button
          type="button"
          className={`${s.reviewBtn} ${s.acceptBtn}`}
          onClick={() => setPendingReview({ request, decision: 'accept' })}
          disabled={!canReview || busy}
          title={canReview ? undefined : 'You do not have permission to review requests'}
        >
          {busy ? 'Saving...' : 'Accept'}
        </button>
      </div>
    );
  };

  return (
    <section className="animate-in" style={{ marginTop: '8px' }}>
      <div className={s.topBar} style={{ marginBottom: '16px' }}>
        <div>
          <h2 className="section-header" style={{ marginBottom: '4px' }}>Website Requests</h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {loading
              ? 'Loading...'
              : `${total} request(s) awaiting review. Accepted requests get a job number and move to New Request.`}
          </p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,.25)', color: 'var(--red)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card">Loading website requests...</div>
      ) : requests.length === 0 ? (
        <div className={s.emptyState}>No website requests are waiting for review.</div>
      ) : (
        <>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Request No</th>
                  <th>Received</th>
                  <th>Vessel Name</th>
                  <th>Company</th>
                  <th>Surveys</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req._id} onClick={() => navigate(`/new-request/${req._id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600 }}>{req.requestNumber}</td>
                    <td>{formatDate(req.createdAt)}</td>
                    <td>{req.vesselName || '-'}</td>
                    <td>
                      <div>{req.companyName || '-'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{req.companyEmail}</div>
                    </td>
                    <td style={{ fontSize: '13px' }}>{surveySummary(req)}</td>
                    <td>{renderActions(req)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={s.mobileCards}>
            {requests.map((req) => (
              <div key={req._id} className={s.mobileCard}>
                <div className={s.mobileCardTop}>
                  <div className={s.mobileCardInfo}>
                    <div className={s.mobileTitle}>{req.requestNumber}</div>
                    <div className={s.mobileSub}>Vessel: {req.vesselName || '-'}</div>
                    <div className={s.mobileSub}>Company: {req.companyName || '-'}</div>
                    <div className={s.mobileSub}>Surveys: {surveySummary(req)}</div>
                  </div>
                  <span className={`${s.statusBadge} ${s.statusPending}`}>Pending</span>
                </div>
                <div className={s.mobileCardBottom}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{formatDate(req.createdAt)}</div>
                  {renderActions(req)}
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onLimitChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
          />
        </>
      )}

      <ConfirmModal
        isOpen={!!pendingReview}
        title={pendingReview?.decision === 'accept' ? 'Accept website request?' : 'Reject website request?'}
        message={
          pendingReview?.decision === 'accept'
            ? `${pendingReview.request.requestNumber} (${pendingReview.request.vesselName}) will be given a job number and moved to New Request.`
            : `${pendingReview?.request.requestNumber} (${pendingReview?.request.vesselName}) will be rejected and removed from this list.`
        }
        confirmText={pendingReview?.decision === 'accept' ? 'Accept' : 'Reject'}
        isDestructive={pendingReview?.decision === 'reject'}
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

export default function DashboardPage() {
  const { user, can } = useAuth();
  const now = new Date();
  const today = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  const canSeeRequests = can(MODULE_KEYS.newRequest);

  return (
    <>
      <h1 className="greeting" style={{ animation: 'fadeUp .4s ease both' }}>
        {greetingForHour(now.getHours())}, {user?.username || 'there'}
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px', fontWeight: 500 }}>{today}</p>

      {canSeeRequests ? (
        <WebsiteRequestsPanel />
      ) : (
        <div className="card animate-in" style={{ padding: '40px', textAlign: 'center', marginTop: '20px' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--label)' }}>System Overview</h2>
          <p style={{ color: 'var(--muted)', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
            Welcome to the UQMS Management System. Please navigate using the sidebar to access your permitted modules and features.
          </p>
        </div>
      )}
    </>
  );
}
