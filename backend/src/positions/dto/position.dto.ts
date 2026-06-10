import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";

export class CreatePositionDto {
  @ApiProperty({ example: "DC" })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code: string;
  @ApiProperty({ example: "ប្រធាននាយកដ្ឋាន" })
  @IsString()
  @MinLength(2)
  nameKh: string;
  @ApiProperty({ example: "Department Chief" })
  @IsString()
  @MinLength(2)
  nameEn: string;
  @ApiProperty({ example: 3, description: "1=highest rank" })
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  rank: number;
}
export class UpdatePositionDto extends PartialType(CreatePositionDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
export class PositionQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() includeInactive?: boolean;
}
