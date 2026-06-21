import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { PrismaModule } from '../../../prisma/prisma.module.js';
import { LogsModule } from '../logs/logs.module.js';

@Module({
  imports: [PrismaModule, LogsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
