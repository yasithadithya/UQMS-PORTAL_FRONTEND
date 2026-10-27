import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Inbox, Settings2, ShieldAlert, UserCheck } from 'lucide-react';
import {
  Badge, Button, Checkbox, DataTable, Drawer, Field, FormGrid, FormSection, Input, Modal, PageHeader, SearchInput, Select, Tabs, Textarea, Toolbar,
  type Column,
} from '@/ui';
import SearchableSelect from '@/components/SearchableSelect';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import { jobsService, operationsService, vesselCodesService } from '@/api';
import type {
  ApiAllocatableSurveyor, ApiAllocationQueueItem, ApiAreaOfOperation, ApiJob, ApiSurveyType, ApiVesselCode, ApiVesselType,
} from '@/api';
import {
  MAIN_SURVEY_TYPE_LABELS, MAIN_TYPES_BY_SECTOR, MARINE_MAIN_TYPES, INDUSTRIAL_MAIN_TYPES, type MainSurveyType, type Sector,
} from '@/config/surveyCategories';
import { JobStatusBadge, Notice, mainTypeLabel, personName, useModulePath } from './shared';
import s from './v2.module.css';

const idOf = (v: unknown): string => (v && typeof v === 'object' ? String((v as { _id?: string })._id ?? '') : String(v ?? ''));

const REQUEST_FIELDS = [
  ['vesselName', 'Vessel name'], ['imoNumber', 'IMO number'], ['mmsiNumber', 'MMSI number'], ['companyName', 'Company'],
  ['contactPersonName', 'Contact person'], ['contactPersonNumber', 'Contact number'], ['companyEmail', 'Company email'],
] as const;

type RequestEdits = Record<string, string>;

function AllocationForm({
  request, surveyTypes, surveyors, vesselTypes, areas, vesselCodes, canOverrideMss, onClose, onDone,
}: {
  request: ApiAllocationQueueItem;
  surveyTypes: ApiSurveyType[];
  surveyors: ApiAllocatableSurveyor[];
  vesselTypes: ApiVesselType[];
  areas: ApiAreaOfOperation[];
  vesselCodes: ApiVesselCode[];
  canOverrideMss: boolean;
  onClose: () => void;
  onDone: (job: ApiJob) => void;
}) {
  const requestTypeIds = (request.surveyTypes || []).map(idOf);
  const requestTypes = surveyTypes.filter(t => requestTypeIds.includes(t._id));
  const guessedMain = (requestTypes.find(t => t.mainType)?.mainType as MainSurveyType | undefined)
    ?? (request.sector === 'industrial' ? 'industrial-survey' : 'first-entry');

  const [sector, setSector] = useState<Sector>(request.sector || 'marine');
  const [mainType, setMainType] = useState<MainSurveyType>(guessedMain);
  const [subTypes, setSubTypes] = useState<string[]>(requestTypeIds);
  const [surveyorId, setSurveyorId] = useState('');
  const [assistantIds, setAssistantIds] = useState<string[]>([]);
  const [mssProofRequired, setMssProofRequired] = useState(true);
  const [edits, setEdits] = useState<RequestEdits>(() => ({
    ...Object.fromEntries(REQUEST_FIELDS.map(([k]) => [k, String((request as any)[k] ?? '')])),
    vesselCode: request.vesselCode ?? '',
    vesselType: idOf(request.vesselType),
    areaOfOperation: idOf(request.areaOfOperation),
    invoicingAddress: request.invoicingAddress ?? '',
    registerdAddress: (request as any).registerdAddress ?? '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeSector = (next: Sector) => {
    setSector(next);
    if (!MAIN_TYPES_BY_SECTOR[next].includes(mainType)) setMainType(MAIN_TYPES_BY_SECTOR[next][0]);
  };

  // Sub types offered: those mapped to the main type, plus unmapped ones (until the mapping is complete).
  const subTypeOptions = surveyTypes
    .filter(t => (!t.mainType || t.mainType === mainType) && (!t.sector || t.sector === 'both' || t.sector === sector))
    .map(t => ({ id: t._id, label: `${t.code} · ${t.name}${t.mainType ? '' : ' (unmapped)'}` }));
  const leadOptions = surveyors.filter(u => u.roleName === 'surveyor').map(u => ({ id: u._id, label: personName(u) }));
  const assistantOptions = surveyors.filter(u => u._id !== surveyorId).map(u => ({
    id: u._id, label: `${personName(u)} (${u.roleName === 'surveyor' ? 'Surveyor' : 'Assistant'})`,
  }));

  const submit = async () => {
    setError(null);
    if (!surveyorId) return setError('Select the lead surveyor.');
    if (subTypes.length === 0) return setError('Select at least one survey.');
    setSaving(true);
    try {
      const res = await jobsService.allocate({
        requestId: request._id,
        mainSurveyType: mainType,
        surveyTypeIds: subTypes.filter(id => subTypeOptions.some(o => o.id === id)),
        surveyorId,
        assistantSurveyorIds: assistantIds.filter(id => id !== surveyorId),
        mssProofRequired,
        request: edits,
      });
      toast.success(res.message || 'Job allocated.');
      onDone(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (k: string) => (e: { target: { value: string } }) => setEdits(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Allocate ${request.jobNumber || request.requestNumber}`}
      description={`${request.vesselName} · quotation ${request.acceptedQuotationNumber ?? '—'} accepted`}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" icon={<UserCheck />} onClick={submit} loading={saving}>Allocate & issue UQMS number</Button>
        </>
      }
    >
      <div className={s.stack}>
        {error && <Notice tone="danger">{error}</Notice>}

        <FormSection title="Survey" description="The main survey type decides the reporting workspace the surveyor uses.">
          <FormGrid columns={2}>
            <Field label="Sector" required>
              <Select value={sector} onChange={e => changeSector(e.target.value as Sector)}>
                <option value="marine">Marine</option>
                <option value="industrial">Industrial</option>
              </Select>
            </Field>
            <Field label="Main survey type" required>
              <Select value={mainType} onChange={e => setMainType(e.target.value as MainSurveyType)}>
                {(sector === 'marine' ? MARINE_MAIN_TYPES : INDUSTRIAL_MAIN_TYPES).map(t => (
                  <option key={t} value={t}>{MAIN_SURVEY_TYPE_LABELS[t]}</option>
                ))}
              </Select>
            </Field>
          </FormGrid>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <SearchableMultiSelect label="Surveys (sub types)" required value={subTypes} options={subTypeOptions} onChange={setSubTypes} placeholder="Choose surveys" />
          </div>
        </FormSection>

        <FormSection title="Surveyors">
          <FormGrid columns={2}>
            <SearchableSelect label="Lead surveyor" required value={surveyorId} options={leadOptions} onChange={setSurveyorId} placeholder="Choose a surveyor" />
            <SearchableMultiSelect label="Assistant surveyors" value={assistantIds} options={assistantOptions} onChange={setAssistantIds} placeholder="Optional" />
          </FormGrid>
          {leadOptions.length === 0 && (
            <p className={s.hint} style={{ marginTop: 'var(--space-2)' }}>No users have the Surveyor role yet. Assign roles under Admin → Users.</p>
          )}
        </FormSection>

        <FormSection title="MSS proof">
          <Checkbox
            label="MSS proof required"
            description={canOverrideMss
              ? 'The surveyor must upload the MSS proof in the code-specific Schedule II (e.g. SSC Schedule II) before submitting or signing.'
              : 'Only users with override access can turn this off.'}
            checked={mssProofRequired}
            disabled={!canOverrideMss}
            onChange={e => setMssProofRequired(e.target.checked)}
          />
        </FormSection>

        <FormSection title="Request details" description="Correct anything that came in wrong on the request.">
          <FormGrid columns={2}>
            {REQUEST_FIELDS.map(([key, label]) => (
              <Field key={key} label={label}><Input value={edits[key]} onChange={set(key)} /></Field>
            ))}
            <Field label="Vessel code">
              <Select value={edits.vesselCode} onChange={set('vesselCode')} placeholder="Choose">
                {vesselCodes.map(c => <option key={c._id} value={c.code}>{c.code}</option>)}
              </Select>
            </Field>
            <Field label="Vessel type">
              <Select value={edits.vesselType} onChange={set('vesselType')} placeholder="Choose">
                {vesselTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Area of operation">
              <Select value={edits.areaOfOperation} onChange={set('areaOfOperation')} placeholder="Choose">
                {areas.map(a => <option key={a._id} value={a._id}>{a.AreaCategory} · {a.description}</option>)}
              </Select>
            </Field>
            <Field label="Registered address" full><Textarea rows={2} value={edits.registerdAddress} onChange={set('registerdAddress')} /></Field>
            <Field label="Invoicing address" full><Textarea rows={2} value={edits.invoicingAddress} onChange={set('invoicingAddress')} /></Field>
          </FormGrid>
        </FormSection>
      </div>
    </Modal>
  );
}

/** Master data: which main survey type each survey (sub type) belongs to. */
function SurveyTypeMappingDrawer({ surveyTypes, onClose, onSaved }: { surveyTypes: ApiSurveyType[]; onClose: () => void; onSaved: (t: ApiSurveyType) => void }) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const save = async (t: ApiSurveyType, patch: { mainType?: string | null; sector?: string }) => {
    setSavingId(t._id);
    try {
      const res = await jobsService.setSurveyTypeMapping(t._id, patch);
      onSaved(res.data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingId(null);
    }
  };
  return (
    <Drawer open onClose={onClose} width={620} title="Survey type mapping" description="Group each survey under its main survey type. Unmapped surveys can be chosen under any main type.">
      <ul className={s.history}>
        {surveyTypes.map(t => (
          <li key={t._id} style={{ alignItems: 'center' }}>
            <span style={{ flex: '1 1 200px' }}><span className={s.mono}>{t.code}</span> {t.name}</span>
            <Select aria-label={`Main type for ${t.name}`} value={t.mainType ?? ''} disabled={savingId === t._id}
              onChange={e => save(t, { mainType: e.target.value || null })} style={{ width: 190 }}>
              <option value="">Not mapped</option>
              {[...MARINE_MAIN_TYPES, ...INDUSTRIAL_MAIN_TYPES].map(m => (
                <option key={m} value={m}>{(INDUSTRIAL_MAIN_TYPES as readonly string[]).includes(m) ? 'Industrial · ' : ''}{MAIN_SURVEY_TYPE_LABELS[m]}</option>
              ))}
            </Select>
            <Select aria-label={`Sector for ${t.name}`} value={t.sector ?? 'marine'} disabled={savingId === t._id}
              onChange={e => save(t, { sector: e.target.value })} style={{ width: 130 }}>
              <option value="marine">Marine</option>
              <option value="industrial">Industrial</option>
              <option value="both">Both</option>
            </Select>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}

export default function SurveyorAllocationPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const pathFor = useModulePath();
  const [tab, setTab] = useState<'queue' | 'allocated'>('queue');
  const [search, setSearch] = useState('');
  const [queue, setQueue] = useState<ApiAllocationQueueItem[]>([]);
  const [allocated, setAllocated] = useState<ApiJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApiAllocationQueueItem | null>(null);
  const [showMapping, setShowMapping] = useState(false);

  const [surveyTypes, setSurveyTypes] = useState<ApiSurveyType[]>([]);
  const [surveyors, setSurveyors] = useState<ApiAllocatableSurveyor[]>([]);
  const [vesselTypes, setVesselTypes] = useState<ApiVesselType[]>([]);
  const [areas, setAreas] = useState<ApiAreaOfOperation[]>([]);
  const [vesselCodes, setVesselCodes] = useState<ApiVesselCode[]>([]);

  const canAllocate = can(MODULE_KEYS.surveyorAllocation, 'create');
  const canOverrideMss = can(MODULE_KEYS.surveyorAllocation, 'override');
  const canMap = can(MODULE_KEYS.adminMasterData, 'update');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'queue') {
        const res = await jobsService.getAllocationQueue(search.trim() || undefined);
        setQueue(res.data);
      } else {
        const res = await jobsService.getJobs({ status: 'allocated,booked', search: search.trim() || undefined, limit: 100 });
        setAllocated(res.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    Promise.all([
      operationsService.getSurveyTypes(), jobsService.getSurveyors(), operationsService.getVesselTypes(),
      operationsService.getAreaOperations(), vesselCodesService.getVesselCodes(),
    ]).then(([st, su, vt, ar, vc]) => {
      setSurveyTypes(st.data);
      setSurveyors(su.data);
      setVesselTypes(vt.data);
      setAreas(ar.data);
      setVesselCodes(vc.data);
    }).catch((err: any) => toast.error('Could not load lookups: ' + err.message));
  }, []);

  const unmappedCount = useMemo(() => surveyTypes.filter(t => !t.mainType).length, [surveyTypes]);

  const queueColumns: Column<ApiAllocationQueueItem>[] = [
    { key: 'job', header: 'Job / request', primary: true, cell: r => (
      <span className={s.cellStack}><span className={s.strong}>{r.jobNumber || '—'}</span><span className={s.muted}>{r.requestNumber}</span></span>
    ) },
    { key: 'vessel', header: 'Vessel', cell: r => (
      <span className={s.cellStack}><span>{r.vesselName}</span><span className={s.muted}>{[r.vesselCode, r.imoNumber].filter(Boolean).join(' · ')}</span></span>
    ) },
    { key: 'company', header: 'Company', hideOnMobile: true, cell: r => r.companyName },
    { key: 'sector', header: 'Sector', cell: r => <Badge tone={r.sector === 'industrial' ? 'accent' : 'info'}>{r.sector === 'industrial' ? 'Industrial' : 'Marine'}</Badge> },
    { key: 'surveys', header: 'Surveys', hideOnMobile: true, cell: r => (r.surveyTypes || []).map(t => (typeof t === 'object' ? t.code : t)).join(', ') },
    { key: 'quote', header: 'Quotation', hideOnMobile: true, cell: r => <span className={s.mono}>{r.acceptedQuotationNumber ?? '—'}</span> },
  ];

  const allocatedColumns: Column<ApiJob>[] = [
    { key: 'job', header: 'Job', primary: true, cell: j => (
      <span className={s.cellStack}><span className={s.strong}>{j.jobNumber || j.requestNumber}</span><span className={s.muted}>{j.uqmsNumber}</span></span>
    ) },
    { key: 'vessel', header: 'Vessel', cell: j => j.vesselName },
    { key: 'type', header: 'Main type', cell: j => mainTypeLabel(j.mainSurveyType) },
    { key: 'surveyor', header: 'Surveyor', cell: j => personName(j.surveyor) },
    { key: 'status', header: 'Status', cell: j => <JobStatusBadge status={j.status} /> },
  ];

  return (
    <div className="animate-in">
      <PageHeader
        title="Surveyor Allocation"
        description="Requests whose quotation was accepted. Allocate a surveyor, confirm the survey type and issue the UQMS number."
        actions={canMap && <Button icon={<Settings2 />} onClick={() => setShowMapping(true)}>Survey type mapping{unmappedCount ? ` (${unmappedCount} unmapped)` : ''}</Button>}
      />

      {!canAllocate && (
        <Notice tone="warning" icon={<ShieldAlert />}>You can view the queue but not allocate surveyors.</Notice>
      )}

      <Tabs
        label="Allocation"
        value={tab}
        onValueChange={v => setTab(v)}
        items={[{ value: 'queue', label: 'Awaiting allocation', count: tab === 'queue' ? queue.length : undefined }, { value: 'allocated', label: 'Allocated, not started' }]}
      />

      <Toolbar attached search={<SearchInput value={search} onChange={setSearch} placeholder="Search vessel, job, request or company…" />} />

      {tab === 'queue' ? (
        <DataTable
          attached
          columns={queueColumns}
          rows={queue}
          getRowId={r => r._id}
          loading={loading}
          error={error}
          onRetry={load}
          onRowClick={canAllocate ? r => setSelected(r) : undefined}
          rowActions={canAllocate ? r => <Button size="sm" variant="primary" onClick={() => setSelected(r)}>Allocate</Button> : undefined}
          empty={{ icon: <Inbox />, title: 'Nothing to allocate', description: 'Requests appear here once their quotation is accepted.' }}
        />
      ) : (
        <DataTable
          attached
          columns={allocatedColumns}
          rows={allocated}
          getRowId={j => j._id}
          loading={loading}
          error={error}
          onRetry={load}
          onRowClick={j => navigate(`${pathFor(MODULE_KEYS.jobs)}/${j._id}`)}
          empty={{ title: 'No jobs waiting to start' }}
        />
      )}

      {selected && (
        <AllocationForm
          request={selected}
          surveyTypes={surveyTypes}
          surveyors={surveyors}
          vesselTypes={vesselTypes}
          areas={areas}
          vesselCodes={vesselCodes}
          canOverrideMss={canOverrideMss}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null);
            load();
          }}
        />
      )}

      {showMapping && (
        <SurveyTypeMappingDrawer
          surveyTypes={surveyTypes}
          onClose={() => setShowMapping(false)}
          onSaved={t => setSurveyTypes(prev => prev.map(p => (p._id === t._id ? { ...p, ...t } : p)))}
        />
      )}
    </div>
  );
}
