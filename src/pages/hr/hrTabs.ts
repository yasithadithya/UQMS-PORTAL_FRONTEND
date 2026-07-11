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

export const findGroupForSubTab = (subTabId: string): HrTabGroup | undefined =>
  HR_TAB_GROUPS.find(g => g.id === subTabId || g.subTabs?.some(s => s.id === subTabId));
