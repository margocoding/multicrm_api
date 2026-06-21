import { Module } from "@nestjs/common";
import { SitesController } from "./sites.controller.js";
import { SitesService } from "./sites.service.js";
import { PrismaModule } from "../../../prisma/prisma.module.js";
import { LogsModule } from "../logs/logs.module.js";

@Module({
    imports: [PrismaModule, LogsModule],
    controllers: [SitesController],
    providers: [SitesService],
})
export class SitesModule { };