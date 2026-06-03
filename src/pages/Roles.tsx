import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import s from './UserManagement.module.css';

export default function RolesPage() {
    const { roles, modules, addRole, updateRole, deleteRole, hasPermission } = useAuth();
    const canDeleteRole = hasPermission('Admin', 'delete') || hasPermission('Role Management', 'delete') || hasPermission(null, 'delete');
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState<any>(null);
    const [formData, setFormData] = useState({
        roleName: '',
        permissions: [] as { module: string; actions: string[] }[],
    });
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const openAdd = () => {
        setEditingRole(null);
        setFormData({ roleName: '', permissions: [] });
        setFormError('');
        setShowModal(true);
    };

    const openEdit = (role: any) => {
        setEditingRole(role);
        setFormData({
            roleName: role.roleName,
            permissions: role.permissions.map((p: any) => ({
                module: typeof p.module === 'object' ? p.module._id : p.module,
                actions: p.actions || [],
            })),
        });
        setFormError('');
        setShowModal(true);
    };

    const togglePermission = (moduleId: string, action: string) => {
        setFormData((prev) => {
            let found = false;
            const newPerms = prev.permissions.map(p => {
                if (p.module === moduleId) {
                    found = true;
                    const newActions = p.actions.includes(action)
                        ? p.actions.filter(a => a !== action)
                        : [...p.actions, action];
                    return { ...p, actions: newActions };
                }
                return p;
            });

            if (!found) {
                newPerms.push({ module: moduleId, actions: [action] });
            }
            return { ...prev, permissions: newPerms };
        });
    };

    const handleSave = async () => {
        if (!formData.roleName) {
            setFormError('Role name is required.');
            return;
        }

        setSaving(true);
        setFormError('');

        try {
            const payload = {
                roleName: formData.roleName,
                permissions: formData.permissions,
            };

            if (editingRole) {
                const res = await updateRole(editingRole._id, payload);
                if (!res.success) {
                    setFormError(res.error || 'Failed to update role');
                    setSaving(false);
                    return;
                }
            } else {
                const res = await addRole(payload);
                if (!res.success) {
                    setFormError(res.error || 'Failed to create role');
                    setSaving(false);
                    return;
                }
            }
            setShowModal(false);
        } catch (err: any) {
            setFormError(err.message || 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const res = await deleteRole(id);
        if (!res.success) {
            alert(res.error || 'Failed to delete role. Users might be assigned to it.');
        }
        setDeleteConfirm(null);
    };

    const actions = ['create', 'read', 'update', 'delete'];

    return (
        <>
            <div className={s.topBar}>
                <div>
                    <h2 className="section-header" style={{ marginBottom: '4px' }}>Role Management</h2>
                    <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Manage roles and granular module permissions</p>
                </div>
                <button className={s.addBtn} onClick={openAdd}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M9 3v12M3 9h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Add Role
                </button>
            </div>

            <div className={s.tableWrap}>
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th>Role Name</th>
                            <th>Modules Accessed</th>
                            <th style={{ width: '120px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map((role) => (
                            <tr key={role._id}>
                                <td style={{ fontWeight: 500, color: 'var(--text)', textTransform: 'capitalize' }}>
                                    {role.roleName}
                                </td>
                                <td>
                                    {role.permissions?.length || 0} module(s) mapped
                                </td>
                                <td>
                                    <div className={s.actions}>
                                        <button className={s.actionBtn} onClick={() => openEdit(role)} title="Edit">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M11.5 2.5l2 2M2 14l1-4L11.5 1.5l2 2L5 12l-4 1z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                        {role.roleName.toLowerCase() !== 'admin' && (
                                            <button className={`${s.actionBtn} ${s.deleteBtn}`} onClick={() => setDeleteConfirm(role._id)} title="Delete" disabled={!canDeleteRole}>
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className={s.overlay} onClick={() => setShowModal(false)}>
                    <div className={s.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className={s.modalHeader}>
                            <h3 className={s.modalTitle}>{editingRole ? 'Edit Role' : 'Add New Role'}</h3>
                            <button className={s.closeBtn} onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className={s.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {formError && (
                                <div style={{ background: 'var(--red-subtle)', color: 'var(--red)', fontSize: '13px', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', textAlign: 'center', border: '1px solid rgba(239,68,68,.15)' }}>
                                    {formError}
                                </div>
                            )}

                            <label className="form-label">Role Name</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="e.g. Inspector"
                                value={formData.roleName}
                                onChange={(e) => setFormData((p) => ({ ...p, roleName: e.target.value }))}
                                disabled={editingRole?.roleName.toLowerCase() === 'admin'}
                            />

                            <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '15px' }}>Module Permissions</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {modules.map(mod => {
                                    const perm = formData.permissions.find(p => p.module === mod._id);
                                    const selectedActions = perm ? perm.actions : [];

                                    return (
                                        <div key={mod._id} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--card-bg)' }}>
                                            <div style={{ fontWeight: 500, marginBottom: '8px', color: 'var(--text)' }}>
                                                {mod.parentId ? <span style={{ color: 'var(--separator)', marginRight: '8px' }}>↳</span> : null}
                                                {mod.name}
                                                <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 400, marginLeft: '8px' }}>
                                                    {mod.description}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                                {actions.map(action => (
                                                    <label key={action} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedActions.includes(action)}
                                                            onChange={() => togglePermission(mod._id, action)}
                                                            style={{ accentColor: 'var(--primary)' }}
                                                        />
                                                        <span style={{ textTransform: 'capitalize' }}>{action}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
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
                            <h3 className={s.modalTitle} style={{ marginBottom: '8px' }}>Delete Role?</h3>
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
