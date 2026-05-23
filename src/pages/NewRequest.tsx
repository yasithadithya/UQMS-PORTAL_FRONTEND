import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import SearchableSelect from '@/components/SearchableSelect';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import s from './NewRequest.module.css';

const emptyForm: RequestPayload = {
  uqmsNumber: '',
  imoNumber: '',
  vesselName: '',
  companyName: '',
  contactPersonName: '',
  contactPersonNumber: '',
  registerdAddress: '',
  invoicingAddress: '',
  companyEmail: '',
  sector: 'marine',
  vesselType: '',
  areaOfOperation: '',
  surveyTypes: [],
  status: 'active',
};

type PendingDocument = {
  id: string;
  file: File;
  name: string;
};

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

const makeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getFileBaseName = (filename: string) => filename.replace(/\.[^/.]+$/, '');

export default function NewRequestPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [vesselTypes, setVesselTypes] = useState<ApiVesselType[]>([]);
  const [areaOperations, setAreaOperations] = useState<ApiAreaOfOperation[]>([]);
  const [surveyTypes, setSurveyTypes] = useState<ApiSurveyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ApiRequest | null>(null);
  const [formData, setFormData] = useState<RequestPayload>({ ...emptyForm });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docModalRequestId, setDocModalRequestId] = useState('');
  const [docModalDocument, setDocModalDocument] = useState<ApiRequestDocument | null>(null);
  const [docModalName, setDocModalName] = useState('');
  const [docModalFile, setDocModalFile] = useState<File | null>(null);
  const [docModalError, setDocModalError] = useState('');
  const [docModalSaving, setDocModalSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setPageError('');
      const [vesselRes, areaRes, surveyRes, requestRes] = await Promise.all([
        operationsService.getVesselTypes(),
        operationsService.getAreaOperations(),
        operationsService.getSurveyTypes(),
        requestsService.getRequests(),
      ]);
      setVesselTypes(vesselRes.data);
      setAreaOperations(areaRes.data);
      setSurveyTypes(surveyRes.data);
      setRequests(requestRes.data);
    } catch (err: any) {
      setPageError(err.message || 'Failed to load request data.');
    } finally {
      setLoading(false);
    }
  };

  const refreshRequests = async () => {
    try {
      const res = await requestsService.getRequests();
      setRequests(res.data);
    } catch (err: any) {
      setPageError(err.message || 'Failed to refresh requests.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const requestStatusLabel = (status: ApiRequest['status']) => {
    if (status === 'print') return 'Print';
    if (status === 'reject') return 'Reject';
    if (status === 'success') return 'Success';
    return 'Active';
  };

  const requestStatusClass = (status: ApiRequest['status']) => {
    if (status === 'print') return `${s.statusBadge} ${s.statusPrint}`;
    if (status === 'reject') return `${s.statusBadge} ${s.statusReject}`;
    if (status === 'success') return `${s.statusBadge} ${s.statusSuccess}`;
    return `${s.statusBadge} ${s.statusActive}`;
  };

  const vesselOptions = useMemo(
    () => vesselTypes.map((item) => ({ id: item._id, label: `${item.group} - ${item.name}` })),
    [vesselTypes]
  );

  const areaOptions = useMemo(
    () => areaOperations.map((item) => ({ id: item._id, label: `${item.AreaCategory} - ${item.description}` })),
    [areaOperations]
  );

  const surveyOptions = useMemo(
    () => surveyTypes.map((item) => ({ id: item._id, label: `${item.code} - ${item.name}` })),
    [surveyTypes]
  );

  const selectedSurveyLabels = useMemo(() => {
    const lookup = new Map(surveyOptions.map((item) => [item.id, item.label]));
    return formData.surveyTypes.map((id) => lookup.get(id)).filter(Boolean) as string[];
  }, [formData.surveyTypes, surveyOptions]);

  const openAdd = () => {
    navigate('/new-request/create');
  };

  const openEdit = (request: ApiRequest) => {
    if (request.status !== 'active') return;
    setEditingRequest(request);
    setFormError('');
    setPendingDocuments([]);
    setFormData({
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
      surveyTypes: request.surveyTypes.map(getId),
      status: request.status || 'active',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await requestsService.deleteRequest(id);
      await refreshRequests();
    } catch (err: any) {
      setPageError(err.message || 'Failed to delete request.');
    } finally {
      setDeleteConfirm(null);
    }
  };

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

  const validateForm = () => {
    if (!formData.vesselName) return 'Vessel name is required.';
    if (!formData.companyName) return 'Company name is required.';
    if (!formData.contactPersonName) return 'Contact person name is required.';
    if (!formData.contactPersonNumber) return 'Contact person number is required.';
    if (!formData.invoicingAddress) return 'Invoicing address is required.';
    if (!formData.companyEmail) return 'Company email is required.';
    if (!formData.sector) return 'Sector is required.';
    if (!formData.vesselType) return 'Vessel type is required.';
    if (!formData.areaOfOperation) return 'Area of operation is required.';
    if (!formData.surveyTypes.length) return 'Select at least one survey type.';
    return '';
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    setSaving(true);
    setFormError('');

    const payload: RequestPayload = {
      ...formData,
      imoNumber: formData.imoNumber?.trim() || undefined,
      uqmsNumber: formData.uqmsNumber?.trim() || undefined,
      status: formData.status || 'active',
    };

    try {
      let requestId = editingRequest?._id;
      if (editingRequest) {
        await requestsService.updateRequest(editingRequest._id, payload);
      } else {
        const res = await requestsService.createRequest(payload);
        requestId = res.data._id;
      }

      if (requestId && pendingDocuments.length > 0) {
        try {
          await requestsService.addRequestDocuments(
            requestId,
            pendingDocuments.map((doc) => ({ file: doc.file, name: doc.name }))
          );
        } catch (err: any) {
          alert(err.message || 'Request saved, but document upload failed.');
        }
      }

      await refreshRequests();
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save request.');
    } finally {
      setSaving(false);
    }
  };

  const openDocModal = (requestId: string, doc: ApiRequestDocument) => {
    setDocModalRequestId(requestId);
    setDocModalDocument(doc);
    setDocModalName(doc.name || '');
    setDocModalFile(null);
    setDocModalError('');
    setDocModalOpen(true);
  };

  const closeDocModal = () => {
    setDocModalOpen(false);
    setDocModalRequestId('');
    setDocModalDocument(null);
    setDocModalName('');
    setDocModalFile(null);
    setDocModalError('');
  };

  const handleUpdateDocument = async () => {
    if (!docModalDocument || !docModalRequestId) return;
    if (!docModalName && !docModalFile) {
      setDocModalError('Provide a new name or upload a new file.');
      return;
    }

    setDocModalSaving(true);
    setDocModalError('');

    try {
      await requestsService.updateRequestDocument(docModalRequestId, docModalDocument._id, {
        name: docModalName || undefined,
        file: docModalFile || undefined,
      });
      await refreshRequests();
      closeDocModal();
    } catch (err: any) {
      setDocModalError(err.message || 'Failed to update document.');
    } finally {
      setDocModalSaving(false);
    }
  };

  const handleDeleteDocument = async (requestId: string, documentId: string) => {
    try {
      await requestsService.deleteRequestDocument(requestId, documentId);
      await refreshRequests();
    } catch (err: any) {
      setPageError(err.message || 'Failed to delete document.');
    }
  };

  const renderDocuments = (request: ApiRequest) => {
    const docs = request.documents || [];
    if (!docs.length) return <div className={s.emptyState}>No documents attached.</div>;

    return (
      <div className={s.docList}>
        {docs.map((doc) => (
          <div key={doc._id} className={s.docRow}>
            <div className={s.docInfo}>
              <div className={s.docName}>{doc.name}</div>
              <div className={s.docMeta}>
                {doc.contentType || 'file'} • {formatBytes(doc.size)}
              </div>
            </div>
            <div className={s.docActions}>
              {doc.url && (
                <a className={s.linkBtn} href={doc.url} target="_blank" rel="noreferrer">
                  View
                </a>
              )}
              <button
                className={s.actionBtn}
                type="button"
                onClick={() => openDocModal(request._id, doc)}
                disabled={request.status !== 'active'}
              >
                Edit
              </button>
              <button
                className={`${s.actionBtn} ${s.deleteBtn}`}
                type="button"
                onClick={() => handleDeleteDocument(request._id, doc._id)}
                disabled={request.status !== 'active'}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const editingIsActive = editingRequest ? editingRequest.status === 'active' : true;

  return (
    <div className="animate-in">
      <div className={s.topBar}>
        <div>
          <h2 className="section-header" style={{ marginBottom: '4px' }}>New Request</h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {requests.length} request(s) submitted
          </p>
        </div>
        <button className={s.addBtn} onClick={openAdd}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3v12M3 9h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Create Request
        </button>
      </div>

      {pageError && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,.25)', color: 'var(--red)' }}>
          {pageError}
        </div>
      )}

      {loading ? (
        <div className="card">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className={s.emptyState}>No requests yet. Create a new request to get started.</div>
      ) : (
        <>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Request No</th>
                  <th>Vessel Name</th>
                  <th>Sector</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req._id} onClick={() => navigate(`/new-request/${req._id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600 }}>{req.requestNumber}</td>
                    <td>{req.vesselName || '-'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{req.sector}</td>
                    <td>
                      <span className={requestStatusClass(req.status)}>{requestStatusLabel(req.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={s.mobileCards}>
            {requests.map((req) => (
              <div key={req._id} className={s.mobileCard} onClick={() => navigate(`/new-request/${req._id}`)} style={{ cursor: 'pointer' }}>
                <div className={s.mobileCardTop}>
                  <div className={s.mobileCardInfo}>
                    <div className={s.mobileTitle}>{req.requestNumber}</div>
                    <div className={s.mobileSub}>Vessel Name: {req.vesselName || '-'}</div>
                  </div>
                  <span className={requestStatusClass(req.status)}>{requestStatusLabel(req.status)}</span>
                </div>
                <div className={s.mobileCardBottom}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'capitalize' }}>{req.sector}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <div className={s.overlay} onClick={() => setShowModal(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>{editingRequest ? 'Edit Request' : 'Create New Request'}</h3>
              <button className={s.closeBtn} onClick={() => setShowModal(false)}>X</button>
            </div>
            <div className={s.modalBody}>
              {formError && (
                <div
                  style={{
                    background: 'var(--red-subtle)',
                    color: 'var(--red)',
                    fontSize: '13px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    textAlign: 'center',
                    border: '1px solid rgba(239,68,68,.15)'
                  }}
                >
                  {formError}
                </div>
              )}

              {!editingIsActive && (
                <div
                  style={{
                    background: 'rgba(245,158,11,.12)',
                    color: 'var(--orange)',
                    fontSize: '13px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    textAlign: 'center',
                    border: '1px solid rgba(245,158,11,.2)'
                  }}
                >
                  Only active requests can be edited.
                </div>
              )}

              <div className={s.formGrid}>
                <div>
                  <label className="form-label">UQMS Number (Optional)</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.uqmsNumber || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, uqmsNumber: e.target.value }))}
                    disabled={!editingIsActive}
                  />
                </div>
                <div>
                  <label className="form-label">IMO Number (Optional)</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.imoNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, imoNumber: e.target.value }))}
                    disabled={!editingIsActive}
                  />
                </div>
                <div>
                  <label className="form-label">Vessel Name</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.vesselName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, vesselName: e.target.value }))}
                    disabled={!editingIsActive}
                  />
                </div>
                <div>
                  <label className="form-label">Company Name</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                    disabled={!editingIsActive}
                  />
                </div>
                <div>
                  <label className="form-label">Contact Person Name</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.contactPersonName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contactPersonName: e.target.value }))}
                    disabled={!editingIsActive}
                  />
                </div>
                <div>
                  <label className="form-label">Contact Person Number</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.contactPersonNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contactPersonNumber: e.target.value }))}
                    disabled={!editingIsActive}
                  />
                </div>
                <div>
                  <label className="form-label">Registered Address</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.registerdAddress || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, registerdAddress: e.target.value }))}
                    disabled={!editingIsActive}
                  />
                </div>
                <div>
                  <label className="form-label">Invoicing Address</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.invoicingAddress}
                    onChange={(e) => setFormData((prev) => ({ ...prev, invoicingAddress: e.target.value }))}
                    disabled={!editingIsActive}
                  />
                </div>
                <div>
                  <label className="form-label">Company Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={formData.companyEmail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, companyEmail: e.target.value }))}
                    disabled={!editingIsActive}
                  />
                </div>
                <div>
                  <label className="form-label">Sector</label>
                  <select
                    className="form-input"
                    value={formData.sector}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sector: e.target.value as 'marine' | 'industrial' }))}
                    disabled={!editingIsActive}
                  >
                    <option value="marine">Marine</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>
                <SearchableSelect
                  label="Vessel Type"
                  value={formData.vesselType}
                  options={vesselOptions}
                  placeholder="Select vessel type"
                  onChange={(value) => setFormData((prev) => ({ ...prev, vesselType: value }))}
                  disabled={!editingIsActive}
                />
                <SearchableSelect
                  label="Area of Operation"
                  value={formData.areaOfOperation}
                  options={areaOptions}
                  placeholder="Select area"
                  onChange={(value) => setFormData((prev) => ({ ...prev, areaOfOperation: value }))}
                  disabled={!editingIsActive}
                />
                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as ApiRequest['status'] }))}
                    disabled={!editingIsActive}
                  >
                    <option value="active">Active</option>
                    <option value="print">Print</option>
                    <option value="reject">Reject</option>
                  </select>
                </div>
              </div>

              <SearchableMultiSelect
                label="Survey Types"
                value={formData.surveyTypes}
                options={surveyOptions}
                placeholder="Select survey types"
                onChange={(value) => setFormData((prev) => ({ ...prev, surveyTypes: value }))}
                disabled={!editingIsActive}
              />

              {selectedSurveyLabels.length > 0 ? (
                <div className={s.selectedList}>
                  {selectedSurveyLabels.map((label) => (
                    <div key={label} className={s.selectedItem}>{label}</div>
                  ))}
                </div>
              ) : (
                <div className={s.emptyState}>No survey types selected.</div>
              )}

              <div className={s.fullRow}>
                <label className="form-label">Documents</label>
                {editingRequest && renderDocuments(editingRequest)}
                <div className="upload-area" style={{ marginTop: '12px', position: 'relative' }}>
                  <div className="upload-icon">+</div>
                  <div className="upload-text">
                    <span>Upload files</span> (PDF or images)
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    onChange={(e) => handleAddFiles(e.target.files)}
                    style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                    disabled={!editingIsActive}
                  />
                </div>

                {pendingDocuments.length > 0 && (
                  <div className={s.fileList}>
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
                          disabled={!editingIsActive}
                        />
                        <button
                          className={`${s.actionBtn} ${s.deleteBtn}`}
                          type="button"
                          onClick={() => handleRemovePending(doc.id)}
                          disabled={!editingIsActive}
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !editingIsActive}>
                {saving ? 'Saving...' : 'Save Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {docModalOpen && (
        <div className={s.overlay} onClick={closeDocModal}>
          <div className={`${s.modal} ${s.modalCompact}`} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>Update Document</h3>
              <button className={s.closeBtn} onClick={closeDocModal}>X</button>
            </div>
            <div className={s.modalBody}>
              {docModalError && (
                <div
                  style={{
                    background: 'var(--red-subtle)',
                    color: 'var(--red)',
                    fontSize: '13px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    textAlign: 'center',
                    border: '1px solid rgba(239,68,68,.15)'
                  }}
                >
                  {docModalError}
                </div>
              )}
              <label className="form-label">Document Name</label>
              <input
                className="form-input"
                type="text"
                value={docModalName}
                onChange={(e) => setDocModalName(e.target.value)}
              />
              <label className="form-label">Replace File (Optional)</label>
              <input
                className="form-input"
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setDocModalFile(e.target.files ? e.target.files[0] : null)}
              />
            </div>
            <div className={s.modalFooter}>
              <button className="btn-secondary" onClick={closeDocModal}>Cancel</button>
              <button className="btn-primary" onClick={handleUpdateDocument} disabled={docModalSaving}>
                {docModalSaving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className={s.overlay} onClick={() => setDeleteConfirm(null)}>
          <div className={`${s.modal} ${s.modalCompact}`} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalBody} style={{ textAlign: 'center', padding: '28px 24px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>!</div>
              <h3 className={s.modalTitle} style={{ marginBottom: '8px' }}>Delete Request?</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>This action cannot be undone.</p>
            </div>
            <div className={s.modalFooter}>
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="btn-primary"
                style={{ background: 'var(--red)' }}
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
