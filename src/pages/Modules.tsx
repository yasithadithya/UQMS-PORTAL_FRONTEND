import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { modulesService } from '@/api/services/modules.service';
import s from './UserManagement.module.css';

export default function ModulesPage() {
    const { modules, refreshModules } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [editingModule, setEditingModule] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        parentId: '',
    });
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const openAdd = () => {
        setEditingModule(null);
        setFormData({ name: '', description: '', parentId: '' });
        setFormError('');
        setShowModal(true);
    };

    const openEdit = (mod: any) => {
        setEditingModule(mod);
        setFormData({
            name: mod.name,
            description: mod.description || '',
            parentId: mod.parentId ? (typeof mod.parentId === 'object' ? mod.parentId._id : mod.parentId) : '',
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
            } else {
                const res = await modulesService.createModule(payload);
                if (!res.success) {
                    setFormError(res.message || 'Failed to create module');
                    setSaving(false);
                    return;
                }
            }
            await refreshModules();
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
            await refreshModules();
        } catch (err: any) {
            alert(err.message || 'Failed to delete module. It might have sub-modules.');
        }
        setDeleteConfirm(null);
    };

    const getParentName = (parentId: any) => {
        if (!parentId) return '-';
        if (typeof parentId === 'object') return parentId.name;
        const parent = modules.find(m => m._id === parentId);
        return parent ? parent.name : '-';
    };

    const parentModules = modules.filter(m => !m.parentId);

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
                            <th style={{ width: '120px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {modules.map((mod) => (
                            <tr key={mod._id}>
                                <td>
                                    <div style={{ fontWeight: 500, color: 'var(--text)' }}>
                                        {mod.parentId ? <span style={{ color: 'var(--separator)', marginRight: '8px' }}>↳</span> : null}
                                        {mod.name}
                                    </div>
                                </td>
                                <td>{mod.description || <span style={{ color: 'var(--muted)' }}>No description</span>}</td>
                                <td>{getParentName(mod.parentId)}</td>
                                <td>
                                    <div className={s.actions}>
                                        <button className={s.actionBtn} onClick={() => openEdit(mod)} title="Edit">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M11.5 2.5l2 2M2 14l1-4L11.5 1.5l2 2L5 12l-4 1z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                        <button className={`${s.actionBtn} ${s.deleteBtn}`} onClick={() => setDeleteConfirm(mod._id)} title="Delete">
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
                                <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
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
                                {parentModules.map((m) => {
                                    if (editingModule && m._id === editingModule._id) return null; // Can't be parent of itself
                                    return (
                                        <option key={m._id} value={m._id}>
                                            {m.name}
                                        </option>
                                    );
                                })}
                            </select>
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
