import { useEffect, useRef, useState } from 'react';
import { History, SearchX } from 'lucide-react';
import { auditLogService, type ApiAuditChange, type ApiAuditLog } from '@/api';
import Pagination from '@/components/Pagination';
import { formatDateTime } from '@/utils/date';
import { Badge, DataTable, PageHeader, Select, Toolbar, type Column } from '@/ui';

const ACTION_LABELS: Record<string, string> = {
  'request.create.override': 'Request created (override)',
  'request.update.override': 'Request edited (override)',
  'quotation.discount': 'Quotation discount',
  'document.annotate': 'Document edited (stamp / strike-off / cross / text)',
};

const ENTITY_LABELS: Record<string, string> = {
  request: 'Survey request',
  quotation: 'Quotation',
  'survey-report': 'Survey report',
  'docking-cert': 'Docking survey certificate',
  scccos: 'Certificate of Survey (COS)',
  'daily-report': 'Daily visit report',
};

const show = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const ChangeList = ({ changes }: { changes: ApiAuditChange[] }) =>
  changes.length === 0 ? <>—</> : (
    <ul style={{ margin: 0, paddingLeft: '1rem' }}>
      {changes.map((c) => (
        <li key={c.field}>
          <strong>{c.field}</strong>: {show(c.from)} → {show(c.to)}
        </li>
      ))}
    </ul>
  );

/** Read-only history of Technical Committee overrides and other controlled changes. */
export default function AuditLogPage() {
  const [entries, setEntries] = useState<ApiAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const requestSeq = useRef(0);

  const load = async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    try {
      const res = await auditLogService.getAuditLogs({ entityType, page, limit });
      if (seq !== requestSeq.current) return;
      setEntries(res.data);
      setTotal(res.count || 0);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      if (seq === requestSeq.current) setError(err.message || 'Failed to load the audit log.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, page, limit]);

  const columns: Column<ApiAuditLog>[] = [
    { key: 'when', header: 'When', nowrap: true, cell: (e) => formatDateTime(e.createdAt) },
    { key: 'action', header: 'Action', primary: true, cell: (e) => ACTION_LABELS[e.action] || e.action },
    {
      key: 'record', header: 'Record', nowrap: true,
      cell: (e) => <>{ENTITY_LABELS[e.entityType] || e.entityType} <span className="tabular">{e.entityRef || ''}</span></>,
    },
    {
      key: 'by', header: 'By', hideOnMobile: true,
      cell: (e) => (
        <>
          {e.user?.fullName || e.user?.username || e.userEmail || '—'}{' '}
          {e.roleName && <Badge tone="neutral">{e.roleName}</Badge>}
        </>
      ),
    },
    { key: 'changes', header: 'Changes', hideOnMobile: true, cell: (e) => <ChangeList changes={e.changes} /> },
    { key: 'reason', header: 'Reason', hideOnMobile: true, cell: (e) => e.reason || '—' },
  ];

  return (
    <div className="animate-in">
      <PageHeader
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Audit log' }]}
        title="Audit log"
        description="Every Technical Committee override and controlled change, newest first."
      />
      <Toolbar
        attached
        filters={
          <Select aria-label="Filter by record type" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
            <option value="">All records</option>
            {Object.entries(ENTITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        }
        end={!loading && `${total} ${total === 1 ? 'entry' : 'entries'}`}
      />
      <DataTable
        attached
        caption="Audit log"
        columns={columns}
        rows={entries}
        getRowId={(e) => e._id}
        loading={loading}
        error={error}
        onRetry={load}
        empty={entityType
          ? { icon: <SearchX />, title: 'No matching entries', description: 'Clear the filter to see every entry.' }
          : { icon: <History />, title: 'No audit entries yet', description: 'Overrides and discount changes will appear here.' }}
        footer={<Pagination page={page} limit={limit} total={total} totalPages={totalPages} onPageChange={setPage} onLimitChange={setLimit} />}
      />
    </div>
  );
}
