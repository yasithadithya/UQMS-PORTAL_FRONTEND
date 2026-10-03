import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, Inbox, SearchX } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import { requestsService, type ApiRequest } from '@/api';
import Pagination from '@/components/Pagination';
import { formatDate } from '@/utils/date';
import { Badge, ButtonLink, DataTable, PageHeader, SearchInput, StatusBadge, Toolbar, type Column, type Tone } from '@/ui';
import s from './NewRequest.module.css';

/** Request statuses as the business uses them, with their badge color. */
const STATUS: Record<ApiRequest['status'], { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'info' },
  print: { label: 'Print', tone: 'warning' },
  reject: { label: 'Reject', tone: 'danger' },
  success: { label: 'Success', tone: 'success' },
};

/** All survey requests (staff-entered and accepted website requests). Opening a row goes to its details page. */
export default function NewRequestPage() {
  const { can } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const requestSeq = useRef(0);

  // Search 300ms after typing stops instead of on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    try {
      const res = await requestsService.getRequests({ search: query || undefined, page, limit });
      if (seq !== requestSeq.current) return;
      setRequests(res.data);
      setTotal(res.count || 0);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      if (seq === requestSeq.current) setError(err.message || 'Failed to load requests.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page, limit]);

  const columns: Column<ApiRequest>[] = [
    {
      key: 'number', header: 'Request no.', primary: true, nowrap: true,
      cell: r => (
        <span className={s.requestNo}>
          {r.requestNumber}
          {r.source === 'web' && <Badge tone="info" title="Submitted through the website">Web</Badge>}
        </span>
      ),
    },
    { key: 'job', header: 'Job no.', nowrap: true, cell: r => r.jobNumber || '—' },
    { key: 'vessel', header: 'Vessel', cell: r => r.vesselName || '—' },
    { key: 'company', header: 'Company', hideOnMobile: true, cell: r => r.companyName || '—' },
    { key: 'sector', header: 'Sector', cell: r => <span className={s.capitalize}>{r.sector}</span> },
    { key: 'created', header: 'Created', nowrap: true, hideOnMobile: true, cell: r => formatDate(r.createdAt) },
    {
      key: 'status', header: 'Status', nowrap: true,
      cell: r => {
        const st = STATUS[r.status] ?? STATUS.active;
        return <StatusBadge status={r.status} label={st.label} tone={st.tone} />;
      },
    },
  ];

  // Requests normally come from the website; creating one here is a Technical Committee override.
  const canCreate = can(MODULE_KEYS.newRequest, 'override');
  const createButton = canCreate && (
    <ButtonLink to="/new-request/create" variant="primary" icon={<FilePlus2 />}>Create request</ButtonLink>
  );

  return (
    <div className="animate-in">
      <PageHeader
        title="New Request"
        description="Survey requests from staff and accepted website submissions."
        actions={createButton}
      />

      <Toolbar
        attached
        search={<SearchInput value={search} onChange={setSearch} placeholder="Search by request no., job no. or vessel…" />}
        end={!loading && `${total} ${total === 1 ? 'request' : 'requests'}`}
      />
      <DataTable
        attached
        caption="Survey requests"
        columns={columns}
        rows={requests}
        getRowId={r => r._id}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={r => navigate(`/new-request/${r._id}`)}
        empty={query
          ? { icon: <SearchX />, title: 'No matching requests', description: `Nothing matches “${query}”. Try a request number, job number or vessel name.` }
          : { icon: <Inbox />, title: 'No requests yet', description: 'Create a request to get started.', action: createButton }}
        footer={
          <Pagination page={page} limit={limit} total={total} totalPages={totalPages} onPageChange={setPage} onLimitChange={setLimit} />
        }
      />
    </div>
  );
}
