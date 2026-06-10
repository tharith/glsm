import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrgUnitDto, UpdateOrgUnitDto, OrgUnitQueryDto } from './dto/org.dto';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async findAll(q: OrgUnitQueryDto) {
    const where: any = {};
    if (!q.includeInactive) where.isActive = true;
    if (q.type)     where.type     = q.type;
    if (q.parentId) where.parentId = q.parentId;
    if (q.search) where.OR = [
      { nameKh: { contains: q.search, mode: 'insensitive' } },
      { nameEn: { contains: q.search, mode: 'insensitive' } },
      { code:   { contains: q.search, mode: 'insensitive' } },
    ];
    return this.prisma.orgUnit.findMany({
      where,
      orderBy: [{ type: 'asc' }, { nameEn: 'asc' }],
      include: {
        parent: { select: { id: true, code: true, nameEn: true, nameKh: true } },
        _count: { select: { children: true, users: true } },
      },
    });
  }

  async getTree() {
    const units = await this.prisma.orgUnit.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { nameEn: 'asc' }],
      include: { _count: { select: { users: true } } },
    });
    const build = (parentId: string | null): any[] =>
      units.filter(u => u.parentId === parentId)
        .map(u => ({ ...u, staffCount: u._count.users, children: build(u.id) }));
    return build(null);
  }

  async findOne(id: string) {
    const unit = await this.prisma.orgUnit.findUnique({
      where: { id },
      include: {
        parent:   { select: { id: true, code: true, nameEn: true, nameKh: true, type: true } },
        children: { where: { isActive: true }, select: { id: true, code: true, nameEn: true, nameKh: true, type: true, isActive: true }, orderBy: { nameEn: 'asc' } },
        users:    { where: { isActive: true, isDeleted: false }, select: { id: true, firstName: true, lastName: true, firstNameKh: true, lastNameKh: true, email: true, position: { select: { nameEn: true, nameKh: true } } }, orderBy: { firstName: 'asc' } },
        _count:   { select: { children: true, users: true } },
      },
    });
    if (!unit) throw new NotFoundException(`Org unit "${id}" not found`);
    return unit;
  }

  async findByCode(code: string) {
    const unit = await this.prisma.orgUnit.findUnique({ where: { code } });
    if (!unit) throw new NotFoundException(`Org unit code "${code}" not found`);
    return unit;
  }

  async create(dto: CreateOrgUnitDto) {
    const exists = await this.prisma.orgUnit.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException(`Code "${dto.code}" already exists`);

    if (dto.parentId) {
      const parent = await this.prisma.orgUnit.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException(`Parent "${dto.parentId}" not found`);
      const hierarchy = ['INSTITUTION','GENERAL_DEPARTMENT','DEPARTMENT','OFFICE'];
      if (hierarchy.indexOf(dto.type) <= hierarchy.indexOf(parent.type))
        throw new BadRequestException(`A ${dto.type} cannot be child of ${parent.type}`);
    }

    return this.prisma.orgUnit.create({
      data: dto,
      include: { parent: { select: { id: true, code: true, nameEn: true } } },
    });
  }

  async update(id: string, dto: UpdateOrgUnitDto) {
    await this.findOne(id);
    if (dto.code) {
      const dup = await this.prisma.orgUnit.findFirst({ where: { code: dto.code, NOT: { id } } });
      if (dup) throw new ConflictException(`Code "${dto.code}" already exists`);
    }
    if (dto.parentId === id) throw new BadRequestException('Cannot be own parent');
    if (dto.parentId) await this.checkCircular(id, dto.parentId);
    return this.prisma.orgUnit.update({
      where: { id }, data: dto,
      include: { parent: { select: { id: true, code: true, nameEn: true } }, _count: { select: { children: true, users: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const [children, users] = await Promise.all([
      this.prisma.orgUnit.count({ where: { parentId: id, isActive: true } }),
      this.prisma.user.count({ where: { orgUnitId: id, isActive: true, isDeleted: false } }),
    ]);
    if (children > 0) throw new BadRequestException(`Has ${children} active child unit(s). Deactivate children first.`);
    if (users > 0) throw new BadRequestException(`Has ${users} active user(s). Reassign users first.`);
    return this.prisma.orgUnit.update({ where: { id }, data: { isActive: false } });
  }

  async restore(id: string) {
    const unit = await this.prisma.orgUnit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException('Not found');
    if (unit.isActive) throw new BadRequestException('Already active');
    return this.prisma.orgUnit.update({ where: { id }, data: { isActive: true } });
  }

  async getStaff(id: string, includeChildren = false) {
    await this.findOne(id);
    const ids = includeChildren ? [id, ...await this.getDescendants(id)] : [id];
    return this.prisma.user.findMany({
      where: { orgUnitId: { in: ids }, isActive: true, isDeleted: false },
      select: { id: true, employeeId: true, firstName: true, lastName: true, firstNameKh: true, lastNameKh: true, email: true, position: { select: { code: true, nameEn: true, nameKh: true, rank: true } }, orgUnit: { select: { code: true, nameEn: true } }, userRoles: { select: { role: { select: { name: true } } } } },
      orderBy: [{ position: { rank: 'asc' } }, { firstName: 'asc' }],
    });
  }

  private async getDescendants(parentId: string): Promise<string[]> {
    const children = await this.prisma.orgUnit.findMany({ where: { parentId }, select: { id: true } });
    const ids = children.map(c => c.id);
    for (const id of ids) ids.push(...await this.getDescendants(id));
    return ids;
  }

  private async checkCircular(id: string, newParentId: string) {
    const descendants = await this.getDescendants(id);
    if (descendants.includes(newParentId))
      throw new BadRequestException('Circular reference: new parent is a descendant');
  }
}
