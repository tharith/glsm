import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  // ── List all roles with their permissions ─────────────────
  async findAll() {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: { permission: { select: { id: true, action: true, module: true, description: true } } },
        },
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ── List all permissions ──────────────────────────────────
  async findPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  // ── Get permissions grouped by module ────────────────────
  async findPermissionsGrouped() {
    const perms = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
    const grouped: Record<string, any[]> = {};
    for (const p of perms) {
      const mod = p.module ?? 'other';
      if (!grouped[mod]) grouped[mod] = [];
      grouped[mod].push(p);
    }
    return grouped;
  }

  // ── Assign permission to role ────────────────────────────
  async assignPermissionToRole(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.upsert({
      where:  { roleId_permissionId: { roleId, permissionId } },
      update: {},
      create: { roleId, permissionId },
    });
  }

  // ── Remove permission from role ───────────────────────────
  async removePermissionFromRole(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
  }

  // ── Get role detail with all permissions ─────────────────
  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: { include: { permission: true } },
        userRoles:   { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, employeeId: true } } }, take: 20 },
        _count:      { select: { userRoles: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }
}
