import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, ParseFilePipe,
  MaxFileSizeValidator, FileTypeValidator, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody, ApiQuery} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, AssignRoleDto } from './dto/create-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../auth/decorators/roles.decorator';

@ApiTags('Users') @ApiBearerAuth('JWT') @UseGuards(JwtAuthGuard, RolesGuard) @Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get()    @Roles('SYSTEM_ADMIN','HR_OFFICER') findAll(@Query() q: PaginationDto) { return this.svc.findAll(q); }
  @Get('search')
  @ApiOperation({ summary: 'Search users for autocomplete (accessible to all authenticated users)' })
  @ApiQuery({ name: 'q',     required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  searchUsers(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.svc.searchForAutocomplete(q, limit ? +limit : 50);
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post() @Roles('SYSTEM_ADMIN')
  create(@Body() dto: CreateUserDto) { return this.svc.create(dto); }

  @Patch(':id') @Roles('SYSTEM_ADMIN','HR_OFFICER')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.svc.update(id, dto); }

  @Delete(':id') @Roles('SYSTEM_ADMIN') @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) { return this.svc.softDelete(id); }

  // ── Avatar Upload ─────────────────────────────────────────
  @Post(':id/avatar')
  @ApiOperation({ summary: 'Upload user avatar — រូបថតមន្ត្រី' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadAvatar(
    @Param('id') id: string,
    @UploadedFile(new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
        new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/i }),
      ],
    })) file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.svc.uploadAvatar(id, file, user.id);
  }

  @Delete(':id/avatar') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove user avatar' })
  removeAvatar(@Param('id') id: string) { return this.svc.removeAvatar(id); }

  // ── Change Password ───────────────────────────────────────
  @Post(':id/change-password') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password — ប្ដូរពាក្យសម្ងាត់' })
  changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto, @CurrentUser() user: any) {
    return this.svc.changePassword(id, dto, user.id);
  }

  // ── Roles ─────────────────────────────────────────────────
  @Post(':id/roles')    @Roles('SYSTEM_ADMIN') assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) { return this.svc.assignRole(id, dto.roleId); }
  @Delete(':id/roles/:roleId') @Roles('SYSTEM_ADMIN') @HttpCode(HttpStatus.OK) removeRole(@Param('id') id: string, @Param('roleId') roleId: string) { return this.svc.removeRole(id, roleId); }

  // ── Direct Permissions ────────────────────────────────────
  @Post(':id/permissions/grant') @Roles('SYSTEM_ADMIN')
  grantPermission(@Param('id') id: string, @Body('permissionId') permissionId: string) { return this.svc.grantPermission(id, permissionId); }

  @Post(':id/permissions/revoke') @Roles('SYSTEM_ADMIN')
  revokePermission(@Param('id') id: string, @Body('permissionId') permissionId: string) { return this.svc.revokePermission(id, permissionId); }
}
