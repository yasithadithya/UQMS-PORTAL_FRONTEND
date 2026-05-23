export default function DashboardPage() {
  return (
    <>
      <h1 className="greeting" style={{ animation: 'fadeUp .4s ease both' }}>Welcome, Inspector</h1>
      <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px', fontWeight: 500 }}>Tuesday, 25 Feb 2026</p>

      {/* Welcome Message */}
      <div className="card animate-in" style={{ padding: '40px', textAlign: 'center', marginTop: '20px' }}>
        <h2 style={{ marginBottom: '16px', color: 'var(--text)' }}>System Overview</h2>
        <p style={{ color: 'var(--muted)', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
          Welcome to the UQMS Management System. Please navigate using the sidebar to access your permitted modules and features.
        </p>
      </div>
    </>
  );
}
