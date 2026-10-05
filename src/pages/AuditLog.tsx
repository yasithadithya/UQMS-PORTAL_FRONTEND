import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, History, SearchX } from 'lucide-react';
import { toast } from 'react-toastify';
import { auditLogService, type ApiAuditLog, type ApiAuditMeta, type AuditLogFilters } from '@/api';
import Pagination from '@/components/Pagination';
import { ChangeList } from '@/components/audit/ChangeList';
import { AuditEntryDrawer, auditActorName } from '@/components/audit/AuditEntryDrawer';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import { formatDateTime } from '@/utils/date';
import { Badge, Button, DataTable, Input, PageHeader, SearchInput, Select, Toolbar, type Column } from '@/ui';

const OPERATION_LABELS: Record<string, string> = {
  create: 'Created', update: 'Edited', delete: 'Deleted', status: 'Status change', approve: 'Approved', revoke: 'Revoked',
  sign: 'Signed', assign: 'Assigned', login: 'Sign-in', logout: 'Sign-out', view: 'Viewed', download: 'Downloaded',
  print: 'Printed / generated', email: 'Emailed', upload: 'Uploaded', export: 'Exported', other: 'Other',
};

const EMPTY_FILTERS = { q: '', module: '', entityType: '', operation: '', outcome: '', user: '', from: '', to: '' };
type Filters = typeof EMPTY_FILTERS;

/** Local calendar dates → UTC timestamps covering the whole days. */
const toApiFilters = (f: Filters): AuditLogFilters => ({
  ...f,
  outcome: f.outcome as AuditLogFilters['outcome'],
  from: f.from ? new Date(`${f.from}T00:00:00`).toISOString() : '',
  to: f.to ? new Date(`${f.to}T23:59:59.999`).toISOString() : '',
});

/** Everything that happened in the system: who did what, when, from where, and what changed. */
export default function AuditLogPage() {
  const { can, modules } = useAuth();
  const canExport = can(MODULE_KEYS.adminAuditLog, 'export');

  const [entries, setEntries] = useState<ApiAuditLog[]>([]);
  const [meta, setMeta] = useState<ApiAuditMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<ApiAuditLog | null>(null);
  const [exporting, setExporting] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    auditLogService.getMeta().then((res) => setMeta(res.data)).catch(() => setMeta(null));
  }, []);

  // Debounce typing in the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === search.trim() ? f : { ...f, q: search.trim() }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    try {
      const res = await auditLogService.getAuditLogs({ ...toApiFilters(filters), page, limit });
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
  }, [filters, page, limit]);

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const filtered = Object.values(filters).some(Boolean);

  const moduleOptions = useMemo(() => {
    const keys = [...new Set(Object.values(meta?.entities ?? {}).map((e) => e.module).filter(Boolean))];
    const nameOf = (key: string) => modules.find((m) => m.key === key)?.name ?? key;
    return keys.map((key) => ({ key, name: nameOf(key) })).sort((a, b) => a.name.localeCompare(b.name));
  }, [meta, modules]);

  const entityOptions = useMemo(
    () => Object.entries(meta?.entities ?? {})
      .filter(([, e]) => !filters.module || e.module === filters.module)
      .sort(([, a], [, b]) => a.label.localeCompare(b.label)),
    [meta, filters.module]
  );

  const actionLabel = (e: ApiAuditLog) => meta?.actions[e.action]?.label ?? e.action;
  const entityLabel = (e: ApiAuditLog) => meta?.entities[e.entityType]?.label ?? e.entityType;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await auditLogService.exportCsv(toApiFilters(filters));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<ApiAuditLog>[] = [
    { key: 'when', header: 'When', nowrap: true, cell: (e) => formatDateTime(e.createdAt) },
    {
      key: 'by', header: 'User',
      cell: (e) => (
        <>
          {auditActorName(e)}{' '}
          {e.roleName && <Badge tone="neutral">{e.roleName}</Badge>}
        </>
      ),
    },
    {
      key: 'action', header: 'Action', primary: true,
      cell: (e) => (
        <>
          {actionLabel(e)}{' '}
          {e.outcome === 'failure' && <Badge tone="danger">Failed</Badge>}
        </>
      ),
    },
    {
      key: 'record', header: 'Record',
      cell: (e) => <>{entityLabel(e)} <span className="tabular">{e.entityRef || ''}</span></>,
    },
    {
      key: 'changes', header: 'Changes', hideOnMobile: true,
      cell: (e) => (e.changes.length ? <ChangeList changes={e.changes} limit={3} /> : e.reason || '—'),
    },
    { key: 'ip', header: 'IP', nowrap: true, hideOnMobile: true, cell: (e) => <span className="tabular">{e.ip || '—'}</span> },
  ];

  return (
    <div className="animate-in">
      <PageHeader
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Audit log' }]}
        title="Audit log"
        description="Every change, sign-in and document action in the system, with who did it, when and from where. Select an entry for the full detail."
        actions={canExport && (
          <Button icon={<Download />} onClick={exportCsv} loading={exporting} disabled={loading || total === 0}>
            Export CSV
          </Button>
        )}
      />
      <Toolbar
        attached
        search={<SearchInput value={search} onChange={setSearch} placeholder="Search record, user, reason or IP…" />}
        filters={
          <>
            <Select aria-label="Filter by module" value={filters.module} onChange={(e) => { setFilter('module', e.target.value); setFilter('entityType', ''); }}>
              <option value="">All modules</option>
              {moduleOptions.map((m) => <option key={m.key} value={m.key}>{m.name}</option>)}
            </Select>
            <Select aria-label="Filter by record type" value={filters.entityType} onChange={(e) => setFilter('entityType', e.target.value)}>
              <option value="">All records</option>
              {entityOptions.map(([value, e]) => <option key={value} value={value}>{e.label}</option>)}
            </Select>
            <Select aria-label="Filter by activity" value={filters.operation} onChange={(e) => setFilter('operation', e.target.value)}>
              <option value="">All activity</option>
              {(meta?.operations ?? Object.keys(OPERATION_LABELS)).map((op) => <option key={op} value={op}>{OPERATION_LABELS[op] ?? op}</option>)}
            </Select>
            <Select aria-label="Filter by user" value={filters.user} onChange={(e) => setFilter('user', e.target.value)}>
              <option value="">All users</option>
              {(meta?.users ?? []).map((u) => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}
            </Select>
            <Select aria-label="Filter by outcome" value={filters.outcome} onChange={(e) => setFilter('outcome', e.target.value)}>
              <option value="">Any outcome</option>
              <option value="success">Succeeded</option>
              <option value="failure">Failed</option>
            </Select>
            <Input type="date" aria-label="From date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter('from', e.target.value)} />
            <Input type="date" aria-label="To date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} />
            {filtered && (
              <Button variant="ghost" onClick={() => { setSearch(''); setFilters(EMPTY_FILTERS); setPage(1); }}>Clear</Button>
            )}
          </>
        }
        end={!loading && `${total} ${total === 1 ? 'entry' : 'entries'}`}
      />
      <DataTable
        attached
        caption="Audit log"
        columns={columns}
        rows={entries}
        getRowId={(e) => e._id}
        onRowClick={(e) => setSelected(e)}
        loading={loading}
        error={error}
        onRetry={load}
        empty={filtered
          ? { icon: <SearchX />, title: 'No matching entries', description: 'Change or clear the filters to see more.' }
          : { icon: <History />, title: 'No audit entries yet', description: 'Changes, sign-ins and document activity will appear here.' }}
        footer={<Pagination page={page} limit={limit} total={total} totalPages={totalPages} onPageChange={setPage} onLimitChange={setLimit} />}
      />
      <AuditEntryDrawer entry={selected} meta={meta} onClose={() => setSelected(null)} />
    </div>
  );
}
