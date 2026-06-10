import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard }   from '../auth/guards/roles.guard';
import { Roles }        from '../auth/decorators/roles.decorator';

@ApiTags('Roles & Permissions')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private svc: RolesService) {}

  // ── Read ─────────────────────────────────────────────────
  @Get()
  @Roles('SYSTEM_ADMIN', 'HR_OFFICER')
  @ApiOperation({ summary: 'List all roles with permissions — តួនាទីទាំងអស់' })
  findAll() { return this.svc.findAll(); }

  @Get('permissions')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'List all permissions — សិទ្ធិទាំងអស់' })
  findPermissions() { return this.svc.findPermissions(); }

  @Get('permissions/grouped')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'List permissions grouped by module' })
  findPermissionsGrouped() { return this.svc.findPermissionsGrouped(); }

  @Get(':id')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Get role detail with users and permissions' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  // ── Assign / Remove Permissions ───────────────────────────
  @Post(':roleId/permissions/:permissionId')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Assign permission to role' })
  assignPermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) { return this.svc.assignPermissionToRole(roleId, permissionId); }

  @Delete(':roleId/permissions/:permissionId')
  @Roles('SYSTEM_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove permission from role' })
  removePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) { return this.svc.removePermissionFromRole(roleId, permissionId); }
}
