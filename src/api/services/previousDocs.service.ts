import { request } from '../client';
import type { ApiJobDocument, ApiPreviousDocument, PaginationMeta } from '../types';

export interface PreviousDocumentPayload {
  uqmsNumber: string;
  vesselName: string;
  vesselCode?: string;
  remarks?: string;
  documents: ApiJobDocument[];
}

export const previousDocsService = {
  list: (params: { search?: string; page?: number; limit?: number } = {}) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') sp.append(k, String(v));
    });
    const qs = sp.toString();
    return request<{ success: boolean; count: number; pagination: PaginationMeta; data: ApiPreviousDocument[] }>(
      `/previous-documents${qs ? `?${qs}` : ''}`
    );
  },
  create: (payload: PreviousDocumentPayload) =>
    request<{ success: boolean; message: string; data: ApiPreviousDocument }>('/previous-documents', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: PreviousDocumentPayload) =>
    request<{ success: boolean; message: string; data: ApiPreviousDocument }>(`/previous-documents/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id: string) => request<{ success: boolean; message: string }>(`/previous-documents/${id}`, { method: 'DELETE' }),
};
