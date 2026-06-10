import { Module } from "@nestjs/common";
import { PositionsService } from "./positions.service";
import { PositionsController } from "./positions.controller";
import { AuthModule } from "../auth/auth.module";
import { PrismaService } from "@/prisma/prisma.service";
@Module({
  imports: [AuthModule],
  providers: [PositionsService, PrismaService],
  controllers: [PositionsController],
  exports: [PositionsService],
})
export class PositionsModule {}
