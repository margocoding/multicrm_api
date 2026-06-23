import { Controller, Get, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service.js';
import { LogRdo } from './rdo/log.rdo.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js'; 

@Controller('logs')
@UseGuards(JwtAuthGuard) 
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async findAll(): Promise<LogRdo[]> {
    return this.logsService.findAll();
  }
}