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

/** Sector a survey sub type is offered in ("both" = marine and industrial). */
export type SubTypeSector = Sector | 'both';

export const ALL_MAIN_TYPES: readonly MainSurveyType[] = [...MARINE_MAIN_TYPES, ...INDUSTRIAL_MAIN_TYPES];

/** Main types a sub type offered in this sector may belong to (mirrors the backend check). */
export const mainTypesForSector = (sector: SubTypeSector): readonly MainSurveyType[] =>
  sector === 'both' ? ALL_MAIN_TYPES : MAIN_TYPES_BY_SECTOR[sector];

/** "First Entry" or, for industrial types whose labels repeat marine ones, "Industrial · Audits". */
export const mainTypeFullLabel = (t: MainSurveyType): string =>
  `${sectorOfMainType(t) === 'industrial' ? 'Industrial · ' : ''}${MAIN_SURVEY_TYPE_LABELS[t]}`;

/** Main types whose reporting workspace is built in this version. */
export const IMPLEMENTED_MAIN_TYPES: MainSurveyType[] = ['first-entry'];

export const JOB_STATUS_LABELS: Record<string, string> = {
  allocated: 'Surveyor booked',
  booked: 'Visits planned',
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
