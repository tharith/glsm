import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PositionsService } from './positions.service';
import { CreatePositionDto, UpdatePositionDto, PositionQueryDto } from './dto/position.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Positions') @ApiBearerAuth('JWT') @UseGuards(JwtAuthGuard, RolesGuard) @Controller('positions')
export class PositionsController {
  constructor(private readonly svc: PositionsService) {}

  @Get()            @ApiOperation({ summary: 'List positions' }) findAll(@Query() q: PositionQueryDto) { return this.svc.findAll(q); }
  @Get('code/:code') findByCode(@Param('code') c: string) { return this.svc.findByCode(c); }
  @Get(':id')       findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post() @Roles('SYSTEM_ADMIN','HR_OFFICER') create(@Body() dto: CreatePositionDto) { return this.svc.create(dto); }

  @Patch('reorder') @Roles('SYSTEM_ADMIN','HR_OFFICER') @HttpCode(HttpStatus.OK)
  reorder(@Body() body: { orders: { id: string; rank: number }[] }) { return this.svc.reorder(body.orders); }

  @Patch(':id') @Roles('SYSTEM_ADMIN','HR_OFFICER') update(@Param('id') id: string, @Body() dto: UpdatePositionDto) { return this.svc.update(id, dto); }

  @Delete(':id') @Roles('SYSTEM_ADMIN') @HttpCode(HttpStatus.OK) remove(@Param('id') id: string) { return this.svc.remove(id); }

  @Patch(':id/restore') @Roles('SYSTEM_ADMIN') @HttpCode(HttpStatus.OK) restore(@Param('id') id: string) { return this.svc.restore(id); }
}
