import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // ── Notify next approver(s) in chain ───────────────────────
  async notifyApprovers(leaveRequestId: string, approverRole: string, requesterId: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        user:      { select: { firstName: true, lastName: true, firstNameKh: true, lastNameKh: true } },
        leaveType: { select: { nameEn: true, nameKh: true } },
      },
    });
    if (!request) return;

    const name   = `${request.user.firstNameKh || request.user.firstName} ${request.user.lastNameKh || request.user.lastName}`;
    const ltKh   = request.leaveType.nameKh || request.leaveType.nameEn;
    const ltEn   = request.leaveType.nameEn;

    // Find all users with the required approver role (within org unit chain)
    const approvers = await this.prisma.userRole.findMany({
      where: { role: { name: approverRole as any }, user: { isActive: true, isDeleted: false } },
      select: { userId: true },
    });

    // Also: SYSTEM_ADMIN always gets notified
    const admins = await this.prisma.userRole.findMany({
      where: { role: { name: 'SYSTEM_ADMIN' }, user: { isActive: true, isDeleted: false } },
      select: { userId: true },
    });

    const recipients = new Set([
      ...approvers.map(a => a.userId),
      ...admins.map(a => a.userId),
    ]);
    // Remove requester from recipients
    recipients.delete(requesterId);

    for (const userId of recipients) {
      await this.createNotification(
        userId,
        'LEAVE_SUBMITTED',
        `${name} — បានស្នើសុំ${ltKh} (${request.totalDays} ថ្ងៃ)`,
        `${name} submitted a ${ltEn} request (${request.totalDays} days)`,
        leaveRequestId,
      );
    }
  }

  // ── Notify requester of approval result ────────────────────
  async notifyRequester(userId: string, leaveRequestId: string, action: string, approver: any) {
    const typeMap: Record<string, { type: string; kh: string; en: string }> = {
      APPROVED: { type: 'LEAVE_APPROVED', kh: 'ពាក្យសុំរបស់អ្នកត្រូវបានអនុម័ត ✅', en: 'Your leave request has been approved ✅' },
      VERIFIED: { type: 'LEAVE_APPROVED', kh: 'ពាក្យសុំរបស់អ្នកត្រូវបានផ្ទៀងផ្ទាត់ ✅', en: 'Your leave request has been verified ✅' },
      REJECTED: { type: 'LEAVE_REJECTED', kh: 'ពាក្យសុំរបស់អ្នកត្រូវបានបដិសេធ ❌', en: 'Your leave request has been rejected ❌' },
      RETURNED: { type: 'LEAVE_RETURNED', kh: 'ពាក្យសុំត្រូវបានប្រឆាំងប្រគល់ ↩', en: 'Your leave request has been returned ↩' },
    };
    const msg = typeMap[action] || typeMap['APPROVED'];
    await this.createNotification(userId, msg.type, msg.kh, msg.en, leaveRequestId);
  }

  // ── Create notification record ──────────────────────────────
  async createNotification(
    userId: string, type: string,
    titleKh: string, titleEn: string,
    leaveRequestId?: string,
  ) {
    try {
      return await this.prisma.notification.create({
        data: { userId, type: type as any, titleKh, titleEn, leaveRequestId: leaveRequestId || null },
      });
    } catch { /* ignore if user not found */ }
  }

  // ── Get my notifications ────────────────────────────────────
  async getMyNotifications(userId: string, onlyUnread = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(onlyUnread ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,    });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data:  { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }
}
