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

export const approvalsService = {
  getApprovals: (params: { status?: string; entityType?: string; entityId?: string; page?: number; limit?: number } = {}) =>
    request<{ success: boolean; count: number; pagination: PaginationMeta; data: ApiApprovalRequest[] }>(`/approvals${query(params)}`),

  /** Proposes a change. Approvers' changes are applied straight away. */
  submit: (payload: { entityType: 'checklist-question'; operation: 'create' | 'update' | 'delete'; entityId?: string; payload?: Record<string, unknown> }) =>
    request<{ success: boolean; message: string; data: ApiApprovalRequest }>('/approvals', { method: 'POST', body: JSON.stringify(payload) }),

  decide: (id: string, decision: 'approve' | 'reject', reason?: string) =>
    request<{ success: boolean; message: string; data: ApiApprovalRequest }>(`/approvals/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason }),
    }),
};
