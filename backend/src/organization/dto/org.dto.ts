import { IsString, IsEnum, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { OrgUnitType } from '@prisma/client';

export class CreateOrgUnitDto {
  @ApiProperty({ example: 'MOI-DEPT-IT' })
  @IsString() @MinLength(2) @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'នាយកដ្ឋានបច្ចេកវិទ្យា' })
  @IsString() @MinLength(2)
  nameKh: string;

  @ApiProperty({ example: 'IT Department' })
  @IsString() @MinLength(2)
  nameEn: string;

  @ApiProperty({ enum: OrgUnitType })
  @IsEnum(OrgUnitType)
  type: OrgUnitType;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  parentId?: string;
}

export class UpdateOrgUnitDto extends PartialType(CreateOrgUnitDto) {
  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class OrgUnitQueryDto {
  @ApiPropertyOptional({ enum: OrgUnitType })
  @IsOptional() @IsEnum(OrgUnitType)
  type?: OrgUnitType;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  includeInactive?: boolean;
}
