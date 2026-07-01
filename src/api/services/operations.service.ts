import { request } from '../client';
import { cachedRequest, CACHE_KEYS, TTL } from '../apiCache';
import type { ApiAreaOfOperation, ApiSurveyType, ApiVesselType } from '../types';

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
};
