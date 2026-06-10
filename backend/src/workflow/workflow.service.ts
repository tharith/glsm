import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateWorkflowDefinitionDto, UpdateWorkflowDefinitionDto,
  UpdateWorkflowStepDto, AssignWorkflowDto, CreateWorkflowStepDto,
} from './dto/workflow.dto';

@Injectable()
export class WorkflowService {
  constructor(private prisma: PrismaService) {}

  // ── Definitions CRUD ────────────────────────────────────────
  findAll() {
    return this.prisma.workflowDefinition.findMany({
      include: {
        steps:       { orderBy: { stepNumber: 'asc' } },
        assignments: { include: { orgUnit: { select: { id: true, code: true, nameEn: true, nameKh: true } } } },
        _count:      { select: { instances: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const wf = await this.prisma.workflowDefinition.findUnique({
      where: { id },
      include: {
        steps:       { orderBy: { stepNumber: 'asc' } },
        assignments: { include: { orgUnit: { select: { id: true, code: true, nameEn: true, nameKh: true } } } },
        instances:   { where: { isCompleted: false }, include: { leaveRequest: { select: { id: true, refNumber: true, status: true, user: { select: { firstName: true, lastName: true } } } } }, take: 20 },
        _count:      { select: { instances: true } },
      },
    });
    if (!wf) throw new NotFoundException('Workflow definition not found');
    return wf;
  }

  create(dto: CreateWorkflowDefinitionDto) {
    const { steps, ...def } = dto;
    // Validate step numbers are sequential starting from 1
    const sortedSteps = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
    for (let i = 0; i < sortedSteps.length; i++) {
      if (sortedSteps[i].stepNumber !== i + 1)
        throw new BadRequestException('Step numbers must be sequential starting from 1');
    }
    return this.prisma.workflowDefinition.create({
      data: { ...def, steps: { create: steps } },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });
  }

  async update(id: string, dto: UpdateWorkflowDefinitionDto) {
    await this.findOne(id);
    return this.prisma.workflowDefinition.update({
      where: { id }, data: dto,
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });
  }

  async remove(id: string) {
    const wf = await this.findOne(id);
    // Check active instances
    const running = await this.prisma.workflowInstance.count({
      where: { definitionId: id, isCompleted: false },
    });
    if (running > 0)
      throw new BadRequestException(`Cannot delete: ${running} active leave request(s) using this workflow`);
    return this.prisma.workflowDefinition.delete({ where: { id } });
  }

  // ── Steps CRUD ───────────────────────────────────────────────
  async addStep(definitionId: string, dto: CreateWorkflowStepDto) {
    await this.findOne(definitionId);
    // Check no duplicate stepNumber
    const existing = await this.prisma.workflowStep.findFirst({
      where: { definitionId, stepNumber: dto.stepNumber },
    });
    if (existing) throw new ConflictException(`Step ${dto.stepNumber} already exists`);

    return this.prisma.workflowStep.create({ data: { ...dto, definitionId } });
  }

  async updateStep(stepId: string, dto: UpdateWorkflowStepDto) {
    const step = await this.prisma.workflowStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Step not found');
    return this.prisma.workflowStep.update({ where: { id: stepId }, data: dto });
  }

  async removeStep(stepId: string) {
    const step = await this.prisma.workflowStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Step not found');
    return this.prisma.workflowStep.delete({ where: { id: stepId } });
  }

  async reorderSteps(definitionId: string, orders: { id: string; stepNumber: number }[]) {
    await this.findOne(definitionId);
    await this.prisma.$transaction(
      orders.map(({ id, stepNumber }) =>
        this.prisma.workflowStep.update({ where: { id }, data: { stepNumber } }),
      ),
    );
    return this.prisma.workflowStep.findMany({
      where: { definitionId },
      orderBy: { stepNumber: 'asc' },
    });
  }

  // ── Assignments CRUD ─────────────────────────────────────────
  getAssignments(orgUnitId?: string) {
    return this.prisma.workflowAssignment.findMany({
      where: orgUnitId ? { orgUnitId } : {},
      include: {
        orgUnit:    { select: { id: true, code: true, nameEn: true, nameKh: true, type: true } },
        definition: { include: { steps: { orderBy: { stepNumber: 'asc' } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assign(dto: AssignWorkflowDto) {
    // Deactivate existing assignment for this org unit first
    await this.prisma.workflowAssignment.updateMany({
      where: { orgUnitId: dto.orgUnitId, isActive: true },
      data:  { isActive: false },
    });
    return this.prisma.workflowAssignment.create({
      data: { ...dto, isActive: true },
      include: {
        orgUnit:    { select: { id: true, code: true, nameEn: true } },
        definition: { include: { steps: { orderBy: { stepNumber: 'asc' } } } },
      },
    });
  }

  async removeAssignment(id: string) {
    const a = await this.prisma.workflowAssignment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Assignment not found');
    return this.prisma.workflowAssignment.delete({ where: { id } });
  }

  // ── Instances monitoring ─────────────────────────────────────
  getInstances(completed?: boolean) {
    const where = completed !== undefined ? { isCompleted: completed } : {};
    return this.prisma.workflowInstance.findMany({
      where,
      include: {
        definition:  { select: { id: true, name: true } },
        leaveRequest: {
          select: {
            id: true, refNumber: true, status: true, submittedAt: true, totalDays: true,
            user: { select: { firstName: true, lastName: true, orgUnit: { select: { nameEn: true } } } },
            leaveType: { select: { nameEn: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Resolve workflow for user (used by leave-requests service) ─
  async resolveForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }, select: { orgUnitId: true },
    });
    if (!user?.orgUnitId) return null;
    const assignment = await this.prisma.workflowAssignment.findFirst({
      where: { orgUnitId: user.orgUnitId, isActive: true },
      include: { definition: { include: { steps: { orderBy: { stepNumber: 'asc' } } } } },
    });
    return assignment?.definition || null;
  }

  // ── Start instance (called by leave-requests service) ──────
  async startInstance(leaveRequestId: string, userId: string) {
    let wf = await this.resolveForUser(userId);
    if (!wf) {
      const fallback = await this.prisma.workflowDefinition.findFirst({
        where: { isActive: true },
        include: { steps: { orderBy: { stepNumber: 'asc' } } },
      });
      if (!fallback) throw new NotFoundException('No workflow configured for this org unit');
      wf = fallback;
    }
    const firstStep = wf.steps[0];
    return this.prisma.workflowInstance.create({
      data: {
        definitionId:  wf.id,
        leaveRequestId,
        currentStep:   firstStep.stepNumber,
        currentRole:   firstStep.approverRole,
      },
    });
  }

  // ── Advance instance (called by leave-requests service) ────
  async advance(leaveRequestId: string, action: 'APPROVED' | 'REJECTED' | 'RETURNED') {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { leaveRequestId },
      include: { definition: { include: { steps: { orderBy: { stepNumber: 'asc' } } } } },
    });
    if (!instance) throw new NotFoundException('Workflow instance not found');

    if (action !== 'APPROVED') {
      await this.prisma.workflowInstance.update({
        where: { leaveRequestId },
        data:  { isCompleted: true, completedAt: new Date() },
      });
      return { status: action === 'REJECTED' ? 'REJECTED' : 'RETURNED', completed: true };
    }

    const steps    = instance.definition.steps;
    const nextStep = steps.find((s: any) => s.stepNumber === instance.currentStep + 1);

    if (!nextStep) {
      await this.prisma.workflowInstance.update({
        where: { leaveRequestId },
        data:  { isCompleted: true, completedAt: new Date() },
      });
      return { status: 'COMPLETED', completed: true };
    }

    await this.prisma.workflowInstance.update({
      where: { leaveRequestId },
      data:  { currentStep: nextStep.stepNumber, currentRole: nextStep.approverRole },
    });

    const statusMap: Record<number, string> = {
      2: 'OFFICE_APPROVED', 3: 'DEPT_APPROVED', 4: 'HR_VERIFIED', 5: 'DG_APPROVED',
    };
    return {
      status:   statusMap[nextStep.stepNumber] || 'SUBMITTED',
      completed: false,
      nextRole: nextStep.approverRole,
    };
  }
}
