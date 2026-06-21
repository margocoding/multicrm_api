// src/common/guards/site-context.guard.ts
import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';

@Injectable()
export class SiteContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    const siteId = request.headers['x-site-id'] || request.user?.siteId;

    if (!siteId) {
      throw new ForbiddenException('Не указан идентификатор сайта');
    }

    const site = await this.prisma.site.findUnique({
      where: { id: siteId, status: 'live' },
      select: { id: true },
    });

    if (!site) {
      throw new NotFoundException('Сайт не найден или не активен');
    }
    
    request.siteId = siteId;

    return true;
  }
}