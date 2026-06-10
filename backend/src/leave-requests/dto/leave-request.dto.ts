import { IsString, IsDateString, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalAction } from '@prisma/client';

export class CreateLeaveRequestDto {
  @ApiProperty({ example: 'clxxxxxxxx' })
  @IsString()
  leaveTypeId: string;

  @ApiProperty({ example: '2025-09-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-09-03' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 'ទៅរៀនផ្ទះ' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ default: false, description: 'Save as draft without submitting' })
  @IsOptional()
  @IsBoolean()
  asDraft?: boolean;

  @ApiPropertyOptional({ default: false, description: 'ច្បាប់កន្លះថ្ងៃ — Half day leave' })
  @IsOptional()
  @IsBoolean()
  isHalfDay?: boolean;

  @ApiPropertyOptional({
    default: 'A',
    enum: ['A','B'],
    description: 'Senior path: A = INSTITUTION_HEAD first, B = HR first (for DEPUTY_INSTITUTION_HEAD role only)',
  })
  @IsOptional()
  @IsString()
  seniorPath?: 'A' | 'B';
}

// Used for multipart/form-data approve endpoint
export class ApproveLeaveRequestDto {
  @ApiProperty({ enum: ApprovalAction })
  @IsEnum(ApprovalAction)
  action: ApprovalAction;

  @ApiPropertyOptional({ description: 'Comment / មតិ' })
  @IsOptional()
  @IsString()
  comment?: string;
  // signature image comes as multipart field (handled by controller)
}

export class FilterLeaveRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leaveTypeId?: string;
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
  get skip() { return ((this.page || 1) - 1) * (this.limit || 20); }
  get take() { return this.limit || 20; }
}
