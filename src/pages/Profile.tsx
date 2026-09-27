import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usersService } from '@/api/services/users.service';
import { toast } from 'react-toastify';
import { Badge, Button, Card, Field, FormGrid, Input, LoadingBlock, PageHeader, Section } from '@/ui';
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
        return <LoadingBlock label="Loading your profile…" />;
    }

    const initials = (profileData.fullName || profileData.username || '?')
        .split(/[\s._-]+/).filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className={`animate-in ${s.page}`}>
            <PageHeader title="My profile" description="Your personal details and sign-in password." />

            <Card className={s.identity}>
                <span className={s.avatar} aria-hidden="true">{initials}</span>
                <div className={s.identityText}>
                    <span className={s.name}>{profileData.fullName || profileData.username}</span>
                    <span className={s.meta}>
                        <Badge tone="accent" className={s.role}>{profileData.roleName || 'No role'}</Badge>
                        <span>{profileData.email}</span>
                        {profileData.empNumber && <span>Emp. no. {profileData.empNumber}</span>}
                    </span>
                </div>
            </Card>

            <div className={s.grid}>
                <Section title="Personal details" description="Email, employee number and role are managed by an administrator.">
                    {profileError && <p className={`${s.alert} ${s.alertError}`} role="alert">{profileError}</p>}
                    {profileSuccess && <p className={`${s.alert} ${s.alertSuccess}`} role="status">{profileSuccess}</p>}
                    <form onSubmit={handleProfileSubmit} noValidate>
                        <FormGrid columns={2}>
                            <Field label="Full name" required id="profile-fullname">
                                <Input value={profileData.fullName} onChange={(e) => setProfileData(p => ({ ...p, fullName: e.target.value }))} />
                            </Field>
                            <Field label="Name with initials" hint="Used on stamps and signatures" id="profile-nameinitials">
                                <Input value={profileData.nameWithInitials} onChange={(e) => setProfileData(p => ({ ...p, nameWithInitials: e.target.value }))} />
                            </Field>
                            <Field label="Username" required id="profile-username">
                                <Input autoComplete="username" value={profileData.username} onChange={(e) => setProfileData(p => ({ ...p, username: e.target.value }))} />
                            </Field>
                            <Field label="Phone number" required id="profile-phone">
                                <Input type="tel" inputMode="tel" value={profileData.phoneNumber} onChange={(e) => setProfileData(p => ({ ...p, phoneNumber: e.target.value }))} />
                            </Field>
                            <Field label="Date of birth" id="profile-dob">
                                <Input type="date" value={profileData.dob} onChange={(e) => setProfileData(p => ({ ...p, dob: e.target.value }))} />
                            </Field>
                            <Field label="Address" id="profile-address">
                                <Input value={profileData.address} onChange={(e) => setProfileData(p => ({ ...p, address: e.target.value }))} />
                            </Field>
                        </FormGrid>
                        <div className={s.formActions}>
                            <Button type="submit" variant="primary" loading={savingProfile} id="profile-save-btn">Save details</Button>
                        </div>
                    </form>
                </Section>

                <Section title="Password" description="At least 6 characters.">
                    {passwordError && <p className={`${s.alert} ${s.alertError}`} role="alert">{passwordError}</p>}
                    {passwordSuccess && <p className={`${s.alert} ${s.alertSuccess}`} role="status">{passwordSuccess}</p>}
                    <form onSubmit={handlePasswordSubmit} noValidate className={s.stack}>
                        <Field label="New password" id="profile-new-password">
                            <Input type="password" autoComplete="new-password" value={passwordData.newPassword}
                                onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))} />
                        </Field>
                        <Field label="Confirm new password" id="profile-confirm-password">
                            <Input type="password" autoComplete="new-password" value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))} />
                        </Field>
                        <div className={s.formActions}>
                            <Button type="submit" loading={savingPassword} id="profile-password-btn">Change password</Button>
                        </div>
                    </form>
                </Section>
            </div>
        </div>
    );
}
