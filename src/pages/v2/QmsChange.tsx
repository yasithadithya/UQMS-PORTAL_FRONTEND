import { useState } from 'react';
import { ArrowRight, CheckCircle2, CircleDot, Send, XCircle } from 'lucide-react';
import { Badge, Checkbox, type Tone } from '@/ui';
import type { ApiApprovalChange, ApiApprovalHistoryEntry, ApiApprovalRequest, ApiApprovalStatus } from '@/api';
import { formatDate, formatDateTime } from '@/utils/date';
import s from './v2.module.css';

/** Shared pieces for QMS change requests: Approvals (to act on them) and Revision history (to look back). */

export const ENTITY_LABELS: Record<string, string> = { 'checklist-question': 'Checklist question' };
export const OP_TONES = { create: 'success', update: 'info', delete: 'danger' } as const;
export const OP_LABELS = { create: 'Addition', update: 'Edit', delete: 'Deletion' } as const;

export const STATUS_LABELS: Record<ApiApprovalStatus, string> = {
  pending: 'Awaiting approval',
  approved: 'Awaiting acceptance',
  accepted: 'Accepted',
  rejected: 'Rejected',
};
export const STATUS_TONES: Record<ApiApprovalStatus, Tone> = { pending: 'warning', approved: 'info', accepted: 'success', rejected: 'danger' };

export const StatusBadgeFor = ({ approval }: { approval: ApiApprovalRequest }) => (
  <Badge tone={STATUS_TONES[approval.status]} dot>
    {STATUS_LABELS[approval.status]}
    {approval.status === 'rejected' && approval.rejectedStage && ` at ${approval.rejectedStage}`}
  </Badge>
);

export const revisionText = (r?: number) => (typeof r === 'number' ? `Rev ${String(r).padStart(2, '0')}` : '—');

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
export function Changes({ approval }: { approval: ApiApprovalRequest }) {
  const [showAll, setShowAll] = useState(false);
  const changes = approval.changes ?? [];
  const changedCount = changes.filter(c => c.changed).length;
  const isUpdate = approval.operation === 'update';
  const visible = isUpdate && !showAll ? changes.filter(c => c.changed) : changes;
  const thing = (ENTITY_LABELS[approval.entityType] ?? 'record').toLowerCase();

  return (
    <div className={s.stack}>
      <div className={s.changesHead}>
        <span>
          {approval.operation === 'create' && `A new ${thing} will be added.`}
          {approval.operation === 'delete' && `This ${thing} will be deleted.`}
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

/** Request comment, the two sign-off levels, dates and revision. */
export function ChangeFacts({ approval }: { approval: ApiApprovalRequest }) {
  return (
    <dl className={s.facts}>
      <div><dt>Status</dt><dd><StatusBadgeFor approval={approval} /></dd></div>
      <div><dt>Revision</dt><dd>{approval.status === 'accepted' ? revisionText(approval.revision) : <span className={s.muted}>On acceptance</span>}</dd></div>
      <div><dt>Request date</dt><dd>{approval.requestDate ? formatDate(approval.requestDate) : <span className={s.muted}>On approval</span>}</dd></div>
      <div><dt>Effective date</dt><dd>{approval.effectiveDate ? formatDate(approval.effectiveDate) : <span className={s.muted}>On acceptance</span>}</dd></div>
      <div><dt>Requested by</dt><dd>{approval.requestedByName || '—'}</dd></div>
      <div><dt>Approved by</dt><dd>{approval.approvedByName || '—'}</dd></div>
      <div><dt>Accepted by</dt><dd>{approval.acceptedByName || '—'}</dd></div>
      <div className={s.factFull}><dt>Request comment</dt><dd className={s.pre}>{approval.requestComment || <span className={s.muted}>None</span>}</dd></div>
    </dl>
  );
}

const EVENT_TEXT: Record<ApiApprovalHistoryEntry['action'], string> = {
  submitted: 'Requested',
  approved: 'Approved',
  accepted: 'Accepted — change in effect',
  rejected: 'Rejected',
};

const EVENT_ICON: Record<ApiApprovalHistoryEntry['action'], React.ReactNode> = {
  submitted: <Send />,
  approved: <CircleDot />,
  accepted: <CheckCircle2 />,
  rejected: <XCircle />,
};

/** Everything that happened to this change request, oldest first. */
export function Timeline({ approval }: { approval: ApiApprovalRequest }) {
  const events = approval.history ?? [];
  if (events.length === 0) return null;
  return (
    <section>
      <h3 className={s.reportGroupTitle}>History</h3>
      <ol className={s.timeline}>
        {events.map((e, i) => (
          <li key={i} className={`${s.timelineItem} ${s[`timeline-${e.action}`] ?? ''}`}>
            <span className={s.timelineIcon} aria-hidden="true">{EVENT_ICON[e.action]}</span>
            <div className={s.cellStack}>
              <span>
                <span className={s.strong}>{EVENT_TEXT[e.action]}{e.action === 'rejected' && e.stage ? ` at ${e.stage}` : ''}</span>
                {e.byName && <> by {e.byName}</>}
              </span>
              <span className={s.muted}>{formatDateTime(e.at)}</span>
              {e.comment && <span className={s.pre}>“{e.comment}”</span>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
