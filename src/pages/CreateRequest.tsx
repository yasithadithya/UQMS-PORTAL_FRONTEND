import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  operationsService,
  requestsService,
  vesselsService,
  type ApiAreaOfOperation,
  type ApiRequest,
  type ApiSurveyType,
  type ApiVesselType,
  type RequestPayload,
  type ApiVessel,
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

export default function CreateRequestPage() {
  const navigate = useNavigate();
  const [vesselTypes, setVesselTypes] = useState<ApiVesselType[]>([]);
  const [areaOperations, setAreaOperations] = useState<ApiAreaOfOperation[]>([]);
  const [surveyTypes, setSurveyTypes] = useState<ApiSurveyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [formData, setFormData] = useState<RequestPayload>({ ...emptyForm });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);

  const [vesselSearchQuery, setVesselSearchQuery] = useState('');
  const [vesselSearchResults, setVesselSearchResults] = useState<ApiVessel[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setPageError('');
      const [vesselRes, areaRes, surveyRes] = await Promise.all([
        operationsService.getVesselTypes(),
        operationsService.getAreaOperations(),
        operationsService.getSurveyTypes(),
      ]);
      setVesselTypes(vesselRes.data);
      setAreaOperations(areaRes.data);
      setSurveyTypes(surveyRes.data);
      setFormData((prev) => ({
        ...prev,
        vesselType: vesselRes.data[0]?._id || '',
        areaOfOperation: areaRes.data[0]?._id || '',
      }));
    } catch (err: any) {
      setPageError(err.message || 'Failed to load request data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handler = setTimeout(async () => {
      try {
        const res = await vesselsService.searchVessels(vesselSearchQuery);
        setVesselSearchResults(res.data);
      } catch (err) {
        console.error('Failed to search vessels', err);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [vesselSearchQuery]);

  const uqmsOptions = useMemo(() => {
    const opts = vesselSearchResults.map((v) => ({
      id: v.uqmsNumber || v._id,
      label: v.uqmsNumber ? `${v.uqmsNumber} - ${v.vesselName}` : v.vesselName,
    }));
    if (formData.uqmsNumber && !opts.find((o) => o.id === formData.uqmsNumber)) {
      opts.unshift({ id: formData.uqmsNumber, label: formData.uqmsNumber });
    }
    return opts;
  }, [vesselSearchResults, formData.uqmsNumber]);

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
      let requestId: string | undefined;
      const res = await requestsService.createRequest(payload);
      requestId = res.data._id;

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

      navigate('/new-request');
    } catch (err: any) {
      setFormError(err.message || 'Failed to save request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in">
      <div className={s.topBar}>
        <div>
          <h2 className="section-header" style={{ marginBottom: '4px' }}>Create Request</h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Add a new request record.</p>
        </div>
        <button className={s.addBtn} onClick={() => navigate('/new-request')}>
          Back to Requests
        </button>
      </div>

      {pageError && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,.25)', color: 'var(--red)' }}>
          {pageError}
        </div>
      )}

      {loading ? (
        <div className="card">Loading request data...</div>
      ) : (
        <div className="card" style={{ padding: '24px' }}>
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

          <div className={s.formGrid}>
            <div>
              <label className="form-label">UQMS Number (Optional)</label>
              <SearchableSelect
                value={formData.uqmsNumber || ''}
                options={uqmsOptions}
                placeholder="Search UQMS / Vessel Name"
                searchPlaceholder="Type to search..."
                allowClear={true}
                onSearchChange={setVesselSearchQuery}
                onChange={(val) => {
                  if (!val) {
                    setFormData((prev) => ({
                      ...prev,
                      uqmsNumber: '',
                      vesselName: '',
                      imoNumber: '',
                    }));
                    return;
                  }
                  const vessel = vesselSearchResults.find((v) => (v.uqmsNumber || v._id) === val);
                  setFormData((prev) => ({
                    ...prev,
                    uqmsNumber: vessel?.uqmsNumber || val,
                    vesselName: vessel?.vesselName || prev.vesselName,
                    imoNumber: vessel?.imoNumber || prev.imoNumber,
                  }));
                }}
              />
            </div>
            <div>
              <label className="form-label">IMO Number (Optional)</label>
              <input
                className="form-input"
                type="text"
                value={formData.imoNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, imoNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Vessel Name</label>
              <input
                className="form-input"
                type="text"
                value={formData.vesselName}
                onChange={(e) => setFormData((prev) => ({ ...prev, vesselName: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Company Name</label>
              <input
                className="form-input"
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Contact Person Name</label>
              <input
                className="form-input"
                type="text"
                value={formData.contactPersonName}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactPersonName: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Contact Person Number</label>
              <input
                className="form-input"
                type="text"
                value={formData.contactPersonNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactPersonNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Registered Address</label>
              <input
                className="form-input"
                type="text"
                value={formData.registerdAddress || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, registerdAddress: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Invoicing Address</label>
              <input
                className="form-input"
                type="text"
                value={formData.invoicingAddress}
                onChange={(e) => setFormData((prev) => ({ ...prev, invoicingAddress: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Company Email</label>
              <input
                className="form-input"
                type="email"
                value={formData.companyEmail}
                onChange={(e) => setFormData((prev) => ({ ...prev, companyEmail: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Sector</label>
              <select
                className="form-input"
                value={formData.sector}
                onChange={(e) => setFormData((prev) => ({ ...prev, sector: e.target.value as RequestPayload['sector'] }))}
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
            />
            <SearchableSelect
              label="Area of Operation"
              value={formData.areaOfOperation}
              options={areaOptions}
              placeholder="Select area"
              onChange={(value) => setFormData((prev) => ({ ...prev, areaOfOperation: value }))}
            />
            <div>
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as ApiRequest['status'] }))}
              >
                <option value="active">Active</option>
                <option value="print">Print</option>
                <option value="reject">Reject</option>
              </select>
            </div>
          </div>

          <div className={s.fullRow}>
            <SearchableMultiSelect
              label="Survey Types"
              value={formData.surveyTypes}
              options={surveyOptions}
              placeholder="Select survey types"
              onChange={(value) => setFormData((prev) => ({ ...prev, surveyTypes: value }))}
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
          </div>

          <div className={s.fullRow}>
            <label className="form-label">Documents</label>
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
          </div>

          <div className={s.modalFooter}>
            <button className="btn-secondary" onClick={() => navigate('/new-request')}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Create Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
