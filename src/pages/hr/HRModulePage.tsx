import { useState } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import EmployeeList from './EmployeeList';
import AttendanceView from './AttendanceView';
import LeaveManagement from './LeaveManagement';
import PayrollDashboard from './PayrollDashboard';

export default function HRModulePage({ currentModule }: { currentModule: any }) {
  const { module } = useParams<{ module?: string }>();
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'leaves' | 'payroll'>('employees');

  const basePath = `/${module || 'hr'}`;

  return (
    <div className="animate-in" style={{ padding: '4px' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="greeting" style={{ animation: 'fadeUp .4s ease both' }}>Human Resources</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
            Manage employees, attendance, leaves, and payroll processing.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--separator)', marginBottom: '24px', gap: '20px' }}>
        <button
          onClick={() => setActiveTab('employees')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'employees' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'employees' ? 'var(--label)' : 'var(--muted)',
            fontSize: '14px',
            fontWeight: 600,
            padding: '12px 4px',
            cursor: 'pointer',
            transition: 'all var(--transition)'
          }}
        >
          Employees
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'attendance' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'attendance' ? 'var(--label)' : 'var(--muted)',
            fontSize: '14px',
            fontWeight: 600,
            padding: '12px 4px',
            cursor: 'pointer',
            transition: 'all var(--transition)'
          }}
        >
          Attendance
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'leaves' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'leaves' ? 'var(--label)' : 'var(--muted)',
            fontSize: '14px',
            fontWeight: 600,
            padding: '12px 4px',
            cursor: 'pointer',
            transition: 'all var(--transition)'
          }}
        >
          Leaves
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'payroll' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'payroll' ? 'var(--label)' : 'var(--muted)',
            fontSize: '14px',
            fontWeight: 600,
            padding: '12px 4px',
            cursor: 'pointer',
            transition: 'all var(--transition)'
          }}
        >
          Payroll
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'employees' && <EmployeeList basePath={basePath} />}
      {activeTab === 'attendance' && <AttendanceView basePath={basePath} />}
      {activeTab === 'leaves' && <LeaveManagement basePath={basePath} />}
      {activeTab === 'payroll' && <PayrollDashboard basePath={basePath} />}
    </div>
  );
}
