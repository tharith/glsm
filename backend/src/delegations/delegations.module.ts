import { Module } from '@nestjs/common';
import { DelegationsService } from './delegations.service';
import { DelegationsController } from './delegations.controller';
import { AuthModule } from '../auth/auth.module';
@Module({ imports: [AuthModule], providers: [DelegationsService], controllers: [DelegationsController], exports: [DelegationsService] })
export class DelegationsModule {}
