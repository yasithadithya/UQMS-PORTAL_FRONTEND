import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileStack, FileText, SearchX, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { quotationsService, type ApiQuotation, type QuotationStatus } from '@/api';
import { useAuth } from '@/context/AuthContext';
import Pagination from '@/components/Pagination';
import { formatDate } from '@/utils/date';
import { MODULE_KEYS } from '@/utils/permissions';
import { Badge, ButtonLink, ConfirmDialog, DataTable, Menu, SearchInput, Select, StatusBadge, Toolbar, type Column } from '@/ui';
import { QUOTATION_STATUS_LABELS, downloadPdf, formatMoney, quotationDisplayStatus, type QuotationDisplayStatus } from './financeFormat';
import { quotationsPath } from './financeTabs';
import s from './finance.module.css';

/** Every quotation, including revisions, with search, a status filter and pagination. */
export default function QuotationsTab({ basePath, createButton }: { basePath: string; createButton?: ReactNode }) {
  const { can } = useAuth();
  const navigate = useNavigate();
  const listPath = quotationsPath(basePath);

  const [quotations, setQuotations] = useState<ApiQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<QuotationDisplayStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<ApiQuotation | null>(null);
  const [deleting, setDeleting] = useState(false);
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
      const res = await quotationsService.getQuotations({ search: query || undefined, status, page, limit });
      if (seq !== requestSeq.current) return;
      setQuotations(res.data);
      setTotal(res.count || 0);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      if (seq === requestSeq.current) setError(err.message || 'Failed to load quotations.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status, page, limit]);

  const handleDownload = async (q: ApiQuotation) => {
    try {
      downloadPdf(await quotationsService.getPdfBlob(q._id), q.quotationNumber);
    } catch (err: any) {
      toast.error(err.message || 'Failed to download the quotation PDF.');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await quotationsService.deleteQuotation(pendingDelete._id);
      toast.success(`Quotation ${pendingDelete.quotationNumber} deleted.`);
      setPendingDelete(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete the quotation.');
    } finally {
      setDeleting(false);
    }
  };

  const canCreate = can(MODULE_KEYS.financeQuotations, 'create');
  const canDelete = can(MODULE_KEYS.financeQuotations, 'delete');

  const columns: Column<ApiQuotation>[] = [
    {
      key: 'number', header: 'Quotation no.', primary: true, nowrap: true,
      cell: q => (
        <span className={s.inline}>
          <span className={s.mono}>{q.quotationNumber}</span>
          {q.revision > 0 && <Badge tone="accent" title={`Revision ${q.revision}`}>R{q.revision}</Badge>}
        </span>
      ),
    },
    { key: 'request', header: 'Request no.', nowrap: true, cell: q => q.requestNumber },
    { key: 'job', header: 'Job no.', nowrap: true, hideOnMobile: true, cell: q => q.jobNumber || '—' },
    { key: 'vessel', header: 'Vessel', cell: q => q.vesselName || '—' },
    { key: 'company', header: 'Client', hideOnMobile: true, cell: q => q.client?.companyName || '—' },
    { key: 'date', header: 'Date', nowrap: true, hideOnMobile: true, cell: q => formatDate(q.quotationDate) },
    { key: 'total', header: 'Total (LKR)', align: 'right', nowrap: true, cell: q => formatMoney(q.totalLkr) },
    { key: 'status', header: 'Status', nowrap: true, cell: q => <StatusBadge status={quotationDisplayStatus(q)} label={QUOTATION_STATUS_LABELS[quotationDisplayStatus(q)]} /> },
  ];

  return (
    <>
      <Toolbar
        attached
        search={<SearchInput value={search} onChange={setSearch} placeholder="Search quotation, request or job no., vessel or client…" />}
        filters={
          <Select aria-label="Filter by status" value={status} onChange={e => { setStatus(e.target.value as QuotationDisplayStatus | ''); setPage(1); }}>
            <option value="">All statuses</option>
            {(Object.keys(QUOTATION_STATUS_LABELS) as QuotationDisplayStatus[]).map(st => (
              <option key={st} value={st}>{QUOTATION_STATUS_LABELS[st]}</option>
            ))}
          </Select>
        }
        end={!loading && `${total} ${total === 1 ? 'quotation' : 'quotations'}`}
      />
      <DataTable
        attached
        caption="Quotations"
        columns={columns}
        rows={quotations}
        getRowId={q => q._id}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={q => navigate(`${listPath}/${q._id}`)}
        empty={query || status
          ? { icon: <SearchX />, title: 'No matching quotations', description: 'Try another quotation, request or job number, or clear the status filter.' }
          : { icon: <FileStack />, title: 'No quotations yet', description: 'Create a quotation for a request that has not been quoted.', action: createButton }}
        rowActions={q => (
          <>
            <ButtonLink to={`${listPath}/${q._id}`} size="sm" variant="secondary">Open</ButtonLink>
            <Menu
              label={`More actions for ${q.quotationNumber}`}
              items={[
                { label: 'Download PDF', icon: <Download />, onSelect: () => handleDownload(q) },
                canCreate && (q.status === 'sent' || q.status === 'rejected') && {
                  label: 'Create revision', icon: <FileText />, onSelect: () => navigate(`${listPath}/new?from=${q._id}`),
                },
                q.status === 'draft' ? 'separator' : false,
                q.status === 'draft' && {
                  label: 'Delete', icon: <Trash2 />, danger: true, disabled: !canDelete,
                  hint: canDelete ? undefined : 'Your role cannot delete quotations',
                  onSelect: () => setPendingDelete(q),
                },
              ]}
            />
          </>
        )}
        footer={<Pagination page={page} limit={limit} total={total} totalPages={totalPages} onPageChange={setPage} onLimitChange={setLimit} />}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this draft quotation?"
        message={pendingDelete && `${pendingDelete.quotationNumber} for ${pendingDelete.vesselName || pendingDelete.requestNumber} will be deleted. This can't be undone.`}
        confirmText="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
