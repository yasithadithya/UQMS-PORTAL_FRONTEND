import { request } from '../client';
import type { ApiVesselCode } from '../types';

export const vesselCodesService = {
  getVesselCodes: () => {
    return request<{ success: boolean; count: number; data: ApiVesselCode[] }>('/vessel-codes');
  },
};
