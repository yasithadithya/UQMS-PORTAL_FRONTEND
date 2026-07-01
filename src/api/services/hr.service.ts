import { request, requestFormData } from '../client';
import { cachedRequest, invalidateCache, invalidateCacheByPrefix, CACHE_KEYS, TTL } from '../apiCache';
import { ApiResponse } from '../types';

export const hrService = {
  // Employees
  getEmployees: (params?: { page?: number; limit?: number; search?: string; department?: string; status?: string; type?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.search) searchParams.append('search', params.search);
    if (params?.department) searchParams.append('department', params.department);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';

    const cacheKey = `${CACHE_KEYS.HR_EMPLOYEES}:${searchParams.toString() || 'all'}`;

    return cachedRequest(
      cacheKey,
      () => request<ApiResponse<any>>(`/hr/employees${query}`),
      TTL.SEMI_DYNAMIC
    );
  },
  getEmployeeById: (id: string) => request<ApiResponse<any>>(`/hr/employees/${id}`),
  createEmployee: (data: any) => request<ApiResponse<any>>('/hr/employees', { method: 'POST', body: JSON.stringify(data) }).then((res) => {
    invalidateCacheByPrefix(CACHE_KEYS.HR_EMPLOYEES);
    return res;
  }),
  updateEmployee: (id: string, data: any) => request<ApiResponse<any>>(`/hr/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then((res) => {
    invalidateCacheByPrefix(CACHE_KEYS.HR_EMPLOYEES);
    return res;
  }),
  deleteEmployee: (id: string) => request<ApiResponse<any>>(`/hr/employees/${id}`, { method: 'DELETE' }).then((res) => {
    invalidateCacheByPrefix(CACHE_KEYS.HR_EMPLOYEES);
    return res;
  }),
  uploadPhoto: (id: string, formData: FormData) => requestFormData<ApiResponse<any>>(`/hr/employees/${id}/upload-photo`, formData, { method: 'POST' }),

  // Departments
  getDepartments: () => cachedRequest(
    CACHE_KEYS.HR_DEPARTMENTS,
    () => request<ApiResponse<any>>('/hr/departments'),
    TTL.STATIC
  ),

  // Job Titles
  getJobTitles: () => cachedRequest(
    CACHE_KEYS.HR_JOB_TITLES,
    () => request<ApiResponse<any>>('/hr/jobtitles'),
    TTL.STATIC
  ),

  // Attendance
  getAttendance: (employeeId?: string) => request<ApiResponse<any>>(`/hr/attendance${employeeId ? `/${employeeId}` : ''}`),
  clockIn: (employeeId: string) => request<ApiResponse<any>>('/hr/attendance/clockin', { method: 'POST', body: JSON.stringify({ employeeId }) }),
  clockOut: (employeeId: string) => request<ApiResponse<any>>('/hr/attendance/clockout', { method: 'POST', body: JSON.stringify({ employeeId }) }),
  getAttendanceSummary: (employeeId: string, month: number, year: number) => request<ApiResponse<any>>(`/hr/attendance/summary/${employeeId}?month=${month}&year=${year}`),

  // Leaves
  getLeaveTypes: () => cachedRequest(
    CACHE_KEYS.HR_LEAVE_TYPES,
    () => request<ApiResponse<any>>('/hr/leaves/types'),
    TTL.STATIC
  ),
  getLeaveBalance: (employeeId: string) => request<ApiResponse<any>>(`/hr/leaves/balance/${employeeId}`),
  getLeaveRequests: () => request<ApiResponse<any>>('/hr/leaves/requests'),
  submitLeaveRequest: (data: any) => request<ApiResponse<any>>('/hr/leaves/request', { method: 'POST', body: JSON.stringify(data) }),
  approveLeaveRequest: (id: string) => request<ApiResponse<any>>(`/hr/leaves/requests/${id}/approve`, { method: 'PUT' }),
  rejectLeaveRequest: (id: string, comments: string) => request<ApiResponse<any>>(`/hr/leaves/requests/${id}/reject`, { method: 'PUT', body: JSON.stringify({ comments }) }),

  // Holidays
  getHolidays: () => cachedRequest(
    CACHE_KEYS.HR_HOLIDAYS,
    () => request<ApiResponse<any>>('/hr/holidays'),
    TTL.STATIC
  ),

  // Payroll
  getPayrollRuns: () => request<ApiResponse<any>>('/hr/payroll/runs'),
  generatePayroll: (month: number, year: number) => request<ApiResponse<any>>('/hr/payroll/generate/bulk', { method: 'POST', body: JSON.stringify({ month, year }) }),
  approvePayrollRun: (id: string) => request<ApiResponse<any>>(`/hr/payroll/runs/${id}/approve`, { method: 'PUT' }),
  markPayrollPaid: (id: string) => request<ApiResponse<any>>(`/hr/payroll/runs/${id}/mark-paid`, { method: 'PUT' }),
  getPayslip: (id: string) => request<ApiResponse<any>>(`/hr/payroll/payslip/${id}`),
};
