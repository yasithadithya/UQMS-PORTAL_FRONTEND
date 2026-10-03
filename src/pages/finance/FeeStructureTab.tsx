import { useEffect, useState } from 'react';
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  feeItemsService, vesselCodesService, type ApiFeeItem, type ApiVesselCode, type FeeCategory, type FeeCurrency, type FeeItemPayload, type FeeUnit,
} from '@/api';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import {
  Badge, Button, Checkbox, ConfirmDialog, DataTable, Field, FormGrid, IconButton, Input, Menu, Modal, Select, Textarea, Toolbar, type Column,
} from '@/ui';
import { FEE_CATEGORY_LABELS, formatCurrency } from './financeFormat';
import s from './finance.module.css';

const UNITS: FeeUnit[] = ['visit', 'trip', 'hour', 'lump sum'];

type FormState = {
  name: string;
  category: FeeCategory;
  currency: FeeCurrency;
  standardRate: string;
  rate: string;
  unit: FeeUnit;
  notes: string;
  order: string;
  isActive: boolean;
  /** Empty = applies to every vessel code. */
  vesselCodes: string[];
};

const EMPTY_FORM: FormState = {
  name: '', category: 'survey', currency: 'USD', standardRate: '', rate: '', unit: 'visit', notes: '', order: '0', isActive: true, vesselCodes: [],
};

const toForm = (item: ApiFeeItem): FormState => ({
  name: item.name,
  category: item.category,
  currency: item.currency,
  standardRate: item.standardRate !== undefined && item.standardRate !== null ? String(item.standardRate) : '',
  rate: String(item.rate),
  unit: item.unit,
  notes: item.notes || '',
  order: String(item.order ?? 0),
  isActive: item.isActive,
  vesselCodes: item.vesselCodes || [],
});

/** The master fee list. Editing a fee only affects quotations created afterwards. */
export default function FeeStructureTab() {
  const { can } = useAuth();
  const canCreate = can(MODULE_KEYS.financeFeeStructure, 'create');
  const canUpdate = can(MODULE_KEYS.financeFeeStructure, 'update');
  const canDelete = can(MODULE_KEYS.financeFeeStructure, 'delete');

  const [items, setItems] = useState<ApiFeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<FeeCategory | ''>('');

  const [editing, setEditing] = useState<ApiFeeItem | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<Partial<Record<'name' | 'rate' | 'standardRate', string>>>({});
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ApiFeeItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [vesselCodes, setVesselCodes] = useState<ApiVesselCode[]>([]);

  useEffect(() => {
    vesselCodesService.getVesselCodes().then(res => setVesselCodes(res.data)).catch(() => setVesselCodes([]));
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await feeItemsService.getFeeItems();
      setItems(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load the fee structure.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEditor = (item: ApiFeeItem | 'new') => {
    setEditing(item);
    setForm(item === 'new' ? { ...EMPTY_FORM, category: category || 'survey', currency: category === 'transport' ? 'LKR' : 'USD' } : toForm(item));
    setFormError({});
  };

  const set = (patch: Partial<FormState>) => setForm(prev => ({ ...prev, ...patch }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof formError = {};
    const rate = Number(form.rate);
    const standardRate = form.standardRate.trim() === '' ? null : Number(form.standardRate);
    if (!form.name.trim()) errors.name = 'Enter a name.';
    if (form.rate.trim() === '' || !Number.isFinite(rate) || rate < 0) errors.rate = 'Enter the current fee (0 or more).';
    if (standardRate !== null && (!Number.isFinite(standardRate) || standardRate < 0)) errors.standardRate = 'Enter 0 or more, or leave empty.';
    setFormError(errors);
    if (Object.keys(errors).length) return;

    const payload: FeeItemPayload = {
      name: form.name.trim(),
      category: form.category,
      currency: form.currency,
      standardRate,
      rate,
      unit: form.unit,
      notes: form.notes.trim(),
      order: Number(form.order) || 0,
      isActive: form.isActive,
      vesselCodes: form.vesselCodes,
    };

    setSaving(true);
    try {
      if (editing === 'new') {
        await feeItemsService.createFeeItem(payload);
        toast.success(`${payload.name} added to the fee structure.`);
      } else if (editing) {
        await feeItemsService.updateFeeItem(editing._id, payload);
        toast.success(`${payload.name} updated.`);
      }
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save the fee item.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await feeItemsService.deleteFeeItem(pendingDelete._id);
      toast.success(`${pendingDelete.name} deleted.`);
      setPendingDelete(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete the fee item.');
    } finally {
      setDeleting(false);
    }
  };

  const rows = category ? items.filter(i => i.category === category) : items;

  const columns: Column<ApiFeeItem>[] = [
    {
      key: 'name', header: 'Item', primary: true,
      cell: i => (
        <span className={s.stack}>
          <span className={s.inline}>
            {i.name}
            {!i.isActive && <Badge tone="neutral">Inactive</Badge>}
          </span>
          {i.notes && <span className={s.muted}>{i.notes}</span>}
          <span className={s.muted}>{i.vesselCodes?.length ? `Vessel codes: ${i.vesselCodes.join(', ')}` : 'All vessel codes'}</span>
        </span>
      ),
    },
    { key: 'category', header: 'Category', nowrap: true, hideOnMobile: true, cell: i => FEE_CATEGORY_LABELS[i.category] },
    {
      key: 'standard', header: 'Standard fee', align: 'right', nowrap: true,
      cell: i => (i.standardRate !== undefined && i.standardRate !== null ? <span className={s.strike}>{formatCurrency(i.standardRate, i.currency)}</span> : '—'),
    },
    { key: 'rate', header: 'Current fee', align: 'right', nowrap: true, cell: i => <strong>{formatCurrency(i.rate, i.currency)}</strong> },
    { key: 'unit', header: 'Per', nowrap: true, cell: i => <span className={s.capitalize}>{i.unit}</span> },
  ];

  const addButton = canCreate && <Button variant="primary" size="sm" icon={<Plus />} onClick={() => openEditor('new')}>Add fee item</Button>;

  return (
    <>
      <Toolbar
        attached
        filters={
          <Select aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value as FeeCategory | '')}>
            <option value="">All categories</option>
            {(Object.keys(FEE_CATEGORY_LABELS) as FeeCategory[]).map(c => <option key={c} value={c}>{FEE_CATEGORY_LABELS[c]}</option>)}
          </Select>
        }
        end={addButton}
      />
      <DataTable
        attached
        caption="Fee structure"
        columns={columns}
        rows={rows}
        getRowId={i => i._id}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={canUpdate ? i => openEditor(i) : undefined}
        empty={{ icon: <Receipt />, title: 'No fee items', description: 'Add the standard survey fees and charges used on quotations.', action: addButton }}
        rowActions={i => (
          <>
            {canUpdate && <IconButton label={`Edit ${i.name}`} icon={<Pencil />} size="sm" onClick={() => openEditor(i)} />}
            <Menu
              label={`More actions for ${i.name}`}
              items={[{
                label: 'Delete', icon: <Trash2 />, danger: true, disabled: !canDelete,
                hint: canDelete ? undefined : 'Your role cannot delete fee items',
                onSelect: () => setPendingDelete(i),
              }]}
            />
          </>
        )}
      />

      <Modal
        open={editing !== null}
        onClose={() => !saving && setEditing(null)}
        title={editing === 'new' ? 'Add fee item' : 'Edit fee item'}
        description="Changes apply to new quotation lines. Existing quotations keep their own values."
        footer={
          <>
            <Button onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="fee-item-form" variant="primary" loading={saving}>
              {editing === 'new' ? 'Add item' : 'Save changes'}
            </Button>
          </>
        }
      >
        <form id="fee-item-form" onSubmit={save} noValidate>
          <FormGrid columns={2}>
            <Field label="Name" required full error={formError.name}>
              <Input value={form.name} placeholder="e.g. Docking survey" onChange={e => set({ name: e.target.value })} />
            </Field>
            <Field label="Category" required>
              <Select value={form.category} onChange={e => set({ category: e.target.value as FeeCategory })}>
                {(Object.keys(FEE_CATEGORY_LABELS) as FeeCategory[]).map(c => <option key={c} value={c}>{FEE_CATEGORY_LABELS[c]}</option>)}
              </Select>
            </Field>
            <Field label="Currency" required>
              <Select value={form.currency} onChange={e => set({ currency: e.target.value as FeeCurrency })}>
                <option value="USD">USD</option>
                <option value="LKR">LKR</option>
              </Select>
            </Field>
            <Field label="Standard fee" hint="List fee before discount (optional)" error={formError.standardRate}>
              <Input type="number" inputMode="decimal" min={0} step="0.01" prefix={form.currency} value={form.standardRate}
                onChange={e => set({ standardRate: e.target.value })} />
            </Field>
            <Field label="Current fee" required hint="Used on new quotation lines" error={formError.rate}>
              <Input type="number" inputMode="decimal" min={0} step="0.01" prefix={form.currency} value={form.rate}
                onChange={e => set({ rate: e.target.value })} />
            </Field>
            <Field label="Charged per">
              <Select value={form.unit} onChange={e => set({ unit: e.target.value as FeeUnit })}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </Select>
            </Field>
            <Field label="Sort order" hint="Lower numbers are listed first">
              <Input type="number" inputMode="numeric" value={form.order} onChange={e => set({ order: e.target.value })} />
            </Field>
            <Field label="Notes" full>
              <Textarea rows={2} value={form.notes} placeholder="e.g. Two hours free" onChange={e => set({ notes: e.target.value })} />
            </Field>
          </FormGrid>
          <fieldset className={s.spaced}>
            <legend className={s.subheading}>Applies to vessel codes</legend>
            <p className={s.muted}>Leave all unticked to offer this fee for every vessel code.</p>
            {vesselCodes.map(vc => (
              <Checkbox
                key={vc._id}
                label={`${vc.code} - ${vc.description}`}
                checked={form.vesselCodes.includes(vc.code)}
                onChange={e => set({
                  vesselCodes: e.target.checked ? [...form.vesselCodes, vc.code] : form.vesselCodes.filter(c => c !== vc.code),
                })}
              />
            ))}
          </fieldset>
          <div className={s.spaced}>
            <Checkbox label="Active" description="Inactive items are hidden when adding lines to a quotation." checked={form.isActive}
              onChange={e => set({ isActive: e.target.checked })} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this fee item?"
        message={pendingDelete && `${pendingDelete.name} will be removed from the fee structure. Existing quotations are not affected. To stop using it without deleting, mark it inactive instead.`}
        confirmText="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
