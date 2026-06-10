import { Module } from '@nestjs/common';
import { LeaveTypesService } from './leave-types.service';
import { LeaveTypesController } from './leave-types.controller';
import { AuthModule } from '../auth/auth.module';
@Module({ imports: [AuthModule], providers: [LeaveTypesService], controllers: [LeaveTypesController], exports: [LeaveTypesService] })
export class LeaveTypesModule {}
