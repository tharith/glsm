// Central API endpoint constants
// Usage: import { API } from '@/config/api'
// Then:  api.get(API.USERS.LIST)

export const API = {
  // Auth
  AUTH: {
    LOGIN:   '/auth/login',
    LOGOUT:  '/auth/logout',
    REFRESH: '/auth/refresh',
    ME:               '/auth/me',
    CHANGE_PASSWORD:  '/auth/change-password',
    RESET_PASSWORD:   '/auth/reset-password',
  },

  // Users
  USERS: {
    LIST:     '/users',
    SEARCH:   '/users/search',
    ONE:      (id: string) => `/users/${id}`,
    AVATAR:   (id: string) => `/users/${id}/avatar`,
    PASSWORD: (id: string) => `/users/${id}/change-password`,
    ROLES:    (id: string) => `/users/${id}/roles`,
    ROLE:     (id: string, roleId: string) => `/users/${id}/roles/${roleId}`,
    PERM_GRANT:  (id: string) => `/users/${id}/permissions/grant`,
    PERM_REVOKE: (id: string) => `/users/${id}/permissions/revoke`,
  },

  // Organization
  ORG: {
    LIST:    '/organization',
    TREE:    '/organization/tree',
    ONE:     (id: string) => `/organization/${id}`,
    CODE:    (code: string) => `/organization/code/${code}`,
    STAFF:   (id: string) => `/organization/${id}/staff`,
    RESTORE: (id: string) => `/organization/${id}/restore`,
  },

  // Positions
  POSITIONS: {
    LIST:    '/positions',
    ONE:     (id: string) => `/positions/${id}`,
    REORDER: '/positions/reorder',
    RESTORE: (id: string) => `/positions/${id}/restore`,
  },

  // Leave Types
  LEAVE_TYPES: {
    LIST:   '/leave-types',
    ONE:    (id: string) => `/leave-types/${id}`,
    TOGGLE: (id: string) => `/leave-types/${id}/toggle`,
  },

  // Leave Balances
  BALANCES: {
    MY:          '/leave-balances/my',
    ALL:         '/leave-balances/all',
    USER:        (uid: string) => `/leave-balances/user/${uid}`,
    ADJUST:      (id: string)  => `/leave-balances/${id}/adjust`,
    ALLOCATE:    '/leave-balances/allocate',
    WORKING_DAYS:'/leave-balances/working-days',
  },

  // Leave Requests
  REQUESTS: {
    CREATE:     '/leave-requests',
    MY:         '/leave-requests/my',
    QUEUE:      '/leave-requests/queue',
    ALL:        '/leave-requests/all',
    ONE:        (id: string) => `/leave-requests/${id}`,
    APPROVE:    (id: string) => `/leave-requests/${id}/approve`,
    CANCEL:     (id: string) => `/leave-requests/${id}/cancel`,
    SUBMIT:     (id: string) => `/leave-requests/${id}/submit`,
    HISTORY:    (id: string) => `/leave-requests/${id}/history`,
    ATTACH:     (id: string) => `/leave-requests/${id}/attachments`,
    DEL_ATTACH: (reqId: string, attId: string) => `/leave-requests/${reqId}/attachments/${attId}/remove`,
  },

  // Public Holidays
  HOLIDAYS: {
    LIST:      '/public-holidays',
    ONE:       (id: string) => `/public-holidays/${id}`,
    BULK:      '/public-holidays/bulk',
    COPY_YEAR: '/public-holidays/copy-year',
  },

  // Delegations
  DELEGATIONS: {
    LIST:       '/delegations',
    MY:         '/delegations/my',
    ONE:        (id: string) => `/delegations/${id}`,
    DEACTIVATE: (id: string) => `/delegations/${id}/deactivate`,
  },

  // Workflow
  WORKFLOW: {
    LIST:        '/workflow',
    MY:          '/workflow/my',
    ONE:         (id: string) => `/workflow/${id}`,
    STEPS:       (id: string) => `/workflow/${id}/steps`,
    STEP:        (stepId: string) => `/workflow/steps/${stepId}`,
    REORDER:     (id: string) => `/workflow/${id}/steps/reorder`,
    ASSIGN:      '/workflow/assign',
    ASSIGNMENTS: '/workflow/assignments',
    ASSIGNMENT:  (id: string) => `/workflow/assignments/${id}`,
    INSTANCES:   '/workflow/instances',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST:     '/notifications',
    COUNT:    '/notifications/count',
    READ:     (id: string) => `/notifications/${id}/read`,
    READ_ALL: '/notifications/read-all',
  },

  // Reports
  REPORTS: {
    DASHBOARD: '/reports/dashboard',
    LEAVE:     '/reports/leave',
    SUMMARY:   '/reports/summary',
    BALANCES:  '/reports/balances',
  },

  // Audit Logs
  AUDIT: {
    LIST:     '/audit-logs',
    ALERTS:   '/audit-logs/security-alerts',
    SUMMARY:  '/audit-logs/summary',
    MODULES:  '/audit-logs/modules',
    USER:     (uid: string) => `/audit-logs/user/${uid}`,
    EXPORT:   (uid: string) => `/audit-logs/user/${uid}/export`,
  },

  // Roles
  ROLES: {
    LIST:        '/roles',
    PERMISSIONS: '/roles/permissions',
  },
} as const
