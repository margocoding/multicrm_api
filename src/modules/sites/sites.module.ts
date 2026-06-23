import { Module } from "@nestjs/common";
import { SitesController } from "./sites.controller.js";
import { SitesService } from "./sites.service.js";
import { PrismaModule } from "../../../prisma/prisma.module.js";
import { LogsModule } from "../logs/logs.module.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
    imports: [PrismaModule, LogsModule, AuthModule],
    controllers: [SitesController],
    providers: [SitesService],
})
export class SitesModule { };