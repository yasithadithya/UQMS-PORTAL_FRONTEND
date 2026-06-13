import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usersService } from '@/api/services/users.service';
import { toast } from 'react-toastify';
import s from './Profile.module.css';

export default function ProfilePage() {
    const { user, updateUser } = useAuth();
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    // Profile info state
    const [profileData, setProfileData] = useState({
        username: '',
        email: '',
        fullName: '',
        nameWithInitials: '',
        phoneNumber: '',
        address: '',
        dob: '',
        empNumber: '',
        roleName: '',
    });

    // Password change state
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: '',
    });

    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    useEffect(() => {
        async function loadProfile() {
            if (!user?.id) return;
            try {
                const res = await usersService.getUserById(user.id);
                if (res.success && res.data) {
                    const u = res.data;
                    let dobStr = '';
                    if (u.dob) {
                        try {
                            dobStr = new Date(u.dob).toISOString().split('T')[0];
                        } catch (e) {
                            console.error('Failed to parse dob', e);
                        }
                    }
                    setProfileData({
                        username: u.username || '',
                        email: u.email || '',
                        fullName: u.fullName || '',
                        nameWithInitials: u.nameWithInitials || '',
                        phoneNumber: u.phoneNumber || '',
                        address: u.address || '',
                        dob: dobStr,
                        empNumber: u.empNumber || '',
                        roleName: typeof u.role === 'object' && u.role ? u.role.roleName : String(u.role || ''),
                    });
                }
            } catch (err: any) {
                toast.error(err.message || 'Failed to load profile details');
            } finally {
                setLoadingProfile(false);
            }
        }
        loadProfile();
    }, [user?.id]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileError('');
        setProfileSuccess('');

        if (!profileData.username || !profileData.fullName || !profileData.phoneNumber) {
            setProfileError('Username, Full Name, and Phone Number are required fields.');
            return;
        }

        setSavingProfile(true);
        try {
            if (!user?.id) throw new Error('No user context found');

            const payload = {
                username: profileData.username,
                fullName: profileData.fullName,
                nameWithInitials: profileData.nameWithInitials,
                phoneNumber: profileData.phoneNumber,
                address: profileData.address,
                dob: profileData.dob || undefined,
            };

            const result = await updateUser(user.id, payload);
            if (result.success) {
                setProfileSuccess('Profile updated successfully.');
                toast.success('Profile updated successfully.');
            } else {
                setProfileError(result.error || 'Failed to update profile.');
            }
        } catch (err: any) {
            setProfileError(err.message || 'An error occurred while saving profile.');
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (!passwordData.newPassword || !passwordData.confirmPassword) {
            setPasswordError('Both password fields are required.');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters.');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('Passwords do not match.');
            return;
        }

        setSavingPassword(true);
        try {
            if (!user?.id) throw new Error('No user context found');

            const result = await updateUser(user.id, {
                password: passwordData.newPassword,
            });

            if (result.success) {
                setPasswordSuccess('Password changed successfully.');
                toast.success('Password changed successfully.');
                setPasswordData({
                    newPassword: '',
                    confirmPassword: '',
                });
            } else {
                setPasswordError(result.error || 'Failed to change password.');
            }
        } catch (err: any) {
            setPasswordError(err.message || 'An error occurred while updating password.');
        } finally {
            setSavingPassword(false);
        }
    };

    if (loadingProfile) {
        return (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
                <h3>Loading profile details…</h3>
            </div>
        );
    }

    return (
        <div className={`${s.container} animate-in`}>
            <div className={s.titleSection}>
                <h2 className={s.title}>My Profile</h2>
                <p className={s.subtitle}>Manage your account settings, personal details, and security credentials.</p>
            </div>

            <div className={s.grid}>
                {/* Profile Details Form */}
                <div className={s.card}>
                    <h3 className={s.cardTitle}>Personal Settings</h3>
                    
                    {profileError && <div className={`${s.alert} ${s.alertError}`}>{profileError}</div>}
                    {profileSuccess && <div className={`${s.alert} ${s.alertSuccess}`}>{profileSuccess}</div>}

                    <form onSubmit={handleProfileSubmit}>
                        <div className={s.formGrid}>
                            <div className={s.fieldGroup}>
                                <label className={s.label}>Username *</label>
                                <input
                                    className={s.input}
                                    type="text"
                                    value={profileData.username}
                                    onChange={(e) => setProfileData(p => ({ ...p, username: e.target.value }))}
                                    id="profile-username"
                                />
                            </div>

                            <div className={s.fieldGroup}>
                                <label className={s.label}>Email Address (Read-only)</label>
                                <input
                                    className={s.input}
                                    type="email"
                                    value={profileData.email}
                                    disabled
                                />
                            </div>

                            <div className={s.fieldGroup}>
                                <label className={s.label}>Full Name *</label>
                                <input
                                    className={s.input}
                                    type="text"
                                    value={profileData.fullName}
                                    onChange={(e) => setProfileData(p => ({ ...p, fullName: e.target.value }))}
                                    id="profile-fullname"
                                />
                            </div>

                            <div className={s.fieldGroup}>
                                <label className={s.label}>Name with Initials</label>
                                <input
                                    className={s.input}
                                    type="text"
                                    value={profileData.nameWithInitials}
                                    onChange={(e) => setProfileData(p => ({ ...p, nameWithInitials: e.target.value }))}
                                    id="profile-nameinitials"
                                />
                            </div>

                            <div className={s.fieldGroup}>
                                <label className={s.label}>Phone Number *</label>
                                <input
                                    className={s.input}
                                    type="text"
                                    value={profileData.phoneNumber}
                                    onChange={(e) => setProfileData(p => ({ ...p, phoneNumber: e.target.value }))}
                                    id="profile-phone"
                                />
                            </div>

                            <div className={s.fieldGroup}>
                                <label className={s.label}>Employee Number (Read-only)</label>
                                <input
                                    className={s.input}
                                    type="text"
                                    value={profileData.empNumber || '-'}
                                    disabled
                                />
                            </div>

                            <div className={s.fieldGroup}>
                                <label className={s.label}>Date of Birth</label>
                                <input
                                    className={s.input}
                                    type="date"
                                    value={profileData.dob}
                                    onChange={(e) => setProfileData(p => ({ ...p, dob: e.target.value }))}
                                    id="profile-dob"
                                />
                            </div>

                            <div className={s.fieldGroup}>
                                <label className={s.label}>Role (Read-only)</label>
                                <input
                                    className={s.input}
                                    type="text"
                                    value={profileData.roleName}
                                    disabled
                                />
                            </div>

                            <div className={`${s.fieldGroup} ${s.fullWidth}`}>
                                <label className={s.label}>Address</label>
                                <input
                                    className={s.input}
                                    type="text"
                                    value={profileData.address}
                                    onChange={(e) => setProfileData(p => ({ ...p, address: e.target.value }))}
                                    id="profile-address"
                                />
                            </div>
                        </div>

                        <button className={s.saveBtn} type="submit" disabled={savingProfile} id="profile-save-btn">
                            {savingProfile ? 'Saving…' : 'Save Personal Settings'}
                        </button>
                    </form>
                </div>

                {/* Password Change Form */}
                <div className={s.card}>
                    <h3 className={s.cardTitle}>Security & Credentials</h3>
                    
                    {passwordError && <div className={`${s.alert} ${s.alertError}`}>{passwordError}</div>}
                    {passwordSuccess && <div className={`${s.alert} ${s.alertSuccess}`}>{passwordSuccess}</div>}

                    <form onSubmit={handlePasswordSubmit}>
                        <div className={s.fieldGroup} style={{ marginBottom: '16px' }}>
                            <label className={s.label}>New Password</label>
                            <input
                                className={s.input}
                                type="password"
                                placeholder="Min 6 characters"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                                id="profile-new-password"
                            />
                        </div>

                        <div className={s.fieldGroup} style={{ marginBottom: '16px' }}>
                            <label className={s.label}>Confirm New Password</label>
                            <input
                                className={s.input}
                                type="password"
                                placeholder="Re-enter new password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                                id="profile-confirm-password"
                            />
                        </div>

                        <button className={s.saveBtn} type="submit" disabled={savingPassword} id="profile-password-btn">
                            {savingPassword ? 'Updating…' : 'Change Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
