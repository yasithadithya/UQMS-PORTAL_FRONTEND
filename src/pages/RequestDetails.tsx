import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { formatDate } from '@/utils/date';
import { useAuth } from '@/context/AuthContext';
import s from './NewRequest.module.css';

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

const formatBytes = (value?: number) => {
  if (value === undefined) return '-';
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const requestStatusLabel = (status: ApiRequest['status']) => {
  if (status === 'print') return 'Print';
  if (status === 'reject') return 'Reject';
  return 'Active';
};

const requestStatusClass = (status: ApiRequest['status']) => {
  if (status === 'print') return `${s.statusBadge} ${s.statusPrint}`;
  if (status === 'reject') return `${s.statusBadge} ${s.statusReject}`;
  return `${s.statusBadge} ${s.statusActive}`;
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
  vesselType: getId(request.vesselType),
  areaOfOperation: getId(request.areaOfOperation),
  surveyTypes: (request.surveyTypes || []).map(getId),
  status: request.status || 'active',
});

const vesselLabel = (request: ApiRequest) => {
  const vesselType = request.vesselType as Partial<ApiVesselType>;
  return vesselType?.name ? `${vesselType.group} - ${vesselType.name}` : '-';
};

const areaLabel = (request: ApiRequest) => {
  const area = request.areaOfOperation as Partial<ApiAreaOfOperation>;
  return area?.description ? `${area.AreaCategory} - ${area.description}` : '-';
};

const surveyLabel = (survey: ApiRequest['surveyTypes'][number]) => {
  if (typeof survey === 'string') return survey;
  return survey.code ? `${survey.code} - ${survey.name}` : survey.name;
};

function DetailField({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className={s.detailField}>
      <dt>{label}</dt>
      <dd>{value || '-'}</dd>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={s.detailSection}>
      <h3 className={s.detailSectionTitle}>{title}</h3>
      <dl className={s.detailGrid}>{children}</dl>
    </section>
  );
}

export default function RequestDetailsPage() {
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('Admin', 'delete') || hasPermission('New Request', 'delete') || hasPermission(null, 'delete');
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
          alert(err.message || 'Request fields saved, but signed PDF upload failed.');
        }
      }

      if (pendingDocuments.length > 0) {
        try {
          await requestsService.addRequestDocuments(
            request._id,
            pendingDocuments.map((doc) => ({ file: doc.file, name: doc.name }))
          );
        } catch (err: any) {
          alert(err.message || 'Request fields saved, but document upload failed.');
        }
      }

      const res = await requestsService.getRequestById(request._id);
      setRequest(res.data);
      setForm(requestToForm(res.data));
      setPendingDocuments([]);
      setPendingSignedPdf(null);
      setEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save request.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSignedPdf = async () => {
    if (!request) return;
    if (!confirm('Are you sure you want to delete the signed PDF?')) return;
    try {
      await requestsService.deleteRequestSignedPdf(request._id);
      const updated = await requestsService.getRequestById(request._id);
      setRequest(updated.data);
      setForm(requestToForm(updated.data));
    } catch (err: any) {
      alert(err.message || 'Failed to delete signed PDF.');
    }
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
      alert(err.message || 'Failed to upload signed PDF.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (doc: ApiRequestDocument) => {
    if (!request) return;
    if (!confirm('Delete document?')) return;

    await requestsService.deleteRequestDocument(request._id, doc._id);
    const updated = await requestsService.getRequestById(request._id);
    setRequest(updated.data);
    setForm(requestToForm(updated.data));
  };

  const handleSurveyPdfAction = async () => {
    if (!request || printingPdf) return;

    setPrintingPdf(true);
    const previewWindow = window.open('', '_blank');

    try {
      const pdfUrl =
        request.status === 'print'
          ? await requestsService.getRequestSurveyPdf(request._id)
          : await requestsService.printRequestSurveyPdf(request._id);

      const shouldPrint = request.status !== 'print';

      if (previewWindow) {
        previewWindow.document.open();
        previewWindow.document.write(`
          <!doctype html>
          <html>
            <head>
              <title>Print ${request.requestNumber}</title>
              <style>
                html, body {
                  margin: 0;
                  width: 100%;
                  height: 100%;
                  background: #f3f4f6;
                }
                .viewer {
                  width: 100vw;
                  height: 100vh;
                  border: 0;
                  display: block;
                }
              </style>
            </head>
            <body>
              <iframe class="viewer" src="${pdfUrl}"></iframe>
              <script>
                const frame = document.querySelector('iframe');
                frame.addEventListener('load', () => {
                  window.focus();
                  ${shouldPrint ? 'window.print();' : ''}
                });
              </script>
            </body>
          </html>
        `);
        previewWindow.document.close();
        previewWindow.focus();
      } else {
        const fallbackWindow = window.open(pdfUrl, '_blank');
        fallbackWindow?.focus();
      }

      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
    } catch (err: any) {
      if (previewWindow) {
        previewWindow.close();
      }
      alert(err.message || 'Failed to print request PDF.');
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
      alert(err.message || 'Failed to load PDF preview.');
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

      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
          <!doctype html>
          <html>
            <head>
              <title>Print ${request.requestNumber}</title>
              <style>
                html, body {
                  margin: 0;
                  width: 100%;
                  height: 100%;
                  background: #f3f4f6;
                }
                .viewer {
                  width: 100vw;
                  height: 100vh;
                  border: 0;
                  display: block;
                }
              </style>
            </head>
            <body>
              <iframe class="viewer" src="${pdfUrl}"></iframe>
              <script>
                const frame = document.querySelector('iframe');
                frame.addEventListener('load', () => {
                  window.focus();
                  window.print();
                });
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
      } else {
        const fallbackWindow = window.open(pdfUrl, '_blank');
        fallbackWindow?.focus();
      }

      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);

      const res = await requestsService.getRequestById(request._id);
      setRequest(res.data);
      setForm(requestToForm(res.data));
      handleClosePreview();
    } catch (err: any) {
      if (printWindow) printWindow.close();
      alert(err.message || 'Failed to print PDF.');
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

      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
          <!doctype html>
          <html>
            <head>
              <title>Print ${request.requestNumber}</title>
              <style>
                html, body {
                  margin: 0;
                  width: 100%;
                  height: 100%;
                  background: #f3f4f6;
                }
                .viewer {
                  width: 100vw;
                  height: 100vh;
                  border: 0;
                  display: block;
                }
              </style>
            </head>
            <body>
              <iframe class="viewer" src="${pdfUrl}"></iframe>
              <script>
                const frame = document.querySelector('iframe');
                frame.addEventListener('load', () => {
                  window.focus();
                  window.print();
                });
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
      } else {
        const fallbackWindow = window.open(pdfUrl, '_blank');
        fallbackWindow?.focus();
      }

      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);

      alert(`Request PDF has been printed & sent to client email (${request.companyEmail}) successfully.`);

      const res = await requestsService.getRequestById(request._id);
      setRequest(res.data);
      setForm(requestToForm(res.data));
      handleClosePreview();
    } catch (err: any) {
      if (printWindow) printWindow.close();
      alert(err.message || 'Failed to print and send PDF.');
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
    return <div className={s.emptyState}>Request id missing.</div>;
  }

  const documents = request?.documents || [];

  return (
    <div className="animate-in">
      <div className={s.detailTopBar}>
        <div className={s.detailTitleBlock}>
          <div className={s.detailTitleRow}>
            <h2 className="section-header">{request ? request.requestNumber : 'Request'}</h2>
            {request && <span className={requestStatusClass(request.status)}>{requestStatusLabel(request.status)}</span>}
          </div>
          <p className={s.detailSubtitle}>
            {request ? `${request.companyName} / ${request.vesselName}` : 'Loading request information'}
          </p>
        </div>

        <div className={s.detailActions}>
          <button className="btn-secondary" type="button" onClick={() => navigate(-1)}>
            Back
          </button>
          {request && (
            request.status === 'print' ? (
              <button className="btn-secondary" type="button" onClick={handleSurveyPdfAction} disabled={printingPdf}>
                {printingPdf ? 'Preparing PDF...' : 'View Pdf'}
              </button>
            ) : (
              <button className="btn-secondary" type="button" onClick={handlePreviewPdfAction} disabled={previewLoading}>
                {previewLoading ? 'Loading Preview...' : 'Preview PDF'}
              </button>
            )
          )}
          {request && !editing && (
            <button className="btn-primary" type="button" onClick={handleEdit}>
              Edit
            </button>
          )}
        </div>
      </div>

      {pageError && (
        <div className={s.detailError}>
          {pageError}
        </div>
      )}

      {loading ? (
        <div className="card">Loading request details...</div>
      ) : !request || !form ? (
        <div className={s.emptyState}>Request details could not be found.</div>
      ) : (
        <>
          <div className={s.summaryGrid}>
            <div className={s.summaryTile}>
              <span>UQMS</span>
              <strong>{request.uqmsNumber || '-'}</strong>
            </div>
            <div className={s.summaryTile}>
              <span>IMO</span>
              <strong>{request.imoNumber || '-'}</strong>
            </div>
            <div className={s.summaryTile}>
              <span>MMSI</span>
              <strong>{request.mmsiNumber || '-'}</strong>
            </div>
            <div className={s.summaryTile}>
              <span>Sector</span>
              <strong>{request.sector}</strong>
            </div>
            <div className={s.summaryTile}>
              <span>Documents</span>
              <strong>{documents.length}</strong>
            </div>
            <div className={s.summaryTile}>
              <span>Created</span>
              <strong>{formatDate(request.createdAt)}</strong>
            </div>
            <div className={s.summaryTile}>
              <span>Updated</span>
              <strong>{formatDate(request.updatedAt)}</strong>
            </div>
          </div>

          {!editing ? (
            <div className={s.detailLayout}>
              <DetailSection title="Vessel">
                <DetailField label="Vessel name" value={request.vesselName} />
                <DetailField label="Vessel code" value={request.vesselCode} />
                <DetailField label="Vessel type" value={vesselLabel(request)} />
                <DetailField label="IMO number" value={request.imoNumber} />
                <DetailField label="MMSI number" value={request.mmsiNumber} />
                <DetailField label="Sector" value={request.sector} />
              </DetailSection>

              <DetailSection title="Company & Contact">
                <DetailField label="Company" value={request.companyName} />
                <DetailField label="Company email" value={request.companyEmail} />
                <DetailField label="Contact person" value={request.contactPersonName} />
                <DetailField label="Contact number" value={request.contactPersonNumber} />
              </DetailSection>

              <DetailSection title="Operation & Survey">
                <DetailField label="Area of operation" value={areaLabel(request)} />
                <DetailField
                  label="Survey types"
                  value={
                    (request.surveyTypes || []).length > 0 ? (
                      <div className={s.selectedList}>
                        {(request.surveyTypes || []).map((survey, index) => (
                          <span
                            key={typeof survey === 'string' ? `${survey}-${index}` : survey._id}
                            className={s.selectedItem}
                          >
                            {surveyLabel(survey)}
                          </span>
                        ))}
                      </div>
                    ) : '-'
                  }
                />
              </DetailSection>

              <DetailSection title="Addresses">
                <DetailField label="Registered address" value={request.registerdAddress} />
                <DetailField label="Invoicing address" value={request.invoicingAddress} />
              </DetailSection>

              <section className={s.documentPanel}>
                <div className={s.detailSectionHeader}>
                  <h3 className={s.detailSectionTitle}>Documents</h3>
                  <span>{documents.length} attached</span>
                </div>

                {documents.length === 0 ? (
                  <div className={s.emptyState}>No documents attached.</div>
                ) : (
                  <div className={s.docList}>
                    {documents.map((doc) => (
                      <div key={doc._id} className={s.docRow}>
                        <div className={s.docInfo}>
                          <div className={s.docName}>{doc.name}</div>
                          <div className={s.docMeta}>
                            {doc.contentType || 'file'} - {formatBytes(doc.size)}
                            {doc.uploadedAt ? ` - Uploaded ${formatDate(doc.uploadedAt)}` : ''}
                          </div>
                        </div>
                        <div className={s.docActions}>
                          {doc.url && (
                            <a className={s.linkBtn} href={doc.url} target="_blank" rel="noreferrer">
                              View
                            </a>
                          )}
                          <button
                            className={`${s.actionBtn} ${s.deleteBtn}`}
                            type="button"
                            onClick={() => handleDeleteDocument(doc)}
                            disabled={!canDelete || request.status === 'print'}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={s.documentPanel}>
                <div className={s.detailSectionHeader}>
                  <h3 className={s.detailSectionTitle}>Signed Request PDF</h3>
                </div>

                {request.signedPdf ? (
                  <div className={s.docList}>
                    <div className={s.docRow}>
                      <div className={s.docInfo}>
                        <div className={s.docName}>{request.signedPdf.name}</div>
                        <div className={s.docMeta}>
                          {request.signedPdf.contentType || 'application/pdf'} - {formatBytes(request.signedPdf.size)}
                          {request.signedPdf.uploadedAt ? ` - Uploaded ${formatDate(request.signedPdf.uploadedAt)}` : ''}
                        </div>
                      </div>
                      <div className={s.docActions}>
                        {request.signedPdf.url && (
                          <a className={s.linkBtn} href={request.signedPdf.url} target="_blank" rel="noreferrer">
                            View
                          </a>
                        )}
                        <button
                          className={`${s.actionBtn} ${s.deleteBtn}`}
                          type="button"
                          onClick={handleDeleteSignedPdf}
                          disabled={!canDelete}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="upload-area" style={{ marginTop: '12px', position: 'relative' }}>
                      <div className="upload-icon">↻</div>
                      <div className="upload-text">
                        <span>Replace Signed PDF</span>
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleUploadSignedPdf(e.target.files[0]);
                          }
                        }}
                        style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                        disabled={saving}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className={s.emptyState} style={{ marginBottom: '12px' }}>No signed PDF uploaded yet.</div>
                    <div className="upload-area" style={{ position: 'relative' }}>
                      <div className="upload-icon">+</div>
                      <div className="upload-text">
                        <span>Upload Signed PDF</span>
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleUploadSignedPdf(e.target.files[0]);
                          }
                        }}
                        style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                        disabled={saving}
                      />
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className={s.editCard}>
              <section className={s.detailSection}>
                <h3 className={s.detailSectionTitle}>Request Details</h3>
                <div className={s.formGrid}>
                  <div>
                    <label className="form-label">UQMS Number (Optional)</label>
                    <input
                      className="form-input"
                      value={form.uqmsNumber || ''}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, uqmsNumber: e.target.value } : prev))}
                      disabled={request.status !== 'active'}
                    />
                  </div>
                  <div>
                    <label className="form-label">IMO Number (Optional)</label>
                    <input
                      className="form-input"
                      value={form.imoNumber || ''}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, imoNumber: e.target.value } : prev))}
                      disabled={request.status !== 'active'}
                    />
                  </div>
                  <div>
                    <label className="form-label">MMSI Number (Optional)</label>
                    <input
                      className="form-input"
                      value={form.mmsiNumber || ''}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, mmsiNumber: e.target.value } : prev))}
                      disabled={request.status !== 'active'}
                    />
                  </div>
                  <div>
                    <label className="form-label">Vessel Code (Optional)</label>
                    <select
                      className="form-input"
                      value={form.vesselCode || ''}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, vesselCode: e.target.value } : prev))}
                      style={{ width: '100%', cursor: 'pointer' }}
                      disabled={request.status !== 'active'}
                    >
                      <option value="">-- Select Vessel Code --</option>
                      {vesselCodes.map(vc => (
                        <option key={vc._id} value={vc.code}>{vc.code} - {vc.description}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Vessel Name</label>
                    <input
                      className="form-input"
                      value={form.vesselName}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, vesselName: e.target.value } : prev))}
                      disabled={request.status !== 'active'}
                    />
                  </div>
                  <div>
                    <label className="form-label">Company Name</label>
                    <input
                      className="form-input"
                      value={form.companyName}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, companyName: e.target.value } : prev))}
                      disabled={request.status !== 'active'}
                    />
                  </div>
                  <div>
                    <label className="form-label">Contact Person Name</label>
                    <input
                      className="form-input"
                      value={form.contactPersonName}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, contactPersonName: e.target.value } : prev))}
                      disabled={request.status !== 'active'}
                    />
                  </div>
                  <div>
                    <label className="form-label">Contact Person Number</label>
                    <input
                      className="form-input"
                      value={form.contactPersonNumber}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, contactPersonNumber: e.target.value } : prev))}
                      disabled={request.status !== 'active'}
                    />
                  </div>
                  <div>
                    <label className="form-label">Registered Address</label>
                    <input
                      className="form-input"
                      value={form.registerdAddress || ''}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, registerdAddress: e.target.value } : prev))}
                      disabled={request.status !== 'active'}
                    />
                  </div>
                  <div>
                    <label className="form-label">Invoicing Address</label>
                    <input
                      className="form-input"
                      value={form.invoicingAddress}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, invoicingAddress: e.target.value } : prev))}
                      disabled={request.status !== 'active'}
                    />
                  </div>
                  <div>
                    <label className="form-label">Company Email</label>
                    <input
                      className="form-input"
                      type="email"
                      value={form.companyEmail}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, companyEmail: e.target.value } : prev))}
                      disabled={request.status !== 'active'}
                    />
                  </div>
                  <div>
                    <label className="form-label">Sector</label>
                    <select
                      className="form-input"
                      value={form.sector}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, sector: e.target.value as 'marine' | 'industrial' } : prev))}
                      disabled={request.status !== 'active'}
                    >
                      <option value="marine">Marine</option>
                      <option value="industrial">Industrial</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select
                      className="form-input"
                      value={form.status}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, status: e.target.value as ApiRequest['status'] } : prev))}
                      disabled={request.status !== 'active'}
                    >
                      <option value="active">Active</option>
                      <option value="print">Print</option>
                      <option value="reject">Reject</option>
                      <option value="success">Success</option>
                    </select>
                  </div>
                  <SearchableSelect
                    label="Vessel Type"
                    value={form.vesselType}
                    options={vesselOptions}
                    placeholder="Select vessel"
                    onChange={(value) => setForm((prev) => (prev ? { ...prev, vesselType: value } : prev))}
                    disabled={request.status !== 'active'}
                  />
                  <SearchableSelect
                    label="Area of Operation"
                    value={form.areaOfOperation}
                    options={areaOptions}
                    placeholder="Select area"
                    onChange={(value) => setForm((prev) => (prev ? { ...prev, areaOfOperation: value } : prev))}
                    disabled={request.status !== 'active'}
                  />
                  <SearchableMultiSelect
                    label="Survey Types"
                    value={form.surveyTypes}
                    options={surveyOptions}
                    placeholder="Select survey types"
                    onChange={(value) => setForm((prev) => (prev ? { ...prev, surveyTypes: value } : prev))}
                    disabled={request.status !== 'active'}
                  />
                </div>
              </section>

              <section className={s.detailSection} style={{ marginTop: '20px' }}>
                <h3 className={s.detailSectionTitle}>Documents</h3>

                {/* List existing documents */}
                {documents.length === 0 ? (
                  <div className={s.emptyState} style={{ padding: '12px', fontSize: '13px' }}>No documents attached.</div>
                ) : (
                  <div className={s.docList}>
                    {documents.map((doc) => (
                      <div key={doc._id} className={s.docRow}>
                        <div className={s.docInfo}>
                          <div className={s.docName}>{doc.name}</div>
                          <div className={s.docMeta}>
                            {doc.contentType || 'file'} - {formatBytes(doc.size)}
                          </div>
                        </div>
                        <div className={s.docActions}>
                          {doc.url && (
                            <a className={s.linkBtn} href={doc.url} target="_blank" rel="noreferrer">
                              View
                            </a>
                          )}
                          <button
                            className={`${s.actionBtn} ${s.deleteBtn}`}
                            type="button"
                            onClick={() => handleDeleteDocument(doc)}
                            disabled={!canDelete || request.status === 'print'}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload New Documents */}
                <div className="upload-area" style={{ marginTop: '16px', position: 'relative' }}>
                  <div className="upload-icon">+</div>
                  <div className="upload-text">
                    <span>Upload more files</span> (PDF or images)
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    onChange={(e) => handleAddFiles(e.target.files)}
                    style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                  />
                </div>

                {/* Pending Documents List */}
                {pendingDocuments.length > 0 && (
                  <div className={s.fileList} style={{ marginTop: '12px' }}>
                    {pendingDocuments.map((doc) => (
                      <div key={doc.id} className={s.fileRow}>
                        <div className={s.fileMeta}>
                          <div className={s.fileName}>{doc.file.name}</div>
                          <div className={s.fileSize}>{formatBytes(doc.file.size)}</div>
                        </div>
                        <input
                          className="form-input"
                          style={{ marginBottom: 0 }}
                          type="text"
                          placeholder="Document name"
                          value={doc.name}
                          onChange={(e) =>
                            setPendingDocuments((prev) =>
                              prev.map((item) => (item.id === doc.id ? { ...item, name: e.target.value } : item))
                            )
                          }
                        />
                        <button
                          className={`${s.actionBtn} ${s.deleteBtn}`}
                          type="button"
                          onClick={() => handleRemovePending(doc.id)}
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={s.detailSection} style={{ marginTop: '20px' }}>
                <h3 className={s.detailSectionTitle}>Signed Request PDF</h3>

                {request.signedPdf ? (
                  <div className={s.docList} style={{ marginBottom: '12px' }}>
                    <div className={s.docRow}>
                      <div className={s.docInfo}>
                        <div className={s.docName}>{request.signedPdf.name}</div>
                        <div className={s.docMeta}>
                          {formatBytes(request.signedPdf.size)}
                        </div>
                      </div>
                      <div className={s.docActions}>
                        <button
                          className={`${s.actionBtn} ${s.deleteBtn}`}
                          type="button"
                          onClick={handleDeleteSignedPdf}
                          disabled={!canDelete}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="upload-area" style={{ marginTop: '12px', position: 'relative' }}>
                  <div className="upload-icon">+</div>
                  <div className="upload-text">
                    {pendingSignedPdf ? (
                      <span>Selected: {pendingSignedPdf.name}</span>
                    ) : (
                      <span>Upload Signed PDF</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPendingSignedPdf(e.target.files ? e.target.files[0] : null)}
                    style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                  />
                </div>
              </section>

              <div className={s.detailFooter}>
                <button className="btn-secondary" type="button" onClick={handleCancel} disabled={saving}>
                  Cancel
                </button>
                <button className="btn-primary" type="button" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showPreviewModal && previewUrl && request && (
        <div className={s.overlay} style={{ padding: 0 }}>
          <div className={s.modal} style={{ maxWidth: '100%', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 0, border: 'none' }}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>Request for Survey PDF Preview ({request.requestNumber})</h3>
              <button className={s.closeBtn} type="button" onClick={handleClosePreview}>
                &times;
              </button>
            </div>

            <div className={s.modalBody} style={{ flex: 1, padding: '16px 24px', position: 'relative' }}>
              <iframe
                src={previewUrl}
                title="Survey PDF Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
            </div>

            <div className={s.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px' }}>
              <button className="btn-secondary" type="button" onClick={handleClosePreview} disabled={printingPdf || sendingEmail}>
                Cancel
              </button>
              <button className="btn-primary" type="button" onClick={handleFinalizePrint} disabled={printingPdf || sendingEmail}>
                {printingPdf ? 'Printing...' : 'Print PDF'}
              </button>
              <button className="btn-primary" type="button" onClick={handlePrintAndSend} disabled={printingPdf || sendingEmail} style={{ background: 'var(--green)' }}>
                {sendingEmail ? 'Sending...' : 'Print & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
