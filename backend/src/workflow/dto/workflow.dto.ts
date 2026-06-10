import {
  IsString, IsInt, IsBoolean, IsOptional, IsEnum,
  IsArray, ValidateNested, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';

export class CreateWorkflowStepDto {
  @ApiProperty({ example: 1 })
  @IsInt() @Min(1) @Type(() => Number)
  stepNumber: number;

  @ApiProperty({ example: 'Office Chief Review' })
  @IsString()
  name: string;

  @ApiProperty({ enum: RoleName })
  @IsEnum(RoleName)
  approverRole: RoleName;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional({ default: 48, description: 'SLA in hours' })
  @IsOptional() @IsInt() @Min(1) @Max(720) @Type(() => Number)
  timeoutHours?: number;
}

export class CreateWorkflowDefinitionDto {
  @ApiProperty({ example: 'Standard 4-Step Workflow' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ type: [CreateWorkflowStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowStepDto)
  steps: CreateWorkflowStepDto[];
}

export class UpdateWorkflowDefinitionDto {
  @ApiPropertyOptional() @IsOptional() @IsString()  name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateWorkflowStepDto {
  @ApiPropertyOptional() @IsOptional() @IsString()             name?: string;
  @ApiPropertyOptional({ enum: RoleName })
  @IsOptional() @IsEnum(RoleName)                              approverRole?: RoleName;
  @ApiPropertyOptional() @IsOptional() @IsBoolean()            isOptional?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) timeoutHours?: number;
}

export class AssignWorkflowDto {
  @ApiProperty() @IsString() orgUnitId: string;
  @ApiProperty() @IsString() definitionId: string;
}
