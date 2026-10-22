import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AlertTriangle, CalendarCheck, Check, CheckCircle2, ClipboardList, Construction, History, Lock, Send, XCircle } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Field, LoadingBlock, Modal, PageHeader, Section, Tabs, Textarea } from '@/ui';
import CreateFirstEntrySurveyBooking from '@/pages/CreateFirstEntrySurveyBooking';
import { jobsService } from '@/api';
import type { ApiJob } from '@/api';
import { IMPLEMENTED_MAIN_TYPES, type MainSurveyType } from '@/config/surveyCategories';
import { formatDate, formatDateTime } from '@/utils/date';
import FirstEntryWorkspace from './reporting/FirstEntryWorkspace';
import { JobStatusBadge, Notice, mainTypeLabel, personName, surveyTypeLabel } from './shared';
import s from './v2.module.css';

/** How the page is opened: working on the job, viewing a completed one, or authorizing it as manager. */
export type JobPageMode = 'work' | 'view' | 'authorize';

const STAGES: { key: string; label: string; reached: string[] }[] = [
  { key: 'allocated', label: 'Allocated', reached: ['allocated', 'booked', 'in-progress', 'submitted', 'surveyor-approved', 'pending-authorization', 'completed'] },
  { key: 'booked', label: 'Survey booked', reached: ['booked', 'in-progress', 'submitted', 'surveyor-approved', 'pending-authorization', 'completed'] },
  { key: 'in-progress', label: 'Reporting', reached: ['in-progress', 'submitted', 'surveyor-approved', 'pending-authorization', 'completed'] },
  { key: 'pending-authorization', label: 'Certificate signed', reached: ['pending-authorization', 'completed'] },
  { key: 'completed', label: 'Manager approved', reached: ['completed'] },
];

function DecisionModal({
  title, approveText, onClose, onDecide,
}: { title: string; approveText: string; onClose: () => void; onDecide: (decision: 'approve' | 'reject', reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const decide = async (decision: 'approve' | 'reject') => {
    if (decision === 'reject' && !reason.trim()) {
      toast.error('Give a reason for rejecting.');
      return;
    }
    setBusy(decision);
    try {
      await onDecide(decision, reason.trim());
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="danger" icon={<XCircle />} loading={busy === 'reject'} disabled={!!busy} onClick={() => decide('reject')}>Reject</Button>
          <Button variant="primary" icon={<CheckCircle2 />} loading={busy === 'approve'} disabled={!!busy} onClick={() => decide('approve')}>{approveText}</Button>
        </>
      }
    >
      <Field label="Reason or comment" hint="Required when rejecting. The reporting becomes editable again.">
        <Textarea rows={4} value={reason} onChange={e => setReason(e.target.value)} />
      </Field>
    </Modal>
  );
}

export default function JobPage({ jobId, backHref, backLabel, mode }: { jobId: string; backHref: string; backLabel: string; mode: JobPageMode }) {
  const [job, setJob] = useState<ApiJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [decision, setDecision] = useState<'review' | 'authorize' | null>(null);
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    try {
      const res = await jobsService.getJob(jobId);
      setJob(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState title="Couldn't load the job" message={error} onRetry={load} />;
  if (!job) return <LoadingBlock label="Loading job…" />;

  const access = job.access;
  const readOnly = mode !== 'work' || !access?.canEdit;
  const implemented = IMPLEMENTED_MAIN_TYPES.includes(job.mainSurveyType as MainSurveyType);
  const started = !!job.links?.surveyReportId;
  const stage = params.get('stage') === 'booking' || !started ? 'booking' : 'reporting';
  const lastRejection = [...(job.statusHistory || [])].reverse().find(h => h.reason && h.to === 'in-progress');

  const run = async (key: string, action: () => Promise<{ data: ApiJob; message?: string }>) => {
    setBusy(key);
    try {
      const res = await action();
      setJob(prev => ({ ...prev, ...res.data, access: prev?.access }));
      if (res.message) toast.success(res.message);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const startReporting = () => run('start', async () => {
    const res = await jobsService.startReporting(job._id);
    setParams(prev => {
      const p = new URLSearchParams(prev);
      p.set('stage', 'reporting');
      return p;
    });
    return res;
  });

  const actions = (
    <>
      {mode === 'work' && access?.canSubmit && (
        <Button variant="primary" icon={<Send />} loading={busy === 'submit'} onClick={() => run('submit', () => jobsService.submit(job._id))}>
          Submit to surveyor
        </Button>
      )}
      {mode === 'work' && access?.canReview && (
        <Button variant="primary" icon={<CheckCircle2 />} onClick={() => setDecision('review')}>Review submission</Button>
      )}
      {mode === 'authorize' && access?.canAuthorize && (
        <Button variant="primary" icon={<CheckCircle2 />} onClick={() => setDecision('authorize')}>Approve or reject</Button>
      )}
    </>
  );

  const surveyorNames = [personName(job.surveyor), ...job.assistantSurveyors.map(a => `${personName(a)} (assistant)`)].join(', ');

  return (
    <div className="animate-in">
      <PageHeader
        back={{ href: backHref, label: backLabel }}
        title={`${job.jobNumber || job.requestNumber} · ${job.vesselName}`}
        description={`${mainTypeLabel(job.mainSurveyType)} · ${job.sector === 'industrial' ? 'Industrial' : 'Marine'}`}
        meta={<><JobStatusBadge status={job.status} />{job.legacy && <Badge tone="neutral">Migrated</Badge>}</>}
        actions={actions}
      />

      <div className={s.stack}>
        <Card>
          <dl className={s.facts}>
            <div><dt>UQMS no.</dt><dd className={s.mono}>{job.uqmsNumber || '—'}</dd></div>
            <div><dt>Request no.</dt><dd className={s.mono}>{job.requestNumber}</dd></div>
            <div><dt>Quotation</dt><dd className={s.mono}>{job.quotationNumber || '—'}</dd></div>
            <div><dt>Vessel code</dt><dd>{job.vesselCode || '—'}</dd></div>
            <div><dt>Surveys</dt><dd>{job.surveyTypes.map(surveyTypeLabel).join(', ') || '—'}</dd></div>
            <div><dt>Surveyors</dt><dd>{surveyorNames}</dd></div>
            <div><dt>MSS proof</dt><dd>{job.mssProofRequired ? (job.mssProofUploaded ? 'Required · uploaded' : 'Required · missing') : 'Not required'}</dd></div>
            <div><dt>Allocated</dt><dd>{job.allocatedAt ? formatDate(job.allocatedAt) : '—'}</dd></div>
          </dl>
          <ol className={s.steps} style={{ marginTop: 'var(--space-4)' }} aria-label="Job progress">
            {STAGES.map(st => {
              const done = st.reached.includes(job.status);
              const current = job.status === st.key || (st.key === 'in-progress' && ['submitted', 'surveyor-approved'].includes(job.status));
              return (
                <li key={st.key} className={`${s.step} ${current ? s.stepCurrent : done ? s.stepDone : ''}`}>
                  {done && !current && <Check aria-hidden="true" />}{st.label}
                </li>
              );
            })}
          </ol>
        </Card>

        {mode === 'work' && access?.lockedReason && <Notice icon={<Lock />}>{access.lockedReason}</Notice>}
        {lastRejection && job.status === 'in-progress' && (
          <Notice tone="warning" icon={<AlertTriangle />}>
            <p><strong>Sent back by {lastRejection.byName || 'a reviewer'}</strong> on {formatDateTime(lastRejection.at)}: {lastRejection.reason}</p>
          </Notice>
        )}
        {job.status === 'submitted' && mode === 'work' && !access?.canReview && (
          <Notice icon={<Send />}>Submitted to {personName(job.surveyor)} for review.</Notice>
        )}

        {!implemented ? (
          <Card padding="none">
            <EmptyState icon={<Construction />} title={`${mainTypeLabel(job.mainSurveyType)} reporting is coming in the next version`}
              description="The job is allocated. Its reporting workspace will be available once this survey type is built." />
          </Card>
        ) : (
          <>
            <Tabs
              label="Job stage"
              value={stage}
              onValueChange={v => setParams(prev => {
                const p = new URLSearchParams(prev);
                p.set('stage', v);
                return p;
              })}
              items={[
                { value: 'booking', label: 'Survey booking' },
                { value: 'reporting', label: 'Survey reporting', disabled: !started },
              ]}
            />

            {stage === 'booking' ? (
              <div className={s.stack}>
                {!started && job.links?.bookingId && (
                  <Notice icon={<CalendarCheck />}>
                    <div className={s.row} style={{ justifyContent: 'space-between', width: '100%' }}>
                      <span>The survey is booked. Start the reporting when you're ready.</span>
                      <Button variant="primary" icon={<ClipboardList />} loading={busy === 'start'} disabled={mode !== 'work' || readOnly} onClick={startReporting}>
                        Survey Reporting
                      </Button>
                    </div>
                  </Notice>
                )}
                <CreateFirstEntrySurveyBooking
                  key={job.links?.bookingId ?? 'new'}
                  job={{
                    bookingId: job.links?.bookingId,
                    vesselId: job.vessel,
                    requestId: typeof job.request === 'object' ? job.request._id : job.request,
                    surveyorIds: [job.surveyor, ...job.assistantSurveyors].map(p => (typeof p === 'object' ? p._id : p)),
                    readOnly,
                    onSaved: async bookingId => {
                      if (!job.links?.bookingId) {
                        await run('link', () => jobsService.linkBooking(job._id, bookingId));
                      } else {
                        await load();
                      }
                    },
                  }}
                />
              </div>
            ) : (
              <FirstEntryWorkspace job={job} readOnly={readOnly} onJob={next => setJob(prev => ({ ...prev, ...next, access: prev?.access }))} reload={load} />
            )}
          </>
        )}

        <Section title={<span className={s.row}><History aria-hidden="true" width={16} height={16} />History</span>}>
          <ul className={s.history}>
            {[...(job.statusHistory || [])].reverse().map((h, i) => (
              <li key={i}>
                <JobStatusBadge status={h.to} />
                <span className={s.muted}>{formatDateTime(h.at)}</span>
                <span>{h.byName}</span>
                {h.reason && <span className={s.muted}>— {h.reason}</span>}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {decision === 'review' && (
        <DecisionModal
          title="Review the submitted reporting"
          approveText="Approve reporting"
          onClose={() => setDecision(null)}
          onDecide={(d, reason) => run('review', () => jobsService.review(job._id, d, reason))}
        />
      )}
      {decision === 'authorize' && (
        <DecisionModal
          title="Manager approval"
          approveText="Approve job"
          onClose={() => setDecision(null)}
          onDecide={(d, reason) => run('authorize', () => jobsService.authorize(job._id, d, reason))}
        />
      )}
    </div>
  );
}
