import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FolderOpen, Plus, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, DataTable, Field, FormGrid, Input, Modal, PageHeader, SearchInput, Textarea, Toolbar, type Column } from '@/ui';
import Pagination from '@/components/Pagination';
import { useAuth } from '@/context/AuthContext';
import { libraryDocsService } from '@/api';
import type { ApiJobDocument, ApiLibraryDocument } from '@/api';
import { formatDate } from '@/utils/date';
import { DOCUMENT_LIBRARIES, type DocumentLibraryKey } from '@/utils/permissions';
import { DocumentList } from './shared';
import s from './v2.module.css';

type Draft = { _id?: string; title: string; referenceNumber: string; issueDate: string; remarks: string; documents: ApiJobDocument[] };
const EMPTY: Draft = { title: '', referenceNumber: '', issueDate: '', remarks: '', documents: [] };

const toDateInput = (v?: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : '');

/**
 * Upload-and-view screen shared by UQMS Rules, UQMS Guidelines and the Flag Instructions
 * (Marine Shipping Notice, Marine News, Gazette, MSN). Permissions come from the screen's own module.
 */
export default function DocumentLibraryPage({ library, breadcrumbs }: { library: DocumentLibraryKey; breadcrumbs?: { label: string; href: string }[] }) {
  const meta = DOCUMENT_LIBRARIES[library];
  const { can } = useAuth();
  const canCreate = can(library, 'create');
  const canUpdate = can(library, 'update');
  const canDelete = can(library, 'delete');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [rows, setRows] = useState<ApiLibraryDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await libraryDocsService.list({ library, search: search.trim() || undefined, page, limit });
      setRows(res.data);
      setTotal(res.count);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [library, search, page, limit]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const save = async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error('Title is required.');
      return;
    }
    if (draft.documents.length === 0) {
      toast.error('Upload at least one file.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: draft.title.trim(),
        referenceNumber: draft.referenceNumber.trim(),
        issueDate: draft.issueDate || null,
        remarks: draft.remarks.trim(),
        documents: draft.documents,
      };
      if (draft._id) await libraryDocsService.update(draft._id, payload);
      else await libraryDocsService.create({ ...payload, library });
      toast.success('Document saved.');
      setDraft(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<ApiLibraryDocument>[] = [
    { key: 'title', header: 'Title', primary: true, cell: r => <span className={s.strong}>{r.title}</span> },
    { key: 'ref', header: meta.referenceLabel, cell: r => (r.referenceNumber ? <span className={s.mono}>{r.referenceNumber}</span> : '—') },
    { key: 'date', header: 'Issue date', nowrap: true, cell: r => (r.issueDate ? formatDate(r.issueDate) : '—') },
    { key: 'files', header: 'Files', cell: r => r.documents.length },
    { key: 'updated', header: 'Uploaded', nowrap: true, hideOnMobile: true, cell: r => (r.createdAt ? formatDate(r.createdAt) : '—') },
  ];

  const editable = !!draft && (draft._id ? canUpdate : canCreate);
  const open = (r: ApiLibraryDocument) =>
    setDraft({ _id: r._id, title: r.title, referenceNumber: r.referenceNumber ?? '', issueDate: toDateInput(r.issueDate), remarks: r.remarks ?? '', documents: r.documents });

  return (
    <div className="animate-in">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={meta.title}
        description={meta.description}
        actions={canCreate && <Button variant="primary" icon={<Plus />} onClick={() => setDraft({ ...EMPTY })}>Upload document</Button>}
      />
      <Toolbar attached search={<SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder={`Search title, ${meta.referenceLabel.toLowerCase()} or remarks…`} />} />
      <DataTable
        attached
        columns={columns}
        rows={rows}
        getRowId={r => r._id}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={open}
        rowActions={r => (
          <>
            <Button size="sm" variant="ghost" onClick={() => open(r)}>View</Button>
            {canDelete && <Button size="sm" variant="dangerGhost" icon={<Trash2 />} onClick={() => setDeleteId(r._id)}>Delete</Button>}
          </>
        )}
        empty={{ icon: <FolderOpen />, title: `No ${meta.title.toLowerCase()} documents yet`, description: canCreate ? 'Use “Upload document” to add the first one.' : undefined }}
        footer={total > limit && <Pagination page={page} limit={limit} total={total} totalPages={totalPages} onPageChange={setPage} onLimitChange={setLimit} />}
      />

      {draft && (
        <Modal
          open
          size="lg"
          onClose={() => setDraft(null)}
          title={draft._id ? draft.title : `Upload ${meta.title} document`}
          footer={editable ? (
            <>
              <Button onClick={() => setDraft(null)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={save} loading={saving}>Save</Button>
            </>
          ) : <Button onClick={() => setDraft(null)}>Close</Button>}
        >
          <fieldset disabled={!editable} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
            <FormGrid columns={3}>
              <Field label="Title" required full><Input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></Field>
              <Field label={meta.referenceLabel}><Input value={draft.referenceNumber} onChange={e => setDraft({ ...draft, referenceNumber: e.target.value })} /></Field>
              <Field label="Issue date"><Input type="date" value={draft.issueDate} onChange={e => setDraft({ ...draft, issueDate: e.target.value })} /></Field>
              <Field label="Remarks" full><Textarea rows={2} value={draft.remarks} onChange={e => setDraft({ ...draft, remarks: e.target.value })} /></Field>
            </FormGrid>
          </fieldset>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <DocumentList
              documents={draft.documents}
              emptyText="No files uploaded."
              uploadPrefix={`library/${library}`}
              uploadLabel="Upload files"
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
        title="Delete this document?"
        message="The document and its file list are removed. This can't be undone."
        confirmText="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          try {
            await libraryDocsService.remove(deleteId!);
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
