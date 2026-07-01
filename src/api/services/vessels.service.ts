import { request } from '../client';
import { cachedRequest, invalidateCache, CACHE_KEYS, TTL } from '../apiCache';
import type { ApiVessel } from '../types';

export const vesselsService = {
  getVessels: () => {
    return cachedRequest(
      CACHE_KEYS.VESSELS,
      () => request<{ success: boolean; count: number; data: ApiVessel[] }>('/vessels'),
      TTL.SEMI_DYNAMIC
    );
  },
  getVesselById: (id: string) => {
    return request<{ success: boolean; data: ApiVessel }>(`/vessels/${id}`);
  },
  searchVessels: (query: string) => {
    return request<{ success: boolean; count: number; data: ApiVessel[] }>(`/vessels/search?query=${encodeURIComponent(query)}`);
  },
  createVessel: (payload: Partial<ApiVessel>) => {
    return request<{ success: boolean; message: string; data: ApiVessel }>('/vessels', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((res) => {
      invalidateCache(CACHE_KEYS.VESSELS);
      return res;
    });
  },
  updateVessel: (id: string, payload: Partial<ApiVessel>) => {
    return request<{ success: boolean; message: string; data: ApiVessel }>(`/vessels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }).then((res) => {
      invalidateCache(CACHE_KEYS.VESSELS);
      return res;
    });
  },
  deleteVessel: (id: string) => {
    return request<{ success: boolean; message: string }>(`/vessels/${id}`, {
      method: 'DELETE',
    }).then((res) => {
      invalidateCache(CACHE_KEYS.VESSELS);
      return res;
    });
  },
};
