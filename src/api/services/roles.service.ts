import { request } from '../client';
import { cachedRequest, invalidateCache, CACHE_KEYS, TTL } from '../apiCache';
import type { ApiRole } from '../types';

export const rolesService = {
  getRoles: () => {
    return cachedRequest(
      CACHE_KEYS.ROLES,
      () => request<{ success: boolean; count: number; data: ApiRole[] }>('/roles'),
      TTL.SEMI_DYNAMIC
    );
  },
  createRole: (payload: { roleName: string; permissions?: { module: string; actions: string[] }[] }) => {
    return request<{ success: boolean; message: string; data: ApiRole }>('/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((res) => {
      invalidateCache(CACHE_KEYS.ROLES);
      return res;
    });
  },
  updateRole: (id: string, payload: { roleName?: string; permissions?: { module: string; actions: string[] }[] }) => {
    return request<{ success: boolean; message: string; data: ApiRole }>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }).then((res) => {
      invalidateCache(CACHE_KEYS.ROLES);
      return res;
    });
  },
  deleteRole: (id: string) => {
    return request<{ success: boolean; message: string }>(`/roles/${id}`, {
      method: 'DELETE',
    }).then((res) => {
      invalidateCache(CACHE_KEYS.ROLES);
      return res;
    });
  },
};
