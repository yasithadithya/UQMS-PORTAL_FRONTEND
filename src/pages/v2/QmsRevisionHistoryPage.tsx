import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History } from 'lucide-react';
import { Badge, Button, DataTable, Drawer, PageHeader, SearchInput, Select, Toolbar, type Column } from '@/ui';
import Pagination from '@/components/Pagination';
import { approvalsService } from '@/api';
import type { ApiApprovalRequest, ApiApprovalStatus } from '@/api';
import { formatDate, formatDateTime } from '@/utils/date';
import { ChangeFacts, Changes, ENTITY_LABELS, OP_LABELS, OP_TONES, STATUS_LABELS, StatusBadgeFor, Timeline, revisionText } from './QmsChange';
import s from './v2.module.css';

/**
 * Every change request ever raised in QMS, in every state, with its request comment, request date
 * (approval), effective date (acceptance), revision and full history. `?record=<id>` narrows it to one record.
 */
export default function QmsRevisionHistoryPage({ basePath }: { basePath: string }) {
  const [params, setParams] = useSearchParams();
  const record = params.get('record') || undefined;
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<'' | ApiApprovalStatus>('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [rows, setRows] = useState<ApiApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<ApiApprovalRequest | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(1); }, [debounced, status, entityType, record]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await approvalsService.getHistory({ search: debounced, status, entityType, entityId: record, page, limit });
      setRows(res.data);
      setTotal(res.count);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debounced, status, entityType, record, page, limit]);
  useEffect(() => { load(); }, [load]);

  const clearRecord = () => {
    const next = new URLSearchParams(params);
    next.delete('record');
    setParams(next, { replace: true });
  };

  const columns: Column<ApiApprovalRequest>[] = [
    { key: 'rev', header: 'Rev', nowrap: true, cell: r => (r.status === 'accepted' ? <span className={s.mono}>{revisionText(r.revision)}</span> : <span className={s.muted}>—</span>) },
    { key: 'summary', header: 'Record', primary: true, cell: r => (
      <span className={s.cellStack}>
        <span className={s.strong}>{r.summary}</span>
        <span className={s.muted}>{ENTITY_LABELS[r.entityType] ?? r.entityType}{r.requestComment ? ` · ${r.requestComment}` : ''}</span>
      </span>
    ) },
    { key: 'op', header: 'Change', cell: r => <Badge tone={OP_TONES[r.operation]}>{OP_LABELS[r.operation]}</Badge> },
    { key: 'status', header: 'Status', nowrap: true, cell: r => <StatusBadgeFor approval={r} /> },
    { key: 'by', header: 'Requested by', hideOnMobile: true, cell: r => r.requestedByName || '—' },
    { key: 'req', header: 'Request date', nowrap: true, hideOnMobile: true, cell: r => (r.requestDate ? formatDate(r.requestDate) : '—') },
    { key: 'eff', header: 'Effective date', nowrap: true, cell: r => (r.effectiveDate ? formatDate(r.effectiveDate) : '—') },
  ];

  return (
    <div className="animate-in">
      <PageHeader
        breadcrumbs={[{ label: 'QMS', href: basePath }, { label: 'Revision history' }]}
        title="QMS revision history"
        description="Every addition, edit and deletion in QMS: who requested it and why, who approved and accepted it, and when it took effect."
      />
      <Toolbar
        attached
        search={<SearchInput value={search} onChange={setSearch} placeholder="Search record, comment or person…" />}
        filters={
          <>
            <Select aria-label="Status" value={status} onChange={e => setStatus(e.target.value as '' | ApiApprovalStatus)}>
              <option value="">All statuses</option>
              {(Object.keys(STATUS_LABELS) as ApiApprovalStatus[]).map(k => <option key={k} value={k}>{STATUS_LABELS[k]}</option>)}
            </Select>
            <Select aria-label="Record type" value={entityType} onChange={e => setEntityType(e.target.value)}>
              <option value="">All record types</option>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            {record && <Button variant="ghost" onClick={clearRecord}>Show all records</Button>}
          </>
        }
        end={!loading && `${total} ${total === 1 ? 'change' : 'changes'}`}
      />
      <DataTable
        attached
        caption="QMS revision history"
        columns={columns}
        rows={rows}
        getRowId={r => r._id}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={r => setOpen(r)}
        empty={{ icon: <History />, title: debounced || status || entityType || record ? 'No matching changes' : 'No QMS changes yet' }}
        footer={<Pagination page={page} limit={limit} total={total} totalPages={totalPages} onPageChange={setPage} onLimitChange={setLimit} />}
      />
      {open && (
        <Drawer
          open
          onClose={() => setOpen(null)}
          width={680}
          title={open.summary}
          description={`${ENTITY_LABELS[open.entityType] ?? open.entityType} · ${OP_LABELS[open.operation]} · submitted ${formatDateTime(open.createdAt)}`}
          footer={<Button onClick={() => setOpen(null)}>Close</Button>}
        >
          <div className={s.stack}>
            <ChangeFacts approval={open} />
            <Changes key={open._id} approval={open} />
            <Timeline approval={open} />
          </div>
        </Drawer>
      )}
    </div>
  );
}
