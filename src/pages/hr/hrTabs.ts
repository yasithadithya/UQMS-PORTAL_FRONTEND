import { MODULE_KEYS, type ModuleKey } from '../../utils/permissions';

export interface HrSubTab {
  id: string;
  label: string;
}

export interface HrTabGroup {
  id: string;
  label: string;
  subTabs?: HrSubTab[];
}

// Two-level navigation for the HR module. Groups without subTabs render a single view.
export const HR_TAB_GROUPS: HrTabGroup[] = [
  { id: 'dashboard', label: 'Dashboard' },
  {
    id: 'people',
    label: 'People',
    subTabs: [
      { id: 'employees', label: 'Employees' },
      { id: 'documents', label: 'Documents' },
      { id: 'onboarding', label: 'On/Offboarding' },
    ],
  },
  {
    id: 'time',
    label: 'Time',
    subTabs: [
      { id: 'attendance', label: 'Attendance' },
      { id: 'leaves', label: 'Leaves' },
      { id: 'balances', label: 'Balances' },
      { id: 'holidays', label: 'Holidays' },
    ],
  },
  {
    id: 'pay',
    label: 'Pay',
    subTabs: [
      { id: 'payroll', label: 'Payroll' },
      { id: 'structures', label: 'Salary Structures' },
    ],
  },
  {
    id: 'talent',
    label: 'Talent',
    subTabs: [
      { id: 'performance', label: 'Performance' },
      { id: 'training', label: 'Training' },
    ],
  },
  { id: 'announcements', label: 'Announcements' },
  {
    id: 'settings',
    label: 'Settings',
    subTabs: [
      { id: 'org', label: 'Departments & Titles' },
      { id: 'leavetypes', label: 'Leave Types' },
    ],
  },
  { id: 'myhr', label: 'My HR' },
];

/**
 * The permission sub-module behind each HR view. "dashboard" needs read on any HR sub-module;
 * "myhr" (self-service) is open to everyone.
 */
export const HR_TAB_MODULE: Record<string, ModuleKey> = {
  employees: MODULE_KEYS.hrEmployees,
  documents: MODULE_KEYS.hrEmployees,
  onboarding: MODULE_KEYS.hrEmployees,
  org: MODULE_KEYS.hrEmployees,
  attendance: MODULE_KEYS.hrAttendance,
  leaves: MODULE_KEYS.hrLeave,
  balances: MODULE_KEYS.hrLeave,
  holidays: MODULE_KEYS.hrLeave,
  leavetypes: MODULE_KEYS.hrLeave,
  payroll: MODULE_KEYS.hrPayroll,
  structures: MODULE_KEYS.hrPayroll,
  performance: MODULE_KEYS.hrPerformance,
  training: MODULE_KEYS.hrTraining,
  announcements: MODULE_KEYS.hrAnnouncements,
};

export const findGroupForSubTab = (subTabId: string): HrTabGroup | undefined =>
  HR_TAB_GROUPS.find(g => g.id === subTabId || g.subTabs?.some(s => s.id === subTabId));
