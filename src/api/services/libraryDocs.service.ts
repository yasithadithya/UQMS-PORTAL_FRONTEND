import { request } from '../client';
import type { ApiJobDocument, ApiLibraryDocument, PaginationMeta } from '../types';

export interface LibraryDocumentPayload {
  library: string;
  title: string;
  referenceNumber?: string;
  issueDate?: string | null;
  remarks?: string;
  documents: ApiJobDocument[];
}

/** UQMS Rules & Guidelines and Flag Instructions documents (one library per screen). */
export const libraryDocsService = {
  list: (params: { library: string; search?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') sp.append(k, String(v));
    });
    return request<{ success: boolean; count: number; pagination: PaginationMeta; data: ApiLibraryDocument[] }>(`/library-documents?${sp.toString()}`);
  },
  create: (payload: LibraryDocumentPayload) =>
    request<{ success: boolean; message: string; data: ApiLibraryDocument }>('/library-documents', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Omit<LibraryDocumentPayload, 'library'>) =>
    request<{ success: boolean; message: string; data: ApiLibraryDocument }>(`/library-documents/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id: string) => request<{ success: boolean; message: string }>(`/library-documents/${id}`, { method: 'DELETE' }),
};
