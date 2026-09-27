import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  AlertTriangle, CheckCircle2, ClipboardList, Download, FileSignature, Inbox, Pencil, Plus, Ship, Trash2,
} from 'lucide-react';
import {
  Badge, Button, ButtonLink, Card, Checkbox, ConfirmDialog, DataTable, Drawer, EmptyState, ErrorState, Field,
  FormGrid, FormSection, IconButton, Input, LoadingBlock, Menu, Modal, PageHeader, SearchInput, Section, Select,
  Skeleton, StatCard, StatGrid, StatusBadge, StickyActionBar, Tabs, Textarea, Toolbar, type Column,
} from '@/ui';
import s from './UiKitPage.module.css';

type DemoRow = { id: string; vessel: string; imo: string; request: string; status: string; date: string };

const ROWS: DemoRow[] = [
  { id: '1', vessel: 'MV Ocean Pearl', imo: '9384721', request: 'REQ-2026-0142', status: 'Active', date: '24 Sep 2026' },
  { id: '2', vessel: 'Lanka Star', imo: '9120457', request: 'REQ-2026-0139', status: 'Pending', date: '22 Sep 2026' },
  { id: '3', vessel: 'Serendib Trader', imo: '9551208', request: 'REQ-2026-0131', status: 'COS Generated', date: '18 Sep 2026' },
  { id: '4', vessel: 'Blue Horizon', imo: '9477310', request: 'REQ-2026-0127', status: 'Rejected', date: '15 Sep 2026' },
  { id: '5', vessel: 'Galle Spirit', imo: '9602883', request: 'REQ-2026-0120', status: 'Draft', date: '11 Sep 2026' },
];

const STATUSES = ['Active', 'Approved', 'Completed', 'Scheduled', 'Submitted', 'Pending', 'Pending Signature', 'Rejected', 'Failed', 'Draft', 'N/A', 'OnProbation'];

type Tab = 'buttons' | 'data' | 'forms' | 'feedback' | 'overlays';
const TABS: Tab[] = ['buttons', 'data', 'forms', 'feedback', 'overlays'];

/** Living style guide: every kit component in one place, for design review and visual QA in both themes. */
export default function UiKitPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : 'buttons';
  const setTab = (t: Tab) => setSearchParams({ tab: t }, { replace: true });
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<'all' | 'open' | 'closed'>('all');
  // ?open=modal|drawer|confirm opens an overlay on load, for screenshots and visual QA.
  const initialOverlay = searchParams.get('open');
  const [modal, setModal] = useState(initialOverlay === 'modal');
  const [drawer, setDrawer] = useState(initialOverlay === 'drawer');
  const [confirm, setConfirm] = useState(initialOverlay === 'confirm');
  const [tableState, setTableState] = useState<'rows' | 'loading' | 'empty' | 'error'>('rows');

  const columns: Column<DemoRow>[] = [
    {
      key: 'vessel', header: 'Vessel', primary: true,
      cell: (r) => (
        <div>
          <div>{r.vessel}</div>
          <div className={s.sub}>IMO {r.imo}</div>
        </div>
      ),
    },
    { key: 'request', header: 'Request no.', nowrap: true, cell: (r) => <span className="tabular">{r.request}</span> },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { key: 'date', header: 'Updated', nowrap: true, cell: (r) => r.date },
  ];

  const filtered = ROWS.filter((r) => r.vessel.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className={s.page}>
      <PageHeader
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'UI kit' }]}
        title="UI kit"
        description="Every component in the design system. Toggle the theme in the sidebar to check both modes."
        meta={<Badge tone="accent">Internal</Badge>}
        actions={<><Button icon={<Download />}>Export</Button><Button variant="primary" icon={<Plus />}>Primary action</Button></>}
      />

      <Tabs
        label="Component groups"
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'buttons', label: 'Buttons & badges' },
          { value: 'data', label: 'Data display', count: ROWS.length },
          { value: 'forms', label: 'Forms' },
          { value: 'feedback', label: 'Feedback' },
          { value: 'overlays', label: 'Overlays' },
        ]}
      />

      {tab === 'buttons' && (
        <div className={s.stack}>
          <Section title="Buttons" description="One primary action per view. Secondary for the rest; ghost inside dense UI.">
            <div className={s.row}>
              <Button variant="primary">Primary</Button>
              <Button>Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Delete</Button>
              <Button variant="dangerGhost" icon={<Trash2 />}>Remove</Button>
              <Button variant="primary" loading>Saving</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className={s.row}>
              <Button size="sm" variant="primary" icon={<Plus />}>Small</Button>
              <Button size="md" variant="primary" icon={<Plus />}>Medium</Button>
              <Button size="lg" variant="primary" icon={<Plus />}>Large</Button>
              <ButtonLink to="/" variant="secondary">Link as button</ButtonLink>
            </div>
            <div className={s.row}>
              <IconButton label="Edit" icon={<Pencil />} />
              <IconButton label="Download" icon={<Download />} variant="secondary" />
              <IconButton label="Delete" icon={<Trash2 />} variant="dangerGhost" />
              <Menu items={[
                { label: 'Edit', icon: <Pencil />, onSelect: () => toast.info('Edit') },
                { label: 'Download PDF', icon: <Download />, onSelect: () => toast.info('Download') },
                'separator',
                { label: 'Delete', icon: <Trash2 />, danger: true, onSelect: () => setConfirm(true) },
              ]} />
            </div>
          </Section>

          <Section title="Status badges" description="Colors come from one map (ui/Badge/status.ts), so a status looks the same everywhere.">
            <div className={s.row}>
              {STATUSES.map((st) => <StatusBadge key={st} status={st} />)}
            </div>
            <div className={s.row}>
              <Badge tone="accent">Web</Badge>
              <Badge tone="info">3 files</Badge>
              <Badge>Neutral tag</Badge>
              <Badge tone="success" icon={<CheckCircle2 />}>Verified</Badge>
            </div>
          </Section>
        </div>
      )}

      {tab === 'data' && (
        <div className={s.stack}>
          <StatGrid>
            <StatCard label="Website requests" value={4} icon={<Inbox />} tone="warning" hint="Waiting for review" href="/" />
            <StatCard label="Open first entries" value={12} icon={<Ship />} tone="info" hint="3 without Schedule II" />
            <StatCard label="Reports to sign" value={2} icon={<FileSignature />} tone="accent" />
            <StatCard label="Certificates this month" value={27} icon={<ClipboardList />} loading={tableState === 'loading'} />
          </StatGrid>

          <div>
            <div className={s.row} style={{ marginBottom: 'var(--space-3)' }}>
              <Tabs
                variant="segmented"
                label="Table state"
                value={tableState}
                onValueChange={setTableState}
                items={[
                  { value: 'rows', label: 'Rows' },
                  { value: 'loading', label: 'Loading' },
                  { value: 'empty', label: 'Empty' },
                  { value: 'error', label: 'Error' },
                ]}
              />
            </div>
            <Toolbar
              attached
              search={<SearchInput value={query} onChange={setQuery} placeholder="Search vessels…" />}
              filters={
                <Tabs variant="segmented" label="Status filter" value={segment} onValueChange={setSegment}
                  items={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} />
              }
              end={`${filtered.length} results`}
            />
            <DataTable
              attached
              caption="Demo first entries"
              columns={columns}
              rows={tableState === 'rows' ? filtered : []}
              getRowId={(r) => r.id}
              loading={tableState === 'loading'}
              error={tableState === 'error' ? 'The server did not respond. Check your connection and try again.' : null}
              onRetry={() => setTableState('rows')}
              empty={{
                title: 'No first entries yet',
                description: 'Register a vessel against an accepted request to get started.',
                icon: <Ship />,
                action: <Button variant="primary" icon={<Plus />}>Create first entry</Button>,
              }}
              onRowClick={(r) => toast.info(`Open ${r.vessel}`)}
              rowActions={(r) => (
                <>
                  <Button size="sm" onClick={() => toast.info(`Edit ${r.vessel}`)}>Edit</Button>
                  <Menu items={[
                    { label: 'Download PDF', icon: <Download />, onSelect: () => toast.info('Download') },
                    'separator',
                    { label: 'Delete', icon: <Trash2 />, danger: true, onSelect: () => setConfirm(true) },
                  ]} />
                </>
              )}
            />
          </div>
        </div>
      )}

      {tab === 'forms' && (
        <div className={s.stack}>
          <FormSection id="vessel" title="Vessel particulars" description="As shown on the registry certificate.">
            <FormGrid columns={2}>
              <Field label="Vessel name" required>
                <Input placeholder="e.g. MV Ocean Pearl" />
              </Field>
              <Field label="IMO number" required hint="7 digits" error="IMO number must be 7 digits.">
                <Input inputMode="numeric" defaultValue="93847" />
              </Field>
              <Field label="Flag">
                <Select placeholder="Select flag" defaultValue="">
                  <option>Sri Lanka</option>
                  <option>Panama</option>
                  <option>Liberia</option>
                </Select>
              </Field>
              <Field label="Gross tonnage">
                <Input inputMode="decimal" suffix="GT" />
              </Field>
              <Field label="Quotation amount">
                <Input inputMode="decimal" prefix="Rs." />
              </Field>
              <Field label="Search owner">
                <SearchInput value={query} onChange={setQuery} placeholder="Company name" />
              </Field>
              <Field label="Remarks" full hint="Visible on the final report.">
                <Textarea placeholder="Optional" />
              </Field>
              <div className={s.row}>
                <Checkbox label="Quoted" description="A quotation has been sent to the client." defaultChecked />
                <Checkbox label="Send Schedule II by email" />
              </div>
            </FormGrid>
          </FormSection>
          <StickyActionBar dirty>
            <Button>Cancel</Button>
            <Button variant="primary">Save changes</Button>
          </StickyActionBar>
        </div>
      )}

      {tab === 'feedback' && (
        <div className={s.grid2}>
          <Card padding="none"><EmptyState title="No certificates yet" description="Certificates appear here once a survey report is approved." icon={<ClipboardList />} action={<Button variant="primary" icon={<Plus />}>Create report</Button>} /></Card>
          <Card padding="none"><ErrorState message="The server did not respond." onRetry={() => toast.success('Retried')} /></Card>
          <Card><LoadingBlock label="Loading survey reports…" /></Card>
          <Card>
            <Skeleton width="40%" height={20} />
            <Skeleton width="90%" style={{ marginTop: 12 }} />
            <Skeleton width="75%" style={{ marginTop: 8 }} />
          </Card>
          <Card>
            <p className={s.label}>Toasts</p>
            <div className={s.row}>
              <Button size="sm" onClick={() => toast.success('First entry saved.')}>Success</Button>
              <Button size="sm" onClick={() => toast.error('Upload failed: file too large.')}>Error</Button>
              <Button size="sm" onClick={() => toast.warning('Request saved, but the document upload failed.')}>Warning</Button>
              <Button size="sm" onClick={() => toast.info('REQ-2026-0142 rejected.')}>Info</Button>
            </div>
          </Card>
          <Card>
            <p className={s.label}>Inline alert text</p>
            <p className={s.alert}><AlertTriangle aria-hidden="true" /> Use Field errors for validation, toasts for results of actions.</p>
          </Card>
        </div>
      )}

      {tab === 'overlays' && (
        <Section title="Dialogs" description="Focus is trapped, Esc closes, the page behind doesn't scroll. Large dialogs become sheets on phones.">
          <div className={s.row}>
            <Button onClick={() => setModal(true)}>Open modal</Button>
            <Button onClick={() => setDrawer(true)}>Open drawer</Button>
            <Button variant="danger" onClick={() => setConfirm(true)}>Confirm delete</Button>
          </div>
        </Section>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Add vessel note"
        description="Notes are shown to surveyors on the survey report."
        size="lg"
        footer={<><Button onClick={() => setModal(false)}>Cancel</Button><Button variant="primary" onClick={() => setModal(false)}>Save note</Button></>}
      >
        <FormGrid columns={2}>
          <Field label="Title" required><Input autoFocus /></Field>
          <Field label="Status"><Select defaultValue="new"><option value="new">New</option><option value="modified">Modified</option></Select></Field>
          <Field label="Note" full><Textarea rows={5} /></Field>
        </FormGrid>
      </Modal>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="MV Ocean Pearl" description="IMO 9384721 · REQ-2026-0142"
        footer={<Button variant="primary" onClick={() => setDrawer(false)}>Done</Button>}>
        <dl className={s.dl}>
          <dt>Status</dt><dd><StatusBadge status="Active" /></dd>
          <dt>Flag</dt><dd>Sri Lanka</dd>
          <dt>Gross tonnage</dt><dd className="tabular">4,120 GT</dd>
          <dt>Schedule II</dt><dd>3 files</dd>
        </dl>
      </Drawer>

      <ConfirmDialog
        open={confirm}
        title="Delete first entry?"
        message="This also deletes its Schedule II documents. This can't be undone."
        confirmText="Delete"
        destructive
        onConfirm={() => { setConfirm(false); toast.success('Deleted.'); }}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}
