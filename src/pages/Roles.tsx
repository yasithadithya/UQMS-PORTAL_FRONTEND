import { useMemo, useState, type CSSProperties } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import type { ApiModule } from '@/api';
import { getParentId } from '@/utils/modules';
import { ACTION_LABELS, MODULE_KEYS, isSuperAdminRole, moduleActions, permissionModuleId } from '@/utils/permissions';
import { CornerDownRight, Eye, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Badge, Button, ConfirmDialog, DataTable, Field, IconButton, Input, Modal, PageHeader, type Column } from '@/ui';
import s from './Roles.module.css';

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
    const { roles, users, modules, addRole, updateRole, deleteRole, can, canAccessModule, user, isSuperAdmin } = useAuth();
    const canCreateRole = can(MODULE_KEYS.adminRoles, 'create');
    const canUpdateRole = can(MODULE_KEYS.adminRoles, 'update');
    const canDeleteRole = can(MODULE_KEYS.adminRoles, 'delete');
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState<any>(null);
    const [roleName, setRoleName] = useState('');
    const [permissions, setPermissions] = useState<PermissionMap>({});
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);
    const [nameError, setNameError] = useState<string>();
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
        setNameError(undefined);
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
            setNameError('Enter a role name.');
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
            toast.success(editingRole ? 'Role updated.' : 'Role added.');
            setShowModal(false);
        } catch (err: any) {
            setFormError(err.message || 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const res = await deleteRole(deleteTarget._id);
        setDeleting(false);
        setDeleteTarget(null);
        if (!res.success) {
            toast.error(res.error || 'Failed to delete role. Users might be assigned to it.');
        } else {
            toast.success('Role deleted.');
        }
    };

    const editingSuperAdmin = !!editingRole && isSuperAdminRole(editingRole);
    const editingOwnRole = !!editingRole && editingRole._id === user?.role?._id;
    const readOnly = (editingRole && !canUpdateRole) || editingSuperAdmin || (editingOwnRole && !isSuperAdmin);

    // Every action any module offers, in a stable order, as matrix columns.
    const ACTION_ORDER = ['read', 'create', 'update', 'delete', 'approve', 'accept', 'sign-on-behalf', 'revoke-signature', 'override', 'discount', 'export'];
    const matrixActions = ACTION_ORDER.filter(a => modules.some(m => moduleActions(m).includes(a)));

    const usersIn = (roleId: string) => users.filter((u: any) => (typeof u.role === 'object' ? u.role?._id : u.role) === roleId).length;

    const columns: Column<any>[] = [
        {
            key: 'name', header: 'Role', primary: true,
            cell: (role) => (
                <span className={s.roleName}>
                    {role.roleName}
                    {isSuperAdminRole(role) && <Badge tone="accent">Full access</Badge>}
                    {role._id === user?.role?._id && <Badge tone="info">Your role</Badge>}
                </span>
            ),
        },
        {
            key: 'modules', header: 'Access',
            cell: (role) => isSuperAdminRole(role) ? 'Every module' : `${role.permissions?.length || 0} ${(role.permissions?.length || 0) === 1 ? 'module' : 'modules'}`,
        },
        { key: 'users', header: 'Users', nowrap: true, cell: (role) => <span className="tabular">{usersIn(role._id)}</span> },
    ];

    return (
        <div className="animate-in">
            <PageHeader
                breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Roles & permissions' }]}
                title="Roles & permissions"
                description="A role decides which modules its users can open and what they can do there."
                actions={canCreateRole && <Button variant="primary" icon={<Plus />} onClick={openAdd}>Add role</Button>}
            />

            <DataTable
                caption="Roles"
                columns={columns}
                rows={roles}
                getRowId={(r) => r._id}
                onRowClick={openEdit}
                empty={{ icon: <ShieldCheck />, title: 'No roles yet' }}
                rowActions={(role) => (
                    <>
                        <IconButton label={canUpdateRole ? `Edit ${role.roleName}` : `View ${role.roleName}`} icon={canUpdateRole ? <Pencil /> : <Eye />} size="sm" onClick={() => openEdit(role)} />
                        {!isSuperAdminRole(role) && role._id !== user?.role?._id && (
                            <IconButton
                                label={usersIn(role._id) ? `${role.roleName} still has users` : `Delete ${role.roleName}`}
                                icon={<Trash2 />}
                                size="sm"
                                variant="dangerGhost"
                                onClick={() => setDeleteTarget(role)}
                                disabled={!canDeleteRole || usersIn(role._id) > 0}
                            />
                        )}
                    </>
                )}
            />

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                dismissible={!saving}
                size="xl"
                title={!editingRole ? 'Add role' : readOnly ? `Role: ${editingRole.roleName}` : `Edit ${editingRole.roleName}`}
                description={editingSuperAdmin ? undefined : 'Granting any action also grants Read on the module and its parents. Removing Read removes access to the module and everything under it.'}
                footer={
                    <>
                        <Button onClick={() => setShowModal(false)} disabled={saving}>{readOnly ? 'Close' : 'Cancel'}</Button>
                        {!readOnly && <Button variant="primary" onClick={handleSave} loading={saving}>{editingRole ? 'Save changes' : 'Add role'}</Button>}
                    </>
                }
            >
                {formError && <p className={s.formError} role="alert">{formError}</p>}
                <div className={s.nameField}>
                    <Field label="Role name" required error={nameError}>
                        <Input placeholder="e.g. Surveyor" value={roleName} disabled={editingSuperAdmin || readOnly}
                            onChange={(e) => { setRoleName(e.target.value); setNameError(undefined); }} autoFocus={!editingRole} />
                    </Field>
                </div>

                {editingSuperAdmin ? (
                    <p className={s.notice}>The <strong>admin</strong> role has full access to every module. Its permissions can't be restricted.</p>
                ) : (
                    <>
                        {editingOwnRole && !isSuperAdmin && <p className={s.notice}>You can't change the permissions of your own role.</p>}
                        <div className={s.matrixWrap}>
                            <table className={s.matrix}>
                                <caption className="sr-only">Permissions by module</caption>
                                <thead>
                                    <tr>
                                        <th scope="col" className={s.moduleCol}>Module</th>
                                        {matrixActions.map(a => <th key={a} scope="col">{ACTION_LABELS[a] || a}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tree.map(({ mod, depth }) => {
                                        const selected = permissions[mod._id] || [];
                                        const offered = moduleActions(mod);
                                        return (
                                            <tr key={mod._id} className={selected.length ? s.rowOn : undefined}>
                                                <th scope="row" className={s.moduleCol}>
                                                    <span className={s.moduleName} style={{ '--depth': depth } as CSSProperties}>
                                                        {depth > 0 && <CornerDownRight className={s.branch} aria-hidden="true" />}
                                                        <span>
                                                            <span className={s.moduleTitle}>{mod.name}</span>
                                                            {mod.description && <span className={s.moduleDesc}>{mod.description}</span>}
                                                        </span>
                                                    </span>
                                                </th>
                                                {matrixActions.map(action => {
                                                    if (!offered.includes(action)) return <td key={action} className={s.na} aria-label="Not applicable">—</td>;
                                                    const checked = selected.includes(action);
                                                    // Existing grants can always be removed; new ones need the granter to hold them.
                                                    const disabled = !!readOnly || (!checked && !canGrant(mod._id, action));
                                                    return (
                                                        <td key={action}>
                                                            <input
                                                                type="checkbox"
                                                                className={s.check}
                                                                checked={checked}
                                                                disabled={disabled}
                                                                onChange={() => togglePermission(mod._id, action)}
                                                                aria-label={`${ACTION_LABELS[action] || action} ${mod.name}`}
                                                                title={disabled && !checked && !readOnly ? "You can only grant permissions you hold yourself" : undefined}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title={`Delete the ${deleteTarget?.roleName ?? ''} role?`}
                message="This can't be undone."
                confirmText="Delete role"
                destructive
                loading={deleting}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
