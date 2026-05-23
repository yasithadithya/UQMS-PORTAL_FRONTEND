import { request, requestFormData } from '../client';
import type { ApiRequest } from '../types';

export type RequestPayload = {
  uqmsNumber?: string;
  imoNumber?: string;
  vesselName: string;
  companyName: string;
  contactPersonName: string;
  contactPersonNumber: string;
  registerdAddress?: string;
  invoicingAddress: string;
  companyEmail: string;
  sector: 'marine' | 'industrial';
  vesselType: string;
  areaOfOperation: string;
  surveyTypes: string[];
  status?: 'active' | 'print' | 'reject' | 'success';
};

const buildDocumentsFormData = (
  documents: Array<{ file: File; name?: string }>
): FormData => {
  const formData = new FormData();
  documents.forEach((doc) => {
    formData.append('files', doc.file);
    if (doc.name) {
      formData.append('documentNames', doc.name);
    }
  });
  return formData;
};

export const requestsService = {
  getRequests: () => {
    return request<{ success: boolean; count: number; data: ApiRequest[] }>('/requests');
  },
  createRequest: (payload: RequestPayload) => {
    return request<{ success: boolean; message: string; data: ApiRequest }>('/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateRequest: (id: string, payload: Partial<RequestPayload>) => {
    return request<{ success: boolean; message: string; data: ApiRequest }>(`/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  deleteRequest: (id: string) => {
    return request<{ success: boolean; message: string }>(`/requests/${id}`, {
      method: 'DELETE',
    });
  },
  getRequestById: (id: string) => {
    return request<{ success: boolean; data: ApiRequest }>(`/requests/${id}`);
  },
  addRequestDocuments: (id: string, documents: Array<{ file: File; name?: string }>) => {
    const formData = buildDocumentsFormData(documents);
    return requestFormData<{ success: boolean; message: string; data: ApiRequest }>(
      `/requests/${id}/documents`,
      formData,
      { method: 'POST' }
    );
  },
  updateRequestDocument: (
    id: string,
    documentId: string,
    payload: { name?: string; file?: File }
  ) => {
    const formData = new FormData();
    if (payload.name) formData.append('name', payload.name);
    if (payload.file) formData.append('file', payload.file);

    return requestFormData<{ success: boolean; message: string; data: ApiRequest }>(
      `/requests/${id}/documents/${documentId}`,
      formData,
      { method: 'PUT' }
    );
  },
  deleteRequestDocument: (id: string, documentId: string) => {
    return request<{ success: boolean; message: string }>(`/requests/${id}/documents/${documentId}`, {
      method: 'DELETE',
    });
  },
  getRequestSurveyPdf: async (id: string) => {
    const response = await request<{ success: boolean; data: { url: string } }>(`/requests/${id}/survey-pdf`);
    return response.data.url;
  },
  printRequestSurveyPdf: async (id: string) => {
    const generated = await request<{ success: boolean; data: { url: string } }>(`/requests/${id}/survey-pdf`, {
      method: 'POST',
    });

    return generated.data.url;
  },
};
