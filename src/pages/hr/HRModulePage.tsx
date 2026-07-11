import { useMemo, type ReactElement } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HR_TAB_GROUPS, findGroupForSubTab } from './hrTabs';
import s from './hr.module.css';

import HRDashboard from './HRDashboard';
import EmployeeList from './EmployeeList';
import EmployeeDocuments from './EmployeeDocuments';
import OnboardingView from './OnboardingView';
import AttendanceView from './AttendanceView';
import LeaveManagement from './LeaveManagement';
import LeaveBalancesView from './LeaveBalancesView';
import HolidaysManagement from './HolidaysManagement';
import PayrollDashboard from './PayrollDashboard';
import SalaryStructures from './SalaryStructures';
import PerformanceView from './PerformanceView';
import TrainingView from './TrainingView';
import Announcements from './Announcements';
import DepartmentsJobTitles from './DepartmentsJobTitles';
import LeaveTypesManagement from './LeaveTypesManagement';
import MyHRView from './MyHRView';

const CONTENT: Record<string, (basePath: string) => ReactElement> = {
  dashboard: () => <HRDashboard />,
  employees: (basePath) => <EmployeeList basePath={basePath} />,
  documents: () => <EmployeeDocuments />,
  onboarding: () => <OnboardingView />,
  attendance: (basePath) => <AttendanceView basePath={basePath} />,
  leaves: (basePath) => <LeaveManagement basePath={basePath} />,
  balances: () => <LeaveBalancesView />,
  holidays: () => <HolidaysManagement />,
  payroll: (basePath) => <PayrollDashboard basePath={basePath} />,
  structures: () => <SalaryStructures />,
  performance: () => <PerformanceView />,
  training: () => <TrainingView />,
  announcements: () => <Announcements />,
  org: () => <DepartmentsJobTitles />,
  leavetypes: () => <LeaveTypesManagement />,
  myhr: () => <MyHRView />,
};

export default function HRModulePage({ currentModule }: { currentModule: any }) {
  const { module } = useParams<{ module?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();

  const basePath = `/${module || 'hr'}`;
  const isHrAdmin = hasPermission('hr', 'update');

  const groups = useMemo(
    () => HR_TAB_GROUPS.filter(g => (isHrAdmin ? true : g.id === 'myhr')),
    [isHrAdmin]
  );

  const defaultTab = isHrAdmin ? 'dashboard' : 'myhr';
  const requestedTab = searchParams.get('tab') || defaultTab;
  const activeGroup = findGroupForSubTab(requestedTab);
  const isAllowed = !!activeGroup && groups.some(g => g.id === activeGroup.id);
  const effectiveGroup = isAllowed ? activeGroup! : findGroupForSubTab(defaultTab)!;
  const activeTab = isAllowed
    ? (effectiveGroup.subTabs && effectiveGroup.id === requestedTab
        ? effectiveGroup.subTabs[0].id
        : requestedTab)
    : defaultTab;

  const setTab = (tabId: string) => {
    setSearchParams({ tab: tabId }, { replace: false });
  };

  const onGroupClick = (groupId: string) => {
    const group = HR_TAB_GROUPS.find(g => g.id === groupId)!;
    setTab(group.subTabs ? group.subTabs[0].id : group.id);
  };

  const render = CONTENT[activeTab] || CONTENT[defaultTab];

  return (
    <div className="animate-in" style={{ padding: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="greeting" style={{ animation: 'fadeUp .4s ease both' }}>Human Resources</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
            {isHrAdmin
              ? 'Manage employees, attendance, leave, payroll, performance, training, and more.'
              : 'Your personal HR portal — profile, attendance, leave, and payslips.'}
          </p>
        </div>
      </div>

      <div className={s.groupTabs} style={{ marginBottom: effectiveGroup.subTabs ? '14px' : '24px' }}>
        {groups.map(group => (
          <button
            key={group.id}
            onClick={() => onGroupClick(group.id)}
            className={`${s.groupTab} ${group.id === effectiveGroup.id ? s.groupTabActive : ''}`}
          >
            {group.label}
          </button>
        ))}
      </div>

      {effectiveGroup.subTabs && (
        <div className={s.subTabs} style={{ marginBottom: '24px' }}>
          {effectiveGroup.subTabs.map(sub => (
            <button
              key={sub.id}
              onClick={() => setTab(sub.id)}
              className={`${s.subTab} ${sub.id === activeTab ? s.subTabActive : ''}`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {render(basePath)}
    </div>
  );
}
