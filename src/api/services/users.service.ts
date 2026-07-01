import { request } from '../client';
import { cachedRequest, invalidateCache, CACHE_KEYS, TTL } from '../apiCache';
import type { ApiUser } from '../types';

export const usersService = {
  getUsers: () => {
    return cachedRequest(
      CACHE_KEYS.USERS,
      () => request<{ success: boolean; count: number; data: ApiUser[] }>('/users'),
      TTL.SEMI_DYNAMIC
    );
  },

  getUserById: (id: string) => {
    return request<{ success: boolean; data: ApiUser }>(`/users/${id}`);
  },

  createUser: (payload: {
    username: string;
    email: string;
    password: string;
    role: string;
    fullName: string;
    nameWithInitials?: string;
    phoneNumber: string;
    address?: string;
    dob?: string;
    empNumber?: string;
  }) => {
    return request<{ success: boolean; message: string; data: ApiUser }>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((res) => {
      invalidateCache(CACHE_KEYS.USERS);
      return res;
    });
  },

  updateUser: (
    id: string,
    payload: {
      username?: string;
      email?: string;
      password?: string;
      role?: string;
      fullName?: string;
      nameWithInitials?: string;
      phoneNumber?: string;
      address?: string;
      dob?: string;
      empNumber?: string;
    }
  ) => {
    return request<{ success: boolean; message: string; data: ApiUser }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }).then((res) => {
      invalidateCache(CACHE_KEYS.USERS);
      return res;
    });
  },

  deleteUser: (id: string) => {
    return request<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE',
    }).then((res) => {
      invalidateCache(CACHE_KEYS.USERS);
      return res;
    });
  }
};
