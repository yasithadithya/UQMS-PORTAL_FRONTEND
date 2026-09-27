import { useMemo, type ReactElement } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HR_TAB_GROUPS, HR_TAB_MODULE, type HrTabGroup } from './hrTabs';
import { HR_KEYS } from '../../utils/permissions';
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
  const { can, canAny } = useAuth();

  const basePath = `/${module || 'hr'}`;
  // Anyone who can read at least one HR area sees the admin views; everyone else gets self-service only.
  const isHrAdmin = canAny(HR_KEYS);

  const groups = useMemo(() => {
    const isTabAllowed = (id: string) =>
      id === 'myhr' ? true : id === 'dashboard' ? isHrAdmin : !!HR_TAB_MODULE[id] && can(HR_TAB_MODULE[id]);
    return HR_TAB_GROUPS
      .map((g): HrTabGroup => (g.subTabs ? { ...g, subTabs: g.subTabs.filter(st => isTabAllowed(st.id)) } : g))
      .filter(g => (g.subTabs ? g.subTabs.length > 0 : isTabAllowed(g.id)));
  }, [can, isHrAdmin]);

  const findGroup = (tabId: string) => groups.find(g => g.id === tabId || g.subTabs?.some(st => st.id === tabId));

  const defaultTab = isHrAdmin ? (groups[0].subTabs ? groups[0].subTabs[0].id : groups[0].id) : 'myhr';
  const requestedTab = searchParams.get('tab') || defaultTab;
  const activeGroup = findGroup(requestedTab);
  const effectiveGroup = activeGroup ?? findGroup(defaultTab)!;
  const activeTab = activeGroup
    ? (activeGroup.subTabs && activeGroup.id === requestedTab ? activeGroup.subTabs[0].id : requestedTab)
    : defaultTab;

  const setTab = (tabId: string) => {
    setSearchParams({ tab: tabId }, { replace: false });
  };

  const onGroupClick = (groupId: string) => {
    const group = groups.find(g => g.id === groupId)!;
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
