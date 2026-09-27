import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { ApiModule } from '@/api';
import { getParentId } from '@/utils/modules';
import { ACTION_LABELS, MODULE_KEYS, isSuperAdminRole, moduleActions, permissionModuleId } from '@/utils/permissions';
import s from './UserManagement.module.css';

type PermissionMap = Record<string, string[]>;

/** Modules in tree order (parents before children, siblings by order) with their depth. */
function flattenTree(modules: ApiModule[]): { mod: ApiModule; depth: number }[] {
    const byParent = new Map<string | null, ApiModule[]>();
    for (const m of modules) {
        const parent = getParentId(m);
        if (!byParent.has(parent)) byParent.set(parent, []);
        byParent.get(parent)!.push(m);
    }
    for (const list of byParent.values()) list.sort((a, b) => (a.order || 0) - (b.order || 0));

    const result: { mod: ApiModule; depth: number }[] = [];
    const visit = (parent: string | null, depth: number) => {
        for (const m of byParent.get(parent) || []) {
            result.push({ mod: m, depth });
            visit(m._id, depth + 1);
        }
    };
    visit(null, 0);
    return result;
}

export default function RolesPage() {
    const { roles, modules, addRole, updateRole, deleteRole, can, canAccessModule, user, isSuperAdmin } = useAuth();
    const canCreateRole = can(MODULE_KEYS.adminRoles, 'create');
    const canUpdateRole = can(MODULE_KEYS.adminRoles, 'update');
    const canDeleteRole = can(MODULE_KEYS.adminRoles, 'delete');
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState<any>(null);
    const [roleName, setRoleName] = useState('');
    const [permissions, setPermissions] = useState<PermissionMap>({});
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const tree = useMemo(() => flattenTree(modules), [modules]);
    const moduleById = useMemo(() => new Map(modules.map(m => [m._id, m])), [modules]);

    const ancestorsOf = (moduleId: string): string[] => {
        const result: string[] = [];
        let parent = moduleById.get(moduleId) ? getParentId(moduleById.get(moduleId)!) : null;
        while (parent && !result.includes(parent)) {
            result.push(parent);
            parent = moduleById.get(parent) ? getParentId(moduleById.get(parent)!) : null;
        }
        return result;
    };

    const descendantsOf = (moduleId: string): string[] => {
        const result: string[] = [];
        const queue = [moduleId];
        while (queue.length) {
            const current = queue.shift()!;
            for (const m of modules) {
                if (getParentId(m) === current && !result.includes(m._id)) {
                    result.push(m._id);
                    queue.push(m._id);
                }
            }
        }
        return result;
    };

    /** Actions the signed-in user may grant: a non-super-admin can only grant what they hold. */
    const canGrant = (moduleId: string, action: string) => isSuperAdmin || canAccessModule(moduleId, action);

    const openAdd = () => {
        setEditingRole(null);
        setRoleName('');
        setPermissions({});
        setFormError('');
        setShowModal(true);
    };

    const openEdit = (role: any) => {
        setEditingRole(role);
        setRoleName(role.roleName);
        const map: PermissionMap = {};
        for (const p of role.permissions || []) {
            map[permissionModuleId(p.module)] = [...(p.actions || [])];
        }
        setPermissions(map);
        setFormError('');
        setShowModal(true);
    };

    const togglePermission = (moduleId: string, action: string) => {
        setPermissions(prev => {
            const next: PermissionMap = { ...prev };
            const current = new Set(next[moduleId] || []);
            const grant = (id: string, a: string) => {
                const mod = moduleById.get(id);
                if (!mod || !moduleActions(mod).includes(a)) return;
                next[id] = Array.from(new Set([...(next[id] || []), a]));
            };

            if (current.has(action)) {
                if (action === 'read') {
                    // Without read nothing else on this module (or below it) is reachable.
                    delete next[moduleId];
                    for (const id of descendantsOf(moduleId)) delete next[id];
                } else {
                    current.delete(action);
                    next[moduleId] = Array.from(current);
                }
            } else {
                // Any action implies read on the module and on every ancestor, so the UI can reach it.
                grant(moduleId, action);
                grant(moduleId, 'read');
                for (const id of ancestorsOf(moduleId)) grant(id, 'read');
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (!roleName.trim()) {
            setFormError('Role name is required.');
            return;
        }

        setSaving(true);
        setFormError('');

        const payload = {
            roleName: roleName.trim(),
            permissions: Object.entries(permissions)
                .filter(([, actions]) => actions.length > 0)
                .map(([module, actions]) => ({ module, actions })),
        };

        try {
            const res = editingRole ? await updateRole(editingRole._id, payload) : await addRole(payload);
            if (!res.success) {
                setFormError(res.error || (editingRole ? 'Failed to update role' : 'Failed to create role'));
                return;
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

    const editingSuperAdmin = !!editingRole && isSuperAdminRole(editingRole);
    const editingOwnRole = !!editingRole && editingRole._id === user?.role?._id;
    const readOnly = (editingRole && !canUpdateRole) || editingSuperAdmin || (editingOwnRole && !isSuperAdmin);

    return (
        <>
            <div className={s.topBar}>
                <div>
                    <h2 className="section-header" style={{ marginBottom: '4px' }}>Role Management</h2>
                    <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Manage roles and granular module permissions</p>
                </div>
                {canCreateRole && (
                    <button className={s.addBtn} onClick={openAdd}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M9 3v12M3 9h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Add Role
                    </button>
                )}
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
                                    {isSuperAdminRole(role) ? 'Full access' : `${role.permissions?.length || 0} module(s) mapped`}
                                </td>
                                <td>
                                    <div className={s.actions}>
                                        <button className={s.actionBtn} onClick={() => openEdit(role)} title={canUpdateRole ? 'Edit' : 'View'}>
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M11.5 2.5l2 2M2 14l1-4L11.5 1.5l2 2L5 12l-4 1z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                        {!isSuperAdminRole(role) && role._id !== user?.role?._id && (
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
                    <div className={s.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
                        <div className={s.modalHeader}>
                            <h3 className={s.modalTitle}>{!editingRole ? 'Add New Role' : readOnly ? 'View Role' : 'Edit Role'}</h3>
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
                                value={roleName}
                                onChange={(e) => setRoleName(e.target.value)}
                                disabled={editingSuperAdmin || readOnly}
                            />

                            <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '15px' }}>Module Permissions</h4>
                            {editingSuperAdmin ? (
                                <div className="card" style={{ padding: '16px', fontSize: '13px', color: 'var(--muted)', marginBottom: 0 }}>
                                    The <strong>admin</strong> role has full access to every module. Its permissions can't be restricted.
                                </div>
                            ) : (
                                <>
                                    {editingOwnRole && !isSuperAdmin && (
                                        <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>You can't change the permissions of your own role.</p>
                                    )}
                                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
                                        Granting any action also grants Read on the module and its parents. Removing Read removes all access to the module and its sub-modules.
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {tree.map(({ mod, depth }) => {
                                            const selected = permissions[mod._id] || [];
                                            return (
                                                <div
                                                    key={mod._id}
                                                    style={{
                                                        padding: '12px 16px',
                                                        marginLeft: `${depth * 20}px`,
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '10px',
                                                        background: 'var(--card-bg)',
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 500, marginBottom: '8px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        {depth > 0 && <span style={{ color: 'var(--separator)' }}>↳</span>}
                                                        {mod.name}
                                                        {mod.isSystem && (
                                                            <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '6px', background: 'var(--primary-subtle)', color: 'var(--primary)' }}>SYSTEM</span>
                                                        )}
                                                        <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 400 }}>{mod.description}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                                        {moduleActions(mod).map(action => {
                                                            const checked = selected.includes(action);
                                                            // Existing grants can always be removed; new ones need the granter to hold them.
                                                            const disabled = readOnly || (!checked && !canGrant(mod._id, action));
                                                            return (
                                                                <label key={action} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled && !checked ? 0.5 : 1 }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        disabled={disabled}
                                                                        onChange={() => togglePermission(mod._id, action)}
                                                                        style={{ accentColor: 'var(--primary)' }}
                                                                    />
                                                                    <span>{ACTION_LABELS[action] || action}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className={s.modalFooter}>
                            <button className="btn-secondary" style={{ width: '100%', minWidth: 0 }} onClick={() => setShowModal(false)}>
                                {readOnly ? 'Close' : 'Cancel'}
                            </button>
                            {!readOnly && (
                                <button className="btn-primary" style={{ width: '100%', minWidth: 0, marginBottom: 0 }} onClick={handleSave} disabled={saving}>
                                    {saving ? 'Saving…' : 'Save'}
                                </button>
                            )}
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
