import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaveBalancesService {
  constructor(private prisma: PrismaService) {}

  // ── GET my balances ─────────────────────────────────────────
  async getMyBalances(userId: string, year?: number) {
    const y = year || new Date().getFullYear();
    return this.prisma.leaveBalance.findMany({
      where: { userId, year: y },
      include: { leaveType: true },
      orderBy: { leaveType: { code: 'asc' } },
    });
  }

  // ── GET user balances (HR/Admin) ────────────────────────────
  async getUserBalances(userId: string, year?: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.getMyBalances(userId, year);
  }

  // ── GET all balances (HR/Admin) ─────────────────────────────
  async getAllBalances(year?: number) {
    const y = year || new Date().getFullYear();
    return this.prisma.leaveBalance.findMany({
      where: { year: y },
      include: {
        leaveType: { select: { code: true, nameEn: true, nameKh: true } },
        user: { select: { id: true, employeeId: true, firstName: true, lastName: true, firstNameKh: true, lastNameKh: true, orgUnit: { select: { nameEn: true } }, position: { select: { nameEn: true } } } },
      },
      orderBy: [{ user: { lastName: 'asc' } }, { leaveType: { code: 'asc' } }],
    });
  }

  // ── Validate balance before leave request ───────────────────
  async validateBalance(userId: string, leaveTypeId: string, requestedDays: number, year: number) {
    const bal = await this.prisma.leaveBalance.findUnique({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    });
    if (!bal) return { valid: false, available: 0, message: 'No balance allocated for this year' };
    if (bal.available < requestedDays)
      return { valid: false, available: bal.available, message: `Insufficient balance. Available: ${bal.available} days, Requested: ${requestedDays} days` };
    return { valid: true, available: bal.available };
  }

  // ── Reserve pending (on submit) ─────────────────────────────
  async reservePending(userId: string, leaveTypeId: string, year: number, days: number) {
    return this.prisma.leaveBalance.update({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
      data: { pending: { increment: days }, available: { decrement: days } },
    });
  }

  // ── Release pending (on cancel before approval) ─────────────
  async releasePending(userId: string, leaveTypeId: string, year: number, days: number) {
    return this.prisma.leaveBalance.update({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
      data: { pending: { decrement: days }, available: { increment: days } },
    });
  }

  // ── Deduct (on final approval) ──────────────────────────────
  async deductBalance(userId: string, leaveTypeId: string, year: number, days: number) {
    return this.prisma.leaveBalance.update({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
      data: { used: { increment: days }, pending: { decrement: days } },
    });
  }

  // ── Restore (on cancel after approval) ─────────────────────
  async restoreBalance(userId: string, leaveTypeId: string, year: number, days: number) {
    return this.prisma.leaveBalance.update({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
      data: { used: { decrement: days }, available: { increment: days } },
    });
  }

  // ── Manual adjust by HR ─────────────────────────────────────
  async adjustBalance(balanceId: string, days: number, reason: string) {
    const bal = await this.prisma.leaveBalance.findUnique({ where: { id: balanceId } });
    if (!bal) throw new NotFoundException('Balance record not found');
    const newAvailable = bal.available + days;
    const newAllocated = bal.allocated + days;
    if (newAvailable < 0) throw new BadRequestException(`Cannot deduct ${Math.abs(days)} days: only ${bal.available} available`);
    return this.prisma.leaveBalance.update({
      where: { id: balanceId },
      data: { allocated: newAllocated, available: newAvailable },
      include: { leaveType: true, user: { select: { firstName: true, lastName: true, email: true } } },
    });
  }

  // ── Bulk allocate for all users at year start ───────────────
  async bulkAllocate(year: number, userIds?: string[]) {
    const [users, leaveTypes] = await Promise.all([
      this.prisma.user.findMany({
        where: { isActive: true, isDeleted: false, ...(userIds?.length ? { id: { in: userIds } } : {}) },
        select: { id: true },
      }),
      this.prisma.leaveType.findMany({ where: { isActive: true } }),
    ]);

    let created = 0, skipped = 0;
    for (const user of users) {
      for (const lt of leaveTypes) {
        const result = await this.prisma.leaveBalance.upsert({
          where: { userId_leaveTypeId_year: { userId: user.id, leaveTypeId: lt.id, year } },
          create: { userId: user.id, leaveTypeId: lt.id, year, allocated: lt.maxDaysPerYear, available: lt.maxDaysPerYear },
          update: {},
        });
        if (result.allocated === lt.maxDaysPerYear && result.used === 0) created++;
        else skipped++;
      }
    }

    return { message: `Year ${year} allocation done`, users: users.length, leaveTypes: leaveTypes.length, created, skipped };
  }

  // ── Calculate working days (exclude weekends + holidays) ────
  async calculateWorkingDays(startDate: Date, endDate: Date): Promise<number> {
    const holidays = await this.prisma.publicHoliday.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { date: true },
    });
    const holidaySet = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));
    let count = 0;
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6 && !holidaySet.has(cur.toISOString().split('T')[0])) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }
}
