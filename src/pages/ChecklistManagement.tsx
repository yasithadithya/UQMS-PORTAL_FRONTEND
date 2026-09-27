import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import {
  checklistQuestionsService,
  operationsService,
  vesselCodesService,
  type ApiChecklistQuestion,
  type ApiSurveyType,
  type ApiAreaOfOperation,
  type ApiVesselType,
  type ApiVesselCode,
} from '@/api';
import Pagination from '@/components/Pagination';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import { ListChecks, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import {
  Badge, Button, Checkbox, ConfirmDialog, DataTable, Drawer, Field, FormGrid, IconButton, Input, Modal, PageHeader, SearchInput, Select,
  Textarea, Toolbar, type Column,
} from '@/ui';
import s from './ChecklistManagement.module.css';

export default function ChecklistManagement() {
  const { can } = useAuth();
  const canCreate = can(MODULE_KEYS.adminMasterData, 'create');
  const canUpdate = can(MODULE_KEYS.adminMasterData, 'update');
  const canDelete = can(MODULE_KEYS.adminMasterData, 'delete');
  const [questions, setQuestions] = useState<ApiChecklistQuestion[]>([]);
  const [surveyTypes, setSurveyTypes] = useState<ApiSurveyType[]>([]);
  const [areaOperations, setAreaOperations] = useState<ApiAreaOfOperation[]>([]);
  const [boatTypes, setBoatTypes] = useState<ApiVesselType[]>([]);
  const [vesselCodes, setVesselCodes] = useState<ApiVesselCode[]>([]);

  // Filtering criteria states (Arrays for multi-select dropdowns)
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterSurveyCategories, setFilterSurveyCategories] = useState<string[]>([]);
  const [filterAreaOperations, setFilterAreaOperations] = useState<string[]>([]);
  const [filterBoatTypes, setFilterBoatTypes] = useState<string[]>([]);
  const [filterVesselCode, setFilterVesselCode] = useState('');
  const [filterQCategory, setFilterQCategory] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ApiChecklistQuestion | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<ApiChecklistQuestion | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<{ item?: string; surveys?: string }>({});

  // Form payload states (using array states for all select dropdowns)
  const [formItemText, setFormItemText] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAdditionalFields, setFormAdditionalFields] = useState<string[]>([]);
  const [formSurveyCategories, setFormSurveyCategories] = useState<string[]>([]);
  const [formAreaOperations, setFormAreaOperations] = useState<string[]>([]);
  const [formBoatTypes, setFormBoatTypes] = useState<string[]>([]);
  const [formVesselCode, setFormVesselCode] = useState('');
  const [formQCategory, setFormQCategory] = useState('');

  // Load lookup criteria options from backend
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [vTypesRes, sTypesRes, areasRes, vCodesRes] = await Promise.all([
          operationsService.getVesselTypes(),
          operationsService.getSurveyTypes(),
          operationsService.getAreaOperations(),
          vesselCodesService.getVesselCodes(),
        ]);
        if (vTypesRes.success) setBoatTypes(vTypesRes.data);
        if (sTypesRes.success) setSurveyTypes(sTypesRes.data);
        if (areasRes.success) setAreaOperations(areasRes.data);
        if (vCodesRes.success) setVesselCodes(vCodesRes.data);
      } catch (err: any) {
        toast.error('Failed to load filter dropdown criteria: ' + err.message);
      }
    };
    loadLookups();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page to 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterSurveyCategories, filterAreaOperations, filterBoatTypes, filterVesselCode, filterQCategory]);

  // Fetch checklist questions on filter updates
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params: any = {
        search: debouncedSearch.trim() || undefined,
        surveyCategory: filterSurveyCategories.length > 0 ? filterSurveyCategories.join(',') : undefined,
        areaOfOperation: filterAreaOperations.length > 0 ? filterAreaOperations.join(',') : undefined,
        boatType: filterBoatTypes.length > 0 ? filterBoatTypes.join(',') : undefined,
        vesselCode: filterVesselCode.trim() || undefined,
        qCategory: filterQCategory.trim() || undefined,
        page,
        limit,
      };
      const res = await checklistQuestionsService.getQuestions(params);
      if (res.success) {
        setQuestions(res.data);
        setTotal(res.count || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err: any) {
      toast.error('Failed to fetch checklist questions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [page, limit, debouncedSearch, filterSurveyCategories, filterAreaOperations, filterBoatTypes, filterVesselCode, filterQCategory]);

  const openAddModal = () => {
    setEditingQuestion(null);
    setFormErrors({});
    setFormItemText('');
    setFormDescription('');
    setFormAdditionalFields([]);
    setFormSurveyCategories([]);
    setFormAreaOperations([]);
    setFormBoatTypes([]);
    setFormVesselCode('');
    setFormQCategory('');
    setShowModal(true);
  };

  const openEditModal = (q: ApiChecklistQuestion) => {
    setEditingQuestion(q);
    setFormErrors({});
    setFormItemText(q.item);
    setFormDescription(q.description || '');
    setFormAdditionalFields(q.additionalFields || []);
    
    // Map populated categories/objects to string arrays
    const categoryIds = (q.surveyCategories || []).map((c: any) => (typeof c === 'object' ? c._id : c));
    const areaIds = (q.areaOfOperations || []).map((a: any) => (typeof a === 'object' ? a._id : a));
    const boatIds = (q.boatTypes || []).map((b: any) => (typeof b === 'object' ? b._id : b));
    
    setFormSurveyCategories(categoryIds);
    setFormAreaOperations(areaIds);
    setFormBoatTypes(boatIds);
    setFormVesselCode(q.vesselCode || '');
    setFormQCategory(q.qCategory || '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const found: { item?: string; surveys?: string } = {};
    if (!formItemText.trim()) found.item = 'Enter the item text.';
    if (formSurveyCategories.length === 0) found.surveys = 'Select at least one survey category.';
    setFormErrors(found);
    if (found.item || found.surveys) return;

    try {
      setSaving(true);
      const payload: Partial<ApiChecklistQuestion> = {
        item: formItemText.trim(),
        description: formDescription.trim() || null,
        additionalFields: formAdditionalFields,
        surveyCategories: formSurveyCategories,
        areaOfOperations: formAreaOperations,
        boatTypes: formBoatTypes,
        vesselCode: formVesselCode.trim() || null,
        qCategory: formQCategory.trim() || null,
      };

      if (editingQuestion?._id) {
        const res = await checklistQuestionsService.updateQuestion(editingQuestion._id, payload);
        if (res.success) {
          toast.success('Checklist item updated successfully.');
          fetchQuestions();
          setShowModal(false);
        } else {
          toast.error(res.message || 'Failed to update item.');
        }
      } else {
        const res = await checklistQuestionsService.createQuestion(payload);
        if (res.success) {
          toast.success('Checklist item created successfully.');
          fetchQuestions();
          setShowModal(false);
        } else {
          toast.error(res.message || 'Failed to create item.');
        }
      }
    } catch (err: any) {
      toast.error('Error saving checklist item: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await checklistQuestionsService.deleteQuestion(deleteConfirmId);
      if (res.success) {
        toast.success('Checklist question deleted successfully.');
        fetchQuestions();
      } else {
        toast.error(res.message || 'Failed to delete question.');
      }
    } catch (err: any) {
      toast.error('Error deleting checklist question: ' + err.message);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const nameOf = (v: any, key: 'name' | 'AreaCategory') => (typeof v === 'object' && v ? v[key] : v);
  const badgeList = (values: any[] | undefined, key: 'name' | 'AreaCategory', allLabel: string) =>
    !values || values.length === 0
      ? <span className={s.muted}>{allLabel}</span>
      : <span className={s.badges}>{values.map((v) => <Badge key={nameOf(v, key)}>{nameOf(v, key)}</Badge>)}</span>;

  const surveyOptions = surveyTypes.map((o) => ({ id: o._id, label: `${o.name} (${o.code})` }));
  const boatOptions = boatTypes.map((o) => ({ id: o._id, label: o.name }));
  const areaOptions = areaOperations.map((o) => ({ id: o._id, label: o.AreaCategory }));

  const activeFilters = [filterSurveyCategories.length > 0, filterBoatTypes.length > 0, filterAreaOperations.length > 0, !!filterVesselCode, !!filterQCategory].filter(Boolean).length;
  const clearFilters = () => {
    setFilterSurveyCategories([]);
    setFilterBoatTypes([]);
    setFilterAreaOperations([]);
    setFilterVesselCode('');
    setFilterQCategory('');
  };

  const columns: Column<ApiChecklistQuestion>[] = [
    {
      key: 'item', header: 'Item', primary: true,
      cell: (q) => (
        <span className={s.itemCell}>
          <span>{q.item}</span>
          {q.description && <span className={s.itemDesc}>{q.description}</span>}
        </span>
      ),
    },
    { key: 'category', header: 'Category', nowrap: true, cell: (q) => <Badge tone={q.qCategory ? 'accent' : 'neutral'}>{q.qCategory || 'General'}</Badge> },
    { key: 'vessel', header: 'Vessel code', nowrap: true, cell: (q) => q.vesselCode || <span className={s.muted}>All</span> },
    {
      key: 'surveys', header: 'Surveys', hideOnMobile: true,
      cell: (q) => (q.surveyCategories?.length ? `${q.surveyCategories.length} ${q.surveyCategories.length === 1 ? 'survey' : 'surveys'}` : <span className={s.muted}>All</span>),
    },
  ];

  const createButton = canCreate && <Button variant="primary" icon={<Plus />} onClick={openAddModal}>Add item</Button>;

  return (
    <div className="animate-in">
      <PageHeader
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Checklists' }]}
        title="Checklist items"
        description="Questions on the survey check sheet, and which surveys, boats, areas and vessel codes each one applies to."
        actions={createButton}
      />

      <Toolbar
        attached
        search={<SearchInput value={search} onChange={setSearch} placeholder="Search item text…" />}
        filters={
          <>
            <Button icon={<SlidersHorizontal />} onClick={() => setFiltersOpen(true)}>
              Filters{activeFilters > 0 && <Badge tone="accent" className={s.filterCount}>{activeFilters}</Badge>}
            </Button>
            {activeFilters > 0 && <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>}
          </>
        }
        end={!loading && `${total} ${total === 1 ? 'item' : 'items'}`}
      />
      <DataTable
        attached
        caption="Checklist items"
        columns={columns}
        rows={questions}
        getRowId={(q) => q._id || q.item}
        loading={loading}
        onRowClick={(q) => setViewingQuestion(q)}
        empty={{
          icon: <ListChecks />,
          title: search || activeFilters ? 'No matching items' : 'No checklist items yet',
          description: search || activeFilters ? 'Try a different search or clear the filters.' : undefined,
          action: search || activeFilters ? <Button onClick={() => { setSearch(''); clearFilters(); }}>Clear search and filters</Button> : createButton,
        }}
        rowActions={(q) => (
          <>
            <IconButton label={`Edit ${q.item}`} icon={<Pencil />} size="sm" onClick={() => openEditModal(q)} disabled={!canUpdate} />
            <IconButton label={`Delete ${q.item}`} icon={<Trash2 />} size="sm" variant="dangerGhost" onClick={() => setDeleteConfirmId(q._id || null)} disabled={!canDelete} />
          </>
        )}
        footer={<Pagination page={page} limit={limit} total={total} totalPages={totalPages} onPageChange={setPage} onLimitChange={setLimit} />}
      />

      {/* Filters */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter checklist items"
        width={420}
        footer={
          <>
            <Button onClick={clearFilters} disabled={!activeFilters}>Clear</Button>
            <Button variant="primary" onClick={() => setFiltersOpen(false)}>Show results</Button>
          </>
        }
      >
        <div className={s.stack}>
          <SearchableMultiSelect label="Survey categories" value={filterSurveyCategories} options={surveyOptions} placeholder="Any survey" onChange={setFilterSurveyCategories} />
          <SearchableMultiSelect label="Boat types" value={filterBoatTypes} options={boatOptions} placeholder="Any boat type" onChange={setFilterBoatTypes} />
          <SearchableMultiSelect label="Areas of operation" value={filterAreaOperations} options={areaOptions} placeholder="Any area" onChange={setFilterAreaOperations} />
          <Field label="Vessel code">
            <Select value={filterVesselCode} onChange={(e) => setFilterVesselCode(e.target.value)}>
              <option value="">Any vessel code</option>
              {vesselCodes.map((vc) => <option key={vc._id} value={vc.code}>{vc.code}</option>)}
            </Select>
          </Field>
          <Field label="Item category">
            <Input placeholder="e.g. Hull" value={filterQCategory} onChange={(e) => setFilterQCategory(e.target.value)} />
          </Field>
        </div>
      </Drawer>

      {/* Add / Edit */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        dismissible={!saving}
        size="lg"
        title={editingQuestion ? 'Edit checklist item' : 'Add checklist item'}
        footer={
          <>
            <Button onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="checklist-form" variant="primary" loading={saving}>{editingQuestion ? 'Save changes' : 'Add item'}</Button>
          </>
        }
      >
        <form id="checklist-form" onSubmit={handleSave} noValidate className={s.stack}>
          <Field label="Item text" required error={formErrors.item}>
            <Textarea rows={2} placeholder="e.g. Lifeboats functional" value={formItemText} autoFocus
              onChange={(e) => { setFormItemText(e.target.value); setFormErrors((p) => ({ ...p, item: undefined })); }} />
          </Field>
          <Field label="Description" hint="Guidance shown to the surveyor under the item.">
            <Textarea rows={2} placeholder="e.g. Ensure emergency batteries are fully charged." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
          </Field>
          <fieldset className={s.fieldset}>
            <legend className={s.legend}>Additional fields the surveyor fills in</legend>
            <div className={s.checks}>
              {['Model', 'Serial Number', 'Qty', 'Capacity', 'Type', 'Last Service'].map((field) => (
                <Checkbox
                  key={field}
                  label={field}
                  checked={formAdditionalFields.includes(field)}
                  onChange={(e) => setFormAdditionalFields(e.target.checked ? [...formAdditionalFields, field] : formAdditionalFields.filter((f) => f !== field))}
                />
              ))}
            </div>
          </fieldset>
          <FormGrid columns={2}>
            <Field label="Vessel code">
              <Select value={formVesselCode} onChange={(e) => setFormVesselCode(e.target.value)}>
                <option value="">All vessel codes</option>
                {vesselCodes.map((vc) => <option key={vc._id} value={vc.code}>{vc.code} - {vc.description}</option>)}
              </Select>
            </Field>
            <Field label="Item category" hint="Groups items on the check sheet">
              <Input placeholder="e.g. Hull" value={formQCategory} onChange={(e) => setFormQCategory(e.target.value)} />
            </Field>
          </FormGrid>
          <div>
            <SearchableMultiSelect label="Survey categories" required value={formSurveyCategories} options={surveyOptions} placeholder="Select survey categories"
              onChange={(v) => { setFormSurveyCategories(v); setFormErrors((p) => ({ ...p, surveys: undefined })); }} />
            {formErrors.surveys && <p className={s.fieldError} role="alert">{formErrors.surveys}</p>}
          </div>
          <SearchableMultiSelect label="Boat types" value={formBoatTypes} options={boatOptions} placeholder="All boat types" onChange={setFormBoatTypes} />
          <SearchableMultiSelect label="Areas of operation" value={formAreaOperations} options={areaOptions} placeholder="All areas" onChange={setFormAreaOperations} />
        </form>
      </Modal>

      {/* View */}
      <Modal
        open={!!viewingQuestion}
        onClose={() => setViewingQuestion(null)}
        size="md"
        title="Checklist item"
        footer={
          <>
            <Button onClick={() => setViewingQuestion(null)}>Close</Button>
            {canUpdate && viewingQuestion && (
              <Button variant="primary" icon={<Pencil />} onClick={() => { const q = viewingQuestion; setViewingQuestion(null); openEditModal(q); }}>Edit item</Button>
            )}
          </>
        }
      >
        {viewingQuestion && (
          <dl className={s.details}>
            <div className={s.detailFull}><dt>Item</dt><dd className={s.itemText}>{viewingQuestion.item}</dd></div>
            {viewingQuestion.description && <div className={s.detailFull}><dt>Description</dt><dd className={s.pre}>{viewingQuestion.description}</dd></div>}
            <div><dt>Category</dt><dd><Badge tone={viewingQuestion.qCategory ? 'accent' : 'neutral'}>{viewingQuestion.qCategory || 'General'}</Badge></dd></div>
            <div><dt>Vessel code</dt><dd>{viewingQuestion.vesselCode || <span className={s.muted}>All vessel codes</span>}</dd></div>
            {viewingQuestion.additionalFields && viewingQuestion.additionalFields.length > 0 && (
              <div className={s.detailFull}><dt>Additional fields</dt><dd className={s.badges}>{viewingQuestion.additionalFields.map((f) => <Badge key={f} tone="info">{f}</Badge>)}</dd></div>
            )}
            <div className={s.detailFull}><dt>Survey categories</dt><dd>{badgeList(viewingQuestion.surveyCategories as any[], 'name', 'All surveys')}</dd></div>
            <div className={s.detailFull}><dt>Boat types</dt><dd>{badgeList(viewingQuestion.boatTypes as any[], 'name', 'All boat types')}</dd></div>
            <div className={s.detailFull}><dt>Areas of operation</dt><dd>{badgeList(viewingQuestion.areaOfOperations as any[], 'AreaCategory', 'All areas')}</dd></div>
          </dl>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteConfirmId}
        title="Delete checklist item?"
        message="It will no longer appear on new check sheets. This can't be undone."
        confirmText="Delete item"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
