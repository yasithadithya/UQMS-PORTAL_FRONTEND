import { request } from '../client';

export const healthService = {
  check: () => {
    return request<{ success: boolean; message: string }>('/health');
  }
};
