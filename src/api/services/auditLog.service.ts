import { request, requestBlob } from '../client';
import type { PaginationMeta } from '../types';

export interface ApiAuditChange {
  /** Dotted path of the changed value, e.g. 'lineItems[2].quantity'. */
  field: string;
  /** Readable field name, when the backend registry defines one. */
  label?: string;
  from?: unknown;
  to?: unknown;
}

export type AuditOutcome = 'success' | 'failure';

export interface ApiAuditLog {
  _id: string;
  action: string;
  operation?: string;
  outcome?: AuditOutcome;
  module?: string;
  entityType: string;
  entityId?: string;
  entityRef?: string;
  summary?: string;
  user?: { _id: string; username?: string; fullName?: string; email?: string } | null;
  userEmail?: string;
  userName?: string;
  roleName?: string;
  reason?: string;
  changes: ApiAuditChange[];
  /** Full record copy (creates and deletes); only returned by getById. */
  snapshot?: unknown;
  hasSnapshot?: boolean;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  method?: string;
  path?: string;
  createdAt: string;
}

export interface ApiAuditMeta {
  entities: Record<string, { label: string; module: string }>;
  actions: Record<string, { label: string; operation: string }>;
  operations: string[];
  users: { _id: string; name?: string; email?: string }[];
}

export interface AuditLogFilters {
  module?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  operation?: string;
  outcome?: AuditOutcome | '';
  user?: string;
  /** yyyy-mm-dd */
  from?: string;
  /** yyyy-mm-dd (inclusive) */
  to?: string;
  q?: string;
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
  getAuditLogs: (params?: AuditLogFilters & { page?: number; limit?: number }) =>
    request<{ success: boolean; count: number; pagination?: PaginationMeta; data: ApiAuditLog[] }>(`/audit-logs${buildQuery({ ...params })}`),

  getById: (id: string) => request<{ success: boolean; data: ApiAuditLog }>(`/audit-logs/${encodeURIComponent(id)}`),

  getMeta: () => request<{ success: boolean; data: ApiAuditMeta }>('/audit-logs/meta'),

  /** Matching entries as a CSV file (needs the audit log export permission). */
  exportCsv: (params?: AuditLogFilters) => requestBlob(`/audit-logs/export${buildQuery({ ...params })}`),
};
