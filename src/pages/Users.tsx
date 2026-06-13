import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import s from './UserManagement.module.css';

export default function UsersPage() {
    const { users, roles, addUser, updateUser, deleteUser, hasPermission } = useAuth();
    const canDeleteUser = hasPermission('Admin', 'delete') || hasPermission('User Management', 'delete') || hasPermission(null, 'delete');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: '',
        fullName: '',
        nameWithInitials: '',
        phoneNumber: '',
        address: '',
        dob: '',
        empNumber: '',
    });
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const openAdd = () => {
        setEditingUser(null);
        setFormData({
            username: '',
            email: '',
            password: '',
            role: roles.length > 0 ? roles[0]._id : '',
            fullName: '',
            nameWithInitials: '',
            phoneNumber: '',
            address: '',
            dob: '',
            empNumber: '',
        });
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
        setFormError('');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.username || !formData.email || !formData.role || !formData.fullName || !formData.phoneNumber) {
            setFormError('Username, email, role, full name, and phone number are required.');
            return;
        }
        if (!editingUser && !formData.password) {
            setFormError('Password is required for new users.');
            return;
        }

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
                    setSaving(false);
                    return;
                }
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
        await deleteUser(id);
        setDeleteConfirm(null);
    };

    const getInitials = (username: string) => {
        return username
            .split(/[\s._-]+/)
            .map((p) => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getRoleName = (user: any): string => {
        if (typeof user.role === 'object' && user.role) return user.role.roleName;
        return String(user.role || '');
    };

    const roleColors: Record<string, string> = {
        admin: '#EF4444',
        inspector: '#3B82F6',
        'senior inspector': '#8B5CF6',
        surveyor: '#F59E0B',
    };

    const getRoleColor = (user: any) => {
        const name = getRoleName(user).toLowerCase();
        return roleColors[name] || '#007AFF';
    };

    return (
        <>
            <div className={s.topBar}>
                <div>
                    <h2 className="section-header" style={{ marginBottom: '4px' }}>User Management</h2>
                    <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{users.length} users registered</p>
                </div>
                <button className={s.addBtn} onClick={openAdd} id="add-user-btn">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M9 3v12M3 9h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Add User
                </button>
            </div>

            {/* Desktop Table */}
            <div className={s.tableWrap}>
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th>User / Name</th>
                            <th>Contact</th>
                            <th>Role</th>
                            <th>Emp No</th>
                            <th style={{ width: '120px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => {
                            const userId = user._id || user.id || '';
                            return (
                                <tr key={userId}>
                                    <td>
                                        <div className={s.userCell}>
                                            <div
                                                className={s.avatar}
                                                style={{ background: `linear-gradient(135deg, ${getRoleColor(user)}, #6366F1)` }}
                                            >
                                                {getInitials(user.fullName || user.username)}
                                            </div>
                                            <div>
                                                <div className={s.userName}>{user.username}</div>
                                                <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px' }}>{user.fullName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={s.emailCell}>{user.email}</div>
                                        <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2.5px' }}>{user.phoneNumber}</div>
                                    </td>
                                    <td>
                                        <span
                                            className={s.roleBadge}
                                            style={{
                                                background: `${getRoleColor(user)}14`,
                                                color: getRoleColor(user),
                                            }}
                                        >
                                            {getRoleName(user)}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{user.empNumber || '-'}</span>
                                    </td>
                                    <td>
                                        <div className={s.actions}>
                                            <button className={s.actionBtn} onClick={() => openEdit(user)} title="Edit">
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M11.5 2.5l2 2M2 14l1-4L11.5 1.5l2 2L5 12l-4 1z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                            <button className={`${s.actionBtn} ${s.deleteBtn}`} onClick={() => setDeleteConfirm(userId)} title="Delete" disabled={!canDeleteUser}>
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className={s.mobileCards}>
                {users.map((user) => {
                    const userId = user._id || user.id || '';
                    return (
                        <div key={userId} className={s.mobileCard}>
                            <div className={s.mobileCardTop}>
                                <div
                                    className={s.avatar}
                                    style={{ background: `linear-gradient(135deg, ${getRoleColor(user)}, #6366F1)` }}
                                >
                                    {getInitials(user.fullName || user.username)}
                                </div>
                                <div className={s.mobileCardInfo}>
                                    <div className={s.userName}>{user.username}</div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)', marginTop: '2px' }}>{user.fullName}</div>
                                    <div className={s.mobileEmail}>{user.email}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>📞 {user.phoneNumber}</div>
                                    {user.empNumber && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Emp No: {user.empNumber}</div>}
                                </div>
                            </div>
                            <div className={s.mobileCardBottom}>
                                <span
                                    className={s.roleBadge}
                                    style={{
                                        background: `${getRoleColor(user)}14`,
                                        color: getRoleColor(user),
                                    }}
                                >
                                    {getRoleName(user)}
                                </span>
                                <div className={s.actions}>
                                    <button className={s.actionBtn} onClick={() => openEdit(user)}>Edit</button>
                                    <button className={`${s.actionBtn} ${s.deleteBtn}`} onClick={() => setDeleteConfirm(userId)} disabled={!canDeleteUser}>Delete</button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className={s.overlay} onClick={() => setShowModal(false)}>
                    <div className={s.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={s.modalHeader}>
                            <h3 className={s.modalTitle}>{editingUser ? 'Edit User' : 'Add New User'}</h3>
                            <button className={s.closeBtn} onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className={s.modalBody} style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
                            {formError && (
                                <div
                                    style={{
                                        background: 'var(--red-subtle)',
                                        color: 'var(--red)',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        marginBottom: '16px',
                                        textAlign: 'center',
                                        border: '1px solid rgba(239,68,68,.15)',
                                    }}
                                >
                                    {formError}
                                </div>
                            )}

                            <div className={s.modalGrid}>
                                <div className={s.fieldGroup}>
                                    <label className="form-label">Username <span style={{ color: 'var(--red)' }}>*</span></label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="e.g. johndoe"
                                        value={formData.username}
                                        onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
                                        id="user-username-input"
                                    />
                                </div>

                                <div className={s.fieldGroup}>
                                    <label className="form-label">Email Address <span style={{ color: 'var(--red)' }}>*</span></label>
                                    <input
                                        className="form-input"
                                        type="email"
                                        placeholder="e.g. john@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                                        id="user-email-input"
                                    />
                                </div>

                                <div className={s.fieldGroup}>
                                    <label className="form-label">Full Name <span style={{ color: 'var(--red)' }}>*</span></label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="John Doe"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
                                        id="user-fullname-input"
                                    />
                                </div>

                                <div className={s.fieldGroup}>
                                    <label className="form-label">Name with Initials</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="J. Doe"
                                        value={formData.nameWithInitials}
                                        onChange={(e) => setFormData((p) => ({ ...p, nameWithInitials: e.target.value }))}
                                        id="user-namewithinitials-input"
                                    />
                                </div>

                                <div className={s.fieldGroup}>
                                    <label className="form-label">Phone Number <span style={{ color: 'var(--red)' }}>*</span></label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="+1234567890"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData((p) => ({ ...p, phoneNumber: e.target.value }))}
                                        id="user-phonenumber-input"
                                    />
                                </div>

                                <div className={s.fieldGroup}>
                                    <label className="form-label">Employee Number</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="EMP001"
                                        value={formData.empNumber}
                                        onChange={(e) => setFormData((p) => ({ ...p, empNumber: e.target.value }))}
                                        id="user-empnumber-input"
                                    />
                                </div>

                                <div className={s.fieldGroup}>
                                    <label className="form-label">Date of Birth</label>
                                    <input
                                        className="form-input"
                                        type="date"
                                        value={formData.dob}
                                        onChange={(e) => setFormData((p) => ({ ...p, dob: e.target.value }))}
                                        id="user-dob-input"
                                    />
                                </div>

                                <div className={s.fieldGroup}>
                                    <label className="form-label">Role <span style={{ color: 'var(--red)' }}>*</span></label>
                                    <select
                                        className="form-input"
                                        value={formData.role}
                                        onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                                        id="user-role-select"
                                    >
                                        {roles.length === 0 && <option value="">No roles available</option>}
                                        {roles.map((r) => (
                                            <option key={r._id} value={r._id}>
                                                {r.roleName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={`${s.fieldGroup} ${s.fullWidth}`}>
                                    <label className="form-label">Address</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="123 Main St, City, Country"
                                        value={formData.address}
                                        onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                                        id="user-address-input"
                                    />
                                </div>

                                <div className={`${s.fieldGroup} ${s.fullWidth}`}>
                                    <label className="form-label">
                                        Password {editingUser && <span style={{ fontWeight: 400, color: 'var(--separator)' }}>(leave blank to keep current)</span>} {!editingUser && <span style={{ color: 'var(--red)' }}>*</span>}
                                    </label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        placeholder={editingUser ? 'Leave blank to keep current' : 'Min 6 characters'}
                                        value={formData.password}
                                        onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                                        id="user-password-input"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={s.modalFooter}>
                            <button
                                className="btn-secondary"
                                style={{ width: '100%', minWidth: 0 }}
                                onClick={() => setShowModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                style={{ width: '100%', minWidth: 0, marginBottom: 0 }}
                                onClick={handleSave}
                                disabled={saving}
                                id="user-save-btn"
                            >
                                {saving ? 'Saving…' : editingUser ? 'Save Changes' : 'Add User'}
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
                            <h3 className={s.modalTitle} style={{ marginBottom: '8px' }}>Delete User?</h3>
                            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>This action cannot be undone.</p>
                        </div>
                        <div className={s.modalFooter}>
                            <button
                                className="btn-secondary"
                                style={{ width: '100%', minWidth: 0 }}
                                onClick={() => setDeleteConfirm(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                style={{ width: '100%', minWidth: 0, marginBottom: 0, background: 'var(--red)' }}
                                onClick={() => handleDelete(deleteConfirm)}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
