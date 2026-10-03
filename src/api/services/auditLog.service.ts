import { request } from '../client';
import type { PaginationMeta } from '../types';

export interface ApiAuditChange {
  field: string;
  from?: unknown;
  to?: unknown;
}

export interface ApiAuditLog {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityRef?: string;
  user?: { _id: string; username?: string; fullName?: string; email?: string } | null;
  userEmail?: string;
  roleName?: string;
  reason?: string;
  changes: ApiAuditChange[];
  createdAt: string;
}

const buildQuery = (params?: Record<string, unknown>): string => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') searchParams.append(key, String(value));
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
};

export const auditLogService = {
  getAuditLogs: (params?: { entityType?: string; entityId?: string; action?: string; page?: number; limit?: number }) =>
    request<{ success: boolean; count: number; pagination?: PaginationMeta; data: ApiAuditLog[] }>(`/audit-logs${buildQuery(params)}`),
};
