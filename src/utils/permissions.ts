import type { ApiModule, ApiRole } from '@/api';

/**
 * Mirrors BACKEND/src/config/permissionRegistry.ts. System modules are referenced by these stable
 * keys (never by display name), so renaming a module can't break access control.
 */
export const MODULE_KEYS = {
  reporting: 'reporting',
  marine: 'marine',
  firstEntry: 'marine.first-entry',
  marineEntries: 'marine.entries',
  marineBookings: 'marine.bookings',
  marineReports: 'marine.reports',
  marineCertificates: 'marine.certificates',
  newRequest: 'new-request',
  hr: 'hr',
  hrEmployees: 'hr.employees',
  hrAttendance: 'hr.attendance',
  hrLeave: 'hr.leave',
  hrPayroll: 'hr.payroll',
  hrPerformance: 'hr.performance',
  hrTraining: 'hr.training',
  hrAnnouncements: 'hr.announcements',
  finance: 'finance',
  financeQuotations: 'finance.quotations',
  financeFeeStructure: 'finance.fee-structure',
  admin: 'admin',
  adminUsers: 'admin.users',
  adminRoles: 'admin.roles',
  adminModules: 'admin.modules',
  adminMasterData: 'admin.master-data',
  adminAuditLog: 'admin.audit-log',
  adminSurveyConfig: 'admin.survey-config',
  // V2 survey workflow
  surveyorAllocation: 'surveyor-allocation',
  jobs: 'jobs',
  jobsMarine: 'jobs.marine',
  jobsIndustrial: 'jobs.industrial',
  jobsReporting: 'jobs.reporting',
  viewReport: 'view-report',
  authorization: 'authorization',
  approvals: 'approvals',
  ships: 'ships',
  qms: 'qms',
  qmsDocuments: 'qms.qms',
  qmsForms: 'qms.forms',
  qmsChecklist: 'qms.checklist',
  qmsSop: 'qms.sop',
  qmsJd: 'qms.jd',
  previousDocs: 'previous-docs',
  uqmsRules: 'uqms-rules',
  uqmsRulesRules: 'uqms-rules.rules',
  uqmsRulesGuidelines: 'uqms-rules.guidelines',
  flagInstructions: 'flag-instructions',
  flagMarineShippingNotice: 'flag-instructions.marine-shipping-notice',
  flagMarineNews: 'flag-instructions.marine-news',
  flagGazette: 'flag-instructions.gazette',
  flagMsn: 'flag-instructions.msn',
} as const;

export type ModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];

/** Upload-and-view document screens (UQMS Rules & Guidelines, Flag Instructions). Mirrors backend DOCUMENT_LIBRARY_KEYS. */
export const DOCUMENT_LIBRARIES = {
  [MODULE_KEYS.uqmsRulesRules]: { title: 'UQMS Rules', description: 'UQMS rules. Upload the current documents and open them here.', referenceLabel: 'Reference no.' },
  [MODULE_KEYS.uqmsRulesGuidelines]: { title: 'UQMS Guidelines', description: 'UQMS guidelines. Upload the current documents and open them here.', referenceLabel: 'Reference no.' },
  [MODULE_KEYS.flagMarineShippingNotice]: { title: 'Marine Shipping Notice', description: 'Flag instructions: marine shipping notices.', referenceLabel: 'Notice no.' },
  [MODULE_KEYS.flagMarineNews]: { title: 'Marine News', description: 'Flag instructions: marine news.', referenceLabel: 'Reference no.' },
  [MODULE_KEYS.flagGazette]: { title: 'Gazette', description: 'Flag instructions: gazette notifications.', referenceLabel: 'Gazette no.' },
  [MODULE_KEYS.flagMsn]: { title: 'Merchant Shipping Notices (MSN)', description: 'Flag instructions: Merchant Shipping Notices (MSN).', referenceLabel: 'MSN no.' },
} as const;
export type DocumentLibraryKey = keyof typeof DOCUMENT_LIBRARIES;
export const isDocumentLibraryKey = (key: unknown): key is DocumentLibraryKey => typeof key === 'string' && key in DOCUMENT_LIBRARIES;

export const MARINE_KEYS: ModuleKey[] = [
  MODULE_KEYS.marineEntries, MODULE_KEYS.marineBookings, MODULE_KEYS.marineReports, MODULE_KEYS.marineCertificates,
];

export const HR_KEYS: ModuleKey[] = [
  MODULE_KEYS.hrEmployees, MODULE_KEYS.hrAttendance, MODULE_KEYS.hrLeave, MODULE_KEYS.hrPayroll,
  MODULE_KEYS.hrPerformance, MODULE_KEYS.hrTraining, MODULE_KEYS.hrAnnouncements,
];

export const FINANCE_KEYS: ModuleKey[] = [MODULE_KEYS.financeQuotations, MODULE_KEYS.financeFeeStructure];

export const ACTION_LABELS: Record<string, string> = {
  create: 'Create',
  read: 'Read',
  update: 'Update',
  delete: 'Delete',
  approve: 'Approve',
  accept: 'Accept',
  'sign-on-behalf': 'Sign on behalf',
  'revoke-signature': 'Revoke signature',
  override: 'Override',
  discount: 'Discount',
  export: 'Export',
  'view-all': 'View all',
};

/** The role name that has unrestricted access (matches the backend). */
export const SUPER_ADMIN_ROLE_NAME = 'admin';

export const isSuperAdminRole = (role: Pick<ApiRole, 'roleName'> | null | undefined): boolean =>
  !!role && typeof role.roleName === 'string' && role.roleName.trim().toLowerCase() === SUPER_ADMIN_ROLE_NAME;

export const permissionModuleId = (module: ApiRole['permissions'][number]['module']): string =>
  typeof module === 'object' && module ? module._id : String(module);

/** Actions a module offers; modules created before actions existed default to CRUD. */
export const moduleActions = (mod: ApiModule): string[] =>
  mod.actions && mod.actions.length > 0 ? mod.actions : ['create', 'read', 'update', 'delete'];

/** Modules that appear in navigation and URLs (permission-only modules are excluded). */
export const isNavigable = (mod: ApiModule): boolean => mod.navigable !== false;
