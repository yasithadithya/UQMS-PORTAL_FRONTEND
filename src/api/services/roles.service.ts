import { request } from '../client';
import type { ApiRole } from '../types';

export const rolesService = {
  getRoles: () => {
    return request<{ success: boolean; count: number; data: ApiRole[] }>('/roles');
  },
  createRole: (payload: { roleName: string; permissions?: { module: string; actions: string[] }[] }) => {
    return request<{ success: boolean; message: string; data: ApiRole }>('/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateRole: (id: string, payload: { roleName?: string; permissions?: { module: string; actions: string[] }[] }) => {
    return request<{ success: boolean; message: string; data: ApiRole }>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  deleteRole: (id: string) => {
    return request<{ success: boolean; message: string }>(`/roles/${id}`, {
      method: 'DELETE',
    });
  },
};
