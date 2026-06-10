import { IsString, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AllocateBalanceDto {
  @ApiProperty({ example: 'user-cuid' })    @IsString() userId: string;
  @ApiProperty({ example: 'leave-type-id'}) @IsString() leaveTypeId: string;
  @ApiProperty({ example: 2025 })           @IsInt() @Type(() => Number) year: number;
  @ApiProperty({ example: 18 })             @IsNumber() @Min(0) @Type(() => Number) allocated: number;
}

export class AdjustBalanceDto {
  @ApiProperty({ example: 2, description: 'Positive=add, Negative=deduct' })
  @IsNumber() @Type(() => Number)
  days: number;

  @ApiProperty({ example: 'Manual correction by HR' })
  @IsString()
  reason: string;
}

export class BulkAllocateDto {
  @ApiProperty({ example: 2025 }) @IsInt() @Type(() => Number) year: number;
  @ApiPropertyOptional({ description: 'Specific user IDs. Empty = allocate for ALL active users' })
  @IsOptional() @IsString({ each: true })
  userIds?: string[];
}
