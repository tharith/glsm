import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeaveBalancesService } from './leave-balances.service';
import { AllocateBalanceDto, AdjustBalanceDto, BulkAllocateDto } from './dto/leave-balance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../auth/decorators/roles.decorator';

@ApiTags('Leave Balances') @ApiBearerAuth('JWT') @UseGuards(JwtAuthGuard, RolesGuard) @Controller('leave-balances')
export class LeaveBalancesController {
  constructor(private readonly svc: LeaveBalancesService) {}

  @Get('my') @ApiOperation({ summary: 'Get my balances — សមតុល្យរបស់ខ្ញុំ' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  myBalances(@CurrentUser() user: any, @Query('year') year?: string) {
    return this.svc.getMyBalances(user.id, year ? +year : undefined);
  }

  @Get('all') @Roles('SYSTEM_ADMIN','HR_OFFICER') @ApiOperation({ summary: 'Get all balances (HR/Admin)' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  allBalances(@Query('year') year?: string) {
    return this.svc.getAllBalances(year ? +year : undefined);
  }

  @Get('working-days') @ApiOperation({ summary: 'Calculate working days between dates' })
  @ApiQuery({ name: 'startDate', required: true }) @ApiQuery({ name: 'endDate', required: true })
  workingDays(@Query('startDate') s: string, @Query('endDate') e: string) {
    return this.svc.calculateWorkingDays(new Date(s), new Date(e));
  }

  @Get('user/:userId') @Roles('SYSTEM_ADMIN','HR_OFFICER') @ApiQuery({ name: 'year', required: false })
  userBalances(@Param('userId') userId: string, @Query('year') year?: string) {
    return this.svc.getUserBalances(userId, year ? +year : undefined);
  }

  @Post('allocate') @Roles('SYSTEM_ADMIN','HR_OFFICER') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk allocate yearly balances for all users' })
  bulkAllocate(@Body() dto: BulkAllocateDto) {
    return this.svc.bulkAllocate(dto.year, dto.userIds);
  }

  @Patch(':id/adjust') @Roles('SYSTEM_ADMIN','HR_OFFICER') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually adjust balance (HR use only)' })
  adjust(@Param('id') id: string, @Body() dto: AdjustBalanceDto) {
    return this.svc.adjustBalance(id, dto.days, dto.reason);
  }
}
