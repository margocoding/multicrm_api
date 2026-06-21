import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SitesModule } from './modules/sites/sites.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { LogsModule } from './modules/logs/logs.module.js';
import { ImportsModule } from './modules/imports/imports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    SitesModule,
    ProductsModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'),
      serveRoot: '/uploads/',
    }),
    CategoriesModule,
    OrdersModule,
    LogsModule,
    ImportsModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
