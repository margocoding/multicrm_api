import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { LogsService } from '../logs/logs.service.js';
import { LogType, Prisma, ProductCondition } from '../../../generated/prisma/client.js';
import * as xml2js from 'xml2js';
import { fillDto } from '../../common/utils/fillDto.js';
import { ImportBatchRdo } from './rdo/import-batch.rdo.js';
import { CreateImportDto } from './dto/create-import.dto.js';
import { ProductsService } from '../products/products.service.js';

type NormalizedCategory = {
  id: string;
  parentId: string | null;
  name: string;
};

type NormalizedOffer = {
  id: string | null;
  name: string;
  price: string;
  currencyId: string;
  categoryId: string | null;
  picture?: string | null;
  description?: string | null;
  quantity?: number | null;
  unit?: string | null;
  condition?: string | null;
  characteristics: { title: string; value: string }[];
};

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
    private readonly productsService: ProductsService,
  ) {}

  private extractValue(val: any): string | null {
    if (val === undefined || val === null) return null;

    if (
      typeof val === 'string' ||
      typeof val === 'number' ||
      typeof val === 'boolean'
    ) {
      return val.toString().trim();
    }

    if (typeof val === 'object') {
      const v = val._ ?? val.value ?? val['#text'] ?? val.$;
      if (typeof v === 'string' || typeof v === 'number') {
        return v.toString().trim();
      }
    }

    return null;
  }

  private async parseXml(content: string): Promise<any> {
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
    });

    const result = await parser.parseStringPromise(content);

    if (!result?.yml_catalog?.shop) {
      throw new Error('Invalid XML structure: missing yml_catalog.shop');
    }

    return result.yml_catalog.shop;
  }

  private parseJson(content: string): any {
    const data = JSON.parse(content);

    if (!data?.shop) {
      throw new Error('Invalid JSON structure');
    }

    return {
      ...data.shop,
      categories: {
        category: Array.isArray(data.shop.categories) ? data.shop.categories : [],
      },
      offers: {
        offer: Array.isArray(data.shop.offers) ? data.shop.offers : [],
      },
    };
  }

  private normalizeId(categoryId: string | null) {
    return categoryId?.trim() ?? null;
  }

  private normalizeCategories(raw: any): NormalizedCategory[] {
    const list = Array.isArray(raw?.category) ? raw.category : raw?.category ? [raw.category] : [];

    const normalized = list
      .map((cat: any) => {
        const idRaw = this.extractValue(cat.id ?? cat.$?.id);
        const id = this.normalizeId(idRaw);
        const name = this.extractValue(cat.name ?? cat._ ?? cat.$?.name);

        let parentIdRaw = this.extractValue(cat.parentId ?? cat.$?.parentId);
        let parentId = this.normalizeId(parentIdRaw);
        if (parentId === '0') parentId = null;

        const resultCat = { id, parentId: parentId ?? null, name };
        return !id || !name ? null : resultCat;
      })
      .filter(Boolean) as NormalizedCategory[];

    return normalized;
  }

  private normalizeOffers(raw: any): NormalizedOffer[] {
    const list = Array.isArray(raw?.offer) ? raw.offer : raw?.offer ? [raw.offer] : [];

    const normalized = list
      .map((offer: any) => {
        const id = this.extractValue(offer.id ?? offer.$?.id);
        const name = this.extractValue(offer.name ?? offer.$?.name);
        const price = this.extractValue(offer.price ?? offer.$?.price);
        const categoryIdRaw = this.extractValue(offer.categoryId ?? offer.$?.categoryId);
        const categoryId = this.normalizeId(categoryIdRaw);

        if (!name || !price) return null;

        const characteristics: { title: string; value: string }[] = [];
        const params = Array.isArray(offer.param) ? offer.param : offer.param ? [offer.param] : [];
        
        for (const p of params) {
          const pName = this.extractValue(p.name ?? p.$?.name);
          const pValue = this.extractValue(p._ ?? p.value ?? p['#text'] ?? p);
          if (pName && pValue) {
            characteristics.push({ title: pName, value: pValue });
          }
        }

        return {
          id,
          name,
          price,
          currencyId: this.extractValue(offer.currencyId ?? offer.$?.currencyId) ?? 'RUB',
          categoryId,
          description: this.extractValue(offer.description ?? offer.$?.description),
          picture: this.extractValue(offer.picture ?? offer.$?.picture) ?? null,
          quantity: isNaN(parseInt(this.extractValue(offer.count ?? offer.$?.count) || '0', 10))
            ? null
            : parseInt(this.extractValue(offer.count ?? offer.$?.count) || '0', 10),
          unit: this.extractValue(offer.unit ?? offer.$?.unit) ?? null,
          condition: this.extractValue(offer.condition ?? offer.$?.condition)?.toUpperCase() ?? null,
          characteristics,
        };
      })
      .filter(Boolean) as NormalizedOffer[];

    return normalized;
  }

  private async syncCategories(
    categories: NormalizedCategory[],
    importBatchId: string,
  ) {
    const categoryMap = new Map<string, string>();

    for (const cat of categories) {
      let dbCategory = await this.prisma.category.findFirst({
        where: { name: cat.name },
      });

      if (dbCategory) {
        dbCategory = await this.prisma.category.update({
          where: { id: dbCategory.id },
          data: { importBatchId },
        });
      } else {
        dbCategory = await this.prisma.category.create({
          data: {
            name: cat.name,
            parentId: null,
            importBatchId,
          },
        });
      }

      categoryMap.set(cat.id, dbCategory.id);
    }

    for (const cat of categories) {
      if (!cat.parentId) continue;

      const parentDbId = categoryMap.get(cat.parentId);
      const childDbId = categoryMap.get(cat.id);

      if (parentDbId && childDbId) {
        await this.prisma.category.update({
          where: { id: childDbId },
          data: { parentId: parentDbId },
        });
      }
    }

    return { categoryMap };
  }

  private async importProducts(
    offers: NormalizedOffer[],
    categoryMap: Map<string, string>,
    importBatchId: string,
  ) {
    const productIds: string[] = [];

    const getCondition = (c: string | null | undefined): ProductCondition => {
      if (!c) return ProductCondition.NEW;
      return Object.values(ProductCondition).includes(c as ProductCondition) 
        ? (c as ProductCondition) 
        : ProductCondition.NEW;
    };

    for (const offer of offers) {
      const categoryDbId = offer.categoryId ? categoryMap.get(offer.categoryId) : null;

      const existingProduct = offer.id 
        ? await this.prisma.product.findUnique({ where: { externalId: offer.id } })
        : null;

      const slug = existingProduct 
        ? existingProduct.slug 
        : await this.productsService.generateUniqueSlug(offer.name);

      const data: Prisma.ProductUncheckedCreateInput = {
        externalId: offer.id || `no-id-${offer.name}-${Date.now()}`,
        name: offer.name,
        slug,
        price: offer.price,
        priceUnit: offer.currencyId,
        subtitle: offer.description?.slice(0, 255) ?? null,
        image: offer.picture ?? null,
        quantity: offer.quantity ?? 0,
        unit: offer.unit ?? 'единица',
        condition: getCondition(offer.condition),
        categoryId: categoryDbId ?? null,
        importBatchId,
      };

      const result = await this.prisma.product.upsert({
        where: { externalId: data.externalId as string },
        update: {
          name: data.name,
          price: data.price,
          priceUnit: data.priceUnit,
          subtitle: data.subtitle,
          image: data.image,
          quantity: data.quantity,
          unit: data.unit,
          condition: data.condition,
          categoryId: data.categoryId,
          importBatchId: data.importBatchId,
          characteristics: {
            deleteMany: {},
            create: offer.characteristics,
          },
        },
        create: {
          ...data,
          characteristics: {
            create: offer.characteristics,
          },
        },
      });

      productIds.push(result.id);
    }

    return productIds;
  }

  async create(dto: CreateImportDto): Promise<ImportBatchRdo> {
    if (!dto.targetSiteIds?.length) {
      throw new BadRequestException('No target sites selected');
    }

    const file = dto.file;
    const isXml = file.originalname.endsWith('.xml');

    const importBatch = await this.prisma.importBatch.create({
      data: {
        name: file.originalname,
        type: isXml ? 'xml' : 'json',
        status: 'processing',
        targetSiteIds: dto.targetSiteIds,
      },
    });

    this.processImport(importBatch.id, file, dto.targetSiteIds).catch((e) =>
      console.error('[IMPORT] Background process error:', e),
    );

    return fillDto(ImportBatchRdo, importBatch);
  }

  async processImport(
    importId: string,
    file: Express.Multer.File,
    targetSiteIds: string[],
  ) {
    try {
      const content = file.buffer.toString('utf-8');

      const shop = file.originalname.endsWith('.xml')
        ? await this.parseXml(content)
        : this.parseJson(content);

      const categories = this.normalizeCategories(shop.categories);
      const offers = this.normalizeOffers(shop.offers);

      const { categoryMap } = await this.syncCategories(categories, importId);
      const productIds = await this.importProducts(offers, categoryMap, importId);

      await this.publishToSites(productIds, targetSiteIds);

      await this.prisma.importBatch.update({
        where: { id: importId },
        data: {
          status: 'completed',
          productsCount: productIds.length,
        },
      });

      await this.logsService.create({
        type: LogType.success,
        message: `Import finished: ${productIds.length} products`,
      });
    } catch (e: any) {
      console.error('[IMPORT] ERROR:', e);

      await this.prisma.importBatch.update({
        where: { id: importId },
        data: { status: 'failed' },
      });

      await this.logsService.create({
        type: LogType.error,
        message: `Import error: ${e.message}`,
      });
    }
  }

  async analyze(file: Express.Multer.File): Promise<{
    productsCount: number;
    categories: string[];
  }> {
    const content = file.buffer.toString('utf-8');

    const shop = file.originalname.endsWith('.xml')
      ? await this.parseXml(content)
      : this.parseJson(content);

    const categories = this.normalizeCategories(shop.categories);
    const offers = this.normalizeOffers(shop.offers);

    return {
      productsCount: offers.length,
      categories: categories.map((c) => c.name).slice(0, 10),
    };
  }

  private async publishToSites(productIds: string[], siteIds: string[]) {
    const data = productIds.flatMap((productId) =>
      siteIds.map((siteId) => ({
        productId,
        siteId,
        isPublished: true,
      })),
    );

    for (const item of data) {
      await this.prisma.productSite.upsert({
        where: {
          productId_siteId: {
            productId: item.productId,
            siteId: item.siteId,
          },
        },
        create: item,
        update: { isPublished: true },
      });
    }
  }

  async findAll() {
    const imports = await this.prisma.importBatch.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return imports.map((i) => fillDto(ImportBatchRdo, i));
  }

  async remove(id: string) {
    const imp = await this.prisma.importBatch.findUnique({ where: { id } });

    if (!imp) throw new BadRequestException('Import not found');

    await this.prisma.importBatch.delete({ where: { id } });

    await this.logsService.create({
      type: LogType.warning,
      message: `Удален импорт и все связанные категории/продукты: ${imp.name}`,
    });
  }
}