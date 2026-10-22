import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { CheckCircle2, Inbox, XCircle } from 'lucide-react';
import { Badge, Button, DataTable, Drawer, Field, PageHeader, Tabs, Textarea, type Column } from '@/ui';
import { showAuditValue } from '@/components/audit/ChangeList';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import { approvalsService } from '@/api';
import type { ApiApprovalRequest } from '@/api';
import { formatDateTime } from '@/utils/date';
import s from './v2.module.css';

const ENTITY_LABELS: Record<string, string> = { 'checklist-question': 'Checklist question' };
const OP_TONES = { create: 'success', update: 'info', delete: 'danger' } as const;
const HIDDEN = new Set(['_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']);

/** Field-by-field comparison of the record before and the proposed change. */
function Diff({ approval }: { approval: ApiApprovalRequest }) {
  const before = approval.before ?? {};
  const after = approval.operation === 'delete' ? {} : approval.payload ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(k => !HIDDEN.has(k));
  const show = (v: unknown) => {
    if (Array.isArray(v)) return v.map(x => (x && typeof x === 'object' ? (x as any).name ?? (x as any).code ?? (x as any).AreaCategory ?? JSON.stringify(x) : String(x))).join(', ') || '—';
    return showAuditValue(v);
  };
  return (
    <table className={s.diff}>
      <thead><tr><th>Field</th><th>Current</th><th>Proposed</th></tr></thead>
      <tbody>
        {keys.map(k => {
          const b = show(before[k]);
          const a = approval.operation === 'delete' ? '(deleted)' : k in after ? show(after[k]) : b;
          return (
            <tr key={k} className={a !== b ? s.changed : undefined}>
              <th scope="row">{k}</th><td>{approval.operation === 'create' ? '—' : b}</td><td>{a}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ApprovalsPage() {
  const { can } = useAuth();
  const canApprove = can(MODULE_KEYS.approvals, 'approve');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rows, setRows] = useState<ApiApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<ApiApprovalRequest | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows((await approvalsService.getApprovals({ status, limit: 100 })).data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const decide = async (decision: 'approve' | 'reject') => {
    if (!open) return;
    if (decision === 'reject' && !reason.trim()) {
      toast.error('Give a reason for rejecting.');
      return;
    }
    setBusy(decision);
    try {
      const res = await approvalsService.decide(open._id, decision, reason.trim() || undefined);
      toast.success(res.message);
      setOpen(null);
      setReason('');
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const columns: Column<ApiApprovalRequest>[] = [
    { key: 'summary', header: 'Change', primary: true, cell: r => (
      <span className={s.cellStack}><span className={s.strong}>{r.summary}</span><span className={s.muted}>{ENTITY_LABELS[r.entityType] ?? r.entityType}</span></span>
    ) },
    { key: 'op', header: 'Type', cell: r => <Badge tone={OP_TONES[r.operation]}>{r.operation}</Badge> },
    { key: 'by', header: 'Requested by', hideOnMobile: true, cell: r => r.requestedByName || '—' },
    { key: 'at', header: 'Requested', nowrap: true, hideOnMobile: true, cell: r => formatDateTime(r.createdAt) },
    ...(status !== 'pending' ? [{ key: 'rev', header: 'Decided by', hideOnMobile: true, cell: (r: ApiApprovalRequest) => r.reviewedByName || '—' }] : []),
  ];

  return (
    <div className="animate-in">
      <PageHeader title="Approvals" description="QMS changes waiting for approval. A change takes effect only after it is approved." />
      <Tabs label="Status" value={status} onValueChange={setStatus}
        items={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={r => r._id}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={r => { setOpen(r); setReason(''); }}
        empty={{ icon: <Inbox />, title: status === 'pending' ? 'Nothing waiting for approval' : `No ${status} changes` }}
      />
      {open && (
        <Drawer
          open
          onClose={() => setOpen(null)}
          width={640}
          title={open.summary}
          description={`${ENTITY_LABELS[open.entityType] ?? open.entityType} · ${open.operation} · requested by ${open.requestedByName || '—'}`}
          footer={open.status === 'pending' && canApprove && (
            <>
              <Button variant="danger" icon={<XCircle />} loading={busy === 'reject'} disabled={!!busy} onClick={() => decide('reject')}>Reject</Button>
              <Button variant="primary" icon={<CheckCircle2 />} loading={busy === 'approve'} disabled={!!busy} onClick={() => decide('approve')}>Approve & apply</Button>
            </>
          )}
        >
          <div className={s.stack}>
            <Diff approval={open} />
            {open.reason && <p className={s.hint}>Reason: {open.reason}</p>}
            {open.status === 'pending' && canApprove && (
              <Field label="Comment" hint="Required when rejecting.">
                <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} />
              </Field>
            )}
          </div>
        </Drawer>
      )}
    </div>
  );
}
