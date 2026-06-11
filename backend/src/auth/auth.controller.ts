import {
  Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService }   from './auth.service';
import { LoginDto, RefreshTokenDto, ChangePasswordDto, ResetPasswordDto } from './dto/login.dto';
import { JwtAuthGuard }  from './guards/jwt-auth.guard';
import { RolesGuard }    from './guards/roles.guard';
import { CurrentUser }   from './decorators/roles.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })  // max 5 attempts/min
  @ApiOperation({
    summary: 'Login — ចូលប្រព័ន្ធ',
    description: 'Login with **employeeId** (លេខអត្តលេខ) or **signatureOfApplicant** (អត្ថលេខ) + password',
  })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.identifier, dto.password, dto.loginChoice);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })  // max 20/min
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — ចាកចេញ' })
  @ApiBearerAuth('JWT')
  logout(@CurrentUser() user: any) {
    return this.auth.logout(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current user profile — ព័ត៌មានគណនី' })
  me(@CurrentUser() user: any) {
    return this.auth.getProfile(user.id);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Change own password — ប្ដូរពាក្យសម្ងាត់',
    description: 'Requires current password. Revokes all sessions after change.',
  })
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Reset user password (SYSTEM_ADMIN only) — កំណត់ពាក្យសម្ងាត់ឡើងវិញ',
    description: 'Admin resets another user password without knowing their old password.',
  })
  resetPassword(@CurrentUser() admin: any, @Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.userId, dto.newPassword, admin.id);
  }
}
