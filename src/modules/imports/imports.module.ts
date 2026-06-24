import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller.js';
import { ImportsService } from './imports.service.js';
import { LogsModule } from '../logs/logs.module.js';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ProductsModule } from '../products/products.module.js';

@Module({
  imports: [
    LogsModule,
    MulterModule.register(),
    PrismaModule,
    AuthModule,
    ProductsModule,
  ],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}
