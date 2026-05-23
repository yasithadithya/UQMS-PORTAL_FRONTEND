import { request } from '../client';
import type { ApiVessel } from '../types';

export const vesselsService = {
  getVessels: () => {
    return request<{ success: boolean; count: number; data: ApiVessel[] }>('/vessels');
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
    });
  },
  updateVessel: (id: string, payload: Partial<ApiVessel>) => {
    return request<{ success: boolean; message: string; data: ApiVessel }>(`/vessels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  deleteVessel: (id: string) => {
    return request<{ success: boolean; message: string }>(`/vessels/${id}`, {
      method: 'DELETE',
    });
  },
};
