import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { modulesService } from '@/api/services/modules.service';
import { toast } from 'react-toastify';
import s from './UserManagement.module.css';

export default function ModulesPage() {
    const { modules, refreshModules, setModulesOptimistic, hasPermission } = useAuth();
    const canDeleteModule = hasPermission('Admin', 'delete') || hasPermission('Module Management', 'delete') || hasPermission(null, 'delete');
    const [showModal, setShowModal] = useState(false);
    const [editingModule, setEditingModule] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        parentId: '',
        order: 0,
    });
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    const openAdd = () => {
        setEditingModule(null);
        setFormData({ name: '', description: '', parentId: '', order: 0 });
        setFormError('');
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
        if (!formData.name) {
            setFormError('Module name is required.');
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
            alert(err.message || 'Failed to delete module. It might have sub-modules.');
        }
        setDeleteConfirm(null);
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
                options.push({ id: child._id, label: child.name, depth });
                addOptions(child._id, depth + 1);
            }
        };

        addOptions(null, 0);
        return options;
    })();

    const handleDrop = async (targetMod: any) => {
        if (!draggedId || draggedId === targetMod._id) return;

        const draggedMod = modules.find(m => m._id === draggedId);
        if (!draggedMod) return;

        const parentId = getParentId(draggedMod);
        const targetParentId = getParentId(targetMod);

        if (parentId !== targetParentId) {
            toast.error("Modules can only be reordered within the same parent level.");
            setDraggedId(null);
            setDragOverId(null);
            return;
        }

        const siblings = modules.filter(m => getParentId(m) === parentId);

        siblings.sort((a, b) => (a.order || 0) - (b.order || 0));

        const filteredSiblings = siblings.filter(s => s._id !== draggedId);

        const targetIndex = filteredSiblings.findIndex(s => s._id === targetMod._id);
        if (targetIndex === -1) return;

        filteredSiblings.splice(targetIndex, 0, draggedMod);

        // Optimistic: immediately update order in local state
        const orderMap = new Map<string, number>();
        filteredSiblings.forEach((sibling, index) => {
            orderMap.set(sibling._id, index);
        });
        setModulesOptimistic(
            modules.map(m => orderMap.has(m._id) ? { ...m, order: orderMap.get(m._id)! } : m)
        );

        setSaving(true);
        try {
            const promises = filteredSiblings.map((sibling, index) => {
                return modulesService.updateModule(sibling._id, {
                    name: sibling.name,
                    description: sibling.description,
                    parentId: getParentId(sibling) || undefined,
                    order: index
                });
            });

            await Promise.all(promises);
            // Refresh from server to get canonical data
            refreshModules();
            toast.success("Module order updated successfully!");
        } catch (err: any) {
            toast.error("Failed to update module order: " + err.message);
            // Revert on failure
            refreshModules();
        } finally {
            setSaving(false);
            setDraggedId(null);
            setDragOverId(null);
        }
    };

    return (
        <>
            <div className={s.topBar}>
                <div>
                    <h2 className="section-header" style={{ marginBottom: '4px' }}>Module Management</h2>
                    <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Manage system features and sub-features</p>
                </div>
                <button className={s.addBtn} onClick={openAdd}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M9 3v12M3 9h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Add Module
                </button>
            </div>

            <div className={s.tableWrap}>
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Parent Module</th>
                            <th style={{ width: '110px', textAlign: 'center' }}>Order</th>
                            <th style={{ width: '120px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedModules.map((mod) => (
                            <tr 
                                key={mod._id}
                                draggable={true}
                                onDragStart={(e) => {
                                    setDraggedId(mod._id);
                                    e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    const draggedMod = modules.find(m => m._id === draggedId);
                                    if (draggedMod && draggedId !== mod._id) {
                                        const pId = getParentId(draggedMod);
                                        const targetPId = getParentId(mod);
                                        if (pId === targetPId) {
                                            setDragOverId(mod._id);
                                        }
                                    }
                                }}
                                onDragLeave={() => {
                                    setDragOverId(null);
                                }}
                                onDragEnd={() => {
                                    setDraggedId(null);
                                    setDragOverId(null);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    handleDrop(mod);
                                }}
                                style={{
                                    cursor: 'grab',
                                    opacity: draggedId === mod._id ? 0.4 : 1,
                                    borderTop: dragOverId === mod._id ? '2px solid var(--primary)' : undefined,
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <td>
                                    <div style={{ fontWeight: 500, color: 'var(--text)', paddingLeft: `${((mod as any).depth || 0) * 24}px`, display: 'flex', alignItems: 'center' }}>
                                        {(mod as any).depth > 0 ? <span style={{ color: 'var(--separator)', marginRight: '8px', opacity: 0.5 }}>{'↳'.repeat(1)}</span> : null}
                                        {mod.name}
                                    </div>
                                </td>
                                <td>{mod.description || <span style={{ color: 'var(--muted)' }}>No description</span>}</td>
                                <td>{getAncestryPath(mod)}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ color: 'var(--muted)', fontSize: '14px', marginRight: '4px', userSelect: 'none' }} title="Drag row to reorder">
                                            ☰
                                        </span>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', minWidth: '20px', textAlign: 'center' }}>
                                            {mod.order || 0}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <div className={s.actions}>
                                        <button className={s.actionBtn} onClick={() => openEdit(mod)} title="Edit">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M11.5 2.5l2 2M2 14l1-4L11.5 1.5l2 2L5 12l-4 1z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                        <button className={`${s.actionBtn} ${s.deleteBtn}`} onClick={() => setDeleteConfirm(mod._id)} title="Delete" disabled={!canDeleteModule}>
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {modules.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                                    No modules found. Create one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className={s.overlay} onClick={() => setShowModal(false)}>
                    <div className={s.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={s.modalHeader}>
                            <h3 className={s.modalTitle}>{editingModule ? 'Edit Module' : 'Add New Module'}</h3>
                            <button className={s.closeBtn} onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className={s.modalBody}>
                            {formError && (
                                <div style={{ background: 'var(--red-subtle)', color: 'var(--red)', fontSize: '13px', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', textAlign: 'center', border: '1px solid rgba(239,68,68,.15)' }}>
                                    {formError}
                                </div>
                            )}

                            <label className="form-label">Module Name</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="e.g. Reporting"
                                value={formData.name}
                                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                            />

                            <label className="form-label">Description (Optional)</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Brief description"
                                value={formData.description}
                                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                            />

                            <label className="form-label">Parent Module (Optional)</label>
                            <select
                                className="form-input"
                                value={formData.parentId}
                                onChange={(e) => setFormData((p) => ({ ...p, parentId: e.target.value }))}
                            >
                                <option value="">-- None (Root Module) --</option>
                                {parentDropdownOptions.map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                        {'\u00A0\u00A0'.repeat(opt.depth)}{opt.depth > 0 ? '↳ ' : ''}{opt.label}
                                    </option>
                                ))}
                            </select>

                            <label className="form-label" style={{ marginTop: '12px' }}>Display Order</label>
                            <input
                                className="form-input"
                                type="number"
                                placeholder="0"
                                value={formData.order}
                                onChange={(e) => setFormData((p) => ({ ...p, order: Number(e.target.value) }))}
                            />
                        </div>

                        <div className={s.modalFooter}>
                            <button className="btn-secondary" style={{ width: '100%', minWidth: 0 }} onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn-primary" style={{ width: '100%', minWidth: 0, marginBottom: 0 }} onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className={s.overlay} onClick={() => setDeleteConfirm(null)}>
                    <div className={s.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '360px' }}>
                        <div className={s.modalBody} style={{ textAlign: 'center', padding: '28px 24px' }}>
                            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
                            <h3 className={s.modalTitle} style={{ marginBottom: '8px' }}>Delete Module?</h3>
                            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>This action cannot be undone.</p>
                        </div>
                        <div className={s.modalFooter}>
                            <button className="btn-secondary" style={{ width: '100%', minWidth: 0 }} onClick={() => setDeleteConfirm(null)}>Cancel</button>
                            <button className="btn-primary" style={{ width: '100%', minWidth: 0, marginBottom: 0, background: 'var(--red)' }} onClick={() => handleDelete(deleteConfirm)}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
