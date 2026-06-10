import { IsString, IsDateString, IsInt, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHolidayDto {
  @ApiProperty({ example: 'ចូលឆ្នាំខ្មែរ' })        @IsString()      nameKh: string;
  @ApiProperty({ example: 'Khmer New Year' })         @IsString()      nameEn: string;
  @ApiProperty({ example: '2025-04-14' })              @IsDateString()  date: string;
  @ApiProperty({ example: 2025 })                      @IsInt() @Type(() => Number) year: number;
  @ApiPropertyOptional({ default: true })               @IsOptional() @IsBoolean() isRecurring?: boolean;
}

export class UpdateHolidayDto {
  @ApiPropertyOptional() @IsOptional() @IsString()     nameKh?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     nameEn?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() date?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean()    isRecurring?: boolean;
}

export class BulkCreateHolidayDto {
  @ApiProperty({ type: [CreateHolidayDto] })
  holidays: CreateHolidayDto[];
}
