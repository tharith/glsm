import { IsString, IsDateString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDelegationDto {
  @ApiProperty({ description: 'User delegating their approval authority' })
  @IsString() fromUserId: string;

  @ApiProperty({ description: 'User receiving the delegated authority' })
  @IsString() toUserId: string;

  @ApiProperty({ example: '2025-07-01' }) @IsDateString() startDate: string;
  @ApiProperty({ example: '2025-07-07' }) @IsDateString() endDate: string;

  @ApiPropertyOptional({ example: 'Going on mission to Siem Reap' })
  @IsOptional() @IsString() reason?: string;
}

export class UpdateDelegationDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean()    isActive?: boolean;
}
