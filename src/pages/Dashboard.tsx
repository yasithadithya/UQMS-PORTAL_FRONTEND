import { useMemo, useState, type DragEvent } from 'react';
import { toast } from 'react-toastify';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, Check, FilePlus2, GripVertical, LayoutGrid, Maximize2, Plus, RotateCcw, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS } from '@/utils/permissions';
import type { DashboardWidgetPlacement, DashboardWidgetSize } from '@/api';
import { Badge, Button, ButtonLink, Card, Drawer, EmptyState, IconButton, Menu, PageHeader, Skeleton } from '@/ui';
import { DashboardDataProvider } from './dashboard/data';
import {
  DashboardLinksProvider, WIDGETS, WIDGETS_BY_ID, WIDGET_GROUPS, defaultLayout, useBuildDashboardLinks,
  type WidgetAccess, type WidgetDef,
} from './dashboard/widgets';
import { useDashboardLayout } from './dashboard/useDashboardLayout';
import s from './Dashboard.module.css';

const greetingForHour = (hour: number) => (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');

const SIZE_LABELS: Record<DashboardWidgetSize, string> = {
  sm: 'Small (quarter width)',
  md: 'Medium (half width)',
  lg: 'Large (full width)',
};

/** Drops widgets the user can't see (unknown id or no permission) and fixes sizes a widget doesn't support. */
function usableLayout(layout: DashboardWidgetPlacement[], access: WidgetAccess): DashboardWidgetPlacement[] {
  return layout.flatMap(p => {
    const def = WIDGETS_BY_ID[p.id];
    if (!def || !def.available(access)) return [];
    return [{ id: p.id, size: def.sizes.includes(p.size) ? p.size : def.sizes[0] }];
  });
}

/**
 * Home: a grid of widgets the user picks from the modules they can access. Until they customize it they see a
 * default layout built from their permissions. The layout is saved on their account.
 */
export default function DashboardPage() {
  const { user, can, canAny, modulesLoaded } = useAuth();
  const links = useBuildDashboardLinks();
  const access = useMemo<WidgetAccess>(() => ({ can, canAny, links }), [can, canAny, links]);
  const { saved, loaded, save } = useDashboardLayout(user?.id);

  const defaults = useMemo(() => defaultLayout(access), [access]);
  const current = useMemo(() => usableLayout(saved ?? defaults, access), [saved, defaults, access]);

  // While customizing, changes go to a draft that only replaces the saved layout on Save.
  const [draft, setDraft] = useState<DashboardWidgetPlacement[] | null>(null);
  const [draftIsDefault, setDraftIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const editing = draft !== null;
  const layout = draft ?? current;

  const change = (next: DashboardWidgetPlacement[]) => { setDraft(next); setDraftIsDefault(false); };
  const move = (from: number, to: number) => {
    if (!draft || to < 0 || to >= draft.length || from === to) return;
    const next = [...draft];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    change(next);
  };
  const remove = (id: string) => draft && change(draft.filter(p => p.id !== id));
  const resize = (id: string, size: DashboardWidgetSize) => draft && change(draft.map(p => (p.id === id ? { ...p, size } : p)));
  const add = (def: WidgetDef) => draft && change([...draft, { id: def.id, size: def.sizes[0] }]);

  const startEditing = () => { setDraft(current); setDraftIsDefault(saved == null); };
  const cancel = () => { setDraft(null); setAdding(false); };
  const resetToDefault = () => { setDraft(defaults); setDraftIsDefault(true); };

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await save(draftIsDefault ? null : draft);
      toast.success(draftIsDefault ? 'Dashboard reset to the default layout.' : 'Dashboard saved.');
      setDraft(null);
      setAdding(false);
    } catch (err: any) {
      toast.error(err?.message || 'Could not save your dashboard.');
    } finally {
      setSaving(false);
    }
  };

  /* ----- drag to reorder (the arrow buttons do the same for keyboard and touch) ----- */
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragProps = (id: string) => editing ? {
    draggable: true,
    onDragStart: (e: DragEvent) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); },
    onDragOver: (e: DragEvent) => { if (dragId) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (overId !== id) setOverId(id); } },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      if (dragId && draft) move(draft.findIndex(p => p.id === dragId), draft.findIndex(p => p.id === id));
      setDragId(null); setOverId(null);
    },
    onDragEnd: () => { setDragId(null); setOverId(null); },
  } : {};

  const now = new Date();
  const today = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fe = links.firstEntry;

  const headerActions = editing ? (
    <>
      <Button variant="ghost" icon={<RotateCcw />} onClick={resetToDefault} disabled={saving}>Reset to default</Button>
      <Button icon={<Plus />} onClick={() => setAdding(true)} disabled={saving}>Add widgets</Button>
      <Button onClick={cancel} disabled={saving}>Cancel</Button>
      <Button variant="primary" icon={<Check />} onClick={saveDraft} loading={saving}>Save layout</Button>
    </>
  ) : (
    <>
      {can(MODULE_KEYS.newRequest, 'override') && <ButtonLink to="/new-request/create" icon={<FilePlus2 />}>New request</ButtonLink>}
      {fe && can(MODULE_KEYS.marineEntries, 'create') && <ButtonLink to={`${fe}/create`} icon={<Plus />}>Create first entry</ButtonLink>}
      <Button variant="primary" icon={<LayoutGrid />} onClick={startEditing} disabled={!modulesLoaded}>Customize</Button>
    </>
  );

  // Widgets depend on the module tree (for permissions and links), and on the saved layout if there's no cached copy.
  const ready = modulesLoaded && (saved !== undefined || loaded);

  return (
    <DashboardLinksProvider value={links}>
      <DashboardDataProvider>
        <div className="animate-in">
          <PageHeader
            title={`${greetingForHour(now.getHours())}, ${user?.username || 'there'}`}
            description={today}
            actions={headerActions}
          />

          {editing && (
            <p className={s.editHint} role="status">
              Drag widgets to reorder them, or use the arrows. Use the size button to make a widget wider or narrower.
              Nothing changes until you select <strong>Save layout</strong>.
            </p>
          )}

          {!ready ? (
            <div className={s.grid} aria-busy="true">
              {[0, 1, 2, 3].map(i => <div key={i} className={clsx(s.cell, s.sm)}><Skeleton height={112} radius="var(--radius-lg)" /></div>)}
              <div className={clsx(s.cell, s.lg)}><Skeleton height={240} radius="var(--radius-lg)" /></div>
            </div>
          ) : layout.length === 0 ? (
            <Card padding="none">
              <EmptyState
                icon={<LayoutGrid />}
                title={editing ? 'No widgets yet' : 'Your dashboard is empty'}
                description={editing ? 'Add widgets for the modules you use.' : 'Choose the widgets you want to see here.'}
                action={editing
                  ? <Button variant="primary" icon={<Plus />} onClick={() => setAdding(true)}>Add widgets</Button>
                  : <Button variant="primary" icon={<LayoutGrid />} onClick={startEditing}>Customize</Button>}
              />
            </Card>
          ) : (
            <div className={s.grid}>
              {layout.map((p, index) => {
                const def = WIDGETS_BY_ID[p.id];
                const { Component } = def;
                return (
                  <div
                    key={p.id}
                    className={clsx(s.cell, s[p.size], editing && s.editing, dragId === p.id && s.dragging, overId === p.id && dragId !== p.id && s.dropTarget)}
                    {...dragProps(p.id)}
                  >
                    {editing && (
                      <div className={s.toolbar}>
                        <GripVertical className={s.grip} aria-hidden="true" />
                        <span className={s.toolbarTitle}>{def.title}</span>
                        <IconButton size="sm" label="Move earlier" icon={<ArrowUp />} disabled={index === 0} onClick={() => move(index, index - 1)} />
                        <IconButton size="sm" label="Move later" icon={<ArrowDown />} disabled={index === layout.length - 1} onClick={() => move(index, index + 1)} />
                        {def.sizes.length > 1 && (
                          <Menu
                            label="Change size"
                            trigger={<IconButton size="sm" label="Change size" icon={<Maximize2 />} noTooltip />}
                            items={def.sizes.map(size => ({
                              label: SIZE_LABELS[size],
                              icon: size === p.size ? <Check /> : <span />,
                              onSelect: () => resize(p.id, size),
                            }))}
                          />
                        )}
                        <IconButton size="sm" label="Remove widget" icon={<X />} variant="dangerGhost" onClick={() => remove(p.id)} />
                      </div>
                    )}
                    {/* While editing, the widget is a preview: `inert` stops its links and buttons taking clicks or focus. */}
                    <div className={s.content} ref={el => { if (el) el.toggleAttribute('inert', editing); }}>
                      <Component />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <AddWidgetsDrawer
            open={adding}
            onClose={() => setAdding(false)}
            access={access}
            placed={new Set(layout.map(p => p.id))}
            onAdd={add}
          />
        </div>
      </DashboardDataProvider>
    </DashboardLinksProvider>
  );
}

/* ------------------------------------------------------------------ widget picker */

function AddWidgetsDrawer({ open, onClose, access, placed, onAdd }: {
  open: boolean; onClose: () => void; access: WidgetAccess; placed: Set<string>; onAdd: (def: WidgetDef) => void;
}) {
  const available = WIDGETS.filter(w => w.available(access));
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add widgets"
      description="Widgets for the modules your role can access. Added widgets go to the end of your dashboard."
      footer={<Button variant="primary" onClick={onClose}>Done</Button>}
    >
      {WIDGET_GROUPS.map(group => {
        const items = available.filter(w => w.group === group);
        if (items.length === 0) return null;
        return (
          <section key={group} className={s.pickerGroup} aria-labelledby={`widgets-${group}`}>
            <h3 id={`widgets-${group}`} className={s.pickerGroupTitle}>{group}</h3>
            <ul className={s.pickerList}>
              {items.map(w => {
                const isPlaced = placed.has(w.id);
                return (
                  <li key={w.id} className={s.pickerItem}>
                    <span className={s.pickerIcon} aria-hidden="true">{w.icon}</span>
                    <span className={s.rowMain}>
                      <span className={s.pickerTitle}>{w.title}</span>
                      <span className={s.pickerDescription}>{w.description}</span>
                    </span>
                    {isPlaced
                      ? <Badge tone="success" dot>Added</Badge>
                      : <Button size="sm" icon={<Plus />} onClick={() => onAdd(w)} aria-label={`Add ${w.title}`}>Add</Button>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </Drawer>
  );
}
