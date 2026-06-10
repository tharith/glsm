import {
  IsEmail, IsString, IsOptional, IsInt, IsDateString,
  MinLength, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  // ── Identity ──────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firstNameKh?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastNameKh?: string;
  @ApiProperty()         @IsEmail()                email: string;
  @ApiProperty()         @IsString() @MinLength(8) password: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiPropertyOptional({ example: 'Phnom Penh' }) @IsOptional() @IsString() dop?: string;
  @ApiPropertyOptional({ enum: ['Male','Female'] }) @IsOptional() @IsString() gender?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() passportNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() signatureOfApplicant?: string;

  // ── Work Info ─────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString()     positionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     orgUnitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() hireDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfPermanentAppointment?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(50) @Type(() => Number) workExperience?: number;
  @ApiPropertyOptional() @IsOptional() @IsString()     currentRankAndGrade?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfLastPromotion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     medalAwarded?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfAward?: string;

  // ── Education & Language ──────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() educationLevel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() foreignLanguages?: string;

  // ── Spouse ────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() nameOfSpouse?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() occupationOfSpouse?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt()    @Type(() => Number) workplaceOfSpouse?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt()    @Min(0) @Type(() => Number) numberOfChildren?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt()    @Min(0) @Type(() => Number) numbersOfSiblings?: number;

  // ── Father ────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() fathersName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dopOfFathers?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fathersOccupation?: string;

  // ── Mother ────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() mothersName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dopOfMothers?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mothersOccupation?: string;

  // ── Father-in-Law ─────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() fathersInLawName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dopOfFathersInLaw?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fathersInLawOccupation?: string;

  // ── Mother-in-Law ─────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() mothersInLawName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dopOfMothersInLaw?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mothersInLawOccupation?: string;
}

export class UpdateUserDto {
  // Identity
  @ApiPropertyOptional() @IsOptional() @IsString()     firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     firstNameKh?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     lastNameKh?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     dop?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     gender?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     nationalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     passportNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     signatureOfApplicant?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     signatureImage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     photo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     photoPath?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt()        @Type(() => Number) signatureFileId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString()     avatarUrl?: string;
  // Work
  @ApiPropertyOptional() @IsOptional() @IsString()     positionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     orgUnitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() hireDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfPermanentAppointment?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt()        @Min(0) @Type(() => Number) workExperience?: number;
  @ApiPropertyOptional() @IsOptional() @IsString()     currentRankAndGrade?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfLastPromotion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     medalAwarded?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfAward?: string;
  // Education
  @ApiPropertyOptional() @IsOptional() @IsString()     educationLevel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     foreignLanguages?: string;
  // Spouse
  @ApiPropertyOptional() @IsOptional() @IsString()     nameOfSpouse?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     occupationOfSpouse?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt()        @Type(() => Number) workplaceOfSpouse?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt()        @Min(0) @Type(() => Number) numberOfChildren?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt()        @Min(0) @Type(() => Number) numbersOfSiblings?: number;
  // Parents
  @ApiPropertyOptional() @IsOptional() @IsString()     fathersName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     dopOfFathers?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     fathersOccupation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     mothersName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     dopOfMothers?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     mothersOccupation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     fathersInLawName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     dopOfFathersInLaw?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     fathersInLawOccupation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     mothersInLawName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     dopOfMothersInLaw?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()     mothersInLawOccupation?: string;
  // System
  @ApiPropertyOptional() @IsOptional()                 isActive?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() @MinLength(1) currentPassword: string;
  @ApiProperty() @IsString() @MinLength(8) newPassword: string;
}

export class AssignRoleDto {
  @ApiProperty() @IsString() roleId: string;
}
