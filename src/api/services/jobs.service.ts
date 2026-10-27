import { request, requestFormData, requestBlob } from '../client';
import type {
  ApiAllocatableSurveyor, ApiAllocationQueueItem, ApiJob, ApiJobDocument, ApiJobReportItem, ApiSurveyType, PaginationMeta, SignableDocType,
} from '../types';
import { firstEntryService } from './firstEntry.service';
import { surveyReportService } from './surveyReport.service';

const buildQuery = (params?: Record<string, unknown>): string => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') searchParams.append(key, String(value));
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
};

type JobResponse = { success: boolean; message?: string; data: ApiJob };

export interface AllocationPayload {
  requestId: string;
  mainSurveyType: string;
  surveyTypeIds: string[];
  surveyorId: string;
  assistantSurveyorIds: string[];
  mssProofRequired: boolean;
  vesselId?: string;
  /** Corrections to the request details. */
  request?: Record<string, unknown>;
}

export interface JobListParams {
  scope?: 'mine' | 'authorization' | 'completed';
  sector?: string;
  mainSurveyType?: string;
  status?: string;
  surveyTypeId?: string;
  surveyorId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const jobsService = {
  getAllocationQueue: (search?: string) =>
    request<{ success: boolean; count: number; data: ApiAllocationQueueItem[] }>(`/jobs/allocation-queue${buildQuery({ search })}`),
  getSurveyors: () => request<{ success: boolean; data: ApiAllocatableSurveyor[] }>('/jobs/surveyors'),
  allocate: (payload: AllocationPayload) => request<JobResponse>('/jobs', { method: 'POST', body: JSON.stringify(payload) }),
  updateAllocation: (id: string, payload: Partial<AllocationPayload>) =>
    request<JobResponse>(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  getJobs: (params?: JobListParams) =>
    request<{ success: boolean; count: number; pagination: PaginationMeta; data: ApiJob[] }>(`/jobs${buildQuery({ ...params })}`),
  getCounts: () => request<{ success: boolean; data: Record<string, number> }>('/jobs/counts'),
  getJob: (id: string) => request<JobResponse>(`/jobs/${id}`),
  getReports: (id: string) => request<{ success: boolean; data: ApiJobReportItem[] }>(`/jobs/${id}/reports`),

  linkBooking: (id: string, bookingId: string) =>
    request<JobResponse>(`/jobs/${id}/booking`, { method: 'POST', body: JSON.stringify({ bookingId }) }),
  startReporting: (id: string) => request<JobResponse>(`/jobs/${id}/start-reporting`, { method: 'POST' }),
  unmarkLastVisit: (id: string) => request<JobResponse>(`/jobs/${id}/unmark-last-visit`, { method: 'POST' }),

  submit: (id: string) => request<JobResponse>(`/jobs/${id}/submit`, { method: 'POST' }),
  submitToManager: (id: string) => request<JobResponse>(`/jobs/${id}/submit-to-manager`, { method: 'POST' }),
  review: (id: string, decision: 'approve' | 'reject', reason?: string) =>
    request<JobResponse>(`/jobs/${id}/review`, { method: 'POST', body: JSON.stringify({ decision, reason }) }),
  authorize: (id: string, decision: 'approve' | 'reject', reason?: string) =>
    request<JobResponse>(`/jobs/${id}/authorize`, { method: 'POST', body: JSON.stringify({ decision, reason }) }),

  addDocument: (id: string, doc: ApiJobDocument) =>
    request<JobResponse>(`/jobs/${id}/documents`, { method: 'POST', body: JSON.stringify(doc) }),
  removeDocument: (id: string, docId: string) => request<JobResponse>(`/jobs/${id}/documents/${docId}`, { method: 'DELETE' }),

  /** Uploads a file to storage; the caller attaches the returned key to a record. */
  uploadFile: (file: File, prefix: string) => {
    const formData = new FormData();
    formData.append('file', file);
    return requestFormData<{ success: boolean; data: { key: string; url: string; contentType: string; size: number } }>(
      `/uploads?prefix=${encodeURIComponent(prefix)}`, formData, { method: 'POST' }
    );
  },

};

/** Fetches a generated report PDF for the viewer, by document type. */
export const fetchReportPdf = (docType: SignableDocType, id: string): Promise<Blob> => {
  switch (docType) {
    case 'scccos': return firstEntryService.getScccosFinalBlob(id);
    case 'docking-cert': return firstEntryService.getDockingSurveyFinalBlob(id);
    case 'survey-report': return surveyReportService.getSurveyReportPdfBlob(id);
    case 'daily-report': return firstEntryService.getDailyReportPdfBlob(id);
    default: return requestBlob(`/${docType}/${id}`);
  }
};
