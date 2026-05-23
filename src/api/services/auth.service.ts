import { request } from '../client';
import type { LoginResponse } from '../types';

export const authService = {
  login: (loginField: string, passwordField: string) => {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: loginField, password: passwordField }),
    });
  }
};
