import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipAudit } from '../common/interceptors/audit-log.interceptor';

@ApiTags('Audit Logs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
@SkipAudit()  // Don't log reads of audit logs (infinite loop)
export class AuditLogsController {
  constructor(private svc: AuditLogsService) {}

  @Get()
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Get all audit logs — កំណត់ហេតុប្រតិបត្តិការ' })
  @ApiQuery({ name: 'userId',    required: false })
  @ApiQuery({ name: 'module',    required: false })
  @ApiQuery({ name: 'action',    required: false })
  @ApiQuery({ name: 'ipAddress', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate',   required: false })
  @ApiQuery({ name: 'page',      required: false, type: Number })
  @ApiQuery({ name: 'limit',     required: false, type: Number })
  findAll(@Query() q: any) { return this.svc.findAll(q); }

  @Get('security-alerts')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: '🔒 Security alerts — failed logins, suspicious activity' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Look back N hours (default 24)' })
  securityAlerts(@Query('hours') hours?: string) {
    return this.svc.getSecurityAlerts(hours ? +hours : 24);
  }

  @Get('summary')
  @Roles('SYSTEM_ADMIN','HR_OFFICER')
  @ApiOperation({ summary: 'Activity summary for last N days' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  summary(@Query('days') days?: string) { return this.svc.getSummary(days ? +days : 7); }

  @Get('modules')
  @Roles('SYSTEM_ADMIN')
  getModules() { return this.svc.getModules(); }

  @Get('user/:userId')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: '👤 Full activity timeline for a specific user' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  userActivity(@Param('userId') userId: string, @Query('days') days?: string) {
    return this.svc.getUserActivity(userId, days ? +days : 30);
  }

  @Get('user/:userId/export')
  @Roles('SYSTEM_ADMIN','HR_OFFICER')
  @ApiOperation({ summary: 'Export user activity for compliance/legal' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  exportUser(@Param('userId') userId: string, @Query('year') year?: string) {
    return this.svc.exportForUser(userId, year ? +year : new Date().getFullYear());
  }
}
