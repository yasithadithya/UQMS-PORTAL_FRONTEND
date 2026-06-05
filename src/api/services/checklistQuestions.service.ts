import { request } from '../client';
import type { ApiChecklistQuestion } from '../types';

export const checklistQuestionsService = {
  getQuestions: (params?: { search?: string; surveyCategory?: string; areaOfOperation?: string; boatType?: string; length?: string }) => {
    let url = '/checklist-questions';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val) searchParams.append(key, val);
      });
      const queryStr = searchParams.toString();
      if (queryStr) {
        url += `?${queryStr}`;
      }
    }
    return request<{ success: boolean; count: number; data: ApiChecklistQuestion[] }>(url);
  },
  getQuestionById: (id: string) => {
    return request<{ success: boolean; data: ApiChecklistQuestion }>(`/checklist-questions/${id}`);
  },
  createQuestion: (payload: Partial<ApiChecklistQuestion>) => {
    return request<{ success: boolean; message: string; data: ApiChecklistQuestion }>('/checklist-questions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateQuestion: (id: string, payload: Partial<ApiChecklistQuestion>) => {
    return request<{ success: boolean; message: string; data: ApiChecklistQuestion }>(`/checklist-questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  deleteQuestion: (id: string) => {
    return request<{ success: boolean; message: string }>(`/checklist-questions/${id}`, {
      method: 'DELETE',
    });
  },
};
