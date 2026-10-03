import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronDown, Columns3, ListPlus, Lock, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  feeItemsService, quotationsService, vesselCodesService,
  type ApiFeeItem, type ApiQuotation, type ApiVesselCode, type DiscountType, type FeeCategory, type FeeCurrency, type QuotableRequest,
  type QuotationPayload,
} from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import SearchableSelect from '@/components/SearchableSelect';
import { MODULE_KEYS } from '@/utils/permissions';
import {
  Badge, Button, ButtonLink, Field, FormGrid, FormSection, FormWithNav, IconButton, Input, LoadingBlock, Menu, PageHeader,
  SectionNav, Select, StickyActionBar, Textarea, type MenuItem,
} from '@/ui';
import {
  DEFAULT_PAYMENT_TERMS, DEFAULT_QUOTATION_NOTES, FEE_CATEGORY_LABELS, formatMoney, formatRate, lineAmountLkr, revisionLabel,
} from './financeFormat';
import { quotationsPath } from './financeTabs';
import s from './finance.module.css';

type Line = {
  key: number;
  feeItem?: string;
  description: string;
  currency: FeeCurrency;
  rate: string;
  quantity: string;
  /** Values for the extra columns, by position. */
  extra: string[];
};

/** Most user-added columns (matches the backend; keeps the PDF table readable). */
const MAX_EXTRA_COLUMNS = 3;

type RequestInfo = { id: string; requestNumber: string; jobNumber?: string };

type FieldKey = 'request' | 'vesselCode' | 'title' | 'companyName' | 'exchangeRate' | 'lines' | 'quotationDate' | 'columns' | 'discount';

const today = () => new Date().toISOString().slice(0, 10);
const toDateInput = (value?: string) => (value ? new Date(value).toISOString().slice(0, 10) : today());

let lineKey = 0;
const newLine = (patch: Partial<Line> = {}): Line => ({ key: ++lineKey, description: '', currency: 'USD', rate: '', quantity: '1', extra: [], ...patch });

const titleFor = (vesselName: string) => `QUOTATION FOR – ${vesselName.toUpperCase()}`;

/**
 * Create, edit or revise a quotation.
 *   /:module/quotations/new            new quotation for an unquoted request
 *   /:module/quotations/new?from=<id>  revision of an existing quotation (same request, next -R number)
 *   /:module/quotations/:id/edit       edit a draft or sent quotation
 */
export default function QuotationForm() {
  const navigate = useNavigate();
  const unsaved = useUnsavedChanges();
  const { user, can } = useAuth();
  const { id, module } = useParams<{ id?: string; module?: string }>();
  const [searchParams] = useSearchParams();
  const revisingId = !id ? searchParams.get('from') : null;
  const isEdit = !!id;
  const listPath = quotationsPath(`/${module || 'finance'}`);
  const canSave = can(MODULE_KEYS.financeQuotations, isEdit ? 'update' : 'create');
  // Discounts are interlocked: only Technical Committee users (discount action) may change them.
  const canDiscount = can(MODULE_KEYS.financeQuotations, 'discount');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'draft' | 'sent' | null>(null);
  const savingRef = useRef(false);

  const [feeItems, setFeeItems] = useState<ApiFeeItem[]>([]);
  const [quotableRequests, setQuotableRequests] = useState<QuotableRequest[]>([]);
  const [vesselCodes, setVesselCodes] = useState<ApiVesselCode[]>([]);
  const [vesselCode, setVesselCode] = useState('');
  const [extraColumns, setExtraColumns] = useState<string[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [discountDescription, setDiscountDescription] = useState('');
  const [source, setSource] = useState<ApiQuotation | null>(null);

  const [requestInfo, setRequestInfo] = useState<RequestInfo | null>(null);
  const [quotationDate, setQuotationDate] = useState(today());
  const [title, setTitle] = useState('');
  const [vesselName, setVesselName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState<string[]>(DEFAULT_QUOTATION_NOTES);
  const [paymentTerms, setPaymentTerms] = useState<string[]>(DEFAULT_PAYMENT_TERMS);
  const [preparedByName, setPreparedByName] = useState(user?.username || '');
  const [preparedByDesignation, setPreparedByDesignation] = useState('');

  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const clearError = (key: FieldKey) => setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));

  /** Copies a saved quotation into the form (edit, or the starting point of a revision). */
  const fillFrom = (q: ApiQuotation, asRevision: boolean) => {
    setRequestInfo({ id: typeof q.request === 'string' ? q.request : q.request._id, requestNumber: q.requestNumber, jobNumber: q.jobNumber });
    setQuotationDate(asRevision ? today() : toDateInput(q.quotationDate));
    setTitle(q.title);
    setVesselName(q.vesselName || '');
    setCompanyName(q.client?.companyName || '');
    setAddress(q.client?.address || '');
    setContactPerson(q.client?.contactPerson || '');
    setEmail(q.client?.email || '');
    setExchangeRate(String(q.exchangeRate));
    setVesselCode(q.vesselCode || '');
    const columns = q.extraColumns || [];
    setExtraColumns(columns);
    setLines(q.lineItems.map(li => newLine({
      feeItem: li.feeItem, description: li.description, currency: li.currency, rate: String(li.rate), quantity: String(li.quantity),
      extra: columns.map((_, i) => li.extra?.[i] ?? ''),
    })));
    setDiscountType(q.discount?.type || 'percent');
    setDiscountValue(q.discount ? String(q.discount.value) : '');
    setDiscountDescription(q.discount?.description || '');
    setNotes(q.notes);
    setPaymentTerms(q.paymentTerms);
    setPreparedByName(q.preparedByName || user?.username || '');
    setPreparedByDesignation(q.preparedByDesignation || '');
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const feesPromise = feeItemsService.getFeeItems({ active: true });
        vesselCodesService.getVesselCodes()
          .then(res => { if (!cancelled) setVesselCodes(res.data); })
          .catch(() => { if (!cancelled) toast.error('Failed to load vessel codes.'); });
        if (id || revisingId) {
          const [fees, res] = await Promise.all([feesPromise, quotationsService.getQuotation((id || revisingId)!)]);
          if (cancelled) return;
          setFeeItems(fees.data);
          setSource(res.data);
          fillFrom(res.data, !!revisingId);
        } else {
          const [fees, reqs] = await Promise.all([feesPromise, quotationsService.getQuotableRequests()]);
          if (cancelled) return;
          setFeeItems(fees.data);
          setQuotableRequests(reqs.data);
          setLines([]);
        }
      } catch (err: any) {
        if (!cancelled) toast.error(err.message || 'Failed to load the quotation.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, revisingId]);

  const requestOptions = useMemo(
    () => quotableRequests.map(r => ({
      id: r._id,
      label: [r.requestNumber, r.jobNumber].filter(Boolean).join(' · ') + ` — ${r.vesselName} (${r.companyName})`,
    })),
    [quotableRequests]
  );

  const handleRequestChange = (value: string) => {
    const r = quotableRequests.find(req => req._id === value);
    if (!r) {
      setRequestInfo(null);
      return;
    }
    setRequestInfo({ id: r._id, requestNumber: r.requestNumber, jobNumber: r.jobNumber });
    setVesselName(r.vesselName || '');
    setTitle(titleFor(r.vesselName || ''));
    setCompanyName(r.companyName || '');
    setAddress(r.invoicingAddress || r.registerdAddress || '');
    setContactPerson(r.contactPersonName || '');
    setEmail(r.companyEmail || '');
    if (r.vesselCode) setVesselCode(r.vesselCode);
    ['request', 'title', 'companyName', 'vesselCode'].forEach(k => clearError(k as FieldKey));
    unsaved.markDirty();
  };

  // ── Line items ──
  const rateNumber = Number(exchangeRate);
  const lineAmounts = lines.map(l => lineAmountLkr(Number(l.rate), Number(l.quantity), l.currency, rateNumber));
  const subtotalLkr = lineAmounts.reduce((sum, a) => sum + a, 0);
  const discountNumber = Number(discountValue) || 0;
  const discountLkr = discountNumber > 0
    ? Math.round((discountType === 'percent' ? (subtotalLkr * discountNumber) / 100 : discountNumber) * 100) / 100
    : 0;
  const totalLkr = subtotalLkr - discountLkr;
  const usdSubtotal = lines.reduce((sum, l) => sum + (l.currency === 'USD' ? (Number(l.rate) || 0) * (Number(l.quantity) || 0) : 0), 0);
  const hasUsdLines = lines.some(l => l.currency === 'USD');

  const updateLine = (key: number, patch: Partial<Line>) => {
    setLines(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)));
    clearError('lines');
  };
  const moveLine = (index: number, by: -1 | 1) => {
    setLines(prev => {
      const next = [...prev];
      const [line] = next.splice(index, 1);
      next.splice(index + by, 0, line);
      return next;
    });
    unsaved.markDirty();
  };
  const addLine = (line: Line) => {
    setLines(prev => [...prev, line]);
    clearError('lines');
    unsaved.markDirty();
  };

  // ── Extra columns ──
  const addColumn = () => {
    if (extraColumns.length >= MAX_EXTRA_COLUMNS) return;
    setExtraColumns(prev => [...prev, '']);
    setLines(prev => prev.map(l => ({ ...l, extra: [...l.extra, ''] })));
    unsaved.markDirty();
  };
  const renameColumn = (index: number, label: string) => {
    setExtraColumns(prev => prev.map((c, i) => (i === index ? label : c)));
    clearError('columns');
  };
  const removeColumn = (index: number) => {
    setExtraColumns(prev => prev.filter((_, i) => i !== index));
    setLines(prev => prev.map(l => ({ ...l, extra: l.extra.filter((_, i) => i !== index) })));
    clearError('columns');
    unsaved.markDirty();
  };
  const blankExtra = () => extraColumns.map(() => '');

  const feeById = useMemo(() => new Map(feeItems.map(f => [f._id, f])), [feeItems]);
  // Fees for the chosen vessel code, plus fees that apply to every code.
  const applicableFees = useMemo(
    () => feeItems.filter(f => !f.vesselCodes?.length || (!!vesselCode && f.vesselCodes.includes(vesselCode))),
    [feeItems, vesselCode]
  );

  const feeMenuItems: (MenuItem | false)[] = (['survey', 'additional', 'transport'] as FeeCategory[]).flatMap((category, i) => {
    const inCategory = applicableFees.filter(f => f.category === category);
    if (inCategory.length === 0) return [];
    return [
      i > 0 ? ('separator' as const) : false,
      ...inCategory.map((f): MenuItem => ({
        label: `${f.name} · ${f.currency} ${formatRate(f.rate)}`,
        hint: FEE_CATEGORY_LABELS[category],
        onSelect: () => addLine(newLine({ feeItem: f._id, description: f.name, currency: f.currency, rate: String(f.rate), extra: blankExtra() })),
      })),
    ];
  });

  // ── Validation & save ──
  const validate = (): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!requestInfo) next.request = 'Choose the request to quote.';
    if (!vesselCode) next.vesselCode = 'Choose the vessel code.';
    if (extraColumns.some(c => !c.trim())) next.columns = 'Name every extra column, or remove it.';
    if (discountValue.trim() !== '') {
      if (!(discountNumber >= 0)) next.discount = 'Enter a discount of 0 or more.';
      else if (discountType === 'percent' && discountNumber > 100) next.discount = 'A percentage discount cannot exceed 100%.';
      else if (discountLkr > subtotalLkr) next.discount = 'The discount cannot be more than the subtotal.';
    }
    if (!quotationDate) next.quotationDate = 'Enter the quotation date.';
    if (!title.trim()) next.title = 'Enter a title.';
    if (!companyName.trim()) next.companyName = 'Enter the client company name.';
    if (!exchangeRate.trim() || !Number.isFinite(rateNumber) || rateNumber <= 0) next.exchangeRate = 'Enter the LKR rate for 1 USD.';
    if (lines.length === 0) {
      next.lines = 'Add at least one line.';
    } else {
      const bad = lines.findIndex(l => !l.description.trim() || l.rate.trim() === '' || Number(l.rate) < 0 || !(Number(l.quantity) > 0));
      if (bad >= 0) next.lines = `Line ${bad + 1} needs a description, a rate and a quantity above 0.`;
    }
    return next;
  };

  const save = async (status: 'draft' | 'sent') => {
    const found = validate();
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      toast.error('Some details are missing. They are highlighted below.');
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-field-error]');
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (first instanceof HTMLInputElement) first.focus({ preventScroll: true });
      });
      return;
    }
    if (savingRef.current || !requestInfo) return;
    savingRef.current = true;
    setSaving(status);

    const body: Omit<QuotationPayload, 'request' | 'revisedFrom' | 'status'> = {
      quotationDate,
      title: title.trim(),
      vesselName: vesselName.trim() || undefined,
      client: {
        companyName: companyName.trim(),
        address: address.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        email: email.trim() || undefined,
      },
      exchangeRate: rateNumber,
      vesselCode,
      extraColumns: extraColumns.map(c => c.trim()),
      lineItems: lines.map(l => ({
        feeItem: l.feeItem, description: l.description.trim(), currency: l.currency, rate: Number(l.rate), quantity: Number(l.quantity),
        extra: l.extra.map(v => v.trim()),
      })),
      discount: discountNumber > 0
        ? { type: discountType, value: discountNumber, description: discountDescription.trim() || undefined }
        : null,
      notes: notes.map(n => n.trim()).filter(Boolean),
      paymentTerms: paymentTerms.map(t => t.trim()).filter(Boolean),
      preparedByName: preparedByName.trim() || undefined,
      preparedByDesignation: preparedByDesignation.trim() || undefined,
    };

    try {
      let savedId: string;
      if (isEdit && id) {
        await quotationsService.updateQuotation(id, body);
        if (status === 'sent' && source?.status === 'draft') await quotationsService.updateStatus(id, 'sent');
        savedId = id;
        toast.success('Quotation saved.');
      } else {
        const res = await quotationsService.createQuotation({
          ...body, request: requestInfo.id, revisedFrom: revisingId || undefined, status,
        });
        savedId = res.data._id;
        toast.success(`Quotation ${res.data.quotationNumber} created.`);
      }
      unsaved.allowNavigation();
      navigate(`${listPath}/${savedId}`);
    } catch (err: any) {
      toast.error('Failed to save the quotation: ' + (err.message || 'unknown error'));
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  };

  if (loading) return <LoadingBlock label="Loading quotation…" />;

  const locked = isEdit && source && source.status !== 'draft' && source.status !== 'sent';
  const backHref = source ? `${listPath}/${source._id}` : `/${module || 'finance'}?tab=quotations`;

  const SECTIONS = [
    { id: 'qt-request', label: 'Job & vessel code', invalid: !!(errors.request || errors.vesselCode) },
    { id: 'qt-details', label: 'Client & details', invalid: !!(errors.title || errors.companyName || errors.exchangeRate || errors.quotationDate) },
    { id: 'qt-lines', label: 'Line items', invalid: !!(errors.lines || errors.columns || errors.discount) },
    { id: 'qt-notes', label: 'Notes & terms' },
  ];

  const heading = isEdit ? `Edit ${source?.quotationNumber ?? 'quotation'}` : revisingId ? 'Revise quotation' : 'New quotation';

  return (
    <div className="animate-in">
      <PageHeader
        back={{ href: backHref, label: source ? source.quotationNumber : 'Quotations' }}
        title={heading}
        description={revisingId && source
          ? `Revision of ${source.quotationNumber}. Saving gives it the next revision number and supersedes the open quotation.`
          : 'Price the request from the fee structure. Every value on a line can be changed for this quotation only.'}
        meta={isEdit && source ? <Badge tone="neutral">{revisionLabel(source.revision)}</Badge> : undefined}
      />

      {locked && (
        <p className={s.notice} role="status">
          This quotation is {source?.status} and can no longer be edited. Create a revision from the quotation page instead.
        </p>
      )}

      <FormWithNav nav={<SectionNav sections={SECTIONS} />}>
        <form onSubmit={e => { e.preventDefault(); save(isEdit ? (source?.status === 'sent' ? 'sent' : 'draft') : 'draft'); }} onChangeCapture={unsaved.markDirty} noValidate>
          <FormSection
            id="qt-request"
            title="Job & vessel code"
            description={isEdit || revisingId
              ? 'The job is fixed for this quotation. The vessel code decides which fees are offered.'
              : 'First choose the job, then the vessel code. Only jobs without a quotation are listed; to re-quote one, create a revision from its quotation.'}
          >
            <div className={s.narrow}>
              {isEdit || revisingId ? (
                <dl className={s.facts}>
                  <div><dt>Request no.</dt><dd>{requestInfo?.requestNumber || '—'}</dd></div>
                  <div><dt>Job no.</dt><dd>{requestInfo?.jobNumber || '—'}</dd></div>
                  {source && <div><dt>{revisingId ? 'Revising' : 'Quotation no.'}</dt><dd className={s.mono}>{source.quotationNumber}</dd></div>}
                </dl>
              ) : (
                <>
                  <SearchableSelect
                    label="Request"
                    required
                    value={requestInfo?.id || ''}
                    options={requestOptions}
                    placeholder={requestOptions.length ? 'Choose a request' : 'Every request has been quoted'}
                    searchPlaceholder="Search request no., job no., vessel or company…"
                    onChange={handleRequestChange}
                  />
                  {errors.request && <p className={s.fieldError} role="alert" data-field-error>{errors.request}</p>}
                </>
              )}
              <Field label="Vessel code" required error={errors.vesselCode} hint="Small Craft, Internal Waters Craft, Large Non-Convention Craft or Large Yacht">
                <Select
                  value={vesselCode}
                  disabled={!isEdit && !revisingId && !requestInfo}
                  onChange={e => { setVesselCode(e.target.value); clearError('vesselCode'); unsaved.markDirty(); }}
                >
                  <option value="">{!isEdit && !revisingId && !requestInfo ? 'Choose the job first' : 'Choose a vessel code'}</option>
                  {vesselCodes.map(vc => <option key={vc._id} value={vc.code}>{vc.code} - {vc.description}</option>)}
                </Select>
              </Field>
            </div>
          </FormSection>

          <FormSection id="qt-details" title="Client & details">
            <FormGrid columns={3}>
              <Field label="Quotation date" required error={errors.quotationDate}>
                <Input type="date" value={quotationDate} onChange={e => { setQuotationDate(e.target.value); clearError('quotationDate'); }} />
              </Field>
              <Field label="Vessel">
                <Input value={vesselName} onChange={e => setVesselName(e.target.value)} />
              </Field>
              <Field label="Conversion rate" required hint="LKR for 1 USD" error={errors.exchangeRate}>
                <Input type="number" inputMode="decimal" min={0} step="0.01" prefix="LKR" placeholder="e.g. 328.13" value={exchangeRate}
                  onChange={e => { setExchangeRate(e.target.value); clearError('exchangeRate'); }} />
              </Field>
              <Field label="Title" required full error={errors.title} hint="Printed in the box at the top of the quotation">
                <Input value={title} placeholder="QUOTATION FOR – VESSEL NAME" onChange={e => { setTitle(e.target.value); clearError('title'); }} />
              </Field>
              <Field label="Client company" required error={errors.companyName}>
                <Input value={companyName} onChange={e => { setCompanyName(e.target.value); clearError('companyName'); }} />
              </Field>
              <Field label="Contact person">
                <Input value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </Field>
              <Field label="Address" full hint="Printed under the client name; separate lines with commas">
                <Textarea rows={2} value={address} onChange={e => setAddress(e.target.value)} />
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection
            id="qt-lines"
            title="Line items"
            description="USD lines are converted to LKR with the conversion rate. LKR lines (e.g. transport) are added as they are."
            actions={
              <div className={s.inline}>
                <Menu
                  label="Add from fee structure"
                  align="end"
                  trigger={
                    <Button size="sm" icon={<ListPlus />} iconRight={<ChevronDown />} disabled={applicableFees.length === 0 || !vesselCode}
                      title={vesselCode ? undefined : 'Choose the vessel code first'}>
                      From fee structure
                    </Button>
                  }
                  items={feeMenuItems}
                />
                <Button size="sm" icon={<Plus />} onClick={() => addLine(newLine({ extra: blankExtra() }))}>Custom line</Button>
                <Button size="sm" icon={<Columns3 />} onClick={addColumn} disabled={extraColumns.length >= MAX_EXTRA_COLUMNS}
                  title={extraColumns.length >= MAX_EXTRA_COLUMNS ? `At most ${MAX_EXTRA_COLUMNS} extra columns` : undefined}>
                  Add column
                </Button>
              </div>
            }
          >
            {lines.length === 0 ? (
              <p className={s.emptyLines} data-field-error={errors.lines ? true : undefined}>
                No lines yet. Add fees from the fee structure, or a custom line.
              </p>
            ) : (
              <div className={s.lines} role="table" aria-label="Quotation lines"
                style={extraColumns.length ? ({ '--extra-cols': `repeat(${extraColumns.length}, minmax(72px, 96px))` } as React.CSSProperties) : undefined}>
                <div className={s.lineHead} role="row">
                  <span role="columnheader">#</span>
                  <span role="columnheader">Description</span>
                  {extraColumns.map((label, ci) => (
                    <span role="columnheader" key={ci} className={`${s.inline} ${s.columnEditor}`}>
                      <Input aria-label={`Column ${ci + 1} name`} placeholder="Column name" value={label}
                        aria-invalid={errors.columns && !label.trim() ? true : undefined}
                        onChange={e => renameColumn(ci, e.target.value)} />
                      <IconButton label={`Remove column ${label || ci + 1}`} icon={<X />} size="sm" variant="dangerGhost" onClick={() => removeColumn(ci)} />
                    </span>
                  ))}
                  <span role="columnheader">Currency</span>
                  <span role="columnheader">Rate</span>
                  <span role="columnheader">Qty</span>
                  <span role="columnheader" className={s.right}>Amount (LKR)</span>
                  <span role="columnheader"><span className="sr-only">Actions</span></span>
                </div>
                {lines.map((line, index) => {
                  const fee = line.feeItem ? feeById.get(line.feeItem) : undefined;
                  const changed = fee && (Number(line.rate) !== fee.rate || line.currency !== fee.currency);
                  return (
                    <div key={line.key} className={s.lineRow} role="row">
                      <span className={s.lineNo} role="cell">{String(index + 1).padStart(2, '0')}</span>
                      <div role="cell" className={s.lineDescription}>
                        <Input aria-label={`Line ${index + 1} description`} value={line.description}
                          onChange={e => updateLine(line.key, { description: e.target.value })} />
                        {fee && (
                          <span className={s.lineHint}>
                            Fee structure: {fee.currency} {formatRate(fee.rate)}
                            {fee.standardRate ? ` (standard ${formatRate(fee.standardRate)})` : ''} per {fee.unit}
                            {changed && <Badge tone="warning">Changed</Badge>}
                          </span>
                        )}
                      </div>
                      {extraColumns.map((label, ci) => (
                        <div role="cell" key={ci}>
                          <span className={s.mobileLabel}>{label || `Column ${ci + 1}`}</span>
                          <Input aria-label={`Line ${index + 1} ${label || `column ${ci + 1}`}`} value={line.extra[ci] ?? ''}
                            onChange={e => updateLine(line.key, { extra: extraColumns.map((_, i) => (i === ci ? e.target.value : line.extra[i] ?? '')) })} />
                        </div>
                      ))}
                      <div role="cell">
                        <span className={s.mobileLabel}>Currency</span>
                        <Select aria-label={`Line ${index + 1} currency`} value={line.currency}
                          onChange={e => updateLine(line.key, { currency: e.target.value as FeeCurrency })}>
                          <option value="USD">USD</option>
                          <option value="LKR">LKR</option>
                        </Select>
                      </div>
                      <div role="cell">
                        <span className={s.mobileLabel}>Rate</span>
                        <Input aria-label={`Line ${index + 1} rate`} type="number" inputMode="decimal" min={0} step="0.01" value={line.rate}
                          onChange={e => updateLine(line.key, { rate: e.target.value })} />
                      </div>
                      <div role="cell">
                        <span className={s.mobileLabel}>Qty</span>
                        <Input aria-label={`Line ${index + 1} quantity`} type="number" inputMode="decimal" min={0} step="1" value={line.quantity}
                          onChange={e => updateLine(line.key, { quantity: e.target.value })} />
                      </div>
                      <span role="cell" className={s.lineAmount}>
                        <span className={s.mobileLabel}>Amount (LKR)</span>
                        {formatMoney(lineAmounts[index])}
                      </span>
                      <div role="cell" className={s.lineActions}>
                        <IconButton label="Move up" icon={<ArrowUp />} size="sm" disabled={index === 0} onClick={() => moveLine(index, -1)} />
                        <IconButton label="Move down" icon={<ArrowDown />} size="sm" disabled={index === lines.length - 1} onClick={() => moveLine(index, 1)} />
                        <IconButton label={`Remove line ${index + 1}`} icon={<Trash2 />} size="sm" variant="dangerGhost"
                          onClick={() => { setLines(prev => prev.filter(l => l.key !== line.key)); unsaved.markDirty(); }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {errors.lines && <p className={s.fieldError} role="alert" data-field-error>{errors.lines}</p>}
            {errors.columns && <p className={s.fieldError} role="alert" data-field-error>{errors.columns}</p>}

            <h3 className={s.subheading}>
              <span className={s.inline}>
                Discount {!canDiscount && <Badge tone="neutral"><Lock aria-hidden="true" /> Technical Committee only</Badge>}
              </span>
            </h3>
            <FormGrid columns={3}>
              <Field label="Discount type">
                <Select value={discountType} disabled={!canDiscount}
                  onChange={e => { setDiscountType(e.target.value as DiscountType); clearError('discount'); }}>
                  <option value="percent">Percentage (%)</option>
                  <option value="amount">Amount (LKR)</option>
                </Select>
              </Field>
              <Field label={discountType === 'percent' ? 'Discount (%)' : 'Discount (LKR)'} error={errors.discount}>
                <Input type="number" inputMode="decimal" min={0} step="0.01" value={discountValue} disabled={!canDiscount}
                  placeholder="0" onChange={e => { setDiscountValue(e.target.value); clearError('discount'); }} />
              </Field>
              <Field label="Reason / label" hint="Printed next to the discount">
                <Input value={discountDescription} disabled={!canDiscount} placeholder="e.g. Repeat client"
                  onChange={e => setDiscountDescription(e.target.value)} />
              </Field>
            </FormGrid>

            <div className={s.totals}>
              {hasUsdLines && (
                <span className={s.muted}>
                  USD lines: USD {formatMoney(usdSubtotal)} × {Number.isFinite(rateNumber) && rateNumber > 0 ? formatRate(rateNumber) : '—'}
                </span>
              )}
              {discountLkr > 0 && (
                <span className={s.muted}>
                  Subtotal LKR {formatMoney(subtotalLkr)} − discount LKR {formatMoney(discountLkr)}
                </span>
              )}
              <span className={s.totalLabel}>Total</span>
              <strong className={s.totalValue}>LKR {formatMoney(totalLkr)}</strong>
            </div>
          </FormSection>

          <FormSection id="qt-notes" title="Notes & payment terms" description="Printed under the line items. Empty lines are left out.">
            <TextListEditor label="Note" items={notes} onChange={v => { setNotes(v); unsaved.markDirty(); }} numbered />
            <h3 className={s.subheading}>Payment terms</h3>
            <TextListEditor label="Payment term" items={paymentTerms} onChange={v => { setPaymentTerms(v); unsaved.markDirty(); }} />
            <h3 className={s.subheading}>Prepared by</h3>
            <p className={s.muted}>
              After saving, the preparer e-signs the quotation from its page. Editing a signed quotation removes the signature.
            </p>
            <FormGrid columns={2}>
              <Field label="Name">
                <Input value={preparedByName} onChange={e => setPreparedByName(e.target.value)} />
              </Field>
              <Field label="Designation">
                <Input value={preparedByDesignation} placeholder="e.g. Junior Marine Engineer" onChange={e => setPreparedByDesignation(e.target.value)} />
              </Field>
            </FormGrid>
          </FormSection>

          <StickyActionBar dirty={unsaved.dirty} status={<span>Total LKR {formatMoney(totalLkr)}</span>}>
            <ButtonLink to={backHref}>Cancel</ButtonLink>
            {isEdit ? (
              <>
                {source?.status === 'draft' && (
                  <Button onClick={() => save('sent')} loading={saving === 'sent'} disabled={!canSave || !!locked || !!saving}>Save & mark sent</Button>
                )}
                <Button type="submit" variant="primary" loading={saving === 'draft'} disabled={!canSave || !!locked || !!saving}
                  title={canSave ? undefined : 'You do not have permission to edit quotations.'}>
                  Save changes
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => save('sent')} loading={saving === 'sent'} disabled={!canSave || !!saving}>Save & mark sent</Button>
                <Button type="submit" variant="primary" loading={saving === 'draft'} disabled={!canSave || !!saving}
                  title={canSave ? undefined : 'You do not have permission to create quotations.'}>
                  Save draft
                </Button>
              </>
            )}
          </StickyActionBar>
        </form>
      </FormWithNav>

      {unsaved.dialog}
    </div>
  );
}

/** Editable list of text lines (notes, payment terms) with add and remove. */
function TextListEditor({ label, items, onChange, numbered }: { label: string; items: string[]; onChange: (items: string[]) => void; numbered?: boolean }) {
  return (
    <div className={s.textList}>
      {items.map((item, index) => (
        <div key={index} className={s.textListRow}>
          <span className={s.textListMarker} aria-hidden="true">{numbered ? `${index + 1}.` : '•'}</span>
          <Textarea aria-label={`${label} ${index + 1}`} rows={2} value={item}
            onChange={e => onChange(items.map((v, i) => (i === index ? e.target.value : v)))} />
          <IconButton label={`Remove ${label.toLowerCase()} ${index + 1}`} icon={<Trash2 />} size="sm" variant="dangerGhost"
            onClick={() => onChange(items.filter((_, i) => i !== index))} />
        </div>
      ))}
      <div>
        <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => onChange([...items, ''])}>Add {label.toLowerCase()}</Button>
      </div>
    </div>
  );
}
