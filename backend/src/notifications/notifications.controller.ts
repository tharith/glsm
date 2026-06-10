import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard }  from '../auth/guards/jwt-auth.guard';
import { RolesGuard }    from '../auth/guards/roles.guard';
import { CurrentUser }   from '../auth/decorators/roles.decorator';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications — ការជូនដំណឹងរបស់ខ្ញុំ' })
  getMyNotifications(@CurrentUser() u: any) { return this.svc.getMyNotifications(u.id); }

  @Get('count')
  @ApiOperation({ summary: 'Get unread count — ចំនួនដែលមិនទាន់អាន' })
  getUnreadCount(@CurrentUser() u: any) { return this.svc.getUnreadCount(u.id); }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.markRead(id, u.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all as read' })
  markAllRead(@CurrentUser() u: any) { return this.svc.markAllRead(u.id); }
}
