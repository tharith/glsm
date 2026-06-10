import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ── Dashboard — employee personal stats (lightweight) ──────
  async getDashboard(userId: string, role: string) {
    const year = new Date().getFullYear();

    // Employee: personal stats only
    const [myPending, myApproved, myBalances] = await Promise.all([
      this.prisma.leaveRequest.count({
        where: { userId, status: { in: ['SUBMITTED','OFFICE_APPROVED','DEPT_APPROVED','HR_VERIFIED','DG_APPROVED'] } },
      }),
      this.prisma.leaveRequest.count({
        where: { userId, status: 'COMPLETED' },
      }),
      this.prisma.leaveBalance.findMany({
        where: { userId, year },
        select: { allocated:true, used:true, pending:true, available:true, carryOver:true,
          leaveType: { select: { code:true, nameEn:true, nameKh:true } } },
        orderBy: { leaveType: { code: 'asc' } },
      }),
    ]);

    const base = { myPending, myApproved, myBalances };

    // Admin/HR: add system-wide stats
    const isAdmin = ['SYSTEM_ADMIN','HR_OFFICER','DIRECTOR_GENERAL','INSTITUTION_HEAD'].includes(role);
    if (!isAdmin) return base;

    const [systemPending, systemCompleted, leaveByType] = await Promise.all([
      this.prisma.leaveRequest.count({
        where: { status: { in: ['SUBMITTED','OFFICE_APPROVED','DEPT_APPROVED','HR_VERIFIED','DG_APPROVED'] } },
      }),
      this.prisma.leaveRequest.count({
        where: { status: 'COMPLETED', completedAt: { gte: new Date(`${year}-01-01`) } },
      }),
      // Group by leaveType — use @@index on leaveTypeId
      this.prisma.leaveRequest.groupBy({
        by: ['leaveTypeId'],
        where: { status: 'COMPLETED', completedAt: { gte: new Date(`${year}-01-01`) } },
        _count: { id: true },
        _sum:   { totalDays: true },
      }),
    ]);

    return { ...base, systemPending, systemCompleted, leaveByType };
  }

  // ── Leave report — paginated, indexed queries ───────────────
  async getLeaveReport(query: {
    status?: string; leaveTypeId?: string; userId?: string;
    startDate?: string; endDate?: string; page?: number; limit?: number;
  }) {
    const where: any = { isDeleted: false };
    if (query.status)      where.status      = query.status;
    if (query.leaveTypeId) where.leaveTypeId = query.leaveTypeId;
    if (query.userId)      where.userId      = query.userId;
    if (query.startDate)   where.startDate   = { gte: new Date(query.startDate) };
    if (query.endDate)     where.endDate     = { lte: new Date(query.endDate) };

    const page  = +(query.page  || 1);
    const limit = Math.min(+(query.limit || 50), 200);
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where, skip, take: limit,
        orderBy: { submittedAt: 'desc' }, // uses @@index([submittedAt])
        select: {
          id:true, refNumber:true, status:true, totalDays:true,
          startDate:true, endDate:true, submittedAt:true, reason:true,
          user: { select: { id:true, employeeId:true, firstName:true, lastName:true,
            orgUnit:  { select: { nameEn:true, code:true } },
            position: { select: { nameEn:true } },
          }},
          leaveType: { select: { code:true, nameEn:true, nameKh:true } },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Summary by department — for annual report ──────────────
  async getSummaryByDept(year?: number) {
    const y = year || new Date().getFullYear();
    const rows = await this.prisma.leaveRequest.groupBy({
      by:    ['userId'],
      where: { status: 'COMPLETED', startDate: { gte: new Date(`${y}-01-01`) }, endDate: { lte: new Date(`${y}-12-31`) } },
      _count: { id: true },
      _sum:   { totalDays: true },
    });

    // Enrich with org unit info
    const userIds = rows.map(r => r.userId);
    const users   = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id:true, orgUnit: { select: { nameEn:true, code:true } } },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    // Aggregate by org unit
    const byDept: Record<string, { dept: string; totalRequests: number; totalDays: number }> = {};
    for (const row of rows) {
      const dept = userMap[row.userId]?.orgUnit?.nameEn || 'Unknown';
      if (!byDept[dept]) byDept[dept] = { dept, totalRequests: 0, totalDays: 0 };
      byDept[dept].totalRequests += row._count.id;
      byDept[dept].totalDays     += row._sum.totalDays || 0;
    }

    return Object.values(byDept).sort((a, b) => b.totalDays - a.totalDays);
  }

  // ── Balance report for HR ───────────────────────────────────
  async getBalanceReport(year?: number) {
    const y = year || new Date().getFullYear();
    return this.prisma.leaveBalance.findMany({
      where: { year: y, allocated: { gt: 0 } },
      select: {
        id:true, allocated:true, used:true, pending:true, available:true,
        user:      { select: { id:true, employeeId:true, firstName:true, lastName:true,
          orgUnit:  { select: { nameEn:true, code:true } },
          position: { select: { nameEn:true } },
        }},
        leaveType: { select: { code:true, nameEn:true } },
      },
      orderBy: [{ user: { lastName: 'asc' } }, { leaveType: { code: 'asc' } }],
    });
  }
}
