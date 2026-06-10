import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DelegationsService } from './delegations.service';
import { CreateDelegationDto, UpdateDelegationDto } from './dto/delegation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../auth/decorators/roles.decorator';

@ApiTags('Delegations') @ApiBearerAuth('JWT') @UseGuards(JwtAuthGuard, RolesGuard) @Controller('delegations')
export class DelegationsController {
  constructor(private svc: DelegationsService) {}

  @Get() @ApiOperation({ summary: 'List delegations — ការប្រគល់សិទ្ធិ' })
  @ApiQuery({ name: 'userId',     required: false })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  findAll(@Query('userId') userId?: string, @Query('activeOnly') activeOnly?: string) {
    return this.svc.findAll({ userId, activeOnly: activeOnly === 'true' });
  }

  @Get('my') @ApiOperation({ summary: 'My delegations (as delegator or delegate)' })
  myDelegations(@CurrentUser() user: any) { return this.svc.findAll({ userId: user.id }); }

  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @Roles('SYSTEM_ADMIN','INSTITUTION_HEAD','DIRECTOR_GENERAL','DEPARTMENT_CHIEF','OFFICE_CHIEF')
  @ApiOperation({ summary: 'Create delegation — ប្រគល់សិទ្ធិអនុម័ត' })
  create(@Body() dto: CreateDelegationDto) { return this.svc.create(dto); }

  @Patch(':id')
  @Roles('SYSTEM_ADMIN','INSTITUTION_HEAD','DIRECTOR_GENERAL','DEPARTMENT_CHIEF','OFFICE_CHIEF')
  update(@Param('id') id: string, @Body() dto: UpdateDelegationDto) { return this.svc.update(id, dto); }

  @Patch(':id/deactivate') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate delegation' })
  deactivate(@Param('id') id: string) { return this.svc.deactivate(id); }

  @Delete(':id') @Roles('SYSTEM_ADMIN') @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) { return this.svc.delete(id); }
}
