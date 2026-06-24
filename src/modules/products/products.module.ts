import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/prisma.module";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { FilesModule } from "../files/files.module";
import { LogsModule } from "../logs/logs.module";
import { AuthModule } from "../auth/auth.module";

@Module({
    imports: [PrismaModule, FilesModule, LogsModule, AuthModule],
    controllers: [ProductsController],
    providers: [ProductsService],
    exports: [ProductsService]
})
export class ProductsModule {};