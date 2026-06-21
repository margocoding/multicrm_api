import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { SiteRdo } from "./rdo/site.rdo.js";
import { GetSitesDto } from "./dto/get-sites.dto.js";
import { CreateSiteDto } from "./dto/create-site.dto.js";
import { UpdateSiteDto } from "./dto/update-site.dto.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { PaginatedRdo, PaginationRdo } from "../../common/rdo/pagination.rdo.js";
import { fillDto } from "../../common/utils/fillDto.js";
import { LogsService } from "../logs/logs.service.js";
import { LogType } from "../../../generated/prisma/client.js";

@Injectable()
export class SitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  async findAll(query: GetSitesDto): Promise<PaginationRdo<SiteRdo>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.SiteWhereInput = {};
    
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { domain: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [sites, total] = await Promise.all([
      this.prisma.site.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { products: true, articles: true } },
        },
      }),
      this.prisma.site.count({ where }),
    ]);

    const plainItems = sites.map(site => ({
      ...site,
      productsCount: site._count?.products ?? 0,
      articlesCount: site._count?.articles ?? 0,
    }));

    return fillDto(PaginatedRdo(SiteRdo), {total, items: plainItems});
  }

  async create(dto: CreateSiteDto): Promise<SiteRdo> {
    try {
      const site = await this.prisma.site.create({
        data: { ...dto, status: 'live' },
        include: { _count: { select: { products: true, articles: true } } }
      });
      
      await this.logsService.create({
        type: LogType.success,
        message: `Создан новый сайт: ${site.name} (${site.domain})`,
      });

      return fillDto(SiteRdo, {
        ...site,
        productsCount: site._count?.products ?? 0,
        articlesCount: site._count?.articles ?? 0,
      });
    } catch (error) {
      await this.logsService.create({
        type: LogType.error,
        message: `Ошибка при создании сайта: ${dto.name}`,
      });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Сайт с таким доменом уже существует');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateSiteDto): Promise<SiteRdo> {
    try {
      const site = await this.prisma.site.update({
        where: { id },
        data: dto,
        include: { _count: { select: { products: true, articles: true } } }
      });

      await this.logsService.create({
        type: LogType.info,
        message: `Обновлен сайт: ${site.name}`,
      });

      return fillDto(SiteRdo, {
        ...site,
        productsCount: site._count?.products ?? 0,
        articlesCount: site._count?.articles ?? 0,
      });
    } catch (error) {
      await this.logsService.create({
        type: LogType.error,
        message: `Ошибка при обновлении сайта (ID: ${id})`,
      });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException('Сайт не найден');
        if (error.code === 'P2002') throw new ConflictException('Сайт с таким доменом уже существует');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const site = await this.prisma.site.findUnique({ where: { id } });
      if (!site) throw new NotFoundException('Сайт не найден');

      await this.prisma.site.delete({ where: { id } });
      
      await this.logsService.create({
        type: LogType.warning,
        message: `Удален сайт: ${site.name} (${site.domain})`,
      });
    } catch (error) {
      await this.logsService.create({
        type: LogType.error,
        message: `Ошибка при удалении сайта (ID: ${id})`,
      });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Сайт не найден');
      }
      throw error;
    }
  }
}