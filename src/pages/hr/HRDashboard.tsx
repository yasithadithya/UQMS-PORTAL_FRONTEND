import { useState, useEffect, type ReactNode } from 'react';
import { toast } from 'react-toastify';
import { hrService } from '../../api';
import { Badge, formatMoney, formatDate } from './hrShared';
import s from './hr.module.css';

function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="stat-card" style={{ textAlign: 'left' }}>
      <div className="stat-label" style={{ marginTop: 0, marginBottom: '8px' }}>{label}</div>
      <div className="stat-value" style={{ fontSize: '28px' }}>{value}</div>
      {hint && <div className={s.entityMeta} style={{ marginTop: '4px', marginBottom: 0 }}>{hint}</div>}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card">
      <h4 className={s.infoCardTitle}>{title}</h4>
      {children}
    </div>
  );
}

export default function HRDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hrService.getDashboardStats().then(res => {
      if (res.success) setStats(res.data);
    }).catch((err: any) => {
      toast.error(err.message || 'Error loading dashboard');
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className={s.mutedNote}>Loading dashboard...</p>;
  if (!stats) return <p className={s.mutedNote}>Dashboard data unavailable.</p>;

  const presentToday = stats.attendanceToday?.Present || 0;
  const maxDeptCount = Math.max(1, ...(stats.departmentDistribution || []).map((d: any) => d.count));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatTile label="Headcount" value={stats.headcount?.total ?? 0} hint={`${stats.headcount?.byStatus?.Active ?? 0} active · ${stats.headcount?.byStatus?.OnProbation ?? 0} on probation`} />
        <StatTile label="Present Today" value={presentToday} hint={`${stats.attendanceToday?.OnLeave || 0} on leave · ${stats.attendanceToday?.Absent || 0} absent`} />
        <StatTile label="Pending Leaves" value={stats.pendingLeaves?.count ?? 0} hint="awaiting approval" />
        <StatTile label="Payroll (This Month)" value={formatMoney(stats.payrollSummary?.totalNetSalary)} hint={`${stats.payrollSummary?.totalEmployees ?? 0} payroll records`} />
      </div>

      <div className={s.infoGrid}>
        <InfoCard title="Department Distribution">
          {(stats.departmentDistribution || []).map((d: any) => (
            <div key={d.department} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span>{d.department}</span>
                <span style={{ fontWeight: 600 }}>{d.count}</span>
              </div>
              <div className={s.progressTrack}>
                <div className={s.progressFill} style={{ width: `${(d.count / maxDeptCount) * 100}%` }} />
              </div>
            </div>
          ))}
          {(!stats.departmentDistribution || stats.departmentDistribution.length === 0) && <p className={s.mutedNote}>No data.</p>}
        </InfoCard>

        <InfoCard title="Pending Leave Requests">
          {(stats.pendingLeaves?.latest || []).map((req: any) => (
            <div key={req._id} className={s.infoRow}>
              <div>
                <div style={{ fontWeight: 600 }}>{req.employee?.firstName} {req.employee?.lastName}</div>
                <div className={s.entityMeta} style={{ marginBottom: 0 }}>{req.leaveType?.name} · {formatDate(req.startDate)} → {formatDate(req.endDate)} ({req.totalDays}d)</div>
              </div>
              <Badge status="Pending" />
            </div>
          ))}
          {(!stats.pendingLeaves?.latest || stats.pendingLeaves.latest.length === 0) && <p className={s.mutedNote}>No pending requests.</p>}
        </InfoCard>

        <InfoCard title="Announcements">
          {(stats.announcements || []).map((a: any) => (
            <div key={a._id} className={s.infoRow} style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{a.title}</span>
                {a.priority !== 'Normal' && <Badge status={a.priority} />}
              </div>
              <p className={s.entityMeta} style={{ marginTop: '2px', marginBottom: 0 }}>{a.body?.length > 120 ? `${a.body.slice(0, 120)}…` : a.body}</p>
            </div>
          ))}
          {(!stats.announcements || stats.announcements.length === 0) && <p className={s.mutedNote}>No active announcements.</p>}
        </InfoCard>

        <InfoCard title="Upcoming Birthdays (30 days)">
          {(stats.upcomingBirthdays || []).map((b: any) => (
            <div key={b._id} className={s.infoRow}>
              <span>{b.firstName} {b.lastName}</span>
              <span className={s.mutedNote}>{b.inDays === 0 ? 'Today 🎂' : `in ${b.inDays}d (${formatDate(b.date)})`}</span>
            </div>
          ))}
          {(!stats.upcomingBirthdays || stats.upcomingBirthdays.length === 0) && <p className={s.mutedNote}>None in the next 30 days.</p>}
        </InfoCard>

        <InfoCard title="Work Anniversaries (30 days)">
          {(stats.upcomingAnniversaries || []).map((a: any) => (
            <div key={a._id} className={s.infoRow}>
              <span>{a.firstName} {a.lastName}</span>
              <span className={s.mutedNote}>{a.years} yr{a.years === 1 ? '' : 's'} · {a.inDays === 0 ? 'Today 🎉' : `in ${a.inDays}d`}</span>
            </div>
          ))}
          {(!stats.upcomingAnniversaries || stats.upcomingAnniversaries.length === 0) && <p className={s.mutedNote}>None in the next 30 days.</p>}
        </InfoCard>

        <InfoCard title="Expiring Documents (60 days)">
          {(stats.expiringDocuments || []).map((doc: any) => (
            <div key={doc._id} className={s.infoRow}>
              <span>
                {doc.title}
                <span className={s.entityMeta} style={{ display: 'block', marginBottom: 0 }}>{doc.employee?.firstName} {doc.employee?.lastName} · {doc.category}</span>
              </span>
              <span style={{ color: 'var(--red)', fontWeight: 600 }}>{formatDate(doc.expiryDate)}</span>
            </div>
          ))}
          {(!stats.expiringDocuments || stats.expiringDocuments.length === 0) && <p className={s.mutedNote}>No documents expiring soon.</p>}
        </InfoCard>
      </div>
    </div>
  );
}
