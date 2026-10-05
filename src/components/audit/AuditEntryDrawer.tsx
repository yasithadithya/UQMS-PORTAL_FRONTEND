import { useEffect, useState } from 'react';
import { auditLogService, type ApiAuditLog, type ApiAuditMeta } from '@/api';
import { formatDateTime } from '@/utils/date';
import { Badge, Drawer, ErrorState, LoadingBlock } from '@/ui';
import { ChangeList, showAuditValue } from './ChangeList';
import s from './Audit.module.css';

type Props = {
  /** The list row; the full entry (with snapshot) is loaded when the drawer opens. */
  entry: ApiAuditLog | null;
  meta: ApiAuditMeta | null;
  onClose: () => void;
};

export const auditActorName = (e: ApiAuditLog): string =>
  e.user?.fullName || e.userName || e.user?.username || e.userEmail || '—';

/** Everything recorded for one audit entry: who, when, where from, what changed and the record snapshot. */
export function AuditEntryDrawer({ entry, meta, onClose }: Props) {
  const [full, setFull] = useState<ApiAuditLog | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setFull(null);
    setError('');
    if (!entry) return;
    let cancelled = false;
    auditLogService.getById(entry._id)
      .then((res) => { if (!cancelled) setFull(res.data); })
      .catch((err: Error) => { if (!cancelled) setError(err.message || 'Could not load the entry.'); });
    return () => { cancelled = true; };
  }, [entry]);

  const e = full ?? entry;
  const actionLabel = e ? meta?.actions[e.action]?.label ?? e.action : '';
  const entityLabel = e ? meta?.entities[e.entityType]?.label ?? e.entityType : '';
  const metadata = e?.metadata && Object.keys(e.metadata).length ? e.metadata : null;

  return (
    <Drawer open={!!entry} onClose={onClose} title={actionLabel || 'Audit entry'} description={e?.summary} width={560}>
      {e && (
        <>
          <dl className={s.meta}>
            <dt>When</dt>
            <dd>{formatDateTime(e.createdAt)}</dd>
            <dt>By</dt>
            <dd>
              {auditActorName(e)} {e.roleName && <Badge tone="neutral">{e.roleName}</Badge>}
              {e.userEmail && e.userEmail !== auditActorName(e) && <div className={s.mono}>{e.userEmail}</div>}
            </dd>
            <dt>Outcome</dt>
            <dd><Badge tone={e.outcome === 'failure' ? 'danger' : 'success'}>{e.outcome === 'failure' ? 'Failed' : 'Succeeded'}</Badge></dd>
            <dt>Record</dt>
            <dd>{entityLabel} {e.entityRef && <strong>{e.entityRef}</strong>}{e.entityId && <div className={s.mono}>{e.entityId}</div>}</dd>
            {e.module && (<><dt>Module</dt><dd className={s.mono}>{e.module}</dd></>)}
            {e.reason && (<><dt>Reason</dt><dd>{e.reason}</dd></>)}
            <dt>IP address</dt>
            <dd className={s.mono}>{e.ip || '—'}</dd>
            <dt>Device</dt>
            <dd className={s.mono}>{e.userAgent || '—'}</dd>
            {(e.method || e.path) && (<><dt>Request</dt><dd className={s.mono}>{[e.method, e.path].filter(Boolean).join(' ')}</dd></>)}
            {e.requestId && (<><dt>Request ID</dt><dd className={s.mono}>{e.requestId}</dd></>)}
          </dl>

          <h3 className={s.sectionTitle}>Changes ({e.changes.length})</h3>
          <ChangeList changes={e.changes} />

          {metadata && (
            <>
              <h3 className={s.sectionTitle}>Details</h3>
              <dl className={s.meta}>
                {Object.entries(metadata).map(([k, v]) => (
                  <div key={k} style={{ display: 'contents' }}>
                    <dt>{k}</dt>
                    <dd>{showAuditValue(v)}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          {e.hasSnapshot && (
            <>
              <h3 className={s.sectionTitle}>Record snapshot</h3>
              {error ? <ErrorState compact title="Could not load the snapshot" message={error} />
                : !full ? <LoadingBlock />
                : <pre className={s.code}>{JSON.stringify(full.snapshot, null, 2)}</pre>}
            </>
          )}
        </>
      )}
    </Drawer>
  );
}
