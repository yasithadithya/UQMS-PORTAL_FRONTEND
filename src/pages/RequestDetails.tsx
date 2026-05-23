import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  operationsService,
  requestsService,
  type ApiAreaOfOperation,
  type ApiRequest,
  type ApiRequestDocument,
  type ApiSurveyType,
  type ApiVesselType,
  type RequestPayload,
} from '@/api';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import SearchableSelect from '@/components/SearchableSelect';
import { formatDate } from '@/utils/date';
import s from './NewRequest.module.css';

const getId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && '_id' in (value as Record<string, string>)) {
    return String((value as Record<string, string>)._id);
  }
  return '';
};

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
  const { submodule: id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<ApiRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<RequestPayload | null>(null);
  const [vesselTypes, setVesselTypes] = useState<ApiVesselType[]>([]);
  const [areaOps, setAreaOps] = useState<ApiAreaOfOperation[]>([]);
  const [surveyTypes, setSurveyTypes] = useState<ApiSurveyType[]>([]);
  const [saving, setSaving] = useState(false);
  const [printingPdf, setPrintingPdf] = useState(false);

  const loadRequest = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setPageError('');
      const [reqRes, vRes, aRes, sRes] = await Promise.all([
        requestsService.getRequestById(id),
        operationsService.getVesselTypes(),
        operationsService.getAreaOperations(),
        operationsService.getSurveyTypes(),
      ]);

      setRequest(reqRes.data);
      setVesselTypes(vRes.data);
      setAreaOps(aRes.data);
      setSurveyTypes(sRes.data);
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
    setEditing(false);
  };

  const handleSave = async () => {
    if (!request || !form) return;

    setSaving(true);
    try {
      await requestsService.updateRequest(request._id, {
        ...form,
        imoNumber: form.imoNumber?.trim() || undefined,
        uqmsNumber: form.uqmsNumber?.trim() || undefined,
      });

      const res = await requestsService.getRequestById(request._id);
      setRequest(res.data);
      setForm(requestToForm(res.data));
      setEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save request.');
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
            <button className="btn-secondary" type="button" onClick={handleSurveyPdfAction} disabled={printingPdf}>
              {printingPdf ? 'Preparing PDF...' : request.status === 'print' ? 'View Pdf' : 'Print PDF'}
            </button>
          )}
          {request && !editing && (
            <button className="btn-primary" type="button" onClick={handleEdit} disabled={request.status === 'print'}>
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
                <DetailField label="Vessel type" value={vesselLabel(request)} />
                <DetailField label="IMO number" value={request.imoNumber} />
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
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
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
                    />
                  </div>
                  <div>
                    <label className="form-label">IMO Number (Optional)</label>
                    <input
                      className="form-input"
                      value={form.imoNumber || ''}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, imoNumber: e.target.value } : prev))}
                    />
                  </div>
                  <div>
                    <label className="form-label">Vessel Name</label>
                    <input
                      className="form-input"
                      value={form.vesselName}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, vesselName: e.target.value } : prev))}
                    />
                  </div>
                  <div>
                    <label className="form-label">Company Name</label>
                    <input
                      className="form-input"
                      value={form.companyName}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, companyName: e.target.value } : prev))}
                    />
                  </div>
                  <div>
                    <label className="form-label">Contact Person Name</label>
                    <input
                      className="form-input"
                      value={form.contactPersonName}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, contactPersonName: e.target.value } : prev))}
                    />
                  </div>
                  <div>
                    <label className="form-label">Contact Person Number</label>
                    <input
                      className="form-input"
                      value={form.contactPersonNumber}
                      onChange={(e) => setForm((prev) => (prev ? { ...prev, contactPersonNumber: e.target.value } : prev))}
                    />
                  </div>
                  <SearchableSelect
                    label="Vessel Type"
                    value={form.vesselType}
                    options={vesselOptions}
                    placeholder="Select vessel"
                    onChange={(value) => setForm((prev) => (prev ? { ...prev, vesselType: value } : prev))}
                  />
                  <SearchableSelect
                    label="Area of Operation"
                    value={form.areaOfOperation}
                    options={areaOptions}
                    placeholder="Select area"
                    onChange={(value) => setForm((prev) => (prev ? { ...prev, areaOfOperation: value } : prev))}
                  />
                  <SearchableMultiSelect
                    label="Survey Types"
                    value={form.surveyTypes}
                    options={surveyOptions}
                    placeholder="Select survey types"
                    onChange={(value) => setForm((prev) => (prev ? { ...prev, surveyTypes: value } : prev))}
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
    </div>
  );
}
