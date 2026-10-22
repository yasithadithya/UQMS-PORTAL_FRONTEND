/** Mirrors BACKEND/src/config/surveyCategories.ts. */
export type Sector = 'marine' | 'industrial';

export const MARINE_MAIN_TYPES = ['first-entry', 'periodical', 'occasional', 'new-construction', 'audit'] as const;
export const INDUSTRIAL_MAIN_TYPES = ['industrial-audit', 'industrial-survey'] as const;
export type MainSurveyType = (typeof MARINE_MAIN_TYPES)[number] | (typeof INDUSTRIAL_MAIN_TYPES)[number];

export const MAIN_SURVEY_TYPE_LABELS: Record<MainSurveyType, string> = {
  'first-entry': 'First Entry',
  periodical: 'Periodical Survey',
  occasional: 'Occasional Survey',
  'new-construction': 'New Constructions',
  audit: 'Audits',
  'industrial-audit': 'Audits',
  'industrial-survey': 'Surveys',
};

export const MAIN_TYPES_BY_SECTOR: Record<Sector, readonly MainSurveyType[]> = {
  marine: MARINE_MAIN_TYPES,
  industrial: INDUSTRIAL_MAIN_TYPES,
};

export const sectorOfMainType = (mainType: MainSurveyType): Sector =>
  (INDUSTRIAL_MAIN_TYPES as readonly string[]).includes(mainType) ? 'industrial' : 'marine';

/** Main types whose reporting workspace is built in this version. */
export const IMPLEMENTED_MAIN_TYPES: MainSurveyType[] = ['first-entry'];

export const JOB_STATUS_LABELS: Record<string, string> = {
  allocated: 'Allocated',
  booked: 'Booked',
  'in-progress': 'In progress',
  submitted: 'Submitted for review',
  'surveyor-approved': 'Surveyor approved',
  'pending-authorization': 'Awaiting manager',
  completed: 'Completed',
};

export const JOB_STATUS_TONES: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'accent'> = {
  allocated: 'neutral',
  booked: 'info',
  'in-progress': 'info',
  submitted: 'warning',
  'surveyor-approved': 'accent',
  'pending-authorization': 'warning',
  completed: 'success',
};

/** Surveyors and assistant surveyors only see the jobs allocated to them (mirrors the backend). */
export const SURVEYOR_ROLE_NAMES = ['surveyor', 'assistant-surveyor'];
export const isSurveyorRoleName = (roleName?: string | null): boolean =>
  SURVEYOR_ROLE_NAMES.includes(String(roleName ?? '').trim().toLowerCase());
