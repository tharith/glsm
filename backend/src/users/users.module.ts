import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module';
import { FileStorageModule } from '../file-storage/file-storage.module';
@Module({ imports: [AuthModule, FileStorageModule], providers: [UsersService], controllers: [UsersController], exports: [UsersService] })
export class UsersModule {}
