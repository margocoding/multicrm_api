import { Controller, Get } from '@nestjs/common';
import { LogsService } from './logs.service.js';
import { LogRdo } from './rdo/log.rdo.js';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async findAll(): Promise<LogRdo[]> {
    return this.logsService.findAll();
  }
}