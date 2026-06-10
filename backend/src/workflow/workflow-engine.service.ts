import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ════════════════════════════════════════════════════════════
// WORKFLOW ENGINE — Spec V (PDF)
//
// RULE 1 — SENIOR STAFF (DEPUTY_INSTITUTION_HEAD):
//   អនុប្រធានអង្គភាព, ឧបការី, ជំនួយការប្រធានអង្គភាព
//   Path A: INSTITUTION_HEAD → HR_OFFICER (notify/record)
//   Path B: HR_OFFICER → INSTITUTION_HEAD
//   (System uses Path A by default — most common in practice)
//
// RULE 2 — REGULAR STAFF:
//   half-day  : OFFICE_CHIEF → DEPT_CHIEF → HR_OFFICER
//   1 day     : OFFICE_CHIEF → DEPT_CHIEF → HR_OFFICER → DIR_GENERAL
//   2+ days   : OFFICE_CHIEF → DEPT_CHIEF → HR_OFFICER → DIR_GENERAL → INSTITUTION_HEAD
// ════════════════════════════════════════════════════════════

// Senior role — spec rule 1 requester
const SENIOR_REQUESTER_ROLES = new Set([
  'DEPUTY_INSTITUTION_HEAD', // អនុប្រធានអង្គភាព, ឧបការី, ជំនួយការប្រធានអង្គភាព
]);

// Regular chains by days
const CHAIN_HALF  = ['OFFICE_CHIEF', 'DEPARTMENT_CHIEF', 'HR_OFFICER'];
const CHAIN_ONE   = ['OFFICE_CHIEF', 'DEPARTMENT_CHIEF', 'HR_OFFICER', 'DIRECTOR_GENERAL'];
const CHAIN_MULTI = ['OFFICE_CHIEF', 'DEPARTMENT_CHIEF', 'HR_OFFICER', 'DIRECTOR_GENERAL', 'INSTITUTION_HEAD'];

// Senior chains
// Path A: go to INSTITUTION_HEAD first, then HR notified/records
// Path B: go to HR first, then HR forwards to INSTITUTION_HEAD
const CHAIN_SENIOR_A = ['INSTITUTION_HEAD', 'HR_OFFICER']; // Path A (default)
const CHAIN_SENIOR_B = ['HR_OFFICER', 'INSTITUTION_HEAD']; // Path B

// Status map: role → status set after that role approves
const ROLE_STATUS: Record<string, string> = {
  OFFICE_CHIEF:             'OFFICE_APPROVED',
  DEPARTMENT_CHIEF:         'DEPT_APPROVED',
  HR_OFFICER:               'HR_VERIFIED',
  DIRECTOR_GENERAL:         'DG_APPROVED',
  INSTITUTION_HEAD:         'COMPLETED',     // final
};

// Whether a step is "notify only" (no balance deduction needed — HR records only)
const NOTIFY_ONLY_ROLES = new Set(['HR_OFFICER']); // when HR comes AFTER INSTITUTION_HEAD in senior path

export type SeniorPath = 'A' | 'B';

@Injectable()
export class WorkflowEngineService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────
  // PUBLIC: Start a new workflow instance
  // ─────────────────────────────────────────────────────────
  async startInstance(
    leaveRequestId: string,
    userId: string,
    totalDays: number,
    seniorPath: SeniorPath = 'A', // default Path A for seniors
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('User not found');

    const userRoleNames = user.userRoles.map(ur => ur.role.name as string);
    const isSenior = userRoleNames.some(r => SENIOR_REQUESTER_ROLES.has(r));

    const steps = this.resolveChain(isSenior, totalDays, seniorPath);
    const label = this.chainLabel(isSenior, totalDays, seniorPath);

    // Upsert workflow definition for this exact chain
    const definition = await this.upsertDefinition(steps, label);

    // Delete old instance (re-submit scenario)
    await this.prisma.workflowInstance.deleteMany({ where: { leaveRequestId } });

    // Create instance
    const instance = await this.prisma.workflowInstance.create({
      data: {
        leaveRequestId,
        definitionId: definition.id,
        currentStep:  1,
        currentRole:  steps[0] as any,
      },
    });

    return {
      ...instance,
      steps,
      isSenior,
      seniorPath: isSenior ? seniorPath : null,
      chainLabel: label,
    };
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC: Advance after approval action
  // ─────────────────────────────────────────────────────────
  async advance(
    leaveRequestId: string,
    action: 'APPROVED' | 'REJECTED' | 'RETURNED' | 'VERIFIED',
  ) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { leaveRequestId },
      include: {
        definition: { include: { steps: { orderBy: { stepNumber: 'asc' } } } },
      },
    });
    if (!instance) throw new NotFoundException('Workflow instance not found');

    // Terminal: rejected or returned
    if (action === 'REJECTED' || action === 'RETURNED') {
      await this.prisma.workflowInstance.update({
        where: { leaveRequestId },
        data:  { isCompleted: true, completedAt: new Date() },
      });
      return {
        status:    action === 'REJECTED' ? 'REJECTED' : 'RETURNED',
        completed: true,
        nextRole:  null,
        isFinalDeduct: false,
      };
    }

    const steps   = instance.definition.steps as any[];
    const currNum = instance.currentStep;
    const currStep = steps.find(s => s.stepNumber === currNum);
    const nextStep = steps.find(s => s.stepNumber === currNum + 1);

    if (!nextStep) {
      // Last step — workflow complete
      await this.prisma.workflowInstance.update({
        where: { leaveRequestId },
        data:  { isCompleted: true, completedAt: new Date() },
      });

      const finalStatus = ROLE_STATUS[currStep?.approverRole] || 'COMPLETED';
      return {
        status:        finalStatus === 'COMPLETED' ? 'COMPLETED' : finalStatus,
        completed:     true,
        nextRole:      null,
        isFinalDeduct: true, // deduct balance on final completion
      };
    }

    // Move to next step
    await this.prisma.workflowInstance.update({
      where: { leaveRequestId },
      data:  { currentStep: nextStep.stepNumber, currentRole: nextStep.approverRole },
    });

    const newStatus = ROLE_STATUS[currStep?.approverRole] || 'SUBMITTED';
    const isNotifyOnly = this.isNotifyOnlyStep(instance.definition.name, nextStep.approverRole);

    return {
      status:        newStatus,
      completed:     false,
      nextRole:      nextStep.approverRole,
      isNotifyOnly,  // true = HR records only (no approval action needed in senior path A)
      isFinalDeduct: false,
    };
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC: Validate approver has correct role for current step
  // ─────────────────────────────────────────────────────────
  validateApprover(currentRole: string, approverRoleNames: string[]): boolean {
    return approverRoleNames.includes(currentRole);
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC: Get instance with full definition
  // ─────────────────────────────────────────────────────────
  async getInstance(leaveRequestId: string) {
    return this.prisma.workflowInstance.findUnique({
      where: { leaveRequestId },
      include: {
        definition: { include: { steps: { orderBy: { stepNumber: 'asc' } } } },
      },
    });
  }

  // ─────────────────────────────────────────────────────────
  // PRIVATE: Resolve chain based on spec rules
  // ─────────────────────────────────────────────────────────
  private resolveChain(isSenior: boolean, totalDays: number, path: SeniorPath): string[] {
    if (isSenior) {
      // Spec rule 1: senior goes directly to INSTITUTION_HEAD or HR first
      return path === 'A' ? CHAIN_SENIOR_A : CHAIN_SENIOR_B;
    }

    // Spec rule 2: regular staff — chain depends on duration
    // half-day: totalDays < 1 (stored as decimal in some systems)
    // Use: asDraft field or a new halfDay boolean flag on leave_request
    // For now: caller passes totalDays; 0 = half-day (custom flag)
    if (totalDays === 0)  return CHAIN_HALF;   // half-day flag
    if (totalDays === 1)  return CHAIN_ONE;    // exactly 1 day
    return CHAIN_MULTI;                         // 2+ days
  }

  // ─────────────────────────────────────────────────────────
  // PRIVATE: Check if a step is notify-only
  // In Senior Path A: HR_OFFICER step 2 = record/notify only
  // ─────────────────────────────────────────────────────────
  private isNotifyOnlyStep(definitionName: string, nextRole: string): boolean {
    // Senior Path A: INSTITUTION_HEAD → HR_OFFICER (notify/record)
    return definitionName.includes('SENIOR_A') && nextRole === 'HR_OFFICER';
  }

  // ─────────────────────────────────────────────────────────
  // PRIVATE: Build human-readable chain label
  // ─────────────────────────────────────────────────────────
  private chainLabel(isSenior: boolean, totalDays: number, path: SeniorPath): string {
    if (isSenior) {
      return path === 'A'
        ? 'SENIOR_A: INSTITUTION_HEAD → HR_OFFICER (notify)'
        : 'SENIOR_B: HR_OFFICER → INSTITUTION_HEAD';
    }
    if (totalDays === 0) return 'HALF_DAY: OFFICE_CHIEF → DEPT_CHIEF → HR_OFFICER';
    if (totalDays === 1) return 'ONE_DAY: OFFICE_CHIEF → DEPT_CHIEF → HR_OFFICER → DIR_GENERAL';
    return `MULTI_${totalDays}D: OFFICE_CHIEF → DEPT_CHIEF → HR_OFFICER → DIR_GENERAL → INSTITUTION_HEAD`;
  }

  // ─────────────────────────────────────────────────────────
  // PRIVATE: Upsert definition for a given chain
  // ─────────────────────────────────────────────────────────
  private async upsertDefinition(steps: string[], name: string) {
    const existing = await this.prisma.workflowDefinition.findFirst({ where: { name } });
    if (existing) return existing;

    return this.prisma.workflowDefinition.create({
      data: {
        name,
        description: name,
        steps: {
          create: steps.map((role, i) => ({
            stepNumber:   i + 1,
            name:         this.stepName(role, i, steps),
            approverRole: role as any,
            timeoutHours: this.stepTimeout(role),
          })),
        },
      },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });
  }

  private stepName(role: string, index: number, steps: string[]): string {
    const labels: Record<string, string> = {
      OFFICE_CHIEF:             'ការពិនិត្យ / Office Chief Review',
      DEPARTMENT_CHIEF:         'ការអនុម័ត / Department Chief Approval',
      HR_OFFICER:               index > 0 && steps[0] === 'INSTITUTION_HEAD'
                                  ? 'ការកត់ត្រា / HR Record (Notify Only)'  // senior path A step 2
                                  : 'ការផ្ទៀងផ្ទាត់ / HR Verification',
      DIRECTOR_GENERAL:         'ការអនុម័ត / Director General Approval',
      INSTITUTION_HEAD:         'ការអនុម័តចុងក្រោយ / Institution Head Final Approval',
      DEPUTY_INSTITUTION_HEAD:  'Senior Review',
    };
    return labels[role] || role.replace(/_/g, ' ');
  }

  private stepTimeout(role: string): number {
    // Priority roles have shorter SLA
    const timeouts: Record<string, number> = {
      OFFICE_CHIEF:     48,
      DEPARTMENT_CHIEF: 48,
      HR_OFFICER:       24,
      DIRECTOR_GENERAL: 72,
      INSTITUTION_HEAD: 72,
    };
    return timeouts[role] || 48;
  }
}
