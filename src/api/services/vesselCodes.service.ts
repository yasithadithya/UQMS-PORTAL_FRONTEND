import { request } from '../client';
import { cachedRequest, CACHE_KEYS, TTL } from '../apiCache';
import type { ApiVesselCode } from '../types';

export const vesselCodesService = {
  getVesselCodes: () => {
    return cachedRequest(
      CACHE_KEYS.VESSEL_CODES,
      () => request<{ success: boolean; count: number; data: ApiVesselCode[] }>('/vessel-codes'),
      TTL.STATIC
    );
  },
};
