import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  operationsService,
  requestsService,
  vesselsService,
  vesselCodesService,
  type ApiAreaOfOperation,
  type ApiRequest,
  type ApiSurveyType,
  type ApiVesselType,
  type RequestPayload,
  type ApiVessel,
  type ApiVesselCode,
  type RequestDocumentType,
  REQUEST_DOCUMENT_TYPES,
} from '@/api';
import SearchableSelect from '@/components/SearchableSelect';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import DragDropFileUpload from '@/components/DragDropFileUpload';
import { X } from 'lucide-react';
import {
  Button, ButtonLink, Card, ErrorState, Field, FormGrid, FormSection, IconButton, Input, LoadingBlock, PageHeader, Select, StickyActionBar,
} from '@/ui';
import s from './CreateRequest.module.css';
import rd from './RequestDetails.module.css';

const emptyForm: RequestPayload = {
  uqmsNumber: '',
  imoNumber: '',
  mmsiNumber: '',
  vesselCode: '',
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
  documentType: RequestDocumentType;
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

const toDateInputValue = (value?: string | Date | null) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const defaultCreatedDate = toDateInputValue(new Date());

export default function CreateRequestPage() {
  const navigate = useNavigate();
  const [vesselTypes, setVesselTypes] = useState<ApiVesselType[]>([]);
  const [vesselCodes, setVesselCodes] = useState<ApiVesselCode[]>([]);
  const [areaOperations, setAreaOperations] = useState<ApiAreaOfOperation[]>([]);
  const [surveyTypes, setSurveyTypes] = useState<ApiSurveyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [formData, setFormData] = useState<RequestPayload>({ ...emptyForm });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [pendingSignedPdf, setPendingSignedPdf] = useState<File | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const [vesselSearchQuery, setVesselSearchQuery] = useState('');
  const [vesselSearchResults, setVesselSearchResults] = useState<ApiVessel[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setPageError('');
      const [vesselRes, areaRes, surveyRes, vcRes] = await Promise.all([
        operationsService.getVesselTypes(),
        operationsService.getAreaOperations(),
        operationsService.getSurveyTypes(),
        vesselCodesService.getVesselCodes(),
      ]);
      setVesselTypes(vesselRes.data);
      setAreaOperations(areaRes.data);
      setSurveyTypes(surveyRes.data);
      setVesselCodes(vcRes.data);
      setFormData((prev) => ({
        ...prev,
        vesselType: vesselRes.data[0]?._id || '',
        areaOfOperation: areaRes.data[0]?._id || '',
        createdAt: prev.createdAt || defaultCreatedDate,
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

  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const nextDocs: PendingDocument[] = Array.from(fileList).map((file) => ({
      id: makeId(),
      file,
      name: getFileBaseName(file.name),
      documentType: 'other' as RequestDocumentType,
    }));
    setPendingDocuments((prev) => [...prev, ...nextDocs]);
  };

  const handleRemovePending = (id: string) => {
    setPendingDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  type FieldKey = 'vesselName' | 'companyName' | 'contactPersonName' | 'contactPersonNumber' | 'invoicingAddress'
    | 'companyEmail' | 'vesselType' | 'areaOfOperation' | 'surveyTypes';
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  /** Per-field messages, so each error shows next to its field. */
  const validate = (): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!formData.vesselName.trim()) next.vesselName = 'Enter the vessel name.';
    if (!formData.vesselType) next.vesselType = 'Choose a vessel type.';
    if (!formData.areaOfOperation) next.areaOfOperation = 'Choose an area of operation.';
    if (!formData.surveyTypes.length) next.surveyTypes = 'Select at least one survey type.';
    if (!formData.companyName.trim()) next.companyName = 'Enter the company name.';
    if (!formData.companyEmail.trim()) next.companyEmail = 'Enter the company email.';
    else if (!/^\S+@\S+\.\S+$/.test(formData.companyEmail.trim())) next.companyEmail = 'Enter a valid email address.';
    if (!formData.contactPersonName.trim()) next.contactPersonName = 'Enter the contact person.';
    if (!formData.contactPersonNumber.trim()) next.contactPersonNumber = 'Enter the contact number.';
    if (!formData.invoicingAddress.trim()) next.invoicingAddress = 'Enter the invoicing address.';
    return next;
  };

  const set = <K extends keyof RequestPayload>(key: K, value: RequestPayload[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (key in errors) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleSave = async () => {
    const found = validate();
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      setFormError('');
      // Bring the first problem into view (inputs mark themselves aria-invalid; selects show their message).
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-field-error]');
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (first instanceof HTMLInputElement) first.focus({ preventScroll: true });
      });
      return;
    }

    setSaving(true);
    setFormError('');

    const payload: RequestPayload = {
      ...formData,
      imoNumber: formData.imoNumber?.trim() || undefined,
      mmsiNumber: formData.mmsiNumber?.trim() || undefined,
      uqmsNumber: formData.uqmsNumber?.trim() || undefined,
      createdAt: formData.createdAt ? new Date(formData.createdAt).toISOString() : undefined,
      status: formData.status || 'active',
      overrideReason: overrideReason.trim() || undefined,
    };

    try {
      const res = await requestsService.createRequest(payload);
      const requestId: string | undefined = res.data._id;

      if (requestId) {
        if (pendingSignedPdf) {
          try {
            await requestsService.uploadRequestSignedPdf(requestId, pendingSignedPdf);
          } catch (err: any) {
            toast.warning(err.message || 'Request saved, but signed PDF upload failed.');
          }
        }

        if (pendingDocuments.length > 0) {
          try {
            await requestsService.addRequestDocuments(
              requestId,
              pendingDocuments.map((doc) => ({ file: doc.file, name: doc.name, documentType: doc.documentType }))
            );
          } catch (err: any) {
            toast.warning(err.message || 'Request saved, but document upload failed.');
          }
        }
      }

      toast.success(res.data.requestNumber ? `Request ${res.data.requestNumber} created.` : 'Request created.');
      navigate('/new-request');
    } catch (err: any) {
      setFormError(err.message || 'Failed to save request.');
    } finally {
      setSaving(false);
    }
  };

  const selectError = (key: FieldKey) =>
    errors[key] ? <p className={s.selectError} role="alert" data-field-error>{errors[key]}</p> : null;

  const dirty = !!(formData.vesselName || formData.companyName || pendingDocuments.length || pendingSignedPdf);

  return (
    <div className="animate-in">
      <PageHeader
        back={{ href: '/new-request', label: 'All requests' }}
        title="Create request"
        description="Survey requests normally come from the website. Creating one here is a Technical Committee override and is recorded in the audit log. Fields marked * are required."
      />

      {loading ? (
        <LoadingBlock label="Loading form…" />
      ) : pageError ? (
        <Card padding="none"><ErrorState message={pageError} onRetry={loadData} /></Card>
      ) : (
        <div className={s.form}>
          {formError && <p className={s.formError} role="alert">{formError}</p>}

          <FormSection title="Technical Committee override">
            <Field label="Reason for creating this request in the ERP" hint="Optional · kept in the audit log">
              <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="e.g. Client sent the request by email" />
            </Field>
          </FormSection>

          <FormSection title="Vessel" description="Pick an existing vessel by UQMS number to fill in its details, or enter a new one.">
            <FormGrid columns={3}>
              <div className={s.span2}>
                <SearchableSelect
                  label="Existing vessel (UQMS number)"
                  value={formData.uqmsNumber || ''}
                  options={uqmsOptions}
                  placeholder="Search by UQMS number or vessel name"
                  searchPlaceholder="Type to search…"
                  allowClear
                  onSearchChange={setVesselSearchQuery}
                  onChange={(val) => {
                    if (!val) {
                      setFormData((prev) => ({ ...prev, uqmsNumber: '', vesselName: '', imoNumber: '', mmsiNumber: '', vesselCode: '' }));
                      return;
                    }
                    const vessel = vesselSearchResults.find((v) => (v.uqmsNumber || v._id) === val);
                    setFormData((prev) => ({
                      ...prev,
                      uqmsNumber: vessel?.uqmsNumber || val,
                      vesselName: vessel?.vesselName || prev.vesselName,
                      imoNumber: vessel?.imoNumber || prev.imoNumber,
                      mmsiNumber: vessel?.mmsiNumber || prev.mmsiNumber,
                      vesselCode: vessel?.vesselCode || prev.vesselCode,
                    }));
                    setErrors((prev) => ({ ...prev, vesselName: undefined }));
                  }}
                />
              </div>
              <Field label="Vessel name" required error={errors.vesselName}>
                <Input value={formData.vesselName} onChange={(e) => set('vesselName', e.target.value)} />
              </Field>
              <Field label="IMO number" hint="Optional">
                <Input inputMode="numeric" value={formData.imoNumber} onChange={(e) => set('imoNumber', e.target.value)} />
              </Field>
              <Field label="MMSI number" hint="Optional">
                <Input inputMode="numeric" value={formData.mmsiNumber || ''} onChange={(e) => set('mmsiNumber', e.target.value)} />
              </Field>
              <Field label="Vessel code" hint="Optional">
                <Select value={formData.vesselCode || ''} onChange={(e) => set('vesselCode', e.target.value)}>
                  <option value="">Not set</option>
                  {vesselCodes.map(vc => <option key={vc._id} value={vc.code}>{vc.code} - {vc.description}</option>)}
                </Select>
              </Field>
              <div>
                <SearchableSelect label="Vessel type" required value={formData.vesselType} options={vesselOptions} placeholder="Select vessel type" onChange={(value) => set('vesselType', value)} />
                {selectError('vesselType')}
              </div>
              <div>
                <SearchableSelect label="Area of operation" required value={formData.areaOfOperation} options={areaOptions} placeholder="Select area" onChange={(value) => set('areaOfOperation', value)} />
                {selectError('areaOfOperation')}
              </div>
              <Field label="Sector" required>
                <Select value={formData.sector} onChange={(e) => set('sector', e.target.value as RequestPayload['sector'])}>
                  <option value="marine">Marine</option>
                  <option value="industrial">Industrial</option>
                </Select>
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection title="Surveys">
            <SearchableMultiSelect
              label="Survey types" required
              value={formData.surveyTypes}
              options={surveyOptions}
              placeholder="Select survey types"
              onChange={(value) => set('surveyTypes', value)}
            />
            {selectError('surveyTypes')}
          </FormSection>

          <FormSection title="Company & contact">
            <FormGrid columns={2}>
              <Field label="Company name" required error={errors.companyName}>
                <Input value={formData.companyName} onChange={(e) => set('companyName', e.target.value)} />
              </Field>
              <Field label="Company email" required error={errors.companyEmail}>
                <Input type="email" inputMode="email" value={formData.companyEmail} onChange={(e) => set('companyEmail', e.target.value)} />
              </Field>
              <Field label="Contact person" required error={errors.contactPersonName}>
                <Input value={formData.contactPersonName} onChange={(e) => set('contactPersonName', e.target.value)} />
              </Field>
              <Field label="Contact number" required error={errors.contactPersonNumber}>
                <Input type="tel" inputMode="tel" value={formData.contactPersonNumber} onChange={(e) => set('contactPersonNumber', e.target.value)} />
              </Field>
              <Field label="Registered address">
                <Input value={formData.registerdAddress || ''} onChange={(e) => set('registerdAddress', e.target.value)} />
              </Field>
              <Field label="Invoicing address" required error={errors.invoicingAddress}>
                <Input value={formData.invoicingAddress} onChange={(e) => set('invoicingAddress', e.target.value)} />
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection title="Request record">
            <FormGrid columns={3}>
              <Field label="Created date">
                <Input type="date" value={formData.createdAt || ''} onChange={(e) => set('createdAt', e.target.value)} />
              </Field>
              <Field label="Status">
                <Select value={formData.status} onChange={(e) => set('status', e.target.value as ApiRequest['status'])}>
                  <option value="active">Active</option>
                  <option value="print">Print</option>
                  <option value="reject">Reject</option>
                </Select>
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection title="Attachments" description="Files upload after the request is created.">
            <DragDropFileUpload onFilesSelected={handleAddFiles} multiple accept=".pdf,image/*" text={<span>Add documents</span>} subText="PDF or images" />
            {pendingDocuments.length > 0 && (
              <ul className={rd.pendingList}>
                {pendingDocuments.map((doc) => (
                  <li key={doc.id} className={rd.pendingRow}>
                    <span className={rd.docText}>
                      <span className={rd.docName}>{doc.file.name}</span>
                      <span className={rd.docMeta}>{formatBytes(doc.file.size)}</span>
                    </span>
                    <Field label="Document type" hideLabel className={rd.pendingName}>
                      <Select
                        value={doc.documentType}
                        onChange={(e) => {
                          const documentType = e.target.value as RequestDocumentType;
                          setPendingDocuments((prev) => prev.map((item) => (item.id === doc.id
                            ? { ...item, documentType, name: documentType !== 'other' ? REQUEST_DOCUMENT_TYPES[documentType] : item.name }
                            : item)));
                        }}
                      >
                        {(Object.keys(REQUEST_DOCUMENT_TYPES) as RequestDocumentType[]).map((type) => (
                          <option key={type} value={type}>{REQUEST_DOCUMENT_TYPES[type]}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Document name" hideLabel className={rd.pendingName}>
                      <Input
                        placeholder="Document name"
                        value={doc.name}
                        onChange={(e) => setPendingDocuments((prev) => prev.map((item) => (item.id === doc.id ? { ...item, name: e.target.value } : item)))}
                      />
                    </Field>
                    <IconButton label={`Remove ${doc.file.name}`} icon={<X />} size="sm" onClick={() => handleRemovePending(doc.id)} />
                  </li>
                ))}
              </ul>
            )}

            <DragDropFileUpload
              onFilesSelected={(files) => setPendingSignedPdf(files ? files[0] : null)}
              multiple={false}
              accept=".pdf"
              text={<span>{pendingSignedPdf ? 'Replace signed request PDF' : 'Add signed request PDF'}</span>}
              subText="Optional · PDF only"
            />
            {pendingSignedPdf && (
              <ul className={rd.pendingList}>
                <li className={rd.pendingRow}>
                  <span className={rd.docText}>
                    <span className={rd.docName}>{pendingSignedPdf.name}</span>
                    <span className={rd.docMeta}>Signed PDF · {formatBytes(pendingSignedPdf.size)}</span>
                  </span>
                  <IconButton label="Remove signed PDF" icon={<X />} size="sm" onClick={() => setPendingSignedPdf(null)} />
                </li>
              </ul>
            )}
          </FormSection>

          <StickyActionBar dirty={dirty}>
            <ButtonLink to="/new-request">Cancel</ButtonLink>
            <Button variant="primary" onClick={handleSave} loading={saving}>Create request</Button>
          </StickyActionBar>
        </div>
      )}
    </div>
  );
}
