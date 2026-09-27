import { useState } from 'react';
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Field, Input } from '@/ui';
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
        <div className={s.page}>
            {/* Brand panel (wide screens). Always dark: the gold logo is designed for it. */}
            <aside className={s.brand} aria-hidden="true">
                <img src="/logo.png" alt="" className={s.brandLogo} />
                <p className={s.brandLine}>Survey, certification and people management for Universal Quality Management Systems.</p>
                <p className={s.brandFoot}>Universal Quality Management Systems (Pvt) Ltd</p>
            </aside>

            <main className={s.formSide}>
                <form className={s.form} onSubmit={handleSubmit} noValidate>
                    <img src="/logo-mark.png" alt="" className={s.mark} />
                    <h1 className={s.title}>Sign in to UQMS</h1>
                    <p className={s.subtitle}>Use your username or email and password.</p>

                    {error && (
                        <p className={s.error} role="alert">
                            <AlertCircle aria-hidden="true" />
                            {error}
                        </p>
                    )}

                    <div className={s.fields}>
                        <Field label="Username or email" id="login-field">
                            <Input
                                type="text"
                                placeholder="e.g. nimal.p or nimal@uqms.lk"
                                value={loginField}
                                onChange={(e) => setLoginField(e.target.value)}
                                required
                                autoComplete="username"
                                autoCapitalize="none"
                                spellCheck={false}
                                autoFocus
                                aria-invalid={error ? true : undefined}
                            />
                        </Field>

                        <Field label="Password" id="password-field">
                            <div className={s.passwordWrap}>
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    className={s.passwordInput}
                                    aria-invalid={error ? true : undefined}
                                />
                                <button
                                    type="button"
                                    className={s.reveal}
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    aria-pressed={showPassword}
                                >
                                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                                </button>
                            </div>
                        </Field>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        block
                        icon={<LogIn />}
                        loading={loading}
                        disabled={authLoading || !loginField || !password}
                        id="login-button"
                    >
                        Sign in
                    </Button>

                    <p className={s.help}>Forgotten your password? Ask an administrator to reset it.</p>
                </form>
            </main>
        </div>
    );
}
