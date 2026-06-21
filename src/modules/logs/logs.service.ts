import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CreateLogDto } from './dto/create-log.dto.js';
import { LogRdo } from './rdo/log.rdo.js';
import { fillDto } from '../../common/utils/fillDto.js';

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLogDto): Promise<void> {
    try {
      await this.prisma.log.create({
        data: {
          type: dto.type,
          message: dto.message,
        },
      });
    } catch (error) {
      console.error('Failed to write activity log:', error);
    }
  }

  async findAll(): Promise<LogRdo[]> {
    const logs = await this.prisma.log.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50, 
    });

    return logs.map((log) => fillDto(LogRdo, log));
  }
}