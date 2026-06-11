import { request, requestFormData, requestBlob } from '../client';
import type { ApiFirstEntry, ApiScheduleII, ApiScheduleIIDocument, ApiFirstEntrySurveyBooking, ApiFirstEntrySurveyReport, ApiFirstEntryFullReport } from '../types';

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

  // First Entry Survey Booking endpoints
  getFirstEntrySurveyBookings: () => {
    return request<{ success: boolean; count: number; data: ApiFirstEntrySurveyBooking[] }>('/first-entry-survey-bookings');
  },
  getFirstEntrySurveyBookingById: (id: string) => {
    return request<{ success: boolean; data: ApiFirstEntrySurveyBooking }>(`/first-entry-survey-bookings/${id}`);
  },
  createFirstEntrySurveyBooking: (payload: Partial<ApiFirstEntrySurveyBooking>) => {
    return request<{ success: boolean; message: string; data: ApiFirstEntrySurveyBooking }>('/first-entry-survey-bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateFirstEntrySurveyBooking: (id: string, payload: Partial<ApiFirstEntrySurveyBooking>) => {
    return request<{ success: boolean; message: string; data: ApiFirstEntrySurveyBooking }>(`/first-entry-survey-bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  deleteFirstEntrySurveyBooking: (id: string) => {
    return request<{ success: boolean; message: string }>(`/first-entry-survey-bookings/${id}`, {
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
  sendScheduleIIEmail: (scheduleId: string) => {
    return request<{ success: boolean; message: string }>(`/first-entries/schedule2/${scheduleId}/send-email`, {
      method: 'POST',
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

  // First Entry Survey Report endpoints
  getFirstEntrySurveyReports: () => {
    return request<{ success: boolean; count: number; data: ApiFirstEntrySurveyReport[] }>('/first-entry-survey-reports');
  },
  getFirstEntrySurveyReportById: (id: string) => {
    return request<{ success: boolean; data: ApiFirstEntrySurveyReport }>(`/first-entry-survey-reports/${id}`);
  },
  getPrePopulatedReportData: (bookingId: string) => {
    return request<{ success: boolean; message: string; data: Partial<ApiFirstEntrySurveyReport> }>(`/first-entry-survey-reports/pre-populate/${bookingId}`);
  },
  createFirstEntrySurveyReport: (payload: Partial<ApiFirstEntrySurveyReport>) => {
    return request<{ success: boolean; message: string; data: ApiFirstEntrySurveyReport }>('/first-entry-survey-reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateFirstEntrySurveyReport: (id: string, payload: Partial<ApiFirstEntrySurveyReport>) => {
    return request<{ success: boolean; message: string; data: ApiFirstEntrySurveyReport }>(`/first-entry-survey-reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  deleteFirstEntrySurveyReport: (id: string) => {
    return request<{ success: boolean; message: string }>(`/first-entry-survey-reports/${id}`, {
      method: 'DELETE',
    });
  },

  // First Entry Full Report endpoints
  getFirstEntryFullReportById: (id: string) => {
    return request<{ success: boolean; data: ApiFirstEntryFullReport }>(`/first-entry-full-reports/${id}`);
  },
  getFirstEntryFullReportBySurveyReportId: (surveyReportId: string) => {
    return request<{ success: boolean; data: ApiFirstEntryFullReport }>(`/first-entry-full-reports/survey-report/${surveyReportId}`);
  },
  updateFirstEntryFullReport: (id: string, payload: Partial<ApiFirstEntryFullReport>) => {
    return request<{ success: boolean; message: string; data: ApiFirstEntryFullReport }>(`/first-entry-full-reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  triggerFullReportGeneration: (surveyReportId: string) => {
    return request<{ success: boolean; message: string; data: ApiFirstEntryFullReport }>(`/first-entry-full-reports/generate/${surveyReportId}`, {
      method: 'POST',
    });
  },
  uploadChecklistDocument: (file: File) => {
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
    }>('/uploads?prefix=checklist', formData, {
      method: 'POST',
    });
  },
  generateDailyReportPdf: (id: string) => {
    return request<{ success: boolean; message: string; data: ApiFirstEntryFullReport }>(`/first-entry-full-reports/${id}/daily-report`, {
      method: 'POST',
    });
  },
  getDailyReportPdfPreview: (id: string) => {
    return requestBlob(`/first-entry-full-reports/${id}/daily-report-preview`);
  },
  addGeneralRemark: (reportId: string, text: string) => {
    return request<{ success: boolean; message: string; data: ApiFirstEntryFullReport }>(`/first-entry-full-reports/${reportId}/remarks`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },
  editGeneralRemark: (reportId: string, remarkId: string, text: string) => {
    return request<{ success: boolean; message: string; data: ApiFirstEntryFullReport }>(`/first-entry-full-reports/${reportId}/remarks/${remarkId}`, {
      method: 'PUT',
      body: JSON.stringify({ text }),
    });
  },
  toggleCloseGeneralRemark: (reportId: string, remarkId: string) => {
    return request<{ success: boolean; message: string; data: ApiFirstEntryFullReport }>(`/first-entry-full-reports/${reportId}/remarks/${remarkId}/toggle-close`, {
      method: 'PUT',
    });
  },
  addRemarkComment: (reportId: string, remarkId: string, text: string) => {
    return request<{ success: boolean; message: string; data: ApiFirstEntryFullReport }>(`/first-entry-full-reports/${reportId}/remarks/${remarkId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },
  editRemarkComment: (reportId: string, remarkId: string, commentId: string, text: string) => {
    return request<{ success: boolean; message: string; data: ApiFirstEntryFullReport }>(`/first-entry-full-reports/${reportId}/remarks/${remarkId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ text }),
    });
  },
};
