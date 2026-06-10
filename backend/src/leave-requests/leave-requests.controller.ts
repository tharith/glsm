import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
  HttpCode, HttpStatus, UseInterceptors, UploadedFiles, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { LeaveRequestsService } from './leave-requests.service';
import {
  CreateLeaveRequestDto, ApproveLeaveRequestDto, FilterLeaveRequestDto,
} from './dto/leave-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../auth/decorators/roles.decorator';

@ApiTags('Leave Requests')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private svc: LeaveRequestsService) {}

  // ── Submit new request (with optional requester signature) ─
  @Post()
  @ApiOperation({
    summary: 'Submit leave request — ស្នើសុំច្បាប់',
    description: 'Multipart form: fields (JSON) + optional signature image file',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        leaveTypeId: { type: 'string' },
        startDate:   { type: 'string', example: '2025-09-01' },
        endDate:     { type: 'string', example: '2025-09-03' },
        reason:      { type: 'string' },
        asDraft:     { type: 'boolean', default: false },
        signature:   { type: 'string', format: 'binary', description: 'ហត្ថលេខាអ្នកស្នើសុំ (optional)' },
      },
      required: ['leaveTypeId','startDate','endDate','reason'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'signature', maxCount: 1 }],
      { storage: memoryStorage() },
    ),
  )
  create(
    @CurrentUser() user: any,
    @Body() dto: CreateLeaveRequestDto,
    @UploadedFiles() files?: { signature?: Express.Multer.File[] },
  ) {
    const signature = files?.signature?.[0];
    return this.svc.create(user.id, dto, signature);
  }

  // ── Submit a saved draft (with optional signature) ─────────
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit draft — ដាក់ស្នើពាក្យព្រាង' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        signature: { type: 'string', format: 'binary', description: 'ហត្ថលេខា (optional)' },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'signature', maxCount: 1 }],
      { storage: memoryStorage() },
    ),
  )
  submit(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFiles() files?: { signature?: Express.Multer.File[] },
  ) {
    const signature = files?.signature?.[0];
    return this.svc.submitDraft(user.id, id, signature);
  }

  // ── Approve / Reject / Return (with optional signature) ────
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Roles('OFFICE_CHIEF','DEPARTMENT_CHIEF','HR_OFFICER','DIRECTOR_GENERAL','INSTITUTION_HEAD')
  @ApiOperation({
    summary: 'Approve / Reject / Return — ចុះហត្ថលេខាអនុម័ត',
    description: 'Multipart: action + comment + optional signature image',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        action:    { type: 'string', enum: ['APPROVED','REJECTED','RETURNED','VERIFIED'] },
        comment:   { type: 'string', description: 'មតិ (optional)' },
        signature: { type: 'string', format: 'binary', description: 'ហត្ថលេខា (optional)' },
      },
      required: ['action'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'signature', maxCount: 1 }],
      { storage: memoryStorage() },
    ),
  )
  approve(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ApproveLeaveRequestDto,
    @UploadedFiles() files?: { signature?: Express.Multer.File[] },
  ) {
    const signature = files?.signature?.[0];
    return this.svc.approve(user, id, dto, signature);
  }

  // ── Add attachment ─────────────────────────────────────────
  @Post(':id/attachments')
  @ApiOperation({ summary: 'Upload attachment — ភ្ជាប់ឯកសារ' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  addAttachment(
    @Param('id') id: string,
    @CurrentUser() u: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.svc.addAttachment(id, u.id, file);
  }

  // ── Remove attachment ──────────────────────────────────────
  @Post(':id/attachments/:attachId/remove')
  @HttpCode(HttpStatus.OK)
  removeAttachment(
    @Param('id') id: string,
    @Param('attachId') attachId: string,
    @CurrentUser() u: any,
  ) {
    return this.svc.removeAttachment(id, attachId, u.id);
  }

  // ── Cancel ─────────────────────────────────────────────────
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.cancel(u.id, id);
  }

  // ── Queries ────────────────────────────────────────────────
  @Get('my')
  @ApiOperation({ summary: 'My leave requests — ពាក្យសុំរបស់ខ្ញុំ' })
  myRequests(@CurrentUser() u: any, @Query() q: FilterLeaveRequestDto) {
    return this.svc.findMyRequests(u.id, q);
  }

  @Get('queue')
  @Roles('OFFICE_CHIEF','DEPARTMENT_CHIEF','HR_OFFICER','DIRECTOR_GENERAL','INSTITUTION_HEAD')
  @ApiOperation({ summary: 'Approval queue — ពាក្យរង់ចាំអនុម័ត' })
  queue(@CurrentUser() u: any) { return this.svc.findApprovalQueue(u); }

  @Get('all')
  @Roles('SYSTEM_ADMIN','HR_OFFICER','DIRECTOR_GENERAL','INSTITUTION_HEAD')
  findAll(@Query() q: FilterLeaveRequestDto) { return this.svc.findAll(q); }

  @Get(':id')
  @ApiOperation({ summary: 'Get request detail — ព័ត៌មានពាក្យសុំ' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  // ── Leave History ──────────────────────────────────────────
  @Get(':id/history')
  @ApiOperation({ summary: 'Get full audit trail of a leave request — ប្រវត្តិនៃការផ្លាស់ប្ដូរ' })
  getHistory(@Param('id') id: string) { return this.svc.getHistory(id); }
}