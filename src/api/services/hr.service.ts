import { request, requestFormData } from '../client';
import { ApiResponse } from '../types';

export const hrService = {
  // Employees
  getEmployees: () => request<ApiResponse<any>>('/hr/employees'),
  getEmployeeById: (id: string) => request<ApiResponse<any>>(`/hr/employees/${id}`),
  createEmployee: (data: any) => request<ApiResponse<any>>('/hr/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: any) => request<ApiResponse<any>>(`/hr/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id: string) => request<ApiResponse<any>>(`/hr/employees/${id}`, { method: 'DELETE' }),
  uploadPhoto: (id: string, formData: FormData) => requestFormData<ApiResponse<any>>(`/hr/employees/${id}/upload-photo`, formData, { method: 'POST' }),

  // Departments
  getDepartments: () => request<ApiResponse<any>>('/hr/departments'),

  // Job Titles
  getJobTitles: () => request<ApiResponse<any>>('/hr/jobtitles'),

  // Attendance
  getAttendance: (employeeId?: string) => request<ApiResponse<any>>(`/hr/attendance${employeeId ? `/${employeeId}` : ''}`),
  clockIn: (employeeId: string) => request<ApiResponse<any>>('/hr/attendance/clockin', { method: 'POST', body: JSON.stringify({ employeeId }) }),
  clockOut: (employeeId: string) => request<ApiResponse<any>>('/hr/attendance/clockout', { method: 'POST', body: JSON.stringify({ employeeId }) }),
  getAttendanceSummary: (employeeId: string, month: number, year: number) => request<ApiResponse<any>>(`/hr/attendance/summary/${employeeId}?month=${month}&year=${year}`),

  // Leaves
  getLeaveTypes: () => request<ApiResponse<any>>('/hr/leaves/types'),
  getLeaveBalance: (employeeId: string) => request<ApiResponse<any>>(`/hr/leaves/balance/${employeeId}`),
  getLeaveRequests: () => request<ApiResponse<any>>('/hr/leaves/requests'),
  submitLeaveRequest: (data: any) => request<ApiResponse<any>>('/hr/leaves/request', { method: 'POST', body: JSON.stringify(data) }),
  approveLeaveRequest: (id: string) => request<ApiResponse<any>>(`/hr/leaves/requests/${id}/approve`, { method: 'PUT' }),
  rejectLeaveRequest: (id: string, comments: string) => request<ApiResponse<any>>(`/hr/leaves/requests/${id}/reject`, { method: 'PUT', body: JSON.stringify({ comments }) }),

  // Holidays
  getHolidays: () => request<ApiResponse<any>>('/hr/holidays'),

  // Payroll
  getPayrollRuns: () => request<ApiResponse<any>>('/hr/payroll/runs'),
  generatePayroll: (month: number, year: number) => request<ApiResponse<any>>('/hr/payroll/generate/bulk', { method: 'POST', body: JSON.stringify({ month, year }) }),
  approvePayrollRun: (id: string) => request<ApiResponse<any>>(`/hr/payroll/runs/${id}/approve`, { method: 'PUT' }),
  markPayrollPaid: (id: string) => request<ApiResponse<any>>(`/hr/payroll/runs/${id}/mark-paid`, { method: 'PUT' }),
  getPayslip: (id: string) => request<ApiResponse<any>>(`/hr/payroll/payslip/${id}`),
};
