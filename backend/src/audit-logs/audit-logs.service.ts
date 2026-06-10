import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditQuery {
  userId?:    string;
  module?:    string;
  action?:    string;
  startDate?: string;
  endDate?:   string;
  ipAddress?: string;
  page?:      number;
  limit?:     number;
}

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  // ── Paginated list with filters ─────────────────────────────
  async findAll(q: AuditQuery) {
    const where: any = {};
    if (q.userId)    where.userId    = q.userId;
    if (q.module)    where.module    = q.module;
    if (q.ipAddress) where.ipAddress = { contains: q.ipAddress };
    if (q.action)    where.action    = { contains: q.action, mode: 'insensitive' };
    if (q.startDate || q.endDate) {
      where.createdAt = {};
      if (q.startDate) where.createdAt.gte = new Date(q.startDate);
      if (q.endDate)   where.createdAt.lte = new Date(q.endDate);
    }

    const page  = +(q.page  || 1);
    const limit = Math.min(+(q.limit || 50), 200); // max 200 per page
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true, employeeId: true,
              firstName: true, lastName: true, email: true,
              orgUnit: { select: { nameEn: true, code: true } },
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── User activity timeline (admin tracking) ─────────────────
  async getUserActivity(userId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [logs, summary] = await Promise.all([
      this.prisma.auditLog.findMany({
        where:   { userId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take:    100,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.auditLog.groupBy({
        by:      ['action', 'module'],
        where:   { userId, createdAt: { gte: since } },
        _count:  { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return { logs, summary, userId, days };
  }

  // ── Security alerts — suspicious activity ──────────────────
  async getSecurityAlerts(hours = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const [
      failedLogins,
      multipleIps,
      sensitiveActions,
    ] = await Promise.all([
      // Failed login attempts
      this.prisma.auditLog.findMany({
        where:   { action: 'LOGIN_FAILED', createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take:    50,
      }),
      // Same user from multiple IPs
      this.prisma.auditLog.groupBy({
        by:      ['userId', 'ipAddress'],
        where:   { createdAt: { gte: since }, userId: { not: null } },
        _count:  { id: true },
        having:  { id: { _count: { gt: 5 } } },
      }),
      // High-risk actions (DELETE, APPROVE, CHANGE_PASSWORD)
      this.prisma.auditLog.findMany({
        where: {
          action:    { in: ['DELETE','CHANGE_PASSWORD','ROLE_ASSIGN','ASSIGN'] },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: { select: { firstName: true, lastName: true, email: true, employeeId: true } },
        },
      }),
    ]);

    return { failedLogins, multipleIps, sensitiveActions, since };
  }

  // ── Activity summary for dashboard widget ──────────────────
  async getSummary(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.auditLog.groupBy({
      by:      ['action', 'module'],
      where:   { createdAt: { gte: since } },
      _count:  { id: true },
      orderBy: { _count: { id: 'desc' } },
      take:    20,
    });
  }

  // ── Distinct modules for filter dropdown ───────────────────
  async getModules() {
    return this.prisma.auditLog.groupBy({
      by:     ['module'],
      _count: { id: true },
      orderBy:{ module: 'asc' },
    });
  }

  // ── Export for compliance (HR/Legal) ───────────────────────
  async exportForUser(userId: string, year: number) {
    const start = new Date(`${year}-01-01`);
    const end   = new Date(`${year}-12-31`);
    return this.prisma.auditLog.findMany({
      where:   { userId, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
  }
}
