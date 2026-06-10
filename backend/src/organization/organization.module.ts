import { Module } from "@nestjs/common";
import { OrganizationService } from "./organization.service";
import { OrganizationController } from "./organization.controller";
import { AuthModule } from "../auth/auth.module";
import { PrismaService } from "@/prisma/prisma.service";
@Module({
  imports: [AuthModule],
  providers: [OrganizationService, PrismaService],
  controllers: [OrganizationController],
  exports: [OrganizationService],
})
export class OrganizationModule {}
