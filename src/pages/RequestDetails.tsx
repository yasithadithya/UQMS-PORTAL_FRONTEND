import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  operationsService,
  requestsService,
  vesselCodesService,
  type ApiAreaOfOperation,
  type ApiRequest,
  type ApiRequestDocument,
  type ApiSurveyType,
  type ApiVesselType,
  type RequestPayload,
  type ApiVesselCode,
} from '@/api';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import SearchableSelect from '@/components/SearchableSelect';
import DragDropFileUpload from '@/components/DragDropFileUpload';
import { formatDate } from '@/utils/date';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import { Check, ExternalLink, Eye, FileText, Pencil, Printer, Send, Trash2, X } from 'lucide-react';
import {
  Badge, Button, ButtonLink, Card, ConfirmDialog, EmptyState, ErrorState, Field, FormGrid, FormSection, IconButton, Input,
  LoadingBlock, Modal, PageHeader, Section, Select, StatusBadge, StickyActionBar, buttonClassName, type Tone,
} from '@/ui';
import s from './RequestDetails.module.css';

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Keep a blob URL alive while `win` is open (so reloading that tab works), then free it. */
const revokeWhenClosed = (win: Window | null, url: string) => {
  if (!win) {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const timer = window.setInterval(() => {
    if (win.closed) {
      window.clearInterval(timer);
      URL.revokeObjectURL(url);
    }
  }, 5_000);
};

/**
 * Show a PDF blob URL in a tab opened earlier (synchronously, so popup blockers allow it).
 * When `autoPrint` is set, prints the PDF frame itself; printing the wrapper page prints blank in Chrome.
 */
const showPdfInWindow = (win: Window | null, pdfUrl: string, title: string, autoPrint: boolean) => {
  if (!win) {
    const fallbackWindow = window.open(pdfUrl, '_blank');
    fallbackWindow?.focus();
    revokeWhenClosed(fallbackWindow, pdfUrl);
    return;
  }

  win.document.open();
  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          html, body { margin: 0; width: 100%; height: 100%; background: #f3f4f6; }
          .viewer { width: 100vw; height: 100vh; border: 0; display: block; }
        </style>
      </head>
      <body>
        <iframe class="viewer" src="${pdfUrl}"></iframe>
        <script>
          const frame = document.querySelector('iframe');
          frame.addEventListener('load', () => {
            ${autoPrint ? `
            // Give the PDF viewer a moment to render before opening the print dialog.
            setTimeout(() => {
              try {
                frame.contentWindow.focus();
                frame.contentWindow.print();
              } catch (e) {
                window.print();
              }
            }, 300);` : 'window.focus();'}
          });
        </script>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  revokeWhenClosed(win, pdfUrl);
};

const getId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && '_id' in (value as Record<string, string>)) {
    return String((value as Record<string, string>)._id);
  }
  return '';
};

type PendingDocument = {
  id: string;
  file: File;
  name: string;
};

const makeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getFileBaseName = (filename: string) => filename.replace(/\.[^/.]+$/, '');

/** "application/pdf" -> "PDF", "image/png" -> "PNG image". */
const fileKind = (contentType?: string) => {
  if (!contentType) return 'File';
  if (contentType === 'application/pdf') return 'PDF';
  const [type, sub] = contentType.split('/');
  if (type === 'image' && sub) return `${sub.toUpperCase()} image`;
  return sub ? sub.toUpperCase() : 'File';
};

const formatBytes = (value?: number) => {
  if (value === undefined) return '-';
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

/** Request statuses as the business uses them, with their badge color (same as the request list). */
const STATUS: Record<ApiRequest['status'], { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'info' },
  print: { label: 'Print', tone: 'warning' },
  reject: { label: 'Reject', tone: 'danger' },
  success: { label: 'Success', tone: 'success' },
};

const requestToForm = (request: ApiRequest): RequestPayload => ({
  uqmsNumber: request.uqmsNumber || '',
  imoNumber: request.imoNumber || '',
  mmsiNumber: request.mmsiNumber || '',
  vesselCode: request.vesselCode || '',
  vesselName: request.vesselName || '',
  companyName: request.companyName || '',
  contactPersonName: request.contactPersonName || '',
  contactPersonNumber: request.contactPersonNumber || '',
  registerdAddress: request.registerdAddress || '',
  invoicingAddress: request.invoicingAddress || '',
  companyEmail: request.companyEmail || '',
  sector: request.sector || 'marine',
  createdAt: request.createdAt ? request.createdAt.split('T')[0] : '',
  vesselType: getId(request.vesselType),
  areaOfOperation: getId(request.areaOfOperation),
  surveyTypes: (request.surveyTypes || []).map(getId),
  status: request.status || 'active',
});

const vesselLabel = (request: ApiRequest) => {
  const vesselType = request.vesselType as Partial<ApiVesselType>;
  return vesselType?.name ? `${vesselType.group} - ${vesselType.name}` : '';
};

const areaLabel = (request: ApiRequest) => {
  const area = request.areaOfOperation as Partial<ApiAreaOfOperation>;
  return area?.description ? `${area.AreaCategory} - ${area.description}` : '';
};

const surveyLabel = (survey: ApiRequest['surveyTypes'][number]) => {
  if (typeof survey === 'string') return survey;
  return survey.code ? `${survey.code} - ${survey.name}` : survey.name;
};

function DetailField({ label, value, full }: { label: string; value?: ReactNode; full?: boolean }) {
  return (
    <div className={full ? `${s.field} ${s.fieldFull}` : s.field}>
      <dt>{label}</dt>
      <dd>{value || <span className={s.empty}>—</span>}</dd>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Section title={title}>
      <dl className={s.fields}>{children}</dl>
    </Section>
  );
}

type DocItem = { key: string; name: string; meta: string; url?: string; onDelete?: () => void; deleteDisabled?: boolean };

/** Attached files: name, type/size, open link and delete. */
function DocList({ items }: { items: DocItem[] }) {
  return (
    <ul className={s.docList}>
      {items.map(doc => (
        <li key={doc.key} className={s.docRow}>
          <span className={s.docIcon} aria-hidden="true"><FileText /></span>
          <span className={s.docText}>
            <span className={s.docName}>{doc.name}</span>
            <span className={s.docMeta}>{doc.meta}</span>
          </span>
          {doc.url && (
            <a className={buttonClassName({ variant: 'ghost', size: 'sm' })} href={doc.url} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" /><span>Open</span>
            </a>
          )}
          {doc.onDelete && (
            <IconButton label={`Delete ${doc.name}`} icon={<Trash2 />} size="sm" variant="dangerGhost" onClick={doc.onDelete} disabled={doc.deleteDisabled} />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function RequestDetailsPage() {
  const { can } = useAuth();
  const canDelete = can(MODULE_KEYS.newRequest, 'delete');
  const canReview = can(MODULE_KEYS.newRequest, 'update');
  const params = useParams();
  const id = params.submodule || (params['*'] ? params['*'].split('/')[0] : undefined);
  const navigate = useNavigate();
  const [request, setRequest] = useState<ApiRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<RequestPayload | null>(null);
  const [vesselTypes, setVesselTypes] = useState<ApiVesselType[]>([]);
  const [vesselCodes, setVesselCodes] = useState<ApiVesselCode[]>([]);
  const [areaOps, setAreaOps] = useState<ApiAreaOfOperation[]>([]);
  const [surveyTypes, setSurveyTypes] = useState<ApiSurveyType[]>([]);
  const [saving, setSaving] = useState(false);
  const [printingPdf, setPrintingPdf] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [pendingSignedPdf, setPendingSignedPdf] = useState<File | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    isDestructive?: boolean;
    action: () => Promise<void>;
  } | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const nextDocs: PendingDocument[] = Array.from(fileList).map((file) => ({
      id: makeId(),
      file,
      name: getFileBaseName(file.name),
    }));
    setPendingDocuments((prev) => [...prev, ...nextDocs]);
  };

  const handleRemovePending = (id: string) => {
    setPendingDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const loadRequest = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setPageError('');
      const [reqRes, vRes, aRes, sRes, vcRes] = await Promise.all([
        requestsService.getRequestById(id),
        operationsService.getVesselTypes(),
        operationsService.getAreaOperations(),
        operationsService.getSurveyTypes(),
        vesselCodesService.getVesselCodes(),
      ]);

      setRequest(reqRes.data);
      setVesselTypes(vRes.data);
      setAreaOps(aRes.data);
      setSurveyTypes(sRes.data);
      setVesselCodes(vcRes.data);
      setForm(requestToForm(reqRes.data));
    } catch (err: any) {
      setPageError(err.message || 'Failed to load request details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
  }, [id]);

  const vesselOptions = useMemo(
    () => vesselTypes.map((item) => ({ id: item._id, label: `${item.group} - ${item.name}` })),
    [vesselTypes]
  );

  const areaOptions = useMemo(
    () => areaOps.map((item) => ({ id: item._id, label: `${item.AreaCategory} - ${item.description}` })),
    [areaOps]
  );

  const surveyOptions = useMemo(
    () => surveyTypes.map((item) => ({ id: item._id, label: `${item.code} - ${item.name}` })),
    [surveyTypes]
  );

  const handleEdit = () => {
    if (!request || request.status === 'print') return;
    setForm(requestToForm(request));
    setEditing(true);
  };

  const handleCancel = () => {
    if (request) setForm(requestToForm(request));
    setPendingDocuments([]);
    setPendingSignedPdf(null);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!request || !form) return;

    setSaving(true);
    try {
      if (request.status === 'active') {
        await requestsService.updateRequest(request._id, {
          ...form,
          imoNumber: form.imoNumber?.trim() || undefined,
          mmsiNumber: form.mmsiNumber?.trim() || undefined,
          uqmsNumber: form.uqmsNumber?.trim() || undefined,
        });
      }

      if (pendingSignedPdf) {
        try {
          await requestsService.uploadRequestSignedPdf(request._id, pendingSignedPdf);
        } catch (err: any) {
          toast.error(err.message || 'Request fields saved, but signed PDF upload failed.');
        }
      }

      if (pendingDocuments.length > 0) {
        try {
          await requestsService.addRequestDocuments(
            request._id,
            pendingDocuments.map((doc) => ({ file: doc.file, name: doc.name }))
          );
        } catch (err: any) {
          toast.error(err.message || 'Request fields saved, but document upload failed.');
        }
      }

      const res = await requestsService.getRequestById(request._id);
      setRequest(res.data);
      setForm(requestToForm(res.data));
      setPendingDocuments([]);
      setPendingSignedPdf(null);
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save request.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSignedPdf = () => {
    if (!request) return;
    setPendingConfirm({
      title: 'Delete signed PDF?',
      message: 'The signed PDF will be removed from this request.',
      action: async () => {
        try {
          await requestsService.deleteRequestSignedPdf(request._id);
          const updated = await requestsService.getRequestById(request._id);
          setRequest(updated.data);
          setForm(requestToForm(updated.data));
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete signed PDF.');
        }
      },
    });
  };

  const handleUploadSignedPdf = async (file: File | null) => {
    if (!file || !request) return;
    setSaving(true);
    try {
      await requestsService.uploadRequestSignedPdf(request._id, file);
      const updated = await requestsService.getRequestById(request._id);
      setRequest(updated.data);
      setForm(requestToForm(updated.data));
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload signed PDF.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = (doc: ApiRequestDocument) => {
    if (!request) return;
    setPendingConfirm({
      title: 'Delete document?',
      message: `"${doc.name || 'This document'}" will be removed from this request.`,
      action: async () => {
        try {
          await requestsService.deleteRequestDocument(request._id, doc._id);
          const updated = await requestsService.getRequestById(request._id);
          setRequest(updated.data);
          setForm(requestToForm(updated.data));
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete document.');
        }
      },
    });
  };

  const handleReviewWebRequest = (decision: 'accept' | 'reject') => {
    if (!request) return;
    setPendingConfirm({
      title: decision === 'accept' ? 'Accept website request?' : 'Reject website request?',
      message:
        decision === 'accept'
          ? 'This request will be given a job number and moved to New Request.'
          : 'This request will be rejected and removed from the dashboard.',
      confirmText: decision === 'accept' ? 'Accept' : 'Reject',
      isDestructive: decision === 'reject',
      action: async () => {
        setReviewing(true);
        try {
          const res = decision === 'accept'
            ? await requestsService.acceptWebRequest(request._id)
            : await requestsService.rejectWebRequest(request._id);
          toast.success(
            decision === 'accept' ? `Accepted. Job number ${res.data.jobNumber} assigned.` : 'Request rejected.'
          );
          setRequest(res.data);
          setForm(requestToForm(res.data));
        } catch (err: any) {
          toast.error(err.message || `Failed to ${decision} request.`);
        } finally {
          setReviewing(false);
        }
      },
    });
  };

  const handleSurveyPdfAction = async () => {
    if (!request || printingPdf) return;

    setPrintingPdf(true);
    // Opened synchronously in the click handler so popup blockers allow it; filled once the PDF arrives.
    const previewWindow = window.open('', '_blank');

    try {
      const pdfUrl =
        request.status === 'print'
          ? await requestsService.getRequestSurveyPdf(request._id)
          : await requestsService.printRequestSurveyPdf(request._id);

      showPdfInWindow(previewWindow, pdfUrl, `Print ${request.requestNumber}`, request.status !== 'print');
    } catch (err: any) {
      previewWindow?.close();
      toast.error(err.message || 'Failed to print request PDF.');
    } finally {
      setPrintingPdf(false);
    }
  };

  const handlePreviewPdfAction = async () => {
    if (!request || previewLoading) return;
    setPreviewLoading(true);
    try {
      const blob = await requestsService.getRequestSurveyPreview(request._id);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setShowPreviewModal(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load PDF preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleFinalizePrint = async () => {
    if (!request || printingPdf) return;
    setPrintingPdf(true);
    const printWindow = window.open('', '_blank');
    try {
      const pdfUrl = await requestsService.printRequestSurveyPdf(request._id);
      showPdfInWindow(printWindow, pdfUrl, `Print ${request.requestNumber}`, true);

      const res = await requestsService.getRequestById(request._id);
      setRequest(res.data);
      setForm(requestToForm(res.data));
      handleClosePreview();
    } catch (err: any) {
      printWindow?.close();
      toast.error(err.message || 'Failed to print PDF.');
    } finally {
      setPrintingPdf(false);
    }
  };

  const handlePrintAndSend = async () => {
    if (!request || sendingEmail) return;
    setSendingEmail(true);
    const printWindow = window.open('', '_blank');
    try {
      const pdfUrl = await requestsService.printAndSendRequestSurveyPdf(request._id);
      showPdfInWindow(printWindow, pdfUrl, `Print ${request.requestNumber}`, true);

      toast.success(`Request PDF printed and sent to ${request.companyEmail}.`);

      const res = await requestsService.getRequestById(request._id);
      setRequest(res.data);
      setForm(requestToForm(res.data));
      handleClosePreview();
    } catch (err: any) {
      printWindow?.close();
      toast.error(err.message || 'Failed to print and send PDF.');
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!id) {
    return <EmptyState title="Request not found" description="The link is missing a request id." action={<ButtonLink to="/new-request">All requests</ButtonLink>} />;
  }

  const documents = request?.documents || [];
  const awaitingReview = request?.approvalStatus === 'pending';
  const isRejectedWebRequest = request?.approvalStatus === 'rejected';
  const locked = request ? request.status !== 'active' : true;
  const setField = <K extends keyof RequestPayload>(key: K, value: RequestPayload[K]) =>
    setForm(prev => (prev ? { ...prev, [key]: value } : prev));

  const status = request ? (STATUS[request.status] ?? STATUS.active) : null;

  const headerMeta = request && (
    <>
      {awaitingReview
        ? <StatusBadge status="pending" label="Pending review" />
        : status && <StatusBadge status={request.status} label={status.label} tone={status.tone} />}
      {request.source === 'web' && <Badge tone="info">Web</Badge>}
    </>
  );

  const headerActions = request && !editing && (
    <>
      {awaitingReview && (
        <>
          <Button variant="dangerGhost" onClick={() => handleReviewWebRequest('reject')} disabled={!canReview || reviewing}>Reject</Button>
          <Button variant="primary" icon={<Check />} onClick={() => handleReviewWebRequest('accept')} disabled={!canReview} loading={reviewing}>Accept</Button>
        </>
      )}
      {!awaitingReview && !isRejectedWebRequest && (
        request.status === 'print' ? (
          <Button icon={<FileText />} onClick={handleSurveyPdfAction} loading={printingPdf}>View PDF</Button>
        ) : (
          <Button icon={<Eye />} onClick={handlePreviewPdfAction} loading={previewLoading}>Preview PDF</Button>
        )
      )}
      {!awaitingReview && !isRejectedWebRequest && canReview && (
        <Button variant="primary" icon={<Pencil />} onClick={handleEdit}>Edit</Button>
      )}
    </>
  );

  const docItems: DocItem[] = documents.map(doc => ({
    key: doc._id,
    name: doc.name,
    meta: [fileKind(doc.contentType), formatBytes(doc.size), doc.uploadedAt && `Uploaded ${formatDate(doc.uploadedAt)}`].filter(Boolean).join(' · '),
    url: doc.url,
    onDelete: () => handleDeleteDocument(doc),
    deleteDisabled: !canDelete || request?.status === 'print',
  }));

  const signedItem: DocItem[] = request?.signedPdf ? [{
    key: 'signed',
    name: request.signedPdf.name,
    meta: ['PDF', formatBytes(request.signedPdf.size), request.signedPdf.uploadedAt && `Uploaded ${formatDate(request.signedPdf.uploadedAt)}`].filter(Boolean).join(' · '),
    url: request.signedPdf.url,
    onDelete: handleDeleteSignedPdf,
    deleteDisabled: !canDelete,
  }] : [];

  return (
    <div className="animate-in">
      <PageHeader
        back={{ href: '/new-request', label: 'All requests' }}
        title={request ? request.requestNumber : 'Request'}
        meta={headerMeta}
        description={request ? [request.companyName, request.vesselName].filter(Boolean).join(' · ') : undefined}
        actions={headerActions}
      />

      {loading ? (
        <LoadingBlock label="Loading request…" />
      ) : pageError && !request ? (
        <Card padding="none"><ErrorState message={pageError} onRetry={loadRequest} /></Card>
      ) : !request || !form ? (
        <Card padding="none"><EmptyState title="Request not found" description="It may have been deleted." action={<ButtonLink to="/new-request">All requests</ButtonLink>} /></Card>
      ) : !editing ? (
        <div className={s.layout}>
          <div className={s.main}>
            <DetailSection title="Vessel">
              <DetailField label="Vessel name" value={request.vesselName} />
              <DetailField label="Vessel code" value={request.vesselCode} />
              <DetailField label="Vessel type" value={vesselLabel(request)} />
              <DetailField label="IMO number" value={request.imoNumber} />
              <DetailField label="MMSI number" value={request.mmsiNumber} />
              <DetailField label="Sector" value={<span className={s.capitalize}>{request.sector}</span>} />
            </DetailSection>

            <DetailSection title="Company & contact">
              <DetailField label="Company" value={request.companyName} />
              <DetailField label="Company email" value={request.companyEmail && <a href={`mailto:${request.companyEmail}`}>{request.companyEmail}</a>} />
              <DetailField label="Contact person" value={request.contactPersonName} />
              <DetailField label="Contact number" value={request.contactPersonNumber && <a href={`tel:${request.contactPersonNumber}`}>{request.contactPersonNumber}</a>} />
              <DetailField label="Registered address" value={request.registerdAddress} full />
              <DetailField label="Invoicing address" value={request.invoicingAddress} full />
            </DetailSection>

            <DetailSection title="Operation & surveys">
              <DetailField label="Area of operation" value={areaLabel(request)} full />
              <DetailField
                label="Survey types"
                full
                value={(request.surveyTypes || []).length > 0 && (
                  <span className={s.tags}>
                    {(request.surveyTypes || []).map((survey, index) => (
                      <Badge key={typeof survey === 'string' ? `${survey}-${index}` : survey._id}>{surveyLabel(survey)}</Badge>
                    ))}
                  </span>
                )}
              />
            </DetailSection>
          </div>

          <aside className={s.rail}>
            <Section title="Summary">
              <dl className={s.summary}>
                <DetailField label="Job no." value={request.jobNumber || (awaitingReview ? 'Assigned on acceptance' : '')} />
                <DetailField label="UQMS no." value={request.uqmsNumber} />
                <DetailField label="Created" value={formatDate(request.createdAt)} />
                <DetailField label="Updated" value={formatDate(request.updatedAt)} />
              </dl>
            </Section>

            <Section title="Documents" description={`${documents.length} attached`} padding="none">
              {docItems.length ? <DocList items={docItems} /> : <p className={s.none}>No documents attached.</p>}
            </Section>

            <Section title="Signed request PDF" padding="sm">
              {signedItem.length > 0 && <DocList items={signedItem} />}
              <DragDropFileUpload
                onFilesSelected={files => { if (files && files[0]) handleUploadSignedPdf(files[0]); }}
                multiple={false}
                accept=".pdf"
                disabled={saving}
                text={<span>{request.signedPdf ? 'Replace signed PDF' : 'Upload signed PDF'}</span>}
                subText="PDF only"
              />
            </Section>
          </aside>
        </div>
      ) : (
        <div className={s.editForm}>
          {locked && (
            <p className={s.notice}>Only active requests can have their details changed. You can still manage documents and the signed PDF.</p>
          )}

          <FormSection title="Vessel" description="Identification of the vessel to be surveyed.">
            <FormGrid columns={3}>
              <Field label="Vessel name" required>
                <Input value={form.vesselName} onChange={e => setField('vesselName', e.target.value)} disabled={locked} />
              </Field>
              <Field label="Vessel code">
                <Select value={form.vesselCode || ''} onChange={e => setField('vesselCode', e.target.value)} disabled={locked}>
                  <option value="">Not set</option>
                  {vesselCodes.map(vc => <option key={vc._id} value={vc.code}>{vc.code} - {vc.description}</option>)}
                </Select>
              </Field>
              <Field label="Sector" required>
                <Select value={form.sector} onChange={e => setField('sector', e.target.value as 'marine' | 'industrial')} disabled={locked}>
                  <option value="marine">Marine</option>
                  <option value="industrial">Industrial</option>
                </Select>
              </Field>
              <Field label="UQMS number" hint="Optional">
                <Input value={form.uqmsNumber || ''} onChange={e => setField('uqmsNumber', e.target.value)} disabled={locked} />
              </Field>
              <Field label="IMO number" hint="Optional">
                <Input inputMode="numeric" value={form.imoNumber || ''} onChange={e => setField('imoNumber', e.target.value)} disabled={locked} />
              </Field>
              <Field label="MMSI number" hint="Optional">
                <Input inputMode="numeric" value={form.mmsiNumber || ''} onChange={e => setField('mmsiNumber', e.target.value)} disabled={locked} />
              </Field>
              <SearchableSelect
                label="Vessel type"
                value={form.vesselType}
                options={vesselOptions}
                placeholder="Select vessel type"
                onChange={value => setField('vesselType', value)}
                disabled={locked}
              />
              <SearchableSelect
                label="Area of operation"
                value={form.areaOfOperation}
                options={areaOptions}
                placeholder="Select area"
                onChange={value => setField('areaOfOperation', value)}
                disabled={locked}
              />
              <Field label="Status">
                <Select value={form.status} onChange={e => setField('status', e.target.value as ApiRequest['status'])} disabled={locked}>
                  <option value="active">Active</option>
                  <option value="print">Print</option>
                  <option value="reject">Reject</option>
                  <option value="success">Success</option>
                </Select>
              </Field>
              <div className={s.fullRow}>
                <SearchableMultiSelect
                  label="Survey types"
                  value={form.surveyTypes}
                  options={surveyOptions}
                  placeholder="Select survey types"
                  onChange={value => setField('surveyTypes', value)}
                  disabled={locked}
                />
              </div>
            </FormGrid>
          </FormSection>

          <FormSection title="Company & contact">
            <FormGrid columns={2}>
              <Field label="Company name" required>
                <Input value={form.companyName} onChange={e => setField('companyName', e.target.value)} disabled={locked} />
              </Field>
              <Field label="Company email" required>
                <Input type="email" inputMode="email" value={form.companyEmail} onChange={e => setField('companyEmail', e.target.value)} disabled={locked} />
              </Field>
              <Field label="Contact person" required>
                <Input value={form.contactPersonName} onChange={e => setField('contactPersonName', e.target.value)} disabled={locked} />
              </Field>
              <Field label="Contact number" required>
                <Input type="tel" inputMode="tel" value={form.contactPersonNumber} onChange={e => setField('contactPersonNumber', e.target.value)} disabled={locked} />
              </Field>
              <Field label="Registered address">
                <Input value={form.registerdAddress || ''} onChange={e => setField('registerdAddress', e.target.value)} disabled={locked} />
              </Field>
              <Field label="Invoicing address" required>
                <Input value={form.invoicingAddress} onChange={e => setField('invoicingAddress', e.target.value)} disabled={locked} />
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection title="Documents" description="Existing files, plus new ones to upload when you save.">
            {docItems.length > 0 ? <DocList items={docItems} /> : <p className={s.none}>No documents attached.</p>}
            <DragDropFileUpload onFilesSelected={handleAddFiles} multiple accept=".pdf,image/*" subText="PDF or images" />
            {pendingDocuments.length > 0 && (
              <ul className={s.pendingList}>
                {pendingDocuments.map(doc => (
                  <li key={doc.id} className={s.pendingRow}>
                    <span className={s.docText}>
                      <span className={s.docName}>{doc.file.name}</span>
                      <span className={s.docMeta}>{formatBytes(doc.file.size)} · uploads on save</span>
                    </span>
                    <Field label="Document name" hideLabel className={s.pendingName}>
                      <Input
                        placeholder="Document name"
                        value={doc.name}
                        onChange={e => setPendingDocuments(prev => prev.map(item => (item.id === doc.id ? { ...item, name: e.target.value } : item)))}
                      />
                    </Field>
                    <IconButton label={`Remove ${doc.file.name}`} icon={<X />} size="sm" onClick={() => handleRemovePending(doc.id)} />
                  </li>
                ))}
              </ul>
            )}
          </FormSection>

          <FormSection title="Signed request PDF">
            {signedItem.length > 0 && <DocList items={signedItem} />}
            <DragDropFileUpload
              onFilesSelected={files => setPendingSignedPdf(files ? files[0] : null)}
              multiple={false}
              accept=".pdf"
              text={<span>{pendingSignedPdf ? `Selected: ${pendingSignedPdf.name}` : request.signedPdf ? 'Replace signed PDF' : 'Upload signed PDF'}</span>}
              subText="PDF only · uploads on save"
            />
          </FormSection>

          <StickyActionBar dirty={pendingDocuments.length > 0 || !!pendingSignedPdf} status="Editing request">
            <Button onClick={handleCancel} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>Save changes</Button>
          </StickyActionBar>
        </div>
      )}

      <Modal
        open={showPreviewModal && !!previewUrl && !!request}
        onClose={handleClosePreview}
        dismissible={!printingPdf && !sendingEmail}
        size="xl"
        title={`Request for survey · ${request?.requestNumber ?? ''}`}
        description="Check the PDF, then print it or print and email it to the company."
        footer={
          <>
            <Button onClick={handleClosePreview} disabled={printingPdf || sendingEmail}>Cancel</Button>
            <Button icon={<Printer />} onClick={handleFinalizePrint} disabled={!canReview || sendingEmail} loading={printingPdf}>Print PDF</Button>
            <Button variant="primary" icon={<Send />} onClick={handlePrintAndSend} disabled={!canReview || printingPdf} loading={sendingEmail}>Print & send</Button>
          </>
        }
      >
        {previewUrl && <iframe src={previewUrl} title="Request PDF preview" className={s.preview} />}
      </Modal>

      <ConfirmDialog
        open={!!pendingConfirm}
        title={pendingConfirm?.title || ''}
        message={pendingConfirm?.message || ''}
        confirmText={pendingConfirm?.confirmText || 'Delete'}
        destructive={pendingConfirm?.isDestructive ?? true}
        onConfirm={() => {
          const action = pendingConfirm?.action;
          setPendingConfirm(null);
          action?.();
        }}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}
