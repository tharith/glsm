import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportsService }  from './reports.service';
import { JwtAuthGuard }    from '../auth/guards/jwt-auth.guard';
import { RolesGuard }      from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../auth/decorators/roles.decorator';

@ApiTags('Reports')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard stats — ស្ថិតិ​ Overview' })
  dashboard(@CurrentUser() u: any) {
    const role = u.userRoles?.[0]?.role?.name || 'EMPLOYEE';
    return this.svc.getDashboard(u.id, role);
  }

  @Get('leave')
  @Roles('SYSTEM_ADMIN','HR_OFFICER','DIRECTOR_GENERAL','INSTITUTION_HEAD')
  @ApiOperation({ summary: 'Leave requests report — paginated + filterable' })
  @ApiQuery({ name: 'status',      required: false })
  @ApiQuery({ name: 'leaveTypeId', required: false })
  @ApiQuery({ name: 'userId',      required: false })
  @ApiQuery({ name: 'startDate',   required: false })
  @ApiQuery({ name: 'endDate',     required: false })
  @ApiQuery({ name: 'page',        required: false, type: Number })
  @ApiQuery({ name: 'limit',       required: false, type: Number })
  leaveReport(@Query() q: any) { return this.svc.getLeaveReport(q); }

  @Get('summary')
  @Roles('SYSTEM_ADMIN','HR_OFFICER','DIRECTOR_GENERAL','INSTITUTION_HEAD')
  @ApiOperation({ summary: 'Summary by department' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  summary(@Query('year') year?: string) { return this.svc.getSummaryByDept(year ? +year : undefined); }

  @Get('balances')
  @Roles('SYSTEM_ADMIN','HR_OFFICER')
  @ApiOperation({ summary: 'Balance report for HR' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  balances(@Query('year') year?: string) { return this.svc.getBalanceReport(year ? +year : undefined); }
}
