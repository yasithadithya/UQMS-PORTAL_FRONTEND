import { useAuth } from '@/context/AuthContext';

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const now = new Date();
  const today = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      <h1 className="greeting" style={{ animation: 'fadeUp .4s ease both' }}>
        {greetingForHour(now.getHours())}, {user?.username || 'there'}
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px', fontWeight: 500 }}>{today}</p>

      {/* Welcome Message */}
      <div className="card animate-in" style={{ padding: '40px', textAlign: 'center', marginTop: '20px' }}>
        <h2 style={{ marginBottom: '16px', color: 'var(--label)' }}>System Overview</h2>
        <p style={{ color: 'var(--muted)', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
          Welcome to the UQMS Management System. Please navigate using the sidebar to access your permitted modules and features.
        </p>
      </div>
    </>
  );
}
