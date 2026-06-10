import { Module } from '@nestjs/common';
import { PublicHolidaysService } from './public-holidays.service';
import { PublicHolidaysController } from './public-holidays.controller';
import { AuthModule } from '../auth/auth.module';
@Module({ imports: [AuthModule], providers: [PublicHolidaysService], controllers: [PublicHolidaysController], exports: [PublicHolidaysService] })
export class PublicHolidaysModule {}
