import { Module }          from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule }    from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule }  from '@nestjs/schedule';
import { CacheModule }     from '@nestjs/cache-manager';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { PrismaModule }        from './prisma/prisma.module';
import { FileStorageModule }   from './file-storage/file-storage.module';
import { AuthModule }          from './auth/auth.module';
import { UsersModule }         from './users/users.module';
import { RolesModule }         from './roles/roles.module';
import { DelegationsModule }   from './delegations/delegations.module';
import { OrganizationModule }  from './organization/organization.module';
import { PositionsModule }     from './positions/positions.module';
import { LeaveTypesModule }    from './leave-types/leave-types.module';
import { LeaveBalancesModule } from './leave-balances/leave-balances.module';
import { PublicHolidaysModule } from './public-holidays/public-holidays.module';
import { WorkflowModule }      from './workflow/workflow.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogsModule }     from './audit-logs/audit-logs.module';
import { ReportsModule }       from './reports/reports.module';

import { AuditLogInterceptor }  from './common/interceptors/audit-log.interceptor';
import { ResponseInterceptor }  from './common/interceptors/response.interceptor';
import { PrismaService }        from './prisma/prisma.service';
import { Reflector }            from '@nestjs/core';

@Module({
  imports: [
    // ── Core ─────────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),

    // ── Security: Rate limiting (global) ─────────────────────
    ThrottlerModule.forRoot([{
      name:  'global',
      ttl:   60_000,   // 1 minute window
      limit: 100,      // 100 requests per minute per IP (global)
    }]),

    // ── Performance: In-memory cache ──────────────────────────
    // TTL 60s — for leave types, positions, org units (rarely change)
    CacheModule.register({
      isGlobal: true,
      ttl:      60,     // seconds
      max:      500,    // max items in cache
    }),

    // ── Scheduling (for cleanup jobs) ────────────────────────
    ScheduleModule.forRoot(),

    // ── Static files (uploads/avatars, signatures etc.) ──────
    ServeStaticModule.forRoot({
      rootPath:   join(process.cwd(), 'uploads'),
      serveRoot:  '/uploads',
      serveStaticOptions: { index: false, maxAge: '7d' }, // cache static 7 days
    }),

    // ── Business modules ─────────────────────────────────────
    PrismaModule,
    FileStorageModule,
    AuthModule,
    UsersModule,
    RolesModule,
    DelegationsModule,
    OrganizationModule,
    PositionsModule,
    LeaveTypesModule,
    LeaveBalancesModule,
    PublicHolidaysModule,
    WorkflowModule,
    LeaveRequestsModule,
    NotificationsModule,
    AuditLogsModule,
    ReportsModule,
  ],
  providers: [
    // ── Standard JSON response envelope ──────────────────────
    {
      provide:  APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // ── Auto-log all write operations ────────────────────────
    {
      provide:    APP_INTERCEPTOR,
      useFactory: (prisma: PrismaService, reflector: Reflector) =>
        new AuditLogInterceptor(prisma, reflector),
      inject: [PrismaService, Reflector],
    },
  ],
})
export class AppModule {}
