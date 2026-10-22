import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FolderArchive, Plus, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, DataTable, Field, FormGrid, Input, Modal, PageHeader, SearchInput, Select, Textarea, Toolbar, type Column } from '@/ui';
import Pagination from '@/components/Pagination';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import { previousDocsService, vesselCodesService } from '@/api';
import type { ApiJobDocument, ApiPreviousDocument, ApiVesselCode } from '@/api';
import { formatDate } from '@/utils/date';
import { DocumentList } from './shared';
import s from './v2.module.css';

type Draft = { _id?: string; uqmsNumber: string; vesselName: string; vesselCode: string; remarks: string; documents: ApiJobDocument[] };
const EMPTY: Draft = { uqmsNumber: '', vesselName: '', vesselCode: '', remarks: '', documents: [] };

export default function PreviousDocsPage() {
  const { can } = useAuth();
  const canCreate = can(MODULE_KEYS.previousDocs, 'create');
  const canUpdate = can(MODULE_KEYS.previousDocs, 'update');
  const canDelete = can(MODULE_KEYS.previousDocs, 'delete');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [rows, setRows] = useState<ApiPreviousDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [vesselCodes, setVesselCodes] = useState<ApiVesselCode[]>([]);

  useEffect(() => { vesselCodesService.getVesselCodes().then(r => setVesselCodes(r.data)).catch(() => undefined); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await previousDocsService.list({ search: search.trim() || undefined, page, limit });
      setRows(res.data);
      setTotal(res.count);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, page, limit]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const save = async () => {
    if (!draft) return;
    if (!draft.uqmsNumber.trim() || !draft.vesselName.trim()) {
      toast.error('UQMS number and vessel name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...draft, uqmsNumber: draft.uqmsNumber.trim(), vesselName: draft.vesselName.trim() };
      if (draft._id) await previousDocsService.update(draft._id, payload);
      else await previousDocsService.create(payload);
      toast.success('Documents saved.');
      setDraft(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<ApiPreviousDocument>[] = [
    { key: 'uqms', header: 'UQMS no.', primary: true, cell: r => <span className={s.mono}>{r.uqmsNumber}</span> },
    { key: 'vessel', header: 'Vessel', cell: r => r.vesselName },
    { key: 'code', header: 'Vessel code', cell: r => r.vesselCode || '—' },
    { key: 'docs', header: 'Documents', cell: r => r.documents.length },
    { key: 'updated', header: 'Updated', nowrap: true, hideOnMobile: true, cell: r => (r.updatedAt ? formatDate(r.updatedAt) : '—') },
  ];

  const editable = draft && (draft._id ? canUpdate : canCreate);

  return (
    <div className="animate-in">
      <PageHeader
        title="Previous Docs"
        description="Documents from surveys done before the portal, filed by UQMS number and vessel."
        actions={canCreate && <Button variant="primary" icon={<Plus />} onClick={() => setDraft({ ...EMPTY })}>Add documents</Button>}
      />
      <Toolbar attached search={<SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search UQMS number, vessel name or code…" />} />
      <DataTable
        attached
        columns={columns}
        rows={rows}
        getRowId={r => r._id}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={r => setDraft({ _id: r._id, uqmsNumber: r.uqmsNumber, vesselName: r.vesselName, vesselCode: r.vesselCode ?? '', remarks: r.remarks ?? '', documents: r.documents })}
        rowActions={canDelete ? r => <Button size="sm" variant="dangerGhost" icon={<Trash2 />} onClick={() => setDeleteId(r._id)}>Delete</Button> : undefined}
        empty={{ icon: <FolderArchive />, title: 'No previous documents yet' }}
        footer={total > limit && <Pagination page={page} limit={limit} total={total} totalPages={totalPages} onPageChange={setPage} onLimitChange={setLimit} />}
      />

      {draft && (
        <Modal
          open
          size="lg"
          onClose={() => setDraft(null)}
          title={draft._id ? `${draft.vesselName} · ${draft.uqmsNumber}` : 'Add previous documents'}
          footer={editable ? (
            <>
              <Button onClick={() => setDraft(null)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={save} loading={saving}>Save</Button>
            </>
          ) : <Button onClick={() => setDraft(null)}>Close</Button>}
        >
          <fieldset disabled={!editable} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
            <FormGrid columns={3}>
              <Field label="UQMS number" required><Input value={draft.uqmsNumber} onChange={e => setDraft({ ...draft, uqmsNumber: e.target.value })} /></Field>
              <Field label="Vessel name" required><Input value={draft.vesselName} onChange={e => setDraft({ ...draft, vesselName: e.target.value })} /></Field>
              <Field label="Vessel code">
                <Select value={draft.vesselCode} onChange={e => setDraft({ ...draft, vesselCode: e.target.value })} placeholder="Choose">
                  {vesselCodes.map(c => <option key={c._id} value={c.code}>{c.code}</option>)}
                </Select>
              </Field>
              <Field label="Remarks" full><Textarea rows={2} value={draft.remarks} onChange={e => setDraft({ ...draft, remarks: e.target.value })} /></Field>
            </FormGrid>
          </fieldset>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <DocumentList
              documents={draft.documents}
              emptyText="No documents uploaded."
              uploadPrefix="previous-docs"
              readOnly={!editable}
              onAdd={doc => setDraft(d => (d ? { ...d, documents: [...d.documents, doc] } : d))}
              onRemove={(_d, idx) => setDraft(d => (d ? { ...d, documents: d.documents.filter((_, i) => i !== idx) } : d))}
            />
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteId}
        destructive
        title="Delete these documents?"
        message="The record and its document list are removed. This can't be undone."
        confirmText="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          try {
            await previousDocsService.remove(deleteId!);
            toast.success('Deleted.');
            load();
          } catch (err: any) {
            toast.error(err.message);
          } finally {
            setDeleteId(null);
          }
        }}
      />
    </div>
  );
}
