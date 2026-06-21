import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/prisma.module";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { FilesModule } from "../files/files.module";
import { LogsModule } from "../logs/logs.module";

@Module({
    imports: [PrismaModule, FilesModule, LogsModule],
    controllers: [ProductsController],
    providers: [ProductsService]
})
export class ProductsModule {};