import { Module } from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveRequestsController } from './leave-requests.controller';
import { AuthModule } from '../auth/auth.module';
import { LeaveBalancesModule } from '../leave-balances/leave-balances.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FileStorageModule } from '../file-storage/file-storage.module';

@Module({
  imports: [AuthModule, LeaveBalancesModule, WorkflowModule, NotificationsModule, FileStorageModule],
  providers: [LeaveRequestsService],
  controllers: [LeaveRequestsController],
  exports: [LeaveRequestsService],
})
export class LeaveRequestsModule {}
