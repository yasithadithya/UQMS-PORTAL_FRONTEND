import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import s from './LoginPage.module.css';

export default function LoginPage() {
    const { login, loading: authLoading } = useAuth();
    const [loginField, setLoginField] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(loginField, password);
        if (!result.success) {
            setError(result.error || 'Invalid credentials');
        }
        setLoading(false);
    };

    return (
        <div className={s.container}>
            <form className={s.card} onSubmit={handleSubmit}>
                <div className={s.logo}>
                    <img src="/logo.png" alt="UQMS Logo" className={s.logoImage} />
                </div>

                <h1 className={s.title}>UQMS</h1>
                <p className={s.subtitle}>UQMS Management System</p>

                {error && <div className={s.error}>{error}</div>}

                <div className={s.field}>
                    <label className={s.label}>Username or Email</label>
                    <input
                        className={s.input}
                        type="text"
                        placeholder="Enter username or email"
                        value={loginField}
                        onChange={(e) => setLoginField(e.target.value)}
                        required
                        autoComplete="username"
                        id="login-field"
                    />
                </div>

                <div className={s.field}>
                    <label className={s.label}>Password</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            className={s.input}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            id="password-field"
                            style={{ paddingRight: '40px' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: 'var(--muted)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                <button className={s.submit} type="submit" disabled={loading || authLoading} id="login-button">
                    {loading ? 'Signing in…' : 'Sign In'}
                </button>
            </form>
        </div>
    );
}
