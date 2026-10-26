import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { CheckCircle2, Inbox, XCircle } from 'lucide-react';
import { Badge, Button, DataTable, Drawer, Field, PageHeader, Tabs, Textarea, type Column } from '@/ui';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import { approvalsService } from '@/api';
import type { ApiApprovalRequest, ApiApprovalStatus } from '@/api';
import { formatDate, formatDateTime } from '@/utils/date';
import { ChangeFacts, Changes, ENTITY_LABELS, OP_LABELS, OP_TONES, Timeline, revisionText } from './QmsChange';
import s from './v2.module.css';

const TABS: { value: ApiApprovalStatus; label: string; empty: string }[] = [
  { value: 'pending', label: 'Awaiting approval', empty: 'Nothing waiting for approval' },
  { value: 'approved', label: 'Awaiting acceptance', empty: 'Nothing waiting for acceptance' },
  { value: 'accepted', label: 'Accepted', empty: 'No accepted changes' },
  { value: 'rejected', label: 'Rejected', empty: 'No rejected changes' },
];

/**
 * QMS change control. Level 1 approves a request (sets the request date); level 2 accepts it, which
 * applies the change and sets the effective date. Either level can reject, with a comment.
 */
export default function ApprovalsPage() {
  const { can } = useAuth();
  const canApprove = can(MODULE_KEYS.approvals, 'approve');
  const canAccept = can(MODULE_KEYS.approvals, 'accept');
  // Acceptors who can't approve start on their own queue.
  const [status, setStatus] = useState<ApiApprovalStatus>(canAccept && !canApprove ? 'approved' : 'pending');
  const [rows, setRows] = useState<ApiApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<ApiApprovalRequest | null>(null);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | undefined>();
  const [busy, setBusy] = useState<'yes' | 'reject' | null>(null);

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

  const openRow = (r: ApiApprovalRequest) => {
    setOpen(r);
    setComment('');
    setCommentError(undefined);
  };

  /** Which level the open request is at, if this user can act on it. */
  const level = open?.status === 'pending' && canApprove ? 'approval' : open?.status === 'approved' && canAccept ? 'acceptance' : null;

  const decide = async (yes: boolean) => {
    if (!open || !level) return;
    const text = comment.trim();
    if (!yes && !text) {
      setCommentError('A comment is required to reject.');
      return;
    }
    setBusy(yes ? 'yes' : 'reject');
    try {
      const res = level === 'approval'
        ? await approvalsService.decide(open._id, yes ? 'approve' : 'reject', text || undefined)
        : await approvalsService.accept(open._id, yes ? 'accept' : 'reject', text || undefined);
      toast.success(res.message);
      setOpen(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const columns: Column<ApiApprovalRequest>[] = [
    { key: 'summary', header: 'Change', primary: true, cell: r => (
      <span className={s.cellStack}>
        <span className={s.strong}>{r.summary}</span>
        <span className={s.muted}>{ENTITY_LABELS[r.entityType] ?? r.entityType}{r.requestComment ? ` · ${r.requestComment}` : ''}</span>
      </span>
    ) },
    { key: 'op', header: 'Type', cell: r => <Badge tone={OP_TONES[r.operation]}>{OP_LABELS[r.operation]}</Badge> },
    { key: 'by', header: 'Requested by', hideOnMobile: true, cell: r => r.requestedByName || '—' },
    { key: 'at', header: 'Submitted', nowrap: true, hideOnMobile: true, cell: r => formatDateTime(r.createdAt) },
    ...(status !== 'pending' ? [
      { key: 'reqDate', header: 'Request date', nowrap: true, hideOnMobile: true, cell: (r: ApiApprovalRequest) => (r.requestDate ? formatDate(r.requestDate) : '—') },
    ] : []),
    ...(status === 'accepted' ? [
      { key: 'effDate', header: 'Effective date', nowrap: true, cell: (r: ApiApprovalRequest) => formatDate(r.effectiveDate) },
      { key: 'rev', header: 'Revision', nowrap: true, cell: (r: ApiApprovalRequest) => revisionText(r.revision) },
    ] : []),
    ...(status === 'rejected' ? [
      { key: 'rej', header: 'Rejected by', hideOnMobile: true, cell: (r: ApiApprovalRequest) => (
        <span className={s.cellStack}><span>{r.rejectedByName || '—'}</span><span className={s.muted}>at {r.rejectedStage ?? 'approval'}</span></span>
      ) },
    ] : []),
  ];

  const current = TABS.find(t => t.value === status)!;

  return (
    <div className="animate-in">
      <PageHeader
        title="Approvals"
        description="QMS change control. Every addition, edit or deletion must be approved and then accepted. It takes effect only once accepted."
      />
      <Tabs label="Status" value={status} onValueChange={setStatus} items={TABS.map(t => ({ value: t.value, label: t.label }))} />
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={r => r._id}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={openRow}
        empty={{ icon: <Inbox />, title: current.empty }}
      />
      {open && (
        <Drawer
          open
          onClose={() => setOpen(null)}
          dismissible={!busy}
          width={680}
          title={open.summary}
          description={`${ENTITY_LABELS[open.entityType] ?? open.entityType} · ${OP_LABELS[open.operation]} · submitted by ${open.requestedByName || '—'} on ${formatDateTime(open.createdAt)}`}
          footer={level && (
            <>
              <Button variant="danger" icon={<XCircle />} loading={busy === 'reject'} disabled={!!busy} onClick={() => decide(false)}>Reject</Button>
              <Button variant="primary" icon={<CheckCircle2 />} loading={busy === 'yes'} disabled={!!busy} onClick={() => decide(true)}>
                {level === 'approval' ? 'Approve' : 'Accept & apply'}
              </Button>
            </>
          )}
        >
          <div className={s.stack}>
            <ChangeFacts approval={open} />
            <Changes key={open._id} approval={open} />
            {level && (
              <Field
                label={level === 'approval' ? 'Approval comment' : 'Acceptance comment'}
                hint={level === 'approval'
                  ? 'Optional when approving, required when rejecting. Approving sets the request date; the change still needs to be accepted.'
                  : 'Optional when accepting, required when rejecting. Accepting applies the change and sets the effective date.'}
                error={commentError}
              >
                <Textarea rows={3} value={comment} onChange={e => { setComment(e.target.value); setCommentError(undefined); }} />
              </Field>
            )}
            {!level && open.status === 'pending' && <p className={s.hint}>Waiting for someone with approve permission.</p>}
            {!level && open.status === 'approved' && <p className={s.hint}>Approved. Waiting for someone with accept permission.</p>}
            <Timeline approval={open} />
          </div>
        </Drawer>
      )}
    </div>
  );
}
