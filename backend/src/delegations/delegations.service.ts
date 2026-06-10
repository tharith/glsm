import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDelegationDto, UpdateDelegationDto } from './dto/delegation.dto';

const INCLUDE = {
  fromUser: { select: { id: true, firstName: true, lastName: true, email: true, position: { select: { nameEn: true } } } },
  toUser:   { select: { id: true, firstName: true, lastName: true, email: true, position: { select: { nameEn: true } } } },
};

@Injectable()
export class DelegationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { userId?: string; activeOnly?: boolean }) {
    const where: any = {};
    if (query?.userId)     where.OR = [{ fromUserId: query.userId }, { toUserId: query.userId }];
    if (query?.activeOnly) {
      const now = new Date();
      where.isActive  = true;
      where.startDate = { lte: now };
      where.endDate   = { gte: now };
    }
    return this.prisma.delegation.findMany({ where, include: INCLUDE, orderBy: { startDate: 'desc' } });
  }

  async findOne(id: string) {
    const d = await this.prisma.delegation.findUnique({ where: { id }, include: INCLUDE });
    if (!d) throw new NotFoundException('Delegation not found');
    return d;
  }

  async create(dto: CreateDelegationDto) {
    if (dto.fromUserId === dto.toUserId)
      throw new BadRequestException('Cannot delegate to yourself');

    const start = new Date(dto.startDate);
    const end   = new Date(dto.endDate);
    if (end <= start) throw new BadRequestException('End date must be after start date');

    // Check for overlapping active delegation from same user
    const overlap = await this.prisma.delegation.findFirst({
      where: {
        fromUserId: dto.fromUserId,
        isActive: true,
        startDate: { lte: end },
        endDate:   { gte: start },
      },
    });
    if (overlap)
      throw new ConflictException('An active delegation already exists in this date range');

    const [from, to] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.fromUserId } }),
      this.prisma.user.findUnique({ where: { id: dto.toUserId  } }),
    ]);
    if (!from) throw new NotFoundException('From-user not found');
    if (!to)   throw new NotFoundException('To-user not found');

    return this.prisma.delegation.create({
      data: { ...dto, startDate: start, endDate: end },
      include: INCLUDE,
    });
  }

  async update(id: string, dto: UpdateDelegationDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate)   data.endDate   = new Date(dto.endDate);
    return this.prisma.delegation.update({ where: { id }, data, include: INCLUDE });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.delegation.update({ where: { id }, data: { isActive: false }, include: INCLUDE });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.delegation.delete({ where: { id } });
  }

  // Check if a user has active delegation (used by workflow engine)
  async getActiveDelegateFor(fromUserId: string): Promise<string | null> {
    const now = new Date();
    const d = await this.prisma.delegation.findFirst({
      where: { fromUserId, isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      select: { toUserId: true },
    });
    return d?.toUserId || null;
  }
}
