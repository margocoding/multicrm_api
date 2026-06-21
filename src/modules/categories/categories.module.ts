import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import { PrismaModule } from '../../../prisma/prisma.module.js';
import { LogsModule } from '../logs/logs.module.js';

@Module({
  imports: [PrismaModule, LogsModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
