// Central API service layer — all endpoints in one place
import api from '@/plugins/axios'

// ── Organization ─────────────────────────────────────────────
export const orgService = {
  list:       (params?: any)        => api.get('/organization', { params }),
  tree:       ()                    => api.get('/organization/tree'),
  get:        (id: string)          => api.get(`/organization/${id}`),
  getByCode:  (code: string)        => api.get(`/organization/code/${code}`),
  staff:      (id: string, ic = false) => api.get(`/organization/${id}/staff`, { params: { includeChildren: ic } }),
  create:     (data: any)           => api.post('/organization', data),
  update:     (id: string, data: any) => api.patch(`/organization/${id}`, data),
  remove:     (id: string)          => api.delete(`/organization/${id}`),
  restore:    (id: string)          => api.patch(`/organization/${id}/restore`),
}

// ── Positions ─────────────────────────────────────────────────
export const positionService = {
  list:       (params?: any)        => api.get('/positions', { params }),
  get:        (id: string)          => api.get(`/positions/${id}`),
  getByCode:  (code: string)        => api.get(`/positions/code/${code}`),
  create:     (data: any)           => api.post('/positions', data),
  update:     (id: string, data: any) => api.patch(`/positions/${id}`, data),
  remove:     (id: string)          => api.delete(`/positions/${id}`),
  restore:    (id: string)          => api.patch(`/positions/${id}/restore`),
  reorder:    (orders: any[])       => api.post('/positions/reorder', { orders }),
}

// ── Leave Types ───────────────────────────────────────────────
export const leaveTypeService = {
  list:       (includeInactive = false) => api.get('/leave-types', { params: { includeInactive } }),
  get:        (id: string)          => api.get(`/leave-types/${id}`),
  getByCode:  (code: string)        => api.get(`/leave-types/code/${code}`),
  create:     (data: any)           => api.post('/leave-types', data),
  update:     (id: string, data: any) => api.patch(`/leave-types/${id}`, data),
  toggle:     (id: string, isActive: boolean) => api.patch(`/leave-types/${id}/toggle`, { isActive }),
}

// ── Leave Balances ────────────────────────────────────────────
export const balanceService = {
  my:          (year?: number)      => api.get('/leave-balances/my', { params: { year } }),
  all:         (year?: number)      => api.get('/leave-balances/all', { params: { year } }),
  user:        (userId: string, year?: number) => api.get(`/leave-balances/user/${userId}`, { params: { year } }),
  adjust:      (id: string, data: any) => api.patch(`/leave-balances/${id}/adjust`, data),
  bulkAllocate:(year: number, userIds?: string[]) => api.post('/leave-balances/allocate', { year, userIds }),
  workingDays: (startDate: string, endDate: string) => api.get('/leave-balances/working-days', { params: { startDate, endDate } }),
}

// ── Leave Requests ────────────────────────────────────────────
export const leaveRequestService = {
  create:     (data: any)           => api.post('/leave-requests', data),
  my:         (params?: any)        => api.get('/leave-requests/my', { params }),
  queue:      ()                    => api.get('/leave-requests/queue'),
  all:        (params?: any)        => api.get('/leave-requests/all', { params }),
  get:        (id: string)          => api.get(`/leave-requests/${id}`),
  approve:    (id: string, data: any) => api.post(`/leave-requests/${id}/approve`, data),
  cancel:     (id: string)          => api.post(`/leave-requests/${id}/cancel`),
  submit:     (id: string)          => api.post(`/leave-requests/${id}/submit`),
}

// ── Users ─────────────────────────────────────────────────────
export const userService = {
  list:       (params?: any)        => api.get('/users', { params }),
  get:        (id: string)          => api.get(`/users/${id}`),
  create:     (data: any)           => api.post('/users', data),
  update:     (id: string, data: any) => api.patch(`/users/${id}`, data),
  remove:     (id: string)          => api.delete(`/users/${id}`),
  assignRole: (id: string, roleId: string) => api.post(`/users/${id}/roles`, { roleId }),
  removeRole: (id: string, roleId: string) => api.delete(`/users/${id}/roles/${roleId}`),
}

// ── Notifications ─────────────────────────────────────────────
export const notifService = {
  list:       (unread = false)      => api.get('/notifications', { params: { unread } }),
  count:      ()                    => api.get('/notifications/count'),
  markRead:   (id: string)          => api.patch(`/notifications/${id}/read`),
  markAll:    ()                    => api.patch('/notifications/read-all'),
}

// ── Reports ───────────────────────────────────────────────────
export const reportService = {
  dashboard:  ()                    => api.get('/reports/dashboard'),
  leave:      (params?: any)        => api.get('/reports/leave', { params }),
  balances:   (year?: number)       => api.get('/reports/balances', { params: { year } }),
  summary:    (year?: number)       => api.get('/reports/summary', { params: { year } }),
  auditLogs:  (params?: any)        => api.get('/reports/audit-logs', { params }),
}
