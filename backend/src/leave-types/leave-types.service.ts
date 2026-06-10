import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/leave-type.dto';

const CACHE_KEY   = 'leave_types_active';
const CACHE_TTL   = 300; // 5 minutes (leave types rarely change)

@Injectable()
export class LeaveTypesService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async findAll(includeInactive = false) {
    if (!includeInactive) {
      // Serve active types from cache
      const cached = await this.cache.get<any[]>(CACHE_KEY);
      if (cached) return cached;
    }
    const result = await this.prisma.leaveType.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { code: 'asc' },
    });
    if (!includeInactive) await this.cache.set(CACHE_KEY, result, CACHE_TTL);
    return result;
  }

  async findOne(id: string) {
    const lt = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!lt) throw new NotFoundException(`Leave type "${id}" not found`);
    return lt;
  }

  async findByCode(code: string) {
    const lt = await this.prisma.leaveType.findUnique({ where: { code: code as any } });
    if (!lt) throw new NotFoundException(`Leave type code "${code}" not found`);
    return lt;
  }

  async create(dto: CreateLeaveTypeDto) {
    const exists = await this.prisma.leaveType.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException(`Code "${dto.code}" already exists`);
    const result = await this.prisma.leaveType.create({ data: dto });
    await this.cache.del(CACHE_KEY); // invalidate cache
    return result;
  }

  async update(id: string, dto: UpdateLeaveTypeDto) {
    await this.findOne(id);
    if (dto.code) {
      const dup = await this.prisma.leaveType.findFirst({ where: { code: dto.code, NOT: { id } } });
      if (dup) throw new ConflictException(`Code "${dto.code}" already exists`);
    }
    const result = await this.prisma.leaveType.update({ where: { id }, data: dto });
    await this.cache.del(CACHE_KEY); // invalidate cache
    return result;
  }

  async toggle(id: string, isActive: boolean) {
    await this.findOne(id);
    const result = await this.prisma.leaveType.update({ where: { id }, data: { isActive } });
    await this.cache.del(CACHE_KEY); // invalidate cache
    return result;
  }
}
