import { request, requestBlob } from '../client';
import { cachedRequest, invalidateCacheByPrefix, TTL } from '../apiCache';
import type {
  ApiFeeItem, ApiQuotation, ApiResponse, FeeItemPayload, PaginationMeta, QuotableRequest, QuotationPayload, QuotationStatus,
} from '../types';

const FEE_ITEMS_CACHE = 'finance:fee-items';

const buildQuery = (params?: Record<string, unknown>): string => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') searchParams.append(key, String(value));
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
};

const invalidateFeeItems = <T>(res: T): T => {
  invalidateCacheByPrefix(FEE_ITEMS_CACHE);
  return res;
};

export const feeItemsService = {
  getFeeItems: (params?: { active?: boolean }) => {
    const query = buildQuery({ active: params?.active ? 'true' : undefined });
    return cachedRequest(
      `${FEE_ITEMS_CACHE}:${query || 'all'}`,
      () => request<ApiResponse<ApiFeeItem[]>>(`/finance/fee-items${query}`),
      TTL.SEMI_DYNAMIC
    );
  },
  createFeeItem: (payload: FeeItemPayload) =>
    request<ApiResponse<ApiFeeItem>>('/finance/fee-items', { method: 'POST', body: JSON.stringify(payload) }).then(invalidateFeeItems),
  updateFeeItem: (id: string, payload: Partial<FeeItemPayload>) =>
    request<ApiResponse<ApiFeeItem>>(`/finance/fee-items/${id}`, { method: 'PUT', body: JSON.stringify(payload) }).then(invalidateFeeItems),
  deleteFeeItem: (id: string) =>
    request<ApiResponse<null>>(`/finance/fee-items/${id}`, { method: 'DELETE' }).then(invalidateFeeItems),
};

export const quotationsService = {
  getQuotations: (params?: { search?: string; status?: QuotationStatus | ''; request?: string; page?: number; limit?: number | 'all' }) =>
    request<{ success: boolean; count: number; pagination?: PaginationMeta; data: ApiQuotation[] }>(`/finance/quotations${buildQuery(params)}`),
  getQuotableRequests: (params?: { search?: string }) =>
    request<ApiResponse<QuotableRequest[]>>(`/finance/quotations/quotable-requests${buildQuery(params)}`),
  /** Every quotation (revision) for a request, oldest first. Line items are not included. */
  getByRequest: (requestId: string) =>
    request<ApiResponse<ApiQuotation[]>>(`/finance/quotations/by-request/${requestId}`),
  getQuotation: (id: string) => request<ApiResponse<ApiQuotation>>(`/finance/quotations/${id}`),
  createQuotation: (payload: QuotationPayload) =>
    request<ApiResponse<ApiQuotation>>('/finance/quotations', { method: 'POST', body: JSON.stringify(payload) }),
  updateQuotation: (id: string, payload: Omit<QuotationPayload, 'request' | 'revisedFrom' | 'status'>) =>
    request<ApiResponse<ApiQuotation>>(`/finance/quotations/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  updateStatus: (id: string, status: 'sent' | 'accepted' | 'rejected', reason?: string) =>
    request<ApiResponse<ApiQuotation>>(`/finance/quotations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }),
  deleteQuotation: (id: string) => request<ApiResponse<null>>(`/finance/quotations/${id}`, { method: 'DELETE' }),
  getPdfBlob: (id: string) => requestBlob(`/finance/quotations/${id}/pdf`),
};
