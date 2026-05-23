import { request } from '../client';
import type { ApiModule } from '../types';

export const modulesService = {
  getModules: () => {
    return request<{ success: boolean; count: number; data: ApiModule[] }>('/modules');
  },
  createModule: (payload: { name: string; description?: string; parentId?: string }) => {
    return request<{ success: boolean; message: string; data: ApiModule }>('/modules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateModule: (id: string, payload: { name: string; description?: string; parentId?: string }) => {
    return request<{ success: boolean; message: string; data: ApiModule }>(`/modules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  deleteModule: (id: string) => {
    return request<{ success: boolean; message: string }>(`/modules/${id}`, {
      method: 'DELETE',
    });
  },
};
