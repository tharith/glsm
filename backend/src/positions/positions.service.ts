import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePositionDto, UpdatePositionDto, PositionQueryDto } from './dto/position.dto';

@Injectable()
export class PositionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(q: PositionQueryDto) {
    const where: any = {};
    if (!q.includeInactive) where.isActive = true;
    if (q.search) where.OR = [
      { nameKh: { contains: q.search, mode: 'insensitive' } },
      { nameEn: { contains: q.search, mode: 'insensitive' } },
      { code:   { contains: q.search, mode: 'insensitive' } },
    ];
    return this.prisma.position.findMany({ where, orderBy: { rank: 'asc' }, include: { _count: { select: { users: true } } } });
  }

  async findOne(id: string) {
    const pos = await this.prisma.position.findUnique({
      where: { id },
      include: { users: { where: { isActive: true, isDeleted: false }, select: { id: true, firstName: true, lastName: true, email: true, orgUnit: { select: { nameEn: true } } }, orderBy: { firstName: 'asc' } }, _count: { select: { users: true } } },
    });
    if (!pos) throw new NotFoundException(`Position "${id}" not found`);
    return pos;
  }

  async findByCode(code: string) {
    const pos = await this.prisma.position.findUnique({ where: { code } });
    if (!pos) throw new NotFoundException(`Position code "${code}" not found`);
    return pos;
  }

  async create(dto: CreatePositionDto) {
    const exists = await this.prisma.position.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException(`Code "${dto.code}" already exists`);
    return this.prisma.position.create({ data: dto, include: { _count: { select: { users: true } } } });
  }

  async update(id: string, dto: UpdatePositionDto) {
    await this.findOne(id);
    if (dto.code) {
      const dup = await this.prisma.position.findFirst({ where: { code: dto.code, NOT: { id } } });
      if (dup) throw new ConflictException(`Code "${dto.code}" already exists`);
    }
    return this.prisma.position.update({ where: { id }, data: dto, include: { _count: { select: { users: true } } } });
  }

  async remove(id: string) {
    await this.findOne(id);
    const count = await this.prisma.user.count({ where: { positionId: id, isActive: true, isDeleted: false } });
    if (count > 0) throw new BadRequestException(`${count} active user(s) hold this position. Reassign first.`);
    return this.prisma.position.update({ where: { id }, data: { isActive: false } });
  }

  async restore(id: string) {
    const pos = await this.prisma.position.findUnique({ where: { id } });
    if (!pos) throw new NotFoundException('Not found');
    if (pos.isActive) throw new BadRequestException('Already active');
    return this.prisma.position.update({ where: { id }, data: { isActive: true } });
  }

  async reorder(orders: { id: string; rank: number }[]) {
    await this.prisma.$transaction(orders.map(({ id, rank }) => this.prisma.position.update({ where: { id }, data: { rank } })));
    return this.findAll({});
  }
}
