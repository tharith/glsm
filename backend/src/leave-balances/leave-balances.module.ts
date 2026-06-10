import { Module } from '@nestjs/common';
import { LeaveBalancesService } from './leave-balances.service';
import { LeaveBalancesController } from './leave-balances.controller';
import { AuthModule } from '../auth/auth.module';
@Module({ imports: [AuthModule], providers: [LeaveBalancesService], controllers: [LeaveBalancesController], exports: [LeaveBalancesService] })
export class LeaveBalancesModule {}
