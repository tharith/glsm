import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PublicHolidaysService } from './public-holidays.service';
import { CreateHolidayDto, UpdateHolidayDto, BulkCreateHolidayDto } from './dto/holiday.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Public Holidays') @ApiBearerAuth('JWT') @UseGuards(JwtAuthGuard, RolesGuard) @Controller('public-holidays')
export class PublicHolidaysController {
  constructor(private svc: PublicHolidaysService) {}

  @Get() @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiOperation({ summary: 'List public holidays — ថ្ងៃឈប់បុណ្យជាតិ' })
  findAll(@Query('year') year?: string) { return this.svc.findAll(year ? +year : undefined); }

  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post() @Roles('SYSTEM_ADMIN','HR_OFFICER')
  create(@Body() dto: CreateHolidayDto) { return this.svc.create(dto); }

  @Post('bulk') @Roles('SYSTEM_ADMIN','HR_OFFICER') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk create holidays for a year' })
  bulkCreate(@Body() dto: BulkCreateHolidayDto) { return this.svc.bulkCreate(dto.holidays); }

  @Post('copy-year') @Roles('SYSTEM_ADMIN') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Copy recurring holidays to a new year' })
  copyToYear(@Body('fromYear') fromYear: number, @Body('toYear') toYear: number) {
    return this.svc.copyToYear(fromYear, toYear);
  }

  @Patch(':id') @Roles('SYSTEM_ADMIN','HR_OFFICER')
  update(@Param('id') id: string, @Body() dto: UpdateHolidayDto) { return this.svc.update(id, dto); }

  @Delete(':id') @Roles('SYSTEM_ADMIN') @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
