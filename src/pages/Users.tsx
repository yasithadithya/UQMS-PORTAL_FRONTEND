import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Pencil, Trash2, UserPlus, Users as UsersIcon, SearchX } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MODULE_KEYS, isSuperAdminRole } from '@/utils/permissions';
import Pagination from '@/components/Pagination';
import {
    Badge, Button, ConfirmDialog, DataTable, Field, FormGrid, IconButton, Input, Modal, PageHeader, SearchInput, Select, Toolbar,
    type Column,
} from '@/ui';
import s from './Users.module.css';

type FormState = {
    username: string; email: string; password: string; role: string; fullName: string;
    nameWithInitials: string; phoneNumber: string; address: string; dob: string; empNumber: string;
};
type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
    username: '', email: '', password: '', role: '', fullName: '', nameWithInitials: '', phoneNumber: '', address: '', dob: '', empNumber: '',
};

const initialsOf = (name: string) =>
    name.split(/[\s._-]+/).filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2) || '?';

const roleNameOf = (user: any): string =>
    typeof user.role === 'object' && user.role ? user.role.roleName : String(user.role || '');

export default function UsersPage() {
    const { users, roles, addUser, updateUser, deleteUser, can, isSuperAdmin, user: currentUser } = useAuth();
    const canCreateUser = can(MODULE_KEYS.adminUsers, 'create');
    const canUpdateUser = can(MODULE_KEYS.adminUsers, 'update');
    const canDeleteUser = can(MODULE_KEYS.adminUsers, 'delete');
    // Only a super admin may assign the admin role or manage users who hold it (enforced by the backend too).
    const assignableRoles = roles.filter(r => isSuperAdmin || !isSuperAdminRole(r));
    const isProtectedUser = (u: any) => !isSuperAdmin && typeof u.role === 'object' && isSuperAdminRole(u.role);
    const isSelf = (u: any) => (u._id || u.id) === currentUser?.id;

    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
    const [errors, setErrors] = useState<FormErrors>({});
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    // List controls (client-side: the users list is already loaded in full)
    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return users.filter((u: any) => {
            if (roleFilter && roleNameOf(u) !== roleFilter) return false;
            if (!q) return true;
            return [u.username, u.fullName, u.email, u.phoneNumber, u.empNumber].some((v) => v && String(v).toLowerCase().includes(q));
        });
    }, [users, query, roleFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
    const currentPage = Math.min(page, totalPages);
    const pageRows = filtered.slice((currentPage - 1) * limit, currentPage * limit);

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setFormData((p) => ({ ...p, [key]: value }));
        if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    };

    const openAdd = () => {
        setEditingUser(null);
        setFormData({ ...EMPTY_FORM, role: assignableRoles.length > 0 ? assignableRoles[0]._id : '' });
        setErrors({});
        setFormError('');
        setShowModal(true);
    };

    const openEdit = (user: any) => {
        setEditingUser(user);
        const roleId = typeof user.role === 'object' ? user.role._id : user.role;
        let dobStr = '';
        if (user.dob) {
            try {
                dobStr = new Date(user.dob).toISOString().split('T')[0];
            } catch (e) {
                console.error('Failed to parse dob', e);
            }
        }
        setFormData({
            username: user.username || '',
            email: user.email || '',
            password: '',
            role: roleId || '',
            fullName: user.fullName || '',
            nameWithInitials: user.nameWithInitials || '',
            phoneNumber: user.phoneNumber || '',
            address: user.address || '',
            dob: dobStr,
            empNumber: user.empNumber || '',
        });
        setErrors({});
        setFormError('');
        setShowModal(true);
    };

    const validate = (): FormErrors => {
        const e: FormErrors = {};
        if (!formData.username.trim()) e.username = 'Enter a username.';
        else if (formData.username.trim().length < 3) e.username = 'Use at least 3 characters.';
        if (!formData.email.trim()) e.email = 'Enter an email address.';
        else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) e.email = 'Enter a valid email address.';
        if (!formData.fullName.trim()) e.fullName = 'Enter the full name.';
        if (!formData.phoneNumber.trim()) e.phoneNumber = 'Enter a phone number.';
        if (!formData.role) e.role = 'Choose a role.';
        if (!editingUser && !formData.password) e.password = 'Set a password for the new user.';
        else if (formData.password && formData.password.length < 6) e.password = 'Use at least 6 characters.';
        return e;
    };

    const handleSave = async () => {
        const found = validate();
        setErrors(found);
        if (Object.values(found).some(Boolean)) return;

        setSaving(true);
        setFormError('');

        try {
            if (editingUser) {
                const payload: any = {
                    username: formData.username,
                    email: formData.email,
                    role: formData.role,
                    fullName: formData.fullName,
                    nameWithInitials: formData.nameWithInitials,
                    phoneNumber: formData.phoneNumber,
                    address: formData.address,
                    dob: formData.dob || '',
                    empNumber: formData.empNumber,
                };
                if (formData.password) {
                    payload.password = formData.password;
                }
                const userId = editingUser._id || editingUser.id;
                const result = await updateUser(userId, payload);
                if (!result.success) {
                    setFormError(result.error || 'Failed to update user');
                    return;
                }
                toast.success(`${formData.username} updated.`);
            } else {
                const result = await addUser({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    role: formData.role,
                    fullName: formData.fullName,
                    nameWithInitials: formData.nameWithInitials,
                    phoneNumber: formData.phoneNumber,
                    address: formData.address,
                    dob: formData.dob || undefined,
                    empNumber: formData.empNumber,
                });
                if (!result.success) {
                    setFormError(result.error || 'Failed to create user');
                    return;
                }
                toast.success(`${formData.username} added.`);
            }
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
        const result = await deleteUser(deleteTarget._id || deleteTarget.id);
        setDeleting(false);
        setDeleteTarget(null);
        if (result.success) {
            toast.success('User deleted.');
        } else {
            toast.error(result.error || 'Failed to delete user.');
        }
    };

    const roleNames = useMemo(() => Array.from(new Set(users.map(roleNameOf).filter(Boolean))).sort(), [users]);

    const columns: Column<any>[] = [
        {
            key: 'user', header: 'User', primary: true,
            cell: (u) => (
                <div className={s.userCell}>
                    <span className={`${s.avatar} ${isSuperAdminRole(u.role) ? s.avatarAdmin : ''}`} aria-hidden="true">
                        {initialsOf(u.fullName || u.username)}
                    </span>
                    <span className={s.stack}>
                        <span className={s.name}>
                            {u.fullName || u.username}
                            {isSelf(u) && <Badge tone="info">You</Badge>}
                        </span>
                        <span className={s.sub}>@{u.username}</span>
                    </span>
                </div>
            ),
        },
        {
            key: 'contact', header: 'Contact',
            cell: (u) => (
                <span className={s.stack}>
                    <span>{u.email}</span>
                    {u.phoneNumber && <span className={s.sub}>{u.phoneNumber}</span>}
                </span>
            ),
        },
        {
            key: 'role', header: 'Role', nowrap: true,
            cell: (u) => <Badge tone={isSuperAdminRole(u.role) ? 'accent' : 'neutral'} className={s.role}>{roleNameOf(u) || 'No role'}</Badge>,
        },
        { key: 'emp', header: 'Emp. no.', nowrap: true, hideOnMobile: true, cell: (u) => <span className="tabular">{u.empNumber || '—'}</span> },
    ];

    const createButton = canCreateUser && (
        <Button variant="primary" icon={<UserPlus />} onClick={openAdd} id="add-user-btn">Add user</Button>
    );

    const editingSelf = !!editingUser && isSelf(editingUser);

    return (
        <div className="animate-in">
            <PageHeader
                breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Users' }]}
                title="Users"
                description="People who can sign in, and the role that decides what each of them can see and do."
                actions={createButton}
            />

            <Toolbar
                attached
                search={<SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search name, username, email or employee no…" />}
                filters={
                    <Select aria-label="Filter by role" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className={s.roleFilter}>
                        <option value="">All roles</option>
                        {roleNames.map((r) => <option key={r} value={r}>{r}</option>)}
                    </Select>
                }
                end={`${filtered.length} of ${users.length} users`}
            />
            <DataTable
                attached
                caption="Users"
                columns={columns}
                rows={pageRows}
                getRowId={(u) => u._id || u.id}
                onRowClick={(u) => { if (!(isProtectedUser(u) || (!canUpdateUser && !isSelf(u)))) openEdit(u); }}
                empty={query || roleFilter
                    ? { icon: <SearchX />, title: 'No matching users', description: 'Try a different search or role.' }
                    : { icon: <UsersIcon />, title: 'No users yet', action: createButton }}
                rowActions={(u) => (
                    <>
                        <IconButton label={`Edit ${u.username}`} icon={<Pencil />} size="sm"
                            onClick={() => openEdit(u)} disabled={isProtectedUser(u) || (!canUpdateUser && !isSelf(u))} />
                        <IconButton label={isSelf(u) ? "You can't delete yourself" : `Delete ${u.username}`} icon={<Trash2 />} size="sm" variant="dangerGhost"
                            onClick={() => setDeleteTarget(u)} disabled={!canDeleteUser || isProtectedUser(u) || isSelf(u)} />
                    </>
                )}
                footer={
                    <Pagination page={currentPage} limit={limit} total={filtered.length} totalPages={totalPages} onPageChange={setPage} onLimitChange={(v) => { setLimit(v); setPage(1); }} />
                }
            />

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                dismissible={!saving}
                size="lg"
                title={editingUser ? `Edit ${editingUser.username}` : 'Add user'}
                description={editingUser ? undefined : 'They can sign in with their username or email and this password.'}
                footer={
                    <>
                        <Button onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave} loading={saving} id="user-save-btn">
                            {editingUser ? 'Save changes' : 'Add user'}
                        </Button>
                    </>
                }
            >
                {formError && <p className={s.formError} role="alert">{formError}</p>}
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} noValidate>
                    <FormGrid columns={2}>
                        <Field label="Full name" required error={errors.fullName} id="user-fullname-input">
                            <Input placeholder="John Doe" value={formData.fullName} onChange={(e) => set('fullName', e.target.value)} autoFocus />
                        </Field>
                        <Field label="Name with initials" hint="Used on surveyor stamps and signatures" id="user-namewithinitials-input">
                            <Input placeholder="J. Doe" value={formData.nameWithInitials} onChange={(e) => set('nameWithInitials', e.target.value)} />
                        </Field>
                        <Field label="Username" required error={errors.username} id="user-username-input">
                            <Input placeholder="e.g. johndoe" autoComplete="off" value={formData.username} onChange={(e) => set('username', e.target.value)} />
                        </Field>
                        <Field label="Email" required error={errors.email} id="user-email-input">
                            <Input type="email" inputMode="email" placeholder="john@example.com" value={formData.email} onChange={(e) => set('email', e.target.value)} />
                        </Field>
                        <Field label="Phone number" required error={errors.phoneNumber} id="user-phonenumber-input">
                            <Input type="tel" inputMode="tel" placeholder="+94 77 123 4567" value={formData.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value)} />
                        </Field>
                        <Field label="Role" required error={errors.role} id="user-role-select"
                            hint={editingSelf ? "You can't change your own role." : undefined}>
                            <Select value={formData.role} disabled={editingSelf} onChange={(e) => set('role', e.target.value)}>
                                {roles.length === 0 && <option value="">No roles available</option>}
                                {roles.filter(r => assignableRoles.includes(r) || r._id === formData.role).map((r) => (
                                    <option key={r._id} value={r._id}>{r.roleName}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Employee no." id="user-empnumber-input">
                            <Input placeholder="EMP001" value={formData.empNumber} onChange={(e) => set('empNumber', e.target.value)} />
                        </Field>
                        <Field label="Date of birth" id="user-dob-input">
                            <Input type="date" value={formData.dob} onChange={(e) => set('dob', e.target.value)} />
                        </Field>
                        <Field label="Address" full id="user-address-input">
                            <Input placeholder="123 Main St, City" value={formData.address} onChange={(e) => set('address', e.target.value)} />
                        </Field>
                        <Field
                            label={editingUser ? 'New password' : 'Password'}
                            required={!editingUser}
                            full
                            error={errors.password}
                            hint={editingUser ? 'Leave blank to keep the current password.' : 'At least 6 characters.'}
                            id="user-password-input"
                        >
                            <Input type="password" autoComplete="new-password" value={formData.password} onChange={(e) => set('password', e.target.value)} />
                        </Field>
                    </FormGrid>
                    <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title={`Delete ${deleteTarget?.fullName || deleteTarget?.username || 'user'}?`}
                message="They will no longer be able to sign in. This can't be undone."
                confirmText="Delete user"
                destructive
                loading={deleting}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
