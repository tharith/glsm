import { IsOptional, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({
    description: "Employee ID or Signature of Applicant",
    example: "EMP-001",
  })
  @IsString()
  identifier: string;

  @ApiProperty({ example: "Admin@2025!" })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: "Employee ID" })
  @IsOptional()
  @IsString()
  loginChoice: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: "Current password" })
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @ApiProperty({ description: "New password (min 8 chars)" })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: "User ID to reset password for" })
  @IsString()
  userId: string;

  @ApiProperty({ description: "New password (min 8 chars)" })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
