import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Changing this value clears the error, e.g. pass the current pathname so navigating away recovers. */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" className="card" style={{ maxWidth: '520px', margin: '64px auto', textAlign: 'center', padding: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--label)', marginBottom: '8px' }}>Something went wrong</h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
          This page hit an unexpected error. Your other work is not affected. Try reloading, or go back to the dashboard.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary btn-inline" onClick={() => window.location.reload()}>Reload page</button>
          <button type="button" className="btn-secondary btn-inline" onClick={() => { window.location.href = '/'; }}>Go to dashboard</button>
        </div>
      </div>
    );
  }
}
