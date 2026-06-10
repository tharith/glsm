import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import {
  CreateWorkflowDefinitionDto, UpdateWorkflowDefinitionDto,
  UpdateWorkflowStepDto, AssignWorkflowDto, CreateWorkflowStepDto,
} from './dto/workflow.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../auth/decorators/roles.decorator';

@ApiTags('Workflow') @ApiBearerAuth('JWT') @UseGuards(JwtAuthGuard, RolesGuard) @Controller('workflow')
export class WorkflowController {
  constructor(private svc: WorkflowService) {}

  // ── Definitions ──────────────────────────────────────────────
  @Get()                       @Roles('SYSTEM_ADMIN') findAll() { return this.svc.findAll(); }
  @Get('my') @ApiOperation({ summary: 'Get workflow for current user org unit' })
  getMyWorkflow(@CurrentUser() user: any) { return this.svc.resolveForUser(user.id); }

  @Get('instances') @Roles('SYSTEM_ADMIN','HR_OFFICER')
  @ApiOperation({ summary: 'Monitor all workflow instances (active/completed)' })
  @ApiQuery({ name: 'completed', required: false, type: Boolean })
  getInstances(@Query('completed') completed?: string) {
    return this.svc.getInstances(completed === undefined ? undefined : completed === 'true');
  }

  @Get('assignments') @ApiOperation({ summary: 'List workflow assignments' })
  @ApiQuery({ name: 'orgUnitId', required: false })
  getAssignments(@Query('orgUnitId') orgUnitId?: string) { return this.svc.getAssignments(orgUnitId); }

  @Get(':id')                  @Roles('SYSTEM_ADMIN') findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post() @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Create workflow definition with steps' })
  create(@Body() dto: CreateWorkflowDefinitionDto) { return this.svc.create(dto); }

  @Patch(':id') @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Update workflow definition name/description/status' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkflowDefinitionDto) { return this.svc.update(id, dto); }

  @Delete(':id') @Roles('SYSTEM_ADMIN') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete workflow definition (only if no active instances)' })
  remove(@Param('id') id: string) { return this.svc.remove(id); }

  // ── Steps ────────────────────────────────────────────────────
  @Post(':id/steps') @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Add a step to workflow definition' })
  addStep(@Param('id') id: string, @Body() dto: CreateWorkflowStepDto) { return this.svc.addStep(id, dto); }

  @Patch('steps/:stepId') @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Update a workflow step' })
  updateStep(@Param('stepId') stepId: string, @Body() dto: UpdateWorkflowStepDto) { return this.svc.updateStep(stepId, dto); }

  @Delete('steps/:stepId') @Roles('SYSTEM_ADMIN') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a workflow step' })
  removeStep(@Param('stepId') stepId: string) { return this.svc.removeStep(stepId); }

  @Post(':id/steps/reorder') @Roles('SYSTEM_ADMIN') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder workflow steps' })
  reorderSteps(
    @Param('id') id: string,
    @Body() body: { orders: { id: string; stepNumber: number }[] },
  ) { return this.svc.reorderSteps(id, body.orders); }

  // ── Assignments ──────────────────────────────────────────────
  @Post('assign') @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Assign workflow to org unit (replaces existing)' })
  assign(@Body() dto: AssignWorkflowDto) { return this.svc.assign(dto); }

  @Delete('assignments/:id') @Roles('SYSTEM_ADMIN') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove workflow assignment' })
  removeAssignment(@Param('id') id: string) { return this.svc.removeAssignment(id); }
}
