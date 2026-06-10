import { IsString, IsInt, IsBoolean, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { LeaveTypeCode } from '@prisma/client';

export class CreateLeaveTypeDto {
  @ApiProperty({ enum: LeaveTypeCode, example: LeaveTypeCode.ANNUAL })
  @IsEnum(LeaveTypeCode)
  code: LeaveTypeCode;

  @ApiProperty({ example: 'ច្បាប់សម្រាកប្រចាំឆ្នាំ' }) @IsString() nameKh: string;
  @ApiProperty({ example: 'Annual Leave' })               @IsString() nameEn: string;

  @ApiProperty({ example: 18, description: 'Max days allowed per year' })
  @IsInt() @Min(1) @Max(365) @Type(() => Number)
  maxDaysPerYear: number;

  @ApiPropertyOptional({ default: false, description: 'Requires supporting document' })
  @IsOptional() @IsBoolean()
  requiresDoc?: boolean;

  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isPaid?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() carryOver?: boolean;

  @ApiPropertyOptional({ default: 0, description: 'Max days to carry over to next year' })
  @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  maxCarryOver?: number;

  @ApiPropertyOptional({ description: 'null=all | M=male only | F=female only', example: null })
  @IsOptional() @IsString()
  gender?: string;
}

export class UpdateLeaveTypeDto extends PartialType(CreateLeaveTypeDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
