import { useState, type CSSProperties } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS, isNavigable } from '@/utils/permissions';
import { modulesService } from '@/api/services/modules.service';
import { toast } from 'react-toastify';
import { ArrowDown, ArrowUp, Blocks, CornerDownRight, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, IconButton, Input, Menu, Modal, PageHeader, Select } from '@/ui';
import s from './Modules.module.css';

export default function ModulesPage() {
    const { modules, refreshModules, setModulesOptimistic, can } = useAuth();
    const canCreateModule = can(MODULE_KEYS.adminModules, 'create');
    const canUpdateModule = can(MODULE_KEYS.adminModules, 'update');
    const canDeleteModule = can(MODULE_KEYS.adminModules, 'delete');
    const [showModal, setShowModal] = useState(false);
    const [editingModule, setEditingModule] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        parentId: '',
        order: 0,
    });
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [nameError, setNameError] = useState<string>();
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    const openAdd = () => {
        setEditingModule(null);
        setFormData({ name: '', description: '', parentId: '', order: 0 });
        setFormError('');
        setNameError(undefined);
        setShowModal(true);
    };

    const openEdit = (mod: any) => {
        setEditingModule(mod);
        setFormData({
            name: mod.name,
            description: mod.description || '',
            parentId: mod.parentId ? (typeof mod.parentId === 'object' ? mod.parentId._id : mod.parentId) : '',
            order: mod.order || 0,
        });
        setFormError('');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            setNameError('Enter a module name.');
            return;
        }

        setSaving(true);
        setFormError('');

        try {
            const payload: any = {
                name: formData.name,
                description: formData.description,
                order: formData.order,
            };
            if (formData.parentId) {
                payload.parentId = formData.parentId;
            }

            if (editingModule) {
                const res = await modulesService.updateModule(editingModule._id, payload);
                if (!res.success) {
                    setFormError(res.message || 'Failed to update module');
                    setSaving(false);
                    return;
                }
                // Optimistic: update the module in state immediately
                setModulesOptimistic(
                    modules.map(m => m._id === editingModule._id ? { ...m, ...payload, parentId: payload.parentId || m.parentId } : m)
                );
            } else {
                const res = await modulesService.createModule(payload);
                if (!res.success) {
                    setFormError(res.message || 'Failed to create module');
                    setSaving(false);
                    return;
                }
                // Optimistic: add the new module to state immediately
                if (res.data) {
                    setModulesOptimistic([...modules, res.data]);
                }
            }
            // Also refresh from server to get canonical data (populated parentId etc.)
            refreshModules();
            setShowModal(false);
        } catch (err: any) {
            setFormError(err.message || 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await modulesService.deleteModule(id);
            // Optimistic: remove the module from state immediately
            setModulesOptimistic(modules.filter(m => m._id !== id));
            // Also refresh from server
            refreshModules();
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete module. It might have sub-modules.');
        }
    };




    // --- Helpers for tree structure ---
    const getParentId = (mod: any) => {
        if (!mod.parentId) return null;
        return typeof mod.parentId === 'object' ? mod.parentId._id : mod.parentId;
    };

    // Build a flat sorted list with depth for display
    const sortedModules = (() => {
        const result: (typeof modules[0] & { depth: number })[] = [];

        const addChildren = (parentId: string | null, depth: number) => {
            const children = modules.filter(m => getParentId(m) === parentId);
            children.sort((a, b) => (a.order || 0) - (b.order || 0));
            for (const child of children) {
                (child as any).depth = depth;
                result.push(child as any);
                addChildren(child._id, depth + 1);
            }
        };

        addChildren(null, 0);
        return result;
    })();

    // Get all descendant IDs of a module (to exclude from parent dropdown when editing)
    const getDescendantIds = (moduleId: string): Set<string> => {
        const descendants = new Set<string>();
        const queue = [moduleId];
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const children = modules.filter(m => getParentId(m) === currentId);
            for (const child of children) {
                if (!descendants.has(child._id)) {
                    descendants.add(child._id);
                    queue.push(child._id);
                }
            }
        }
        return descendants;
    };

    // Build full ancestry path string for display
    const getAncestryPath = (mod: any): string => {
        const path: string[] = [];
        let current = mod;
        let depth = 0;
        while (current?.parentId && depth < 10) {
            const parent = typeof current.parentId === 'object' ? current.parentId : modules.find(m => m._id === current.parentId);
            if (parent) {
                path.unshift(parent.name);
                current = parent;
            } else break;
            depth++;
        }
        return path.length > 0 ? path.join(' › ') : '-';
    };

    // Build tree-indented options for parent dropdown (all modules, indented by depth)
    const parentDropdownOptions = (() => {
        const options: { id: string; label: string; depth: number }[] = [];
        const excludedIds = editingModule ? getDescendantIds(editingModule._id) : new Set<string>();

        const addOptions = (parentId: string | null, depth: number) => {
            const children = modules.filter(m => getParentId(m) === parentId);
            children.sort((a, b) => (a.order || 0) - (b.order || 0));
            for (const child of children) {
                // Exclude self and all descendants when editing
                if (editingModule && child._id === editingModule._id) continue;
                if (excludedIds.has(child._id)) continue;
                if (!isNavigable(child)) continue;
                options.push({ id: child._id, label: child.name, depth });
                addOptions(child._id, depth + 1);
            }
        };

        addOptions(null, 0);
        return options;
    })();

    const siblingsOf = (mod: any) =>
        modules.filter(m => getParentId(m) === getParentId(mod)).sort((a, b) => (a.order || 0) - (b.order || 0));

    /** Moves `mod` to `newIndex` among its siblings and saves the new order for all of them. */
    const reorder = async (mod: any, newIndex: number) => {
        const ordered = siblingsOf(mod).filter(s => s._id !== mod._id);
        ordered.splice(Math.max(0, Math.min(newIndex, ordered.length)), 0, mod);

        // Optimistic: immediately update order in local state
        const orderMap = new Map<string, number>();
        ordered.forEach((sibling, index) => orderMap.set(sibling._id, index));
        setModulesOptimistic(modules.map(m => (orderMap.has(m._id) ? { ...m, order: orderMap.get(m._id)! } : m)));

        setSaving(true);
        try {
            await Promise.all(ordered.map((sibling, index) =>
                modulesService.updateModule(sibling._id, {
                    name: sibling.name,
                    description: sibling.description,
                    parentId: getParentId(sibling) || undefined,
                    order: index,
                })
            ));
            // Refresh from server to get canonical data
            refreshModules();
            toast.success('Module order updated.');
        } catch (err: any) {
            toast.error('Failed to update module order: ' + err.message);
            // Revert on failure
            refreshModules();
        } finally {
            setSaving(false);
            setDraggedId(null);
            setDragOverId(null);
        }
    };

    const handleDrop = (targetMod: any) => {
        if (!draggedId || draggedId === targetMod._id) return;
        const draggedMod = modules.find(m => m._id === draggedId);
        if (!draggedMod) return;
        if (getParentId(draggedMod) !== getParentId(targetMod)) {
            toast.error('Modules can only be reordered within the same parent.');
            setDraggedId(null);
            setDragOverId(null);
            return;
        }
        const targetIndex = siblingsOf(targetMod).filter(s => s._id !== draggedId).findIndex(s => s._id === targetMod._id);
        if (targetIndex >= 0) reorder(draggedMod, targetIndex);
    };

    const moveBy = (mod: any, delta: number) => {
        const index = siblingsOf(mod).findIndex(s => s._id === mod._id);
        reorder(mod, index + delta);
    };

    return (
        <div className="animate-in">
            <PageHeader
                breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Modules' }]}
                title="Modules"
                description="The navigation tree and the permission areas roles are built from. Drag rows, or use the row menu, to reorder siblings."
                actions={canCreateModule && <Button variant="primary" icon={<Plus />} onClick={openAdd}>Add module</Button>}
            />

            <Card padding="none">
                {sortedModules.length === 0 ? (
                    <EmptyState icon={<Blocks />} title="No modules yet" description="Create a module to get started." />
                ) : (
                    <ul className={s.tree} aria-label="Modules" aria-busy={saving || undefined}>
                        {sortedModules.map((mod) => {
                            const depth = (mod as any).depth || 0;
                            const siblings = siblingsOf(mod);
                            const index = siblings.findIndex(x => x._id === mod._id);
                            return (
                                <li
                                    key={mod._id}
                                    className={`${s.row} ${draggedId === mod._id ? s.dragging : ''} ${dragOverId === mod._id ? s.dropTarget : ''}`}
                                    draggable={canUpdateModule && !saving}
                                    onDragStart={(e) => {
                                        setDraggedId(mod._id);
                                        e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        const draggedMod = modules.find(m => m._id === draggedId);
                                        if (draggedMod && draggedId !== mod._id && getParentId(draggedMod) === getParentId(mod)) {
                                            setDragOverId(mod._id);
                                        }
                                    }}
                                    onDragLeave={() => setDragOverId(null)}
                                    onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                                    onDrop={(e) => { e.preventDefault(); handleDrop(mod); }}
                                >
                                    {canUpdateModule && <GripVertical className={s.grip} aria-hidden="true" />}
                                    <div className={s.main} style={{ '--depth': depth } as CSSProperties}>
                                        {depth > 0 && <CornerDownRight className={s.branch} aria-hidden="true" />}
                                        <div className={s.text}>
                                            <span className={`${s.name} ${isNavigable(mod) ? '' : s.hidden}`}>
                                                {mod.name}
                                                {mod.isSystem && (
                                                    <Badge title={`System module (${mod.key})${isNavigable(mod) ? '' : ': permission only, not shown in navigation'}`}>
                                                        {isNavigable(mod) ? 'System' : 'System · permission only'}
                                                    </Badge>
                                                )}
                                            </span>
                                            <span className={s.desc}>
                                                {mod.description || 'No description'}
                                                {depth > 0 && <> · in {getAncestryPath(mod)}</>}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={s.order} title="Display order">#{(mod.order || 0) + 1}</span>
                                    <div className={s.actions}>
                                        <IconButton label={`Edit ${mod.name}`} icon={<Pencil />} size="sm" onClick={() => openEdit(mod)} disabled={!canUpdateModule} />
                                        <Menu
                                            label={`More actions for ${mod.name}`}
                                            items={[
                                                canUpdateModule && { label: 'Move up', icon: <ArrowUp />, disabled: index <= 0 || saving, onSelect: () => moveBy(mod, -1) },
                                                canUpdateModule && { label: 'Move down', icon: <ArrowDown />, disabled: index >= siblings.length - 1 || saving, onSelect: () => moveBy(mod, 1) },
                                                mod.isSystem ? false : 'separator',
                                                !mod.isSystem && { label: 'Delete', icon: <Trash2 />, danger: true, disabled: !canDeleteModule, onSelect: () => setDeleteTarget(mod) },
                                            ]}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Card>

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                dismissible={!saving}
                title={editingModule ? `Edit ${editingModule.name}` : 'Add module'}
                description={editingModule?.isSystem ? `System module (${editingModule.key}). Permissions and routes depend on it, so only the description and order can be changed.` : undefined}
                footer={
                    <>
                        <Button onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave} loading={saving}>{editingModule ? 'Save changes' : 'Add module'}</Button>
                    </>
                }
            >
                {formError && <p className={s.formError} role="alert">{formError}</p>}
                <div className={s.stack}>
                    <Field label="Name" required error={nameError}>
                        <Input placeholder="e.g. Reporting" value={formData.name} disabled={!!editingModule?.isSystem} autoFocus={!editingModule}
                            onChange={(e) => { setFormData((p) => ({ ...p, name: e.target.value })); setNameError(undefined); }} />
                    </Field>
                    <Field label="Description">
                        <Input placeholder="Shown on the module's overview page" value={formData.description}
                            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
                    </Field>
                    <Field label="Parent module" hint="Leave empty for a top-level module.">
                        <Select value={formData.parentId} disabled={!!editingModule?.isSystem}
                            onChange={(e) => setFormData((p) => ({ ...p, parentId: e.target.value }))}>
                            <option value="">None (top level)</option>
                            {parentDropdownOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                    {'  '.repeat(opt.depth)}{opt.depth > 0 ? '↳ ' : ''}{opt.label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Display order" hint="Lower numbers come first among siblings.">
                        <Input type="number" inputMode="numeric" value={formData.order}
                            onChange={(e) => setFormData((p) => ({ ...p, order: Number(e.target.value) }))} />
                    </Field>
                </div>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title={`Delete ${deleteTarget?.name ?? 'module'}?`}
                message="Modules with sub-modules can't be deleted. This can't be undone."
                confirmText="Delete module"
                destructive
                onConfirm={() => { const target = deleteTarget; setDeleteTarget(null); if (target) handleDelete(target._id); }}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
