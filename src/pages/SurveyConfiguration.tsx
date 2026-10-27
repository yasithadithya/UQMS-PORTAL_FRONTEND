import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AlertTriangle, ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Badge, Button, Checkbox, ConfirmDialog, DataTable, Drawer, Field, FormGrid, IconButton, Input, PageHeader, SearchInput, Section,
  Select, Tabs, Textarea, Toolbar, type Column,
} from '@/ui';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import { operationsService, type SurveyTypeUsage } from '@/api/services/operations.service';
import type { ApiSurveyType } from '@/api';
import {
  ALL_MAIN_TYPES, IMPLEMENTED_MAIN_TYPES, INDUSTRIAL_MAIN_TYPES, MAIN_SURVEY_TYPE_LABELS, MARINE_MAIN_TYPES,
  mainTypeFullLabel, mainTypesForSector, type MainSurveyType, type SubTypeSector,
} from '@/config/surveyCategories';
import s from './SurveyConfiguration.module.css';

const SECTOR_LABELS: Record<SubTypeSector, string> = { marine: 'Marine', industrial: 'Industrial', both: 'Marine & industrial' };

const UNMAPPED = 'unmapped';

type Draft = { code: string; name: string; description: string; sector: SubTypeSector; mainTypes: MainSurveyType[] };

const emptyDraft: Draft = { code: '', name: '', description: '', sector: 'marine', mainTypes: [] };

const toDraft = (t: ApiSurveyType): Draft => ({
  code: t.code,
  name: t.name,
  description: t.description ?? '',
  sector: t.sector ?? 'marine',
  mainTypes: (t.mainTypes ?? []) as MainSurveyType[],
});

const mainTypesOf = (t: ApiSurveyType) => (t.mainTypes ?? []) as MainSurveyType[];

/** Create / edit a survey sub type and choose every main survey type it belongs to. */
function SurveyTypeDrawer({
  surveyType, canEdit, onClose, onSaved,
}: {
  surveyType: ApiSurveyType | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (t: ApiSurveyType) => void;
}) {
  const isNew = !surveyType;
  const [draft, setDraft] = useState<Draft>(() => (surveyType ? toDraft(surveyType) : emptyDraft));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = mainTypesForSector(draft.sector);

  const setSector = (sector: SubTypeSector) => {
    const keep = mainTypesForSector(sector);
    setDraft(d => ({ ...d, sector, mainTypes: d.mainTypes.filter(m => keep.includes(m)) }));
  };

  const toggleMain = (m: MainSurveyType, on: boolean) =>
    setDraft(d => ({ ...d, mainTypes: on ? [...d.mainTypes, m] : d.mainTypes.filter(x => x !== m) }));

  const save = async () => {
    setError(null);
    if (!draft.code.trim()) return setError('Enter a code.');
    if (!draft.name.trim()) return setError('Enter a name.');
    setSaving(true);
    try {
      // Keep main types in the standard order.
      const body = { ...draft, mainTypes: ALL_MAIN_TYPES.filter(m => draft.mainTypes.includes(m)) };
      const res = isNew
        ? await operationsService.createSurveyType(body)
        : await operationsService.updateSurveyType(surveyType._id, body);
      toast.success(res.message || 'Survey type saved.');
      onSaved(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const group = (label: string, types: readonly MainSurveyType[]) => {
    const offered = types.filter(m => allowed.includes(m));
    if (offered.length === 0) return null;
    return (
      <fieldset className={s.mainTypeGroup}>
        <legend>{label}</legend>
        {offered.map(m => (
          <Checkbox
            key={m}
            label={MAIN_SURVEY_TYPE_LABELS[m]}
            description={IMPLEMENTED_MAIN_TYPES.includes(m) ? undefined : 'Reporting workspace coming in a later version'}
            checked={draft.mainTypes.includes(m)}
            disabled={!canEdit}
            onChange={e => toggleMain(m, e.target.checked)}
          />
        ))}
      </fieldset>
    );
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width={520}
      title={isNew ? 'New survey type' : `${surveyType.code} · ${surveyType.name}`}
      description="A survey type can belong to more than one main survey type. It is offered at Surveyor Booking under each one ticked here."
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>{canEdit ? 'Cancel' : 'Close'}</Button>
          {canEdit && <Button variant="primary" onClick={save} loading={saving}>{isNew ? 'Create' : 'Save'}</Button>}
        </>
      }
    >
      <div className={s.stack}>
        {error && <Badge tone="danger" icon={<AlertTriangle />}>{error}</Badge>}
        <FormGrid columns={2}>
          <Field label="Code" required>
            <Input value={draft.code} disabled={!canEdit} onChange={e => setDraft(d => ({ ...d, code: e.target.value }))} placeholder="e.g. ST01" />
          </Field>
          <Field label="Sector" required hint="Which sector offers this survey.">
            <Select value={draft.sector} disabled={!canEdit} onChange={e => setSector(e.target.value as SubTypeSector)}>
              <option value="marine">Marine</option>
              <option value="industrial">Industrial</option>
              <option value="both">Marine & industrial</option>
            </Select>
          </Field>
          <Field label="Name" required full>
            <Input value={draft.name} disabled={!canEdit} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Annual Survey" />
          </Field>
          <Field label="Description" full>
            <Textarea rows={2} value={draft.description} disabled={!canEdit} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
          </Field>
        </FormGrid>

        <div className={s.stack}>
          <div>
            <strong>Main survey types</strong>
            <p className={s.hint}>
              {draft.mainTypes.length === 0
                ? 'None selected: the survey stays unmapped and can be picked under any main type until it is mapped.'
                : `Belongs to ${draft.mainTypes.length} main survey type${draft.mainTypes.length === 1 ? '' : 's'}.`}
            </p>
          </div>
          {group('Marine', MARINE_MAIN_TYPES)}
          {group('Industrial', INDUSTRIAL_MAIN_TYPES)}
        </div>
      </div>
    </Drawer>
  );
}

export default function SurveyConfigurationPage() {
  const { can } = useAuth();
  const canCreate = can(MODULE_KEYS.adminSurveyConfig, 'create');
  const canUpdate = can(MODULE_KEYS.adminSurveyConfig, 'update');
  const canDelete = can(MODULE_KEYS.adminSurveyConfig, 'delete');

  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'main-types' ? 'main-types' : 'survey-types';
  const setTab = (next: 'survey-types' | 'main-types') => setParams(p => {
    const n = new URLSearchParams(p);
    n.set('tab', next);
    return n;
  }, { replace: true });

  const [types, setTypes] = useState<ApiSurveyType[]>([]);
  const [usage, setUsage] = useState<SurveyTypeUsage>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mainFilter, setMainFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [editing, setEditing] = useState<ApiSurveyType | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ApiSurveyType | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, used] = await Promise.all([operationsService.getSurveyTypes(), operationsService.getSurveyTypeUsage()]);
      setTypes(list.data);
      setUsage(used.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unmapped = useMemo(() => types.filter(t => mainTypesOf(t).length === 0), [types]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return types.filter(t => {
      if (q && !`${t.code} ${t.name} ${t.description ?? ''}`.toLowerCase().includes(q)) return false;
      if (sectorFilter && (t.sector ?? 'marine') !== sectorFilter) return false;
      if (mainFilter === UNMAPPED) return mainTypesOf(t).length === 0;
      if (mainFilter) return mainTypesOf(t).includes(mainFilter as MainSurveyType);
      return true;
    });
  }, [types, search, sectorFilter, mainFilter]);

  const usageOf = (t: ApiSurveyType) => usage[t._id];
  const inUse = (t: ApiSurveyType) => {
    const u = usageOf(t);
    return !!u && u.requests + u.jobs + u.checklistQuestions > 0;
  };

  const onSaved = (saved: ApiSurveyType) => {
    setTypes(prev => {
      const exists = prev.some(p => p._id === saved._id);
      const next = exists ? prev.map(p => (p._id === saved._id ? saved : p)) : [...prev, saved];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const res = await operationsService.deleteSurveyType(deleting._id);
      toast.success(res.message || 'Survey type deleted.');
      setTypes(prev => prev.filter(p => p._id !== deleting._id));
      setDeleting(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns: Column<ApiSurveyType>[] = [
    { key: 'code', header: 'Code', width: 100, nowrap: true, cell: t => <span className={s.mono}>{t.code}</span> },
    { key: 'name', header: 'Survey type', primary: true, cell: t => (
      <span className={s.cellStack}>
        <span>{t.name}</span>
        {t.description && <span className={s.muted}>{t.description}</span>}
      </span>
    ) },
    { key: 'sector', header: 'Sector', hideOnMobile: true, nowrap: true, cell: t => (
      <Badge tone={t.sector === 'industrial' ? 'accent' : t.sector === 'both' ? 'neutral' : 'info'}>{SECTOR_LABELS[t.sector ?? 'marine']}</Badge>
    ) },
    { key: 'main', header: 'Main survey types', cell: t => {
      const mains = mainTypesOf(t);
      if (mains.length === 0) return <Badge tone="warning" dot>Not mapped</Badge>;
      return <span className={s.badges}>{mains.map(m => <Badge key={m}>{mainTypeFullLabel(m)}</Badge>)}</span>;
    } },
    { key: 'usage', header: 'Used by', hideOnMobile: true, cell: t => {
      const u = usageOf(t);
      if (!u) return <span className={s.muted}>Not used</span>;
      return (
        <span className={s.muted}>
          {[u.requests && `${u.requests} requests`, u.jobs && `${u.jobs} jobs`, u.checklistQuestions && `${u.checklistQuestions} checklist`]
            .filter(Boolean).join(' · ')}
        </span>
      );
    } },
  ];

  /* "By main survey type" view: one card per main type listing its survey types. */
  const byMainType = (sectorLabel: string, mains: readonly MainSurveyType[]) => (
    <>
      <h2 className={s.sectorHeading}>{sectorLabel}</h2>
      <div className={s.cards}>
        {mains.map(m => {
          const members = types.filter(t => mainTypesOf(t).includes(m));
          return (
            <Section
              key={m}
              title={MAIN_SURVEY_TYPE_LABELS[m]}
              description={`${members.length} survey type${members.length === 1 ? '' : 's'}${IMPLEMENTED_MAIN_TYPES.includes(m) ? '' : ' · workspace coming later'}`}
            >
              {members.length === 0 ? (
                <p className={s.hint}>No survey types yet. Tick this main type on a survey type to add it.</p>
              ) : (
                <ul className={s.list}>
                  {members.map(t => (
                    <li key={t._id}>
                      <span className={s.mono}>{t.code}</span>
                      <button type="button" onClick={() => setEditing(t)}>{t.name}</button>
                      {mainTypesOf(t).length > 1 && (
                        <span className={s.muted}>+{mainTypesOf(t).length - 1} more</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="animate-in">
      <PageHeader
        title="Survey Configuration"
        description="Survey types (sub types) and the main survey types they belong to. One survey type can sit under several main types, for example Annual Survey under both First Entry and New Constructions."
        actions={canCreate && <Button variant="primary" icon={<Plus />} onClick={() => setEditing('new')}>New survey type</Button>}
      />

      {!loading && unmapped.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Badge tone="warning" icon={<AlertTriangle />}>
            {unmapped.length} survey type{unmapped.length === 1 ? ' is' : 's are'} not mapped to a main survey type yet.
          </Badge>
          {' '}
          <Button size="sm" variant="ghost" onClick={() => { setTab('survey-types'); setMainFilter(UNMAPPED); }}>Show them</Button>
        </div>
      )}

      <Tabs
        label="Survey configuration"
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'survey-types', label: 'Survey types', count: types.length || undefined },
          { value: 'main-types', label: 'By main survey type' },
        ]}
      />

      {tab === 'survey-types' ? (
        <>
          <Toolbar
            attached
            search={<SearchInput value={search} onChange={setSearch} placeholder="Search code, name or description…" />}
            filters={
              <>
                <Select aria-label="Main survey type" value={mainFilter} onChange={e => setMainFilter(e.target.value)}>
                  <option value="">All main types</option>
                  <option value={UNMAPPED}>Not mapped</option>
                  {ALL_MAIN_TYPES.map(m => <option key={m} value={m}>{mainTypeFullLabel(m)}</option>)}
                </Select>
                <Select aria-label="Sector" value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}>
                  <option value="">All sectors</option>
                  <option value="marine">Marine</option>
                  <option value="industrial">Industrial</option>
                  <option value="both">Marine & industrial</option>
                </Select>
              </>
            }
          />
          <DataTable
            attached
            columns={columns}
            rows={filtered}
            getRowId={t => t._id}
            loading={loading}
            error={error}
            onRetry={load}
            onRowClick={t => setEditing(t)}
            rowActions={t => (
              <>
                <IconButton label={canUpdate ? `Edit ${t.name}` : `View ${t.name}`} icon={<Pencil />} size="sm" variant="ghost" onClick={() => setEditing(t)} />
                {canDelete && (
                  <IconButton
                    label={inUse(t) ? `${t.name} is in use and cannot be deleted` : `Delete ${t.name}`}
                    icon={<Trash2 />}
                    size="sm"
                    variant="dangerGhost"
                    disabled={inUse(t)}
                    onClick={() => setDeleting(t)}
                  />
                )}
              </>
            )}
            empty={{
              icon: <ClipboardList />,
              title: types.length ? 'No survey types match' : 'No survey types yet',
              description: types.length ? 'Try a different search or filter.' : 'Create the first survey type to get started.',
            }}
          />
        </>
      ) : (
        <div className={s.stack} style={{ marginTop: 'var(--space-4)' }}>
          {byMainType('Marine', MARINE_MAIN_TYPES)}
          {byMainType('Industrial', INDUSTRIAL_MAIN_TYPES)}
        </div>
      )}

      {editing && (
        <SurveyTypeDrawer
          surveyType={editing === 'new' ? null : editing}
          canEdit={editing === 'new' ? canCreate : canUpdate}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete survey type?"
        message={deleting ? `${deleting.code} · ${deleting.name} will be removed. This cannot be undone.` : ''}
        confirmText="Delete"
        destructive
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
