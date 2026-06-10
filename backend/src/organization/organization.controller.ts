import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { OrganizationService } from "./organization.service";
import {
  CreateOrgUnitDto,
  UpdateOrgUnitDto,
  OrgUnitQueryDto,
} from "./dto/org.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, RequirePermissions } from "../auth/decorators/roles.decorator";

@ApiTags("Organization")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("organization")
export class OrganizationController {
  constructor(private readonly svc: OrganizationService) {}

  @Get() @ApiOperation({ summary: "List org units" }) findAll(
    @Query() q: OrgUnitQueryDto,
  ) {
    return this.svc.findAll(q);
  }
  @Get("tree") @ApiOperation({ summary: "Full tree hierarchy" }) getTree() {
    return this.svc.getTree();
  }
  @Get("code/:code") findByCode(@Param("code") code: string) {
    return this.svc.findByCode(code);
  }
  @Get(":id") findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
  }
  @Get(":id/staff")
  @ApiQuery({ name: "includeChildren", required: false, type: Boolean })
  getStaff(@Param("id") id: string, @Query("includeChildren") ic?: string) {
    return this.svc.getStaff(id, ic === "true");
  }

  @Post()
  @Roles("SYSTEM_ADMIN")
  @RequirePermissions("org:create")
  @ApiOperation({ summary: "Create org unit" })
  create(@Body() dto: CreateOrgUnitDto) {
    return this.svc.create(dto);
  }

  @Patch(":id")
  @Roles("SYSTEM_ADMIN")
  @RequirePermissions("org:update")
  @ApiOperation({ summary: "Update org unit" })
  update(@Param("id") id: string, @Body() dto: UpdateOrgUnitDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @Roles("SYSTEM_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Soft-delete org unit" })
  remove(@Param("id") id: string) {
    return this.svc.remove(id);
  }

  @Patch(":id/restore")
  @Roles("SYSTEM_ADMIN")
  @HttpCode(HttpStatus.OK)
  restore(@Param("id") id: string) {
    return this.svc.restore(id);
  }
}
