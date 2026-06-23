import { Module } from '@nestjs/common';
import { LogsService } from './logs.service.js';
import { LogsController } from './logs.controller.js';
import { PrismaModule } from '../../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, LogsModule, AuthModule],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
