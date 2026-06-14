import { request, requestBlob } from '../client';

export const surveyReportService = {
  getSurveyReports: () => {
    return request<{ success: boolean; count: number; data: any[] }>('/survey-reports');
  },
  
  getSurveyReportById: (id: string) => {
    return request<{ success: boolean; data: any }>(`/survey-reports/${id}`);
  },
  
  getPrePopulatedSurveyReportData: (firstEntrySurveyReportId: string) => {
    return request<{
      success: boolean;
      message: string;
      data: {
        exists: boolean;
        existingReportId: string | null;
        report: any;
        vessel: any;
        equipmentRecordId: string;
      };
    }>(`/survey-reports/pre-populate/${firstEntrySurveyReportId}`);
  },
  
  createSurveyReport: (payload: any) => {
    return request<{ success: boolean; message: string; data: any }>('/survey-reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  
  updateSurveyReport: (id: string, payload: any) => {
    return request<{ success: boolean; message: string; data: any }>(`/survey-reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  
  deleteSurveyReport: (id: string) => {
    return request<{ success: boolean; message: string }>(`/survey-reports/${id}`, {
      method: 'DELETE',
    });
  },
  
  getSurveyReportPdfBlob: (id: string) => {
    return requestBlob(`/survey-reports/pdf/${id}`);
  },
};
export default surveyReportService;
