import { request } from '../client';
import type { ApiApprovalRequest, PaginationMeta } from '../types';

const query = (params: Record<string, unknown>) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
};

type ListResponse = { success: boolean; count: number; pagination: PaginationMeta; data: ApiApprovalRequest[] };
type OneResponse = { success: boolean; message: string; data: ApiApprovalRequest };

export const approvalsService = {
  /** `status` may be comma-separated, e.g. "pending,approved" for everything still open. */
  getApprovals: (params: { status?: string; entityType?: string; entityId?: string; page?: number; limit?: number } = {}) =>
    request<ListResponse>(`/approvals${query(params)}`),

  /** QMS revision history: every change request in every state, newest activity first. */
  getHistory: (params: { status?: string; entityType?: string; entityId?: string; search?: string; page?: number; limit?: number } = {}) =>
    request<ListResponse>(`/approvals/history${query(params)}`),

  /** Proposes a change. It needs approval and then acceptance before it takes effect. */
  submit: (payload: {
    entityType: 'checklist-question';
    operation: 'create' | 'update' | 'delete';
    entityId?: string;
    payload?: Record<string, unknown>;
    requestComment: string;
  }) => request<OneResponse>('/approvals', { method: 'POST', body: JSON.stringify(payload) }),

  /** Level 1. */
  decide: (id: string, decision: 'approve' | 'reject', comment?: string) =>
    request<OneResponse>(`/approvals/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision, comment }) }),

  /** Level 2: accepting applies the change. */
  accept: (id: string, decision: 'accept' | 'reject', comment?: string) =>
    request<OneResponse>(`/approvals/${id}/acceptance`, { method: 'POST', body: JSON.stringify({ decision, comment }) }),
};
