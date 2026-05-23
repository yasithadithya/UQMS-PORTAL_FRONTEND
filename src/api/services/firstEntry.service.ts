import { request, requestFormData } from '../client';
import type { ApiFirstEntry, ApiScheduleII, ApiScheduleIIDocument } from '../types';

export const firstEntryService = {
  // First Entry endpoints
  getFirstEntries: () => {
    return request<{ success: boolean; count: number; data: ApiFirstEntry[] }>('/first-entries');
  },
  getFirstEntryById: (id: string) => {
    return request<{ success: boolean; data: ApiFirstEntry }>(`/first-entries/${id}`);
  },
  createFirstEntry: (payload: {
    request: string;
    vessel: string;
    isQuoted: boolean;
    quotationNumber?: string;
    quotationComments?: string;
  }) => {
    return request<{ success: boolean; message: string; data: ApiFirstEntry }>('/first-entries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateFirstEntry: (id: string, payload: Partial<{
    request: string;
    vessel: string;
    isQuoted: boolean;
    quotationNumber?: string;
    quotationComments?: string;
  }>) => {
    return request<{ success: boolean; message: string; data: ApiFirstEntry }>(`/first-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  deleteFirstEntry: (id: string) => {
    return request<{ success: boolean; message: string }>(`/first-entries/${id}`, {
      method: 'DELETE',
    });
  },

  // Schedule II endpoints
  createScheduleII: (payload: {
    firstEntryId: string;
    status?: string;
    documents?: ApiScheduleIIDocument[];
  }) => {
    return request<{ success: boolean; message: string; data: ApiScheduleII }>('/first-entries/schedule2', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getScheduleIIById: (scheduleId: string) => {
    return request<{ success: boolean; data: ApiScheduleII }>(`/first-entries/schedule2/${scheduleId}`);
  },
  updateScheduleII: (scheduleId: string, payload: Partial<{
    status?: string;
    documents?: ApiScheduleIIDocument[];
  }>) => {
    return request<{ success: boolean; message: string; data: ApiScheduleII }>(`/first-entries/schedule2/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  deleteScheduleII: (scheduleId: string) => {
    return request<{ success: boolean; message: string }>(`/first-entries/schedule2/${scheduleId}`, {
      method: 'DELETE',
    });
  },

  // File Upload Helper to upload schedule 2 documents to R2
  uploadScheduleIIDocument: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return requestFormData<{
      success: boolean;
      message: string;
      data: {
        key: string;
        bucket: string;
        url: string;
        etag: string;
        contentType: string;
        size: number;
      };
    }>('/uploads?prefix=schedule2', formData, {
      method: 'POST',
    });
  },
};
