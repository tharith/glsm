import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeaveTypesService } from './leave-types.service';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/leave-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Leave Types') @ApiBearerAuth('JWT') @UseGuards(JwtAuthGuard, RolesGuard) @Controller('leave-types')
export class LeaveTypesController {
  constructor(private readonly svc: LeaveTypesService) {}

  @Get() @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiOperation({ summary: 'List all leave types — ប្រភេទច្បាប់' })
  findAll(@Query('includeInactive') inc?: string) { return this.svc.findAll(inc === 'true'); }

  @Get('code/:code') findByCode(@Param('code') code: string) { return this.svc.findByCode(code); }
  @Get(':id')        findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post() @Roles('SYSTEM_ADMIN') @ApiOperation({ summary: 'Create leave type' })
  create(@Body() dto: CreateLeaveTypeDto) { return this.svc.create(dto); }

  @Patch(':id') @Roles('SYSTEM_ADMIN','HR_OFFICER') @ApiOperation({ summary: 'Update leave type' })
  update(@Param('id') id: string, @Body() dto: UpdateLeaveTypeDto) { return this.svc.update(id, dto); }

  @Patch(':id/toggle') @Roles('SYSTEM_ADMIN') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle leave type active/inactive' })
  toggle(@Param('id') id: string, @Body('isActive') isActive: boolean) { return this.svc.toggle(id, isActive); }
}
