import { request } from '../client';
import { cachedRequest, invalidateCache, CACHE_KEYS, TTL } from '../apiCache';
import type { ApiModule } from '../types';

export const modulesService = {
  getModules: () => {
    return cachedRequest(
      CACHE_KEYS.MODULES,
      () => request<{ success: boolean; count: number; data: ApiModule[] }>('/modules'),
      TTL.SEMI_DYNAMIC
    );
  },
  createModule: (payload: { name: string; description?: string; parentId?: string; order?: number }) => {
    return request<{ success: boolean; message: string; data: ApiModule }>('/modules', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((res) => {
      invalidateCache(CACHE_KEYS.MODULES);
      return res;
    });
  },
  updateModule: (id: string, payload: { name: string; description?: string; parentId?: string; order?: number }) => {
    return request<{ success: boolean; message: string; data: ApiModule }>(`/modules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }).then((res) => {
      invalidateCache(CACHE_KEYS.MODULES);
      return res;
    });
  },
  deleteModule: (id: string) => {
    return request<{ success: boolean; message: string }>(`/modules/${id}`, {
      method: 'DELETE',
    }).then((res) => {
      invalidateCache(CACHE_KEYS.MODULES);
      return res;
    });
  },
};
