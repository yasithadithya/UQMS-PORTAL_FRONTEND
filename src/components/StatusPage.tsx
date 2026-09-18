import { Link } from 'react-router-dom';

type Props = {
  title: string;
  message: string;
};

/** Full-page message for "not found" / "access denied" states, with a way back. */
export default function StatusPage({ title, message }: Props) {
  return (
    <div className="animate-in" style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
      <h2 style={{ marginBottom: '0.75rem', color: 'var(--label)', fontSize: '22px' }}>{title}</h2>
      <p style={{ marginBottom: '1.5rem' }}>{message}</p>
      <Link to="/" className="btn-secondary btn-inline" style={{ textDecoration: 'none' }}>Back to dashboard</Link>
    </div>
  );
}

export function AccessDenied() {
  return <StatusPage title="Access denied" message="You do not have permission to view this page." />;
}

export function NotFound() {
  return <StatusPage title="Page not found" message="The page you're looking for doesn't exist or has moved." />;
}
