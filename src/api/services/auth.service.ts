import { request } from '../client';
import type { LoginResponse } from '../types';

export const authService = {
  login: (loginField: string, passwordField: string) => {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: loginField, password: passwordField }),
    });
  },
  /** Records the sign-out in the audit log; the token is discarded client-side regardless. */
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
};
