import { request } from '../client';
import type { ApiAreaOfOperation, ApiSurveyType, ApiVesselType } from '../types';

export const operationsService = {
  getVesselTypes: () => {
    return request<{ success: boolean; count: number; data: ApiVesselType[] }>('/operations/vessel-types');
  },
  getSurveyTypes: () => {
    return request<{ success: boolean; count: number; data: ApiSurveyType[] }>('/operations/survey-types');
  },
  getAreaOperations: () => {
    return request<{ success: boolean; count: number; data: ApiAreaOfOperation[] }>('/operations/area-operations');
  },
};
