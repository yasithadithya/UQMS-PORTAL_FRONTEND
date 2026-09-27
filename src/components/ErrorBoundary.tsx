import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
import { Button, Card, ErrorState } from '@/ui';
import s from './StatusPage.module.css';

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

    // Rendered outside the router at the top level, so this uses plain buttons rather than links.
    return (
      <div className={s.wrap}>
        <Card padding="none">
          <ErrorState
            title="Something went wrong"
            message="This page hit an unexpected error. Your other work is not affected. Reload the page, or go back to the dashboard."
          />
          <div className={s.actions}>
            <Button variant="primary" icon={<RotateCw />} onClick={() => window.location.reload()}>Reload page</Button>
            <Button onClick={() => { window.location.href = '/'; }}>Go to dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }
}
