import { request } from '../client';
import { cachedRequest, invalidateCache, CACHE_KEYS, TTL } from '../apiCache';
import type { ApiAreaOfOperation, ApiSurveyType, ApiVesselType } from '../types';

export type SurveyTypeInput = Partial<Pick<ApiSurveyType, 'code' | 'name' | 'description' | 'sector' | 'mainTypes'>>;

/** How many records use a survey type, keyed by survey type id (ids with no usage are absent). */
export type SurveyTypeUsage = Record<string, { requests: number; jobs: number; checklistQuestions: number }>;

/** Runs a survey type change and drops the cached list so every screen sees it. */
const mutateSurveyTypes = async <T>(run: () => Promise<T>): Promise<T> => {
  const res = await run();
  invalidateCache(CACHE_KEYS.SURVEY_TYPES);
  return res;
};

export const operationsService = {
  getVesselTypes: () => {
    return cachedRequest(
      CACHE_KEYS.VESSEL_TYPES,
      () => request<{ success: boolean; count: number; data: ApiVesselType[] }>('/operations/vessel-types'),
      TTL.STATIC
    );
  },
  getSurveyTypes: () => {
    return cachedRequest(
      CACHE_KEYS.SURVEY_TYPES,
      () => request<{ success: boolean; count: number; data: ApiSurveyType[] }>('/operations/survey-types'),
      TTL.STATIC
    );
  },
  getAreaOperations: () => {
    return cachedRequest(
      CACHE_KEYS.AREA_OPERATIONS,
      () => request<{ success: boolean; count: number; data: ApiAreaOfOperation[] }>('/operations/area-operations'),
      TTL.STATIC
    );
  },

  /* Survey configuration (Admin → Survey Configuration) */
  getSurveyTypeUsage: () => request<{ success: boolean; data: SurveyTypeUsage }>('/operations/survey-types/usage'),
  createSurveyType: (data: SurveyTypeInput) =>
    mutateSurveyTypes(() => request<{ success: boolean; message?: string; data: ApiSurveyType }>('/operations/survey-types', {
      method: 'POST', body: JSON.stringify(data),
    })),
  updateSurveyType: (id: string, data: SurveyTypeInput) =>
    mutateSurveyTypes(() => request<{ success: boolean; message?: string; data: ApiSurveyType }>(`/operations/survey-types/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    })),
  deleteSurveyType: (id: string) =>
    mutateSurveyTypes(() => request<{ success: boolean; message?: string }>(`/operations/survey-types/${id}`, { method: 'DELETE' })),
};
