import { request, requestFormData } from '../client';
import { cachedRequest, invalidateCache, invalidateCacheByPrefix, CACHE_KEYS, TTL } from '../apiCache';
import { ApiResponse } from '../types';

const buildQuery = (params?: Record<string, any>): string => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
};

export const hrService = {
  // Employees
  getEmployees: (params?: { page?: number; limit?: number; search?: string; department?: string; status?: string; type?: string }) => {
    const query = buildQuery(params);
    const cacheKey = `${CACHE_KEYS.HR_EMPLOYEES}:${query || 'all'}`;

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
  uploadPhoto: (id: string, formData: FormData) => requestFormData<ApiResponse<any>>(`/hr/employees/${id}/upload-photo`, formData, { method: 'POST' }).then((res) => {
    invalidateCacheByPrefix(CACHE_KEYS.HR_EMPLOYEES);
    return res;
  }),
  getEmployeeHistory: (id: string) => request<ApiResponse<any>>(`/hr/employees/${id}/history`),

  // Departments
  getDepartments: () => cachedRequest(
    CACHE_KEYS.HR_DEPARTMENTS,
    () => request<ApiResponse<any>>('/hr/departments'),
    TTL.STATIC
  ),
  createDepartment: (data: any) => request<ApiResponse<any>>('/hr/departments', { method: 'POST', body: JSON.stringify(data) }).then((res) => {
    invalidateCache(CACHE_KEYS.HR_DEPARTMENTS);
    return res;
  }),
  updateDepartment: (id: string, data: any) => request<ApiResponse<any>>(`/hr/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then((res) => {
    invalidateCache(CACHE_KEYS.HR_DEPARTMENTS);
    return res;
  }),
  deleteDepartment: (id: string) => request<ApiResponse<any>>(`/hr/departments/${id}`, { method: 'DELETE' }).then((res) => {
    invalidateCache(CACHE_KEYS.HR_DEPARTMENTS);
    return res;
  }),

  // Job Titles
  getJobTitles: () => cachedRequest(
    CACHE_KEYS.HR_JOB_TITLES,
    () => request<ApiResponse<any>>('/hr/jobtitles'),
    TTL.STATIC
  ),
  createJobTitle: (data: any) => request<ApiResponse<any>>('/hr/jobtitles', { method: 'POST', body: JSON.stringify(data) }).then((res) => {
    invalidateCache(CACHE_KEYS.HR_JOB_TITLES);
    return res;
  }),
  updateJobTitle: (id: string, data: any) => request<ApiResponse<any>>(`/hr/jobtitles/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then((res) => {
    invalidateCache(CACHE_KEYS.HR_JOB_TITLES);
    return res;
  }),
  deleteJobTitle: (id: string) => request<ApiResponse<any>>(`/hr/jobtitles/${id}`, { method: 'DELETE' }).then((res) => {
    invalidateCache(CACHE_KEYS.HR_JOB_TITLES);
    return res;
  }),

  // Attendance
  getAttendance: (employeeId: string, params?: { month?: number; year?: number }) =>
    request<ApiResponse<any>>(`/hr/attendance/${employeeId}${buildQuery(params)}`),
  clockIn: (employeeId: string) => request<ApiResponse<any>>('/hr/attendance/clockin', { method: 'POST', body: JSON.stringify({ employeeId }) }),
  clockOut: (employeeId: string) => request<ApiResponse<any>>('/hr/attendance/clockout', { method: 'POST', body: JSON.stringify({ employeeId }) }),
  getAttendanceSummary: (employeeId: string, month: number, year: number) => request<ApiResponse<any>>(`/hr/attendance/summary/${employeeId}?month=${month}&year=${year}`),
  manualAttendanceEntry: (data: any) => request<ApiResponse<any>>('/hr/attendance/manual', { method: 'POST', body: JSON.stringify(data) }),

  // Leaves
  getLeaveTypes: () => cachedRequest(
    CACHE_KEYS.HR_LEAVE_TYPES,
    () => request<ApiResponse<any>>('/hr/leaves/types'),
    TTL.STATIC
  ),
  createLeaveType: (data: any) => request<ApiResponse<any>>('/hr/leaves/types', { method: 'POST', body: JSON.stringify(data) }).then((res) => {
    invalidateCache(CACHE_KEYS.HR_LEAVE_TYPES);
    return res;
  }),
  updateLeaveType: (id: string, data: any) => request<ApiResponse<any>>(`/hr/leaves/types/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then((res) => {
    invalidateCache(CACHE_KEYS.HR_LEAVE_TYPES);
    return res;
  }),
  deleteLeaveType: (id: string) => request<ApiResponse<any>>(`/hr/leaves/types/${id}`, { method: 'DELETE' }).then((res) => {
    invalidateCache(CACHE_KEYS.HR_LEAVE_TYPES);
    return res;
  }),
  getLeaveBalance: (employeeId: string) => request<ApiResponse<any>>(`/hr/leaves/balance/${employeeId}`),
  getAllLeaveBalances: (params?: { year?: number; employeeId?: string; page?: number; limit?: number }) =>
    request<ApiResponse<any>>(`/hr/leaves/balances${buildQuery(params)}`),
  initializeLeaveBalances: (year: number) => request<ApiResponse<any>>('/hr/leaves/balance/initialize', { method: 'POST', body: JSON.stringify({ year }) }),
  getLeaveRequests: (params?: { status?: string; employeeId?: string; page?: number; limit?: number }) =>
    request<ApiResponse<any>>(`/hr/leaves/requests${buildQuery(params)}`),
  submitLeaveRequest: (data: any) => request<ApiResponse<any>>('/hr/leaves/request', { method: 'POST', body: JSON.stringify(data) }),
  approveLeaveRequest: (id: string) => request<ApiResponse<any>>(`/hr/leaves/requests/${id}/approve`, { method: 'PUT' }),
  rejectLeaveRequest: (id: string, rejectionReason: string) => request<ApiResponse<any>>(`/hr/leaves/requests/${id}/reject`, { method: 'PUT', body: JSON.stringify({ rejectionReason }) }),
  cancelLeaveRequest: (id: string) => request<ApiResponse<any>>(`/hr/leaves/requests/${id}/cancel`, { method: 'PUT' }),

  // Holidays
  getHolidays: () => cachedRequest(
    CACHE_KEYS.HR_HOLIDAYS,
    () => request<ApiResponse<any>>('/hr/holidays'),
    TTL.STATIC
  ),
  addHoliday: (data: any) => request<ApiResponse<any>>('/hr/holidays', { method: 'POST', body: JSON.stringify(data) }).then((res) => {
    invalidateCache(CACHE_KEYS.HR_HOLIDAYS);
    return res;
  }),
  updateHoliday: (id: string, data: any) => request<ApiResponse<any>>(`/hr/holidays/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then((res) => {
    invalidateCache(CACHE_KEYS.HR_HOLIDAYS);
    return res;
  }),
  removeHoliday: (id: string) => request<ApiResponse<any>>(`/hr/holidays/${id}`, { method: 'DELETE' }).then((res) => {
    invalidateCache(CACHE_KEYS.HR_HOLIDAYS);
    return res;
  }),

  // Payroll
  getPayrollRuns: (params?: { month?: number; year?: number; employeeId?: string; page?: number; limit?: number }) =>
    request<ApiResponse<any>>(`/hr/payroll/runs${buildQuery(params)}`),
  generatePayroll: (month: number, year: number) => request<ApiResponse<any>>('/hr/payroll/generate/bulk', { method: 'POST', body: JSON.stringify({ month, year }) }),
  generateSinglePayroll: (employeeId: string, month: number, year: number) =>
    request<ApiResponse<any>>('/hr/payroll/generate', { method: 'POST', body: JSON.stringify({ employeeId, month, year }) }),
  approvePayrollRun: (id: string) => request<ApiResponse<any>>(`/hr/payroll/runs/${id}/approve`, { method: 'PUT' }),
  markPayrollPaid: (id: string) => request<ApiResponse<any>>(`/hr/payroll/runs/${id}/mark-paid`, { method: 'PUT' }),
  getPayslip: (id: string) => request<ApiResponse<any>>(`/hr/payroll/payslip/${id}`),
  getPayrollSummary: (month: number, year: number) => request<ApiResponse<any>>(`/hr/payroll/summary?month=${month}&year=${year}`),
  getSalaryStructure: (employeeId: string) => request<ApiResponse<any>>(`/hr/payroll/structure/${employeeId}`),
  setSalaryStructure: (data: any) => request<ApiResponse<any>>('/hr/payroll/structure', { method: 'POST', body: JSON.stringify(data) }),

  // Announcements
  getAnnouncements: (params?: { activeOnly?: boolean; page?: number; limit?: number }) =>
    request<ApiResponse<any>>(`/hr/announcements${buildQuery(params)}`),
  createAnnouncement: (data: any) => request<ApiResponse<any>>('/hr/announcements', { method: 'POST', body: JSON.stringify(data) }),
  updateAnnouncement: (id: string, data: any) => request<ApiResponse<any>>(`/hr/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAnnouncement: (id: string) => request<ApiResponse<any>>(`/hr/announcements/${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboardStats: () => request<ApiResponse<any>>('/hr/dashboard/stats'),

  // Performance — cycles
  getReviewCycles: () => request<ApiResponse<any>>('/hr/performance/cycles'),
  createReviewCycle: (data: any) => request<ApiResponse<any>>('/hr/performance/cycles', { method: 'POST', body: JSON.stringify(data) }),
  updateReviewCycle: (id: string, data: any) => request<ApiResponse<any>>(`/hr/performance/cycles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Performance — goals
  getGoals: (params?: { employeeId?: string; cycleId?: string; page?: number; limit?: number }) =>
    request<ApiResponse<any>>(`/hr/performance/goals${buildQuery(params)}`),
  createGoal: (data: any) => request<ApiResponse<any>>('/hr/performance/goals', { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (id: string, data: any) => request<ApiResponse<any>>(`/hr/performance/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGoal: (id: string) => request<ApiResponse<any>>(`/hr/performance/goals/${id}`, { method: 'DELETE' }),

  // Performance — appraisals
  getAppraisals: (params?: { cycleId?: string; employeeId?: string; status?: string; page?: number; limit?: number }) =>
    request<ApiResponse<any>>(`/hr/performance/appraisals${buildQuery(params)}`),
  createAppraisal: (data: any) => request<ApiResponse<any>>('/hr/performance/appraisals', { method: 'POST', body: JSON.stringify(data) }),
  updateAppraisal: (id: string, data: any) => request<ApiResponse<any>>(`/hr/performance/appraisals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  submitAppraisal: (id: string) => request<ApiResponse<any>>(`/hr/performance/appraisals/${id}/submit`, { method: 'PUT' }),
  acknowledgeAppraisal: (id: string, employeeComments?: string) =>
    request<ApiResponse<any>>(`/hr/performance/appraisals/${id}/acknowledge`, { method: 'PUT', body: JSON.stringify({ employeeComments }) }),

  // Training
  getTrainingPrograms: () => cachedRequest(
    CACHE_KEYS.HR_TRAINING_PROGRAMS,
    () => request<ApiResponse<any>>('/hr/training/programs'),
    TTL.STATIC
  ),
  createTrainingProgram: (data: any) => request<ApiResponse<any>>('/hr/training/programs', { method: 'POST', body: JSON.stringify(data) }).then((res) => {
    invalidateCache(CACHE_KEYS.HR_TRAINING_PROGRAMS);
    return res;
  }),
  updateTrainingProgram: (id: string, data: any) => request<ApiResponse<any>>(`/hr/training/programs/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then((res) => {
    invalidateCache(CACHE_KEYS.HR_TRAINING_PROGRAMS);
    return res;
  }),
  deleteTrainingProgram: (id: string) => request<ApiResponse<any>>(`/hr/training/programs/${id}`, { method: 'DELETE' }).then((res) => {
    invalidateCache(CACHE_KEYS.HR_TRAINING_PROGRAMS);
    return res;
  }),
  getTrainingSessions: (params?: { programId?: string; status?: string }) =>
    request<ApiResponse<any>>(`/hr/training/sessions${buildQuery(params)}`),
  createTrainingSession: (data: any) => request<ApiResponse<any>>('/hr/training/sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateTrainingSession: (id: string, data: any) => request<ApiResponse<any>>(`/hr/training/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getSessionEnrollments: (sessionId: string) => request<ApiResponse<any>>(`/hr/training/sessions/${sessionId}/enrollments`),
  enrollInSession: (sessionId: string, employeeId: string) =>
    request<ApiResponse<any>>(`/hr/training/sessions/${sessionId}/enroll`, { method: 'POST', body: JSON.stringify({ employeeId }) }),
  updateEnrollment: (id: string, data: any) => request<ApiResponse<any>>(`/hr/training/enrollments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEnrollment: (id: string) => request<ApiResponse<any>>(`/hr/training/enrollments/${id}`, { method: 'DELETE' }),
  getEmployeeTrainings: (employeeId: string) => request<ApiResponse<any>>(`/hr/training/employee/${employeeId}`),

  // Checklists (onboarding / offboarding)
  getChecklistTemplates: (type?: string) => cachedRequest(
    `${CACHE_KEYS.HR_CHECKLIST_TEMPLATES}:${type || 'all'}`,
    () => request<ApiResponse<any>>(`/hr/checklists/templates${buildQuery({ type })}`),
    TTL.STATIC
  ),
  createChecklistTemplate: (data: any) => request<ApiResponse<any>>('/hr/checklists/templates', { method: 'POST', body: JSON.stringify(data) }).then((res) => {
    invalidateCacheByPrefix(CACHE_KEYS.HR_CHECKLIST_TEMPLATES);
    return res;
  }),
  updateChecklistTemplate: (id: string, data: any) => request<ApiResponse<any>>(`/hr/checklists/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then((res) => {
    invalidateCacheByPrefix(CACHE_KEYS.HR_CHECKLIST_TEMPLATES);
    return res;
  }),
  deleteChecklistTemplate: (id: string) => request<ApiResponse<any>>(`/hr/checklists/templates/${id}`, { method: 'DELETE' }).then((res) => {
    invalidateCacheByPrefix(CACHE_KEYS.HR_CHECKLIST_TEMPLATES);
    return res;
  }),
  createEmployeeChecklist: (data: { employeeId: string; templateId: string; startDate?: string }) =>
    request<ApiResponse<any>>('/hr/checklists', { method: 'POST', body: JSON.stringify(data) }),
  getEmployeeChecklists: (params?: { employeeId?: string; type?: string; status?: string; page?: number; limit?: number }) =>
    request<ApiResponse<any>>(`/hr/checklists${buildQuery(params)}`),
  updateChecklistTask: (checklistId: string, taskIndex: number, data: any) =>
    request<ApiResponse<any>>(`/hr/checklists/${checklistId}/tasks/${taskIndex}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployeeChecklist: (id: string) => request<ApiResponse<any>>(`/hr/checklists/${id}`, { method: 'DELETE' }),

  // Employee documents
  uploadEmployeeDocument: (employeeId: string, formData: FormData) =>
    requestFormData<ApiResponse<any>>(`/hr/documents/${employeeId}`, formData, { method: 'POST' }),
  getEmployeeDocuments: (employeeId: string) => request<ApiResponse<any>>(`/hr/documents/${employeeId}`),
  getExpiringDocuments: (days?: number) => request<ApiResponse<any>>(`/hr/documents/expiring${buildQuery({ days })}`),
  deleteEmployeeDocument: (id: string) => request<ApiResponse<any>>(`/hr/documents/doc/${id}`, { method: 'DELETE' }),

  // Self-service (ESS)
  getMyProfile: () => request<ApiResponse<any>>('/hr/me/profile'),
  getMyPayslips: (params?: { page?: number; limit?: number }) => request<ApiResponse<any>>(`/hr/me/payslips${buildQuery(params)}`),
  getMyLeaveBalance: () => request<ApiResponse<any>>('/hr/me/leaves/balance'),
  getMyLeaveRequests: (params?: { page?: number; limit?: number }) => request<ApiResponse<any>>(`/hr/me/leaves/requests${buildQuery(params)}`),
  submitMyLeaveRequest: (data: any) => request<ApiResponse<any>>('/hr/me/leaves/request', { method: 'POST', body: JSON.stringify(data) }),
  cancelMyLeaveRequest: (id: string) => request<ApiResponse<any>>(`/hr/me/leaves/requests/${id}/cancel`, { method: 'PUT' }),
  myClockIn: () => request<ApiResponse<any>>('/hr/me/attendance/clockin', { method: 'POST' }),
  myClockOut: () => request<ApiResponse<any>>('/hr/me/attendance/clockout', { method: 'POST' }),
  getMyAttendance: (params?: { month?: number; year?: number }) => request<ApiResponse<any>>(`/hr/me/attendance${buildQuery(params)}`),
  getMyAppraisals: () => request<ApiResponse<any>>('/hr/me/appraisals'),
  acknowledgeMyAppraisal: (id: string, employeeComments?: string) =>
    request<ApiResponse<any>>(`/hr/me/appraisals/${id}/acknowledge`, { method: 'PUT', body: JSON.stringify({ employeeComments }) }),
  getMyTrainings: () => request<ApiResponse<any>>('/hr/me/trainings'),
  getMyAnnouncements: () => request<ApiResponse<any>>('/hr/me/announcements'),
};
