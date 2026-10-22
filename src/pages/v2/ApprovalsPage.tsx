import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ArrowRight, CheckCircle2, Inbox, XCircle } from 'lucide-react';
import { Badge, Button, Checkbox, DataTable, Drawer, Field, PageHeader, Tabs, Textarea, type Column } from '@/ui';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import { approvalsService } from '@/api';
import type { ApiApprovalChange, ApiApprovalRequest } from '@/api';
import { formatDateTime } from '@/utils/date';
import s from './v2.module.css';

const ENTITY_LABELS: Record<string, string> = { 'checklist-question': 'Checklist question' };
const OP_TONES = { create: 'success', update: 'info', delete: 'danger' } as const;
const OP_LABELS = { create: 'New', update: 'Edit', delete: 'Delete' } as const;

/** One field: text shows old → new; lists show chips marked added / removed / unchanged. */
function ChangeRow({ change, operation }: { change: ApiApprovalChange; operation: ApiApprovalRequest['operation'] }) {
  const emptyText = <span className={s.changeEmpty}>{change.empty ?? 'None'}</span>;
  const shown = operation === 'delete' ? change.before : change.after;

  let body: React.ReactNode;
  if (change.list) {
    const kept = shown.filter(v => !change.added.includes(v));
    const removed = operation === 'update' ? change.removed : [];
    const added = operation === 'update' ? change.added : [];
    body = kept.length + removed.length + added.length === 0 ? emptyText : (
      <ul className={s.chips}>
        {added.map(v => <li key={`+${v}`} className={`${s.chip} ${s.chipAdded}`}><span aria-label="Added">+</span> {v}</li>)}
        {removed.map(v => <li key={`-${v}`} className={`${s.chip} ${s.chipRemoved}`}><span aria-label="Removed">−</span> {v}</li>)}
        {kept.map(v => <li key={v} className={s.chip}>{v}</li>)}
      </ul>
    );
  } else if (operation === 'update' && change.changed) {
    body = (
      <div className={s.textChange}>
        <span className={s.oldValue}>{change.before[0] || emptyText}</span>
        <ArrowRight className={s.changeArrow} aria-label="changed to" />
        <span className={s.newValue}>{change.after[0] || emptyText}</span>
      </div>
    );
  } else {
    body = shown[0] ? <span className={s.plainValue}>{shown[0]}</span> : emptyText;
  }

  return (
    <div className={`${s.changeRow} ${operation === 'update' && change.changed ? s.changeRowChanged : ''}`}>
      <div className={s.changeLabel}>
        {change.label}
        {operation === 'update' && change.changed && <Badge tone="warning">Changed</Badge>}
        {operation === 'update' && change.list && change.changed && (
          <span className={s.changeCount}>
            {[change.added.length && `${change.added.length} added`, change.removed.length && `${change.removed.length} removed`].filter(Boolean).join(', ')}
          </span>
        )}
      </div>
      {body}
    </div>
  );
}

/** The proposed change, field by field. Edits show only changed fields unless asked. */
function Changes({ approval }: { approval: ApiApprovalRequest }) {
  const [showAll, setShowAll] = useState(false);
  const changes = approval.changes ?? [];
  const changedCount = changes.filter(c => c.changed).length;
  const isUpdate = approval.operation === 'update';
  const visible = isUpdate && !showAll ? changes.filter(c => c.changed) : changes;

  return (
    <div className={s.stack}>
      <div className={s.changesHead}>
        <span>
          {approval.operation === 'create' && 'A new checklist question will be added.'}
          {approval.operation === 'delete' && 'This checklist question will be deleted.'}
          {isUpdate && (changedCount === 0 ? 'No fields change.' : `${changedCount} field${changedCount === 1 ? '' : 's'} will change.`)}
        </span>
        {isUpdate && changes.length > changedCount && (
          <Checkbox label="Show unchanged fields" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
        )}
      </div>
      <div className={s.changeList}>
        {visible.map(c => <ChangeRow key={c.key} change={c} operation={approval.operation} />)}
      </div>
    </div>
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
    { key: 'op', header: 'Type', cell: r => <Badge tone={OP_TONES[r.operation]}>{OP_LABELS[r.operation]}</Badge> },
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
          description={`${ENTITY_LABELS[open.entityType] ?? open.entityType} · ${OP_LABELS[open.operation]} · requested by ${open.requestedByName || '—'} on ${formatDateTime(open.createdAt)}`}
          footer={open.status === 'pending' && canApprove && (
            <>
              <Button variant="danger" icon={<XCircle />} loading={busy === 'reject'} disabled={!!busy} onClick={() => decide('reject')}>Reject</Button>
              <Button variant="primary" icon={<CheckCircle2 />} loading={busy === 'approve'} disabled={!!busy} onClick={() => decide('approve')}>Approve & apply</Button>
            </>
          )}
        >
          <div className={s.stack}>
            <Changes key={open._id} approval={open} />
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
