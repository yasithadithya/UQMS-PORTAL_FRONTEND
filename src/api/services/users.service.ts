import { request } from '../client';
import type { ApiUser } from '../types';

export const usersService = {
  getUsers: () => {
    return request<{ success: boolean; count: number; data: ApiUser[] }>('/users');
  },

  createUser: (payload: {
    username: string;
    email: string;
    password: string;
    role: string;
  }) => {
    return request<{ success: boolean; message: string; data: ApiUser }>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateUser: (
    id: string,
    payload: {
      username?: string;
      email?: string;
      password?: string;
      role?: string;
    }
  ) => {
    return request<{ success: boolean; message: string; data: ApiUser }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteUser: (id: string) => {
    return request<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  }
};
