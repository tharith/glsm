export interface User {
  id: string; employeeId: string; firstName: string; lastName: string
  firstNameKh?: string; lastNameKh?: string; email: string; phone?: string
  isActive: boolean; createdAt: string
  position?: { id: string; nameEn: string; nameKh: string; code: string }
  orgUnit?:   { id: string; nameEn: string; nameKh: string; code: string; type: string }
  userRoles?: { role: { id: string; name: string; rolePermissions?: any[] } }[]
}

export interface LeaveType {
  id: string; code: string; nameKh: string; nameEn: string
  maxDaysPerYear: number; requiresDoc: boolean; isPaid: boolean
  carryOver: boolean; gender?: string; isActive: boolean
}

export interface LeaveBalance {
  id: string; year: number; allocated: number; used: number
  pending: number; available: number; carryOver: number
  leaveType: LeaveType
}

export interface LeaveRequest {
  id: string; refNumber: string; userId: string; status: LeaveStatus
  startDate: string; endDate: string; totalDays: number; reason: string
  submittedAt?: string; completedAt?: string; createdAt: string
  user: Partial<User>; leaveType: LeaveType
  approvals?: LeaveApproval[]; histories?: LeaveHistory[]
  workflowInstance?: WorkflowInstance
}

export interface LeaveApproval {
  id: string; stepNumber: number; approverRole: string; action: string
  comment?: string; actionedAt: string
  approver: { firstName: string; lastName: string }
}

export interface LeaveHistory {
  id: string; fromStatus?: string; toStatus: string
  comment?: string; createdAt: string; actorId?: string
}

export interface WorkflowInstance {
  currentStep: number; currentRole?: string; isCompleted: boolean
  definition?: { steps: WorkflowStep[] }
}

export interface WorkflowStep {
  stepNumber: number; name: string; approverRole: string; timeoutHours: number
}

export interface Notification {
  id: string; type: string; titleKh: string; titleEn: string
  body?: string; isRead: boolean; createdAt: string; leaveRequestId?: string
}

export interface OrgUnit {
  id: string; code: string; nameKh: string; nameEn: string
  type: string; parentId?: string; isActive: boolean; children?: OrgUnit[]
}

export type LeaveStatus = 'DRAFT'|'SUBMITTED'|'OFFICE_APPROVED'|'DEPT_APPROVED'|'HR_VERIFIED'|'DG_APPROVED'|'COMPLETED'|'REJECTED'|'RETURNED'|'CANCELLED'
