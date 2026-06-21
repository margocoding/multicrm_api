import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductRdo } from './rdo/product.rdo.js';
import { GetProductsDto } from './dto/get-products.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { PublishToSiteDto } from './dto/publish-to-site.dto.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  PaginatedRdo,
  PaginationRdo,
} from '../../common/rdo/pagination.rdo.js';
import { fillDto } from '../../common/utils/fillDto.js';
import { FilesService } from '../files/files.service.js';
import { LogsService } from '../logs/logs.service.js';
import { LogType } from '../../../generated/prisma/client.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly logsService: LogsService,
  ) {}

  private async getCategoryWithDescendants(categoryId: string): Promise<string[]> {
    const allCategories = await this.prisma.category.findMany({
      select: { id: true, parentId: true },
    });

    const childrenMap = new Map<string, string[]>();
    for (const cat of allCategories) {
      if (cat.parentId) {
        if (!childrenMap.has(cat.parentId)) {
          childrenMap.set(cat.parentId, []);
        }
        childrenMap.get(cat.parentId)!.push(cat.id);
      }
    }

    const result: string[] = [categoryId];
    const queue: string[] = [categoryId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = childrenMap.get(current) || [];
      for (const child of children) {
        result.push(child);
        queue.push(child);
      }
    }

    return result;
  }

  private async buildProductFilters(
    query: GetProductsDto,
  ): Promise<Prisma.ProductWhereInput[]> {
    const andConditions: Prisma.ProductWhereInput[] = [];

    if (query.search) {
      andConditions.push({
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { subtitle: { contains: query.search, mode: 'insensitive' } },
          { standard: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    if (query.categoryId) {
      const categoryIds = await this.getCategoryWithDescendants(
        query.categoryId,
      );
      andConditions.push({ categoryId: { in: categoryIds } });
    }

    return andConditions;
  }

  async findAll(query: GetProductsDto): Promise<PaginationRdo<ProductRdo>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    const andConditions = await this.buildProductFilters(query);

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              sites: {
                where: { isPublished: true },
              },
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const plainItems = products.map((product) => ({
      ...product,
      publishedSitesCount: product._count?.sites ?? 0,
    }));

    return fillDto(PaginatedRdo(ProductRdo), { total, items: plainItems });
  }

  async findByDomain(
    domain: string,
    query: GetProductsDto,
  ): Promise<PaginationRdo<ProductRdo>> {
    const site = await this.prisma.site.findUnique({
      where: { domain },
    });

    if (!site) {
      throw new NotFoundException(`Сайт с доменом ${domain} не найден`);
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      sites: {
        some: {
          siteId: site.id,
          isPublished: true,
        },
      },
    };

    const andConditions = await this.buildProductFilters(query);

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              sites: {
                where: { isPublished: true },
              },
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const plainItems = products.map((product) => ({
      ...product,
      publishedSitesCount: product._count?.sites ?? 0,
    }));

    return fillDto<PaginationRdo<ProductRdo>>(PaginatedRdo(ProductRdo), {
      total,
      items: plainItems,
    });
  }

  async create(dto: CreateProductDto): Promise<ProductRdo> {
    let imagePath: string | null = null;

    if (dto.image) {
      imagePath = this.filesService.saveFile(dto.image);
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Категория ${dto.categoryId} не найдена`,
        );
      }
    }

    try {
      const product = await this.prisma.product.create({
        data: {
          name: dto.name,
          subtitle: dto.subtitle,
          standard: dto.standard,
          length: dto.length,
          weight: dto.weight,
          price: dto.price,
          priceUnit: dto.priceUnit,
          image: imagePath,
          categoryId: dto.categoryId ?? null,
          sites: dto.siteIds?.length
            ? {
                create: dto.siteIds.map((siteId) => ({
                  siteId,
                  isPublished: true,
                })),
              }
            : undefined,
        },
        include: {
          _count: {
            select: {
              sites: {
                where: { isPublished: true },
              },
            },
          },
        },
      });

      await this.logsService.create({
        type: LogType.success,
        message: `Создан товар: ${product.name}`,
      });

      return fillDto(ProductRdo, {
        ...product,
        publishedSitesCount: product._count?.sites ?? 0,
      });
    } catch (error) {
      await this.logsService.create({
        type: LogType.error,
        message: `Ошибка создания товара: ${dto.name}`,
      });

      if (imagePath) {
        this.filesService.deleteFile(imagePath);
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Товар с таким внешним ID уже существует');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductRdo> {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
      select: { image: true },
    });

    if (!existingProduct) {
      throw new NotFoundException('Товар не найден');
    }

    let imagePath = existingProduct.image;

    if (dto.image) {
      if (existingProduct.image) {
        this.filesService.deleteFile(existingProduct.image);
      }
      imagePath = this.filesService.saveFile(dto.image);
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Категория ${dto.categoryId} не найдена`,
        );
      }
    }

    const { siteIds, image, categoryId, ...productData } = dto;

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          ...productData,
          image: imagePath,
          categoryId:
            categoryId !== undefined ? (categoryId ?? null) : undefined,
        },
        include: {
          _count: {
            select: {
              sites: {
                where: { isPublished: true },
              },
            },
          },
        },
      });

      if (siteIds !== undefined) {
        await this.prisma.productSite.deleteMany({
          where: { productId: id },
        });

        if (siteIds.length > 0) {
          const existingSites = await this.prisma.site.findMany({
            where: {
              id: { in: siteIds },
            },
            select: { id: true },
          });

          const validSiteIds = new Set(existingSites.map((s) => s.id));
          const dataToCreate = siteIds
            .filter((siteId) => validSiteIds.has(siteId))
            .map((siteId) => ({
              productId: id,
              siteId,
              isPublished: true,
            }));

          if (dataToCreate.length > 0) {
            await this.prisma.productSite.createMany({
              data: dataToCreate,
            });
          }
        }
      }

      await this.logsService.create({
        type: LogType.info,
        message: `Обновлен товар: ${product.name}`,
      });

      return fillDto(ProductRdo, {
        ...product,
        publishedSitesCount: product._count?.sites ?? 0,
      });
    } catch (error) {
      await this.logsService.create({
        type: LogType.error,
        message: `Ошибка обновления товара (ID: ${id})`,
      });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025')
          throw new NotFoundException('Товар не найден');
        if (error.code === 'P2002')
          throw new ConflictException(
            'Товар с таким внешним ID уже существует',
          );
      }
      throw error;
    }
  }

  async publishToSite(dto: PublishToSiteDto): Promise<ProductRdo> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });
    if (!site) {
      throw new NotFoundException('Сайт не найден');
    }

    await this.prisma.productSite.upsert({
      where: {
        productId_siteId: {
          productId: dto.productId,
          siteId: dto.siteId,
        },
      },
      create: {
        productId: dto.productId,
        siteId: dto.siteId,
        isPublished: dto.isPublished,
      },
      update: {
        isPublished: dto.isPublished,
      },
    });

    const action = dto.isPublished ? 'опубликован на' : 'скрыт с';
    await this.logsService.create({
      type: LogType.info,
      message: `Товар "${product.name}" ${action} сайте ${site.domain}`,
    });

    const updatedProduct = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        _count: {
          select: {
            sites: {
              where: { isPublished: true },
            },
          },
        },
      },
    });

    return fillDto(ProductRdo, {
      ...updatedProduct,
      publishedSitesCount: updatedProduct!._count?.sites ?? 0,
    });
  }

  async remove(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { image: true, name: true },
    });

    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    if (product.image) {
      this.filesService.deleteFile(product.image);
    }

    try {
      await this.prisma.product.delete({ where: { id } });
      
      await this.logsService.create({
        type: LogType.warning,
        message: `Удален товар: ${product.name}`,
      });
    } catch (error) {
      await this.logsService.create({
        type: LogType.error,
        message: `Ошибка удаления товара (ID: ${id})`,
      });
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Товар не найден');
      }
      throw error;
    }
  }

  async fetchById(id: string): Promise<ProductRdo> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        sites: {
          where: { isPublished: true },
          select: {
            site: {
              select: {
                id: true,
                domain: true,
              },
            },
          },
        },
        _count: {
          select: {
            sites: {
              where: { isPublished: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    return fillDto(ProductRdo, {
      ...product,
      publishedSitesCount: product._count?.sites ?? 0,
      publishedSites: product.sites.map((ps) => ps.site),
    });
  }
}