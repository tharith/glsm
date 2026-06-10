import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveBalancesService } from '../leave-balances/leave-balances.service';
import { WorkflowService } from '../workflow/workflow.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import {
  CreateLeaveRequestDto, ApproveLeaveRequestDto, FilterLeaveRequestDto,
} from './dto/leave-request.dto';

const REQUEST_INCLUDE = {
  user: {
    select: {
      id: true, firstName: true, lastName: true,
      firstNameKh: true, lastNameKh: true,
      email: true, avatarUrl: true,
      position: { select: { nameEn: true, nameKh: true, code: true } },
      orgUnit:  { select: { nameEn: true, nameKh: true, code: true } },
    },
  },
  leaveType: true,
  approvals: {
    include: {
      approver: {
        select: {
          id: true,
          firstName: true, lastName: true,
          firstNameKh: true, lastNameKh: true,
          avatarUrl: true,
          position: { select: { nameEn: true, nameKh: true } },
        },
      },
    },
    orderBy: { stepNumber: 'asc' as const },
  },
  attachments: {
    include: {
      fileStorage: {
        select: { id: true, originalName: true, mimeType: true, size: true, storedName: true },
      },
    },
  },
  histories:   { orderBy: { createdAt: 'asc' as const } },
  workflowInstance: {
    include: {
      definition: {
        include: { steps: { orderBy: { stepNumber: 'asc' as const } } },
      },
    },
  },
};

@Injectable()
export class LeaveRequestsService {
  constructor(
    private prisma: PrismaService,
    private balances: LeaveBalancesService,
    private workflow: WorkflowService,
    private engine: WorkflowEngineService,
    private notifications: NotificationsService,
    private fileStorage: FileStorageService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // CREATE — with optional requester signature
  // ──────────────────────────────────────────────────────────
  async create(
    userId: string,
    dto: CreateLeaveRequestDto,
    signatureFile?: Express.Multer.File,  // ហត្ថលេខាអ្នកស្នើសុំ (optional)
  ) {
    const start = new Date(dto.startDate);
    const end   = new Date(dto.endDate);
    if (end < start) throw new BadRequestException('End date must be after start date');

    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: dto.leaveTypeId } });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    // Calculate working days (excludes weekends + holidays)
    let totalDays = await this.balances.calculateWorkingDays(start, end);
    // Half-day flag: override totalDays to 0 so engine uses CHAIN_HALF
    if (dto.isHalfDay) totalDays = 0;
    if (!dto.isHalfDay && totalDays === 0) throw new BadRequestException('No working days in selected period');

    const year = start.getFullYear();

    if (!dto.asDraft) {
      const { valid, message } = await this.balances.validateBalance(
        userId, dto.leaveTypeId, totalDays, year,
      );
      if (!valid) throw new BadRequestException(message);
    }

    // Upload requester signature if provided
    let requesterSignatureUrl: string | undefined;
    if (signatureFile) {
      requesterSignatureUrl = await this.fileStorage.saveSignature(signatureFile, userId);
    }

    const count     = await this.prisma.leaveRequest.count();
    const refNumber = `LR-${year}-${String(count + 1).padStart(4, '0')}`;

    const request = await this.prisma.leaveRequest.create({
      data: {
        refNumber,
        userId,
        leaveTypeId: dto.leaveTypeId,
        startDate:   start,
        endDate:     end,
        totalDays,
        reason:      dto.reason,
        isHalfDay: dto.isHalfDay ?? false,
        status:      dto.asDraft ? 'DRAFT' : 'SUBMITTED',
        submittedAt: dto.asDraft ? null : new Date(),
        requesterSignatureUrl,   // ← save requester signature
      },
      include: REQUEST_INCLUDE,
    });

    if (!dto.asDraft) {
      await this.balances.reservePending(userId, dto.leaveTypeId, year, totalDays);
      await this.addHistory(request.id, null, 'SUBMITTED', userId, 'Request submitted');
      const instance = await this.engine.startInstance(request.id, userId, totalDays, dto.seniorPath || 'A');
      await this.notifications.notifyApprovers(
        request.id, instance.currentRole as string, userId,
      );
    }

    return request;
  }

  // ──────────────────────────────────────────────────────────
  // APPROVE / REJECT / RETURN — with optional approver signature
  // ──────────────────────────────────────────────────────────
  async approve(
    approver: any,
    requestId: string,
    dto: ApproveLeaveRequestDto,
    signatureFile?: Express.Multer.File,  // ហត្ថលេខាអ្នកអនុម័ត (optional)
  ) {
    const request  = await this.findOne(requestId);
    const instance = request.workflowInstance as any;

    if (['COMPLETED','REJECTED','CANCELLED'].includes(request.status))
      throw new BadRequestException('Request is already finalized');
    if (!instance) throw new BadRequestException('No workflow instance found');

    const approverRoles: string[] = approver.userRoles?.map((ur: any) => ur.role.name) || [];
    if (!approverRoles.includes(instance.currentRole))
      throw new ForbiddenException(
        `Not your turn. Current step requires role: ${instance.currentRole}`,
      );

    // Upload approver signature if provided
    let signatureUrl: string | undefined;
    if (signatureFile) {
      signatureUrl = await this.fileStorage.saveSignature(signatureFile, approver.id);
    }

    // Record approval with optional signature
    await this.prisma.leaveApproval.create({
      data: {
        leaveRequestId: requestId,
        approverId:     approver.id,
        stepNumber:     instance.currentStep,
        approverRole:   instance.currentRole,
        action:         dto.action,
        comment:        dto.comment,
        signatureUrl,                          // ← save approver signature
        stampedAt:      signatureUrl ? new Date() : undefined,
      },
    });

    // Advance workflow engine
    const result    = await this.engine.advance(requestId, dto.action as any);
    const newStatus = result.status as any;

    await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status:      newStatus,
        completedAt: result.completed ? new Date() : undefined,
      },
    });

    await this.addHistory(
      requestId, request.status as any, newStatus, approver.id, dto.comment,
    );

    // Deduct balance on final completion
    if (result.completed && newStatus === 'COMPLETED') {
      const year = new Date(request.startDate).getFullYear();
      await this.balances.deductBalance(
        request.userId, request.leaveTypeId, year, request.totalDays,
      );
    }

    // Notify next approver or requester
    if (result.nextRole) {
      await this.notifications.notifyApprovers(requestId, result.nextRole, request.userId);
    }
    await this.notifications.notifyRequester(request.userId, requestId, dto.action, approver);

    return this.findOne(requestId);
  }

  // ──────────────────────────────────────────────────────────
  // ATTACHMENTS
  // ──────────────────────────────────────────────────────────
  async addAttachment(requestId: string, userId: string, file: Express.Multer.File) {
    const req = await this.prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Leave request not found');
    if (req.userId !== userId) throw new ForbiddenException('Not your request');
    if (!['DRAFT','SUBMITTED','RETURNED'].includes(req.status))
      throw new BadRequestException('Cannot add attachment to a finalized request');

    const stored = await this.fileStorage.saveAttachment(file, userId);
    return this.prisma.leaveAttachment.create({
      data: { leaveRequestId: requestId, fileStorageId: stored.id },
      include: {
        fileStorage: { select: { id: true, originalName: true, mimeType: true, size: true } },
      },
    });
  }

  async removeAttachment(requestId: string, attachmentId: string, userId: string) {
    const attach = await this.prisma.leaveAttachment.findUnique({
      where: { id: attachmentId },
      include: { leaveRequest: true, fileStorage: true },
    });
    if (!attach) throw new NotFoundException('Attachment not found');
    if (attach.leaveRequest.userId !== userId) throw new ForbiddenException('Not your request');
    await this.fileStorage.deleteFile(attach.fileStorageId);
    return this.prisma.leaveAttachment.delete({ where: { id: attachmentId } });
  }

  // ──────────────────────────────────────────────────────────
  // SUBMIT DRAFT — with optional requester signature
  // ──────────────────────────────────────────────────────────
  async submitDraft(
    userId: string,
    requestId: string,
    signatureFile?: Express.Multer.File,
  ) {
    const req = await this.findOne(requestId);
    if (req.userId !== userId) throw new ForbiddenException('Not your request');
    if (req.status !== 'DRAFT') throw new BadRequestException('Only DRAFT requests can be submitted');

    const year = new Date(req.startDate).getFullYear();
    const { valid, message } = await this.balances.validateBalance(
      userId, req.leaveTypeId, req.totalDays, year,
    );
    if (!valid) throw new BadRequestException(message);

    // Upload signature if provided
    let requesterSignatureUrl: string | undefined;
    if (signatureFile) {
      requesterSignatureUrl = await this.fileStorage.saveSignature(signatureFile, userId);
    }

    await this.balances.reservePending(userId, req.leaveTypeId, year, req.totalDays);
    await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status:      'SUBMITTED',
        submittedAt: new Date(),
        ...(requesterSignatureUrl ? { requesterSignatureUrl } : {}),
      },
    });
    await this.addHistory(requestId, 'DRAFT', 'SUBMITTED', userId, 'Draft submitted');
    const instance = await this.engine.startInstance(requestId, userId, req.isHalfDay ? 0 : req.totalDays, 'A');
    await this.notifications.notifyApprovers(
      requestId, instance.currentRole as string, userId,
    );
    return this.findOne(requestId);
  }

  // ──────────────────────────────────────────────────────────
  // CANCEL
  // ──────────────────────────────────────────────────────────
  async cancel(userId: string, requestId: string) {
    const req = await this.findOne(requestId);
    if (req.userId !== userId) throw new ForbiddenException('Not your request');
    if (!['DRAFT','SUBMITTED'].includes(req.status))
      throw new BadRequestException('Cannot cancel a request already in approval');

    await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });
    if (req.status === 'SUBMITTED') {
      const year = new Date(req.startDate).getFullYear();
      await this.balances.releasePending(userId, req.leaveTypeId, year, req.totalDays);
    }
    await this.addHistory(requestId, req.status as any, 'CANCELLED', userId, 'Cancelled by requester');
    return { message: 'Request cancelled successfully' };
  }

  // ──────────────────────────────────────────────────────────
  // QUERIES
  // ──────────────────────────────────────────────────────────
  async findMyRequests(userId: string, filter: FilterLeaveRequestDto) {
    const where: any = { userId, isDeleted: false };
    if (filter.status)      where.status      = filter.status;
    if (filter.leaveTypeId) where.leaveTypeId = filter.leaveTypeId;
    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where, include: REQUEST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip, take: filter.take,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    return { data, total };
  }

  async findApprovalQueue(approver: any) {
    const roleToStatus: Record<string,string> = {
      OFFICE_CHIEF:     'SUBMITTED',
      DEPARTMENT_CHIEF: 'OFFICE_APPROVED',
      HR_OFFICER:       'DEPT_APPROVED',
      DIRECTOR_GENERAL: 'HR_VERIFIED',
      INSTITUTION_HEAD: 'DG_APPROVED',
    };
    const roles: string[] = approver.userRoles?.map((ur: any) => ur.role.name) || [];
    const statuses = roles.map(r => roleToStatus[r]).filter(Boolean);
    if (!statuses.length) return [];

    return this.prisma.leaveRequest.findMany({
      where: {
        status: { in: statuses as any[] },
        isDeleted: false,
        userId: { not: approver.id },
      },
      include: REQUEST_INCLUDE,
      orderBy: { submittedAt: 'asc' },
    });
  }

  async findAll(filter: FilterLeaveRequestDto) {
    const where: any = { isDeleted: false };
    if (filter.status)      where.status      = filter.status;
    if (filter.leaveTypeId) where.leaveTypeId = filter.leaveTypeId;
    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where, include: REQUEST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip, take: filter.take,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    return { data, total };
  }

  async findOne(id: string) {
    const req = await this.prisma.leaveRequest.findUnique({
      where: { id }, include: REQUEST_INCLUDE,
    });
    if (!req) throw new NotFoundException('Leave request not found');
    return req;
  }

  // ──────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────

  // ── Get leave history / audit trail ───────────────────────
  async getHistory(requestId: string) {
    const req = await this.prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Leave request not found');
    return this.prisma.leaveHistory.findMany({
      where: { leaveRequestId: requestId },
      orderBy: { createdAt: 'asc' },
      include: {
        leaveRequest: { select: { refNumber: true } },
      },
    });
  }
  private async addHistory(
    requestId: string, from: any, to: any,
    actorId: string, comment?: string,
  ) {
    return this.prisma.leaveHistory.create({
      data: { leaveRequestId: requestId, actorId, fromStatus: from, toStatus: to, comment },
    });
  }
}
