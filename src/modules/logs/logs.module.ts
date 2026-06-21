import { Module } from '@nestjs/common';
import { LogsService } from './logs.service.js';
import { LogsController } from './logs.controller.js';
import { PrismaModule } from '../../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, LogsModule],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
