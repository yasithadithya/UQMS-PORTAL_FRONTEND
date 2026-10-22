import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Anchor, Award, ExternalLink, Eye, FileText, Hourglass, Lock, PenLine, RotateCcw, Send, Wrench } from 'lucide-react';
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, LoadingBlock, Modal, Section, Tabs, buttonClassName,
} from '@/ui';
import CreateFirstEntry from '@/pages/CreateFirstEntry';
import FirstEntryFullReportPage from '@/pages/FirstEntryFullReportPage';
import VesselEquipmentRecordPage from '@/pages/VesselEquipmentRecordPage';
import EditSurveyReport from '@/pages/EditSurveyReport';
import ScccosModal from '@/components/ScccosModal';
import DockingSurveyModal from '@/components/DockingSurveyModal';
import SignableDocumentModal from '@/components/ESignature/SignableDocumentModal';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import { firstEntryService, fetchReportPdf, jobsService } from '@/api';
import type { ApiFirstEntrySurveyBooking, ApiJob, ApiJobReportItem, ApiScheduleII, ApiScheduleIIDocument, ApiSurveyType, SignableDocType } from '@/api';
import { cosVariantFor } from '@/config/certificateVariants';
import { formatDateTime } from '@/utils/date';
import { DocumentList, Notice } from '../shared';
import s from '../v2.module.css';

type SectionId = 'preliminary' | 'schedule' | 'checklist' | 'supporting' | 'reports-gen' | 'certificate' | 'status' | 'narrative';

const SECTIONS: { value: SectionId; label: string }[] = [
  { value: 'preliminary', label: '1. Preliminary Data' },
  { value: 'schedule', label: '2. Schedule II' },
  { value: 'checklist', label: '3. Checklist' },
  { value: 'supporting', label: '4. Supporting Documents' },
  { value: 'reports-gen', label: '5. Report Generation' },
  { value: 'certificate', label: '6. Certificate' },
  { value: 'status', label: '7. Survey Status' },
  { value: 'narrative', label: '8. Narrative Report' },
];

/**
 * Which reports a job needs, decided by its survey sub types. Edit these rules when the list of
 * reports per survey type is confirmed.
 */
const REPORT_RULES: { id: 'equipment' | 'docking'; applies: (types: ApiSurveyType[], mainType: string) => boolean }[] = [
  { id: 'equipment', applies: (_t, mainType) => mainType === 'first-entry' },
  { id: 'docking', applies: types => types.some(t => /docking/i.test(t.name)) },
];

/** A PDF opened from the Reports tab or a report card (no signing: only the certificate is signed). */
function PdfModal({ title, load, onClose }: { title: string; load: () => Promise<Blob>; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    load()
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((err: any) => setError(err.message));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Modal open onClose={onClose} title={title} size="full" flush>
      {error ? <EmptyState title="Couldn't load the PDF" description={error} /> : url ? (
        <iframe src={url} title={title} style={{ width: '100%', height: '80vh', border: 0 }} />
      ) : <LoadingBlock label="Loading PDF…" />}
    </Modal>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <Card padding="none">
      <EmptyState icon={<Hourglass />} title={title} description="This section is still being specified. It will be added in a later release." />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 2. Schedule II (+ MSS proof)
// ---------------------------------------------------------------------------

function ScheduleIISection({ job, readOnly, onChanged }: { job: ApiJob; readOnly: boolean; onChanged: () => void }) {
  const [schedule, setSchedule] = useState<ApiScheduleII | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);
  const scheduleId = job.links?.scheduleIIId;
  const firstEntryId = job.links?.firstEntryId;

  useEffect(() => {
    if (!scheduleId) {
      setLoading(false);
      return;
    }
    firstEntryService.getScheduleIIById(scheduleId)
      .then(res => setSchedule(res.data))
      .catch((err: any) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [scheduleId]);

  const save = async (next: { documents?: ApiScheduleIIDocument[]; mssProofDocuments?: ApiScheduleIIDocument[] }) => {
    try {
      if (schedule) {
        const res = await firstEntryService.updateScheduleII(schedule._id, { ...next, status: 'attached' });
        setSchedule(res.data);
      } else {
        if (!firstEntryId) throw new Error('This job has no first entry record.');
        const res = await firstEntryService.createScheduleII({ firstEntryId, status: 'attached', documents: next.documents ?? [] });
        let created = res.data;
        if (next.mssProofDocuments) {
          created = (await firstEntryService.updateScheduleII(created._id, { mssProofDocuments: next.mssProofDocuments })).data;
        }
        setSchedule(created);
      }
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingBlock label="Loading Schedule II…" />;
  const docs = schedule?.documents ?? [];
  const proof = schedule?.mssProofDocuments ?? [];

  return (
    <div className={s.stack}>
      <Section
        title="Schedule II documents"
        actions={schedule && docs.length > 0 && !readOnly && (
          schedule.emailSent
            ? <Badge tone="success">Emailed to DSSC</Badge>
            : <Button size="sm" icon={<Send />} loading={emailing} onClick={async () => {
              setEmailing(true);
              try {
                await firstEntryService.sendScheduleIIEmail(schedule._id);
                setSchedule({ ...schedule, emailSent: true });
                toast.success('Schedule II emailed to the DSSC.');
              } catch (err: any) {
                toast.error(err.message);
              } finally {
                setEmailing(false);
              }
            }}>Email to DSSC</Button>
        )}
      >
        <DocumentList
          documents={docs}
          emptyText="No Schedule II documents attached yet."
          uploadPrefix="schedule2"
          uploadLabel="Add Schedule II documents"
          readOnly={readOnly}
          onAdd={doc => save({ documents: [...docs, doc] })}
          onRemove={(_d, idx) => save({ documents: docs.filter((_, i) => i !== idx) })}
        />
      </Section>

      <Section
        title="MSS proof"
        description={job.mssProofRequired
          ? 'Required for this job: upload the MSS proof before submitting or signing the certificate. It is listed under Reports.'
          : 'Not required for this job.'}
        actions={job.mssProofRequired && (proof.length > 0 ? <Badge tone="success">Uploaded</Badge> : <Badge tone="warning">Required</Badge>)}
      >
        <DocumentList
          documents={proof}
          emptyText="No MSS proof uploaded."
          uploadPrefix="mss-proof"
          uploadLabel="Upload MSS proof"
          readOnly={readOnly}
          onAdd={doc => save({ mssProofDocuments: [...proof, doc] })}
          onRemove={(_d, idx) => save({ mssProofDocuments: proof.filter((_, i) => i !== idx) })}
        />
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Supporting documents
// ---------------------------------------------------------------------------

function SupportingDocumentsSection({ job, readOnly, onJob }: { job: ApiJob; readOnly: boolean; onJob: (j: ApiJob) => void }) {
  return (
    <Section title="Supporting documents" description="Any other files for this survey.">
      <DocumentList
        documents={job.supportingDocuments}
        emptyText="No supporting documents yet."
        uploadPrefix="supporting"
        readOnly={readOnly}
        onAdd={async doc => {
          try {
            onJob((await jobsService.addDocument(job._id, doc)).data);
          } catch (err: any) {
            toast.error(err.message);
          }
        }}
        onRemove={async doc => {
          if (!doc._id) return;
          try {
            onJob((await jobsService.removeDocument(job._id, doc._id)).data);
          } catch (err: any) {
            toast.error(err.message);
          }
        }}
      />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 5. Report generation
// ---------------------------------------------------------------------------

function ReportGenerationSection({
  job, booking, readOnly, onChanged,
}: { job: ApiJob; booking: ApiFirstEntrySurveyBooking | null; readOnly: boolean; onChanged: () => void }) {
  const { can } = useAuth();
  const [panel, setPanel] = useState<'equipment' | 'final' | null>(null);
  const [dockingOpen, setDockingOpen] = useState(false);
  const [viewer, setViewer] = useState<{ title: string; docType: SignableDocType; id: string } | null>(null);
  const surveyReportId = job.links?.surveyReportId;
  const types = job.surveyTypes.filter((t): t is ApiSurveyType => typeof t === 'object');
  const needs = new Set(REPORT_RULES.filter(r => r.applies(types, job.mainSurveyType)).map(r => r.id));

  if (!surveyReportId) return <Notice>Start the reporting from the job page first.</Notice>;

  return (
    <div className={s.stack}>
      {needs.size === 0 && <Notice>No reports are needed for this job's surveys.</Notice>}
      <div className={s.cards}>
        {needs.has('equipment') && (
          <>
            <Card>
              <div className={s.cardBody}>
                <h3 className={s.cardTitle}><Wrench aria-hidden="true" />Record of Equipment</h3>
                <p className={s.hint}>Recommended equipment for the vessel, grouped by code.</p>
                <div className={s.cardActions}>
                  <Button size="sm" variant={panel === 'equipment' ? 'primary' : 'secondary'} onClick={() => setPanel(panel === 'equipment' ? null : 'equipment')}>
                    {panel === 'equipment' ? 'Close' : readOnly ? 'View' : 'Fill in'}
                  </Button>
                </div>
              </div>
            </Card>
            <Card>
              <div className={s.cardBody}>
                <h3 className={s.cardTitle}><FileText aria-hidden="true" />Survey Report (Part C)</h3>
                <p className={s.hint}>Hull, machinery, safety equipment and capacity.</p>
                <div className={s.cardActions}>
                  <Button size="sm" variant={panel === 'final' ? 'primary' : 'secondary'} onClick={() => setPanel(panel === 'final' ? null : 'final')}>
                    {panel === 'final' ? 'Close' : readOnly ? 'View' : 'Fill in'}
                  </Button>
                  {job.links?.finalReportId && (
                    <Button size="sm" icon={<Eye />} onClick={() => setViewer({ title: 'Survey report', docType: 'survey-report', id: job.links!.finalReportId! })}>PDF</Button>
                  )}
                </div>
              </div>
            </Card>
          </>
        )}
        {needs.has('docking') && (
          <Card>
            <div className={s.cardBody}>
              <h3 className={s.cardTitle}><Anchor aria-hidden="true" />Docking Survey Report</h3>
              <p className={s.hint}>Docking statement for the docking survey.</p>
              <div className={s.cardActions}>
                {job.links?.dockingCertId ? (
                  <Button size="sm" icon={<Eye />} onClick={() => setViewer({ title: 'Docking survey report', docType: 'docking-cert', id: job.links!.dockingCertId! })}>View</Button>
                ) : (
                  <Button size="sm" variant="primary" disabled={readOnly || !booking || !can(MODULE_KEYS.marineCertificates, 'create')} onClick={() => setDockingOpen(true)}>Generate</Button>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {panel === 'equipment' && (
        <VesselEquipmentRecordPage embedded={{ surveyReportId, readOnly, onSaved: () => { setPanel(null); onChanged(); } }} />
      )}
      {panel === 'final' && <EditSurveyReport embedded={{ surveyReportId, readOnly }} />}

      <DockingSurveyModal
        isOpen={dockingOpen}
        onClose={() => setDockingOpen(false)}
        booking={booking}
        surveyReportId={surveyReportId}
        onSuccess={() => { setDockingOpen(false); onChanged(); }}
      />
      {viewer && <PdfModal title={viewer.title} load={() => fetchReportPdf(viewer.docType, viewer.id)} onClose={() => setViewer(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. Certificate
// ---------------------------------------------------------------------------

function CertificateSection({
  job, booking, readOnly, onChanged,
}: { job: ApiJob; booking: ApiFirstEntrySurveyBooking | null; readOnly: boolean; onChanged: () => void }) {
  const { can } = useAuth();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const variant = cosVariantFor(job.vesselCode);
  const surveyReportId = job.links?.surveyReportId;
  const certificateId = job.links?.certificateId;
  const hasLastVisit = !!(booking?.lastVisitDate || booking?.lastVisit || booking?.visitDetails?.some(v => v.isLastVist || v.isLastVisitDate));
  const canSign = can(MODULE_KEYS.jobsReporting, 'approve') || can(MODULE_KEYS.marineCertificates, 'sign-on-behalf');

  if (!surveyReportId) return <Notice>Start the reporting from the job page first.</Notice>;

  return (
    <div className={s.stack}>
      <Section
        title={`Certificate of Survey · ${variant.shortName}`}
        description={variant.title}
        actions={certificateId
          ? <Button variant="primary" icon={<PenLine />} onClick={() => setSignOpen(true)}>{canSign && job.status !== 'completed' ? 'View & sign' : 'View certificate'}</Button>
          : <Button variant="primary" icon={<Award />} disabled={readOnly || !hasLastVisit || !booking || !can(MODULE_KEYS.marineCertificates, 'create')} onClick={() => setGenerateOpen(true)}>Generate {variant.shortName}</Button>}
      >
        {!certificateId && !hasLastVisit && <p className={s.hint}>Mark the last visit in the survey booking before generating the certificate.</p>}
        {!certificateId && hasLastVisit && <p className={s.hint}>Record the findings and generate the certificate. The surveyor then signs it, and it goes to the manager for approval.</p>}
        {certificateId && (
          <p className={s.hint}>
            {job.status === 'pending-authorization' && 'Signed and waiting for manager approval.'}
            {job.status === 'completed' && 'Signed and approved by the manager.'}
            {!['pending-authorization', 'completed'].includes(job.status) && (canSign
              ? 'Open the certificate to sign it. Signing locks the reporting and sends the job to the manager.'
              : 'The surveyor signs the certificate.')}
          </p>
        )}
      </Section>

      <Section title="Class Certificate" description="Issued for classed vessels.">
        <p className={s.hint}>The class certificate template has not been set up yet.</p>
      </Section>

      <ScccosModal
        isOpen={generateOpen}
        onClose={() => setGenerateOpen(false)}
        booking={booking}
        surveyReportId={surveyReportId}
        vesselCode={job.vesselCode}
        onSuccess={() => { setGenerateOpen(false); onChanged(); }}
      />
      {signOpen && certificateId && (
        <SignableDocumentModal
          isOpen
          onClose={() => { setSignOpen(false); onChanged(); }}
          title={`${variant.shortName} — ${job.vesselName}`}
          docType="scccos"
          docId={certificateId}
          fetchPdf={() => fetchReportPdf('scccos', certificateId)}
          downloadFileName={`${variant.shortName}_${job.vesselName}.pdf`}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reports tab
// ---------------------------------------------------------------------------

export function ReportsTab({ job }: { job: ApiJob }) {
  const [items, setItems] = useState<ApiJobReportItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ApiJobReportItem | null>(null);

  useEffect(() => {
    jobsService.getReports(job._id).then(res => setItems(res.data)).catch((err: any) => setError(err.message));
  }, [job._id, job.updatedAt]);

  const groups = useMemo(() => {
    const map = new Map<string, ApiJobReportItem[]>();
    (items ?? []).forEach(i => map.set(i.category, [...(map.get(i.category) ?? []), i]));
    return [...map.entries()];
  }, [items]);

  if (error) return <Notice tone="danger">{error}</Notice>;
  if (!items) return <LoadingBlock label="Loading reports…" />;
  if (items.length === 0) {
    return <Card padding="none"><EmptyState icon={<FileText />} title="No reports yet" description="Uploaded documents and generated PDFs appear here." /></Card>;
  }

  return (
    <Card>
      {groups.map(([category, list]) => (
        <div key={category} className={s.reportGroup}>
          <h3 className={s.reportGroupTitle}>{category}</h3>
          <ul className={s.docList}>
            {list.map((item, idx) => (
              <li key={`${item.docId ?? item.key}-${idx}`} className={s.docRow}>
                <span className={s.docIcon} aria-hidden="true"><FileText /></span>
                <span className={s.docText}>
                  <span className={s.docName}>{item.name}</span>
                  <span className={s.docMeta}>{item.generatedAt ? formatDateTime(item.generatedAt) : ''}</span>
                </span>
                {item.docType === 'scccos' && <Badge tone={item.signed ? 'success' : 'warning'}>{item.signed ? 'Signed' : 'Not signed'}</Badge>}
                {item.docType ? (
                  <Button size="sm" variant="ghost" icon={<Eye />} onClick={() => setViewer(item)}>View</Button>
                ) : item.url ? (
                  <a className={buttonClassName({ variant: 'ghost', size: 'sm' })} href={item.url} target="_blank" rel="noreferrer">
                    <ExternalLink aria-hidden="true" /><span>Open</span>
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {viewer?.docType && viewer.docId && (
        <PdfModal title={viewer.name} load={() => fetchReportPdf(viewer.docType!, viewer.docId!)} onClose={() => setViewer(null)} />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

/** V2 Survey Reporting workspace for First Entry jobs: Reporting (8 sections) and Reports. */
export default function FirstEntryWorkspace({
  job, readOnly, onJob, reload,
}: { job: ApiJob; readOnly: boolean; onJob: (j: ApiJob) => void; reload: () => void }) {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'reports' ? 'reports' : 'reporting';
  const section = (SECTIONS.some(x => x.value === params.get('section')) ? params.get('section') : 'preliminary') as SectionId;
  const [booking, setBooking] = useState<ApiFirstEntrySurveyBooking | null>(null);
  const [confirmUnmark, setConfirmUnmark] = useState(false);
  const [unmarking, setUnmarking] = useState(false);

  const loadBooking = useCallback(() => {
    if (!job.links?.bookingId) return;
    firstEntryService.getFirstEntrySurveyBookingById(job.links.bookingId).then(res => setBooking(res.data)).catch(() => setBooking(null));
  }, [job.links?.bookingId]);
  useEffect(loadBooking, [loadBooking, job.updatedAt]);

  const set = (next: Record<string, string>) => setParams(prev => {
    const p = new URLSearchParams(prev);
    Object.entries(next).forEach(([k, v]) => p.set(k, v));
    return p;
  }, { replace: true });

  const lastVisit = booking?.visitDetails?.find(v => v.isLastVist || v.isLastVisitDate);
  const canUnmark = !readOnly && !!lastVisit && String(lastVisit.status || '').toLowerCase() === 'completed';

  const changed = () => {
    reload();
    loadBooking();
  };

  const surveyReportId = job.links?.surveyReportId;

  return (
    <div className={s.stack}>
      <div className={s.row} style={{ justifyContent: 'space-between' }}>
        <Tabs
          label="Workspace"
          variant="segmented"
          value={view}
          onValueChange={v => set({ view: v })}
          items={[{ value: 'reporting', label: 'Reporting' }, { value: 'reports', label: 'Reports' }]}
        />
        <div className={s.row}>
          {readOnly && <Badge tone="neutral" icon={<Lock />}>Read only</Badge>}
          {canUnmark && <Button size="sm" icon={<RotateCcw />} onClick={() => setConfirmUnmark(true)}>Unmark last visit</Button>}
        </div>
      </div>

      {view === 'reports' ? <ReportsTab job={job} /> : (
        <>
          <Tabs label="Reporting section" value={section} onValueChange={v => set({ section: v })} items={SECTIONS} />
          {section === 'preliminary' && (job.links?.firstEntryId
            ? <CreateFirstEntry key={job.links.firstEntryId} embedded={{ firstEntryId: job.links.firstEntryId, readOnly, onSaved: changed }} />
            : <Notice tone="warning">This job has no first entry record.</Notice>)}
          {section === 'schedule' && <ScheduleIISection job={job} readOnly={readOnly} onChanged={changed} />}
          {section === 'checklist' && (surveyReportId
            ? <FirstEntryFullReportPage key={surveyReportId} embedded={{ surveyReportId, readOnly }} />
            : <Notice>Start the reporting from the job page first.</Notice>)}
          {section === 'supporting' && <SupportingDocumentsSection job={job} readOnly={readOnly} onJob={onJob} />}
          {section === 'reports-gen' && <ReportGenerationSection job={job} booking={booking} readOnly={readOnly} onChanged={changed} />}
          {section === 'certificate' && <CertificateSection job={job} booking={booking} readOnly={readOnly} onChanged={changed} />}
          {section === 'status' && <Placeholder title="Survey Status" />}
          {section === 'narrative' && <Placeholder title="Narrative Report" />}
        </>
      )}

      <ConfirmDialog
        open={confirmUnmark}
        title="Unmark the last visit?"
        message="The visit stays in the booking but is no longer the last visit, so more visits can be added."
        confirmText="Unmark"
        loading={unmarking}
        onCancel={() => setConfirmUnmark(false)}
        onConfirm={async () => {
          setUnmarking(true);
          try {
            onJob((await jobsService.unmarkLastVisit(job._id)).data);
            loadBooking();
            toast.success('Last visit unmarked.');
          } catch (err: any) {
            toast.error(err.message);
          } finally {
            setUnmarking(false);
            setConfirmUnmark(false);
          }
        }}
      />
    </div>
  );
}

