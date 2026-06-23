import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { LogsService } from '../logs/logs.service.js';
import { LogType, Prisma } from '../../../generated/prisma/client.js';
import * as xml2js from 'xml2js';
import { fillDto } from '../../common/utils/fillDto.js';
import { ImportBatchRdo } from './rdo/import-batch.rdo.js';
import { CreateImportDto } from './dto/create-import.dto.js';

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
};

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  // ----------------------------
  // Utils
  // ----------------------------

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

  // ----------------------------
  // Parse
  // ----------------------------

  private async parseXml(content: string): Promise<any> {
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
    });

    const result = await parser.parseStringPromise(content);
    console.log('[IMPORT] Parsed XML root keys:', Object.keys(result || {}));
    console.log(
      '[IMPORT] yml_catalog keys:',
      Object.keys(result?.yml_catalog || {}),
    );

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
        category: Array.isArray(data.shop.categories)
          ? data.shop.categories
          : [],
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
    const list = Array.isArray(raw?.category)
      ? raw.category
      : raw?.category
        ? [raw.category]
        : [];

    console.log(`[IMPORT] Raw categories found: ${list.length}`);

    const normalized = list
      .map((cat: any) => {
        const idRaw = this.extractValue(cat.id ?? cat.$?.id);
        const id = this.normalizeId(idRaw);
        const name = this.extractValue(cat.name ?? cat._ ?? cat.$?.name);

        let parentIdRaw = this.extractValue(cat.parentId ?? cat.$?.parentId);
        let parentId = this.normalizeId(parentIdRaw);
        if (parentId === '0') parentId = null;

        const resultCat = { id, parentId: parentId ?? null, name };

        console.log(`[IMPORT] Normalized category →`, resultCat);
        return !id || !name ? null : resultCat;
      })
      .filter(Boolean) as NormalizedCategory[];

    console.log(`[IMPORT] Final normalized categories:`, normalized);
    return normalized;
  }

  private normalizeOffers(raw: any): NormalizedOffer[] {
    const list = Array.isArray(raw?.offer)
      ? raw.offer
      : raw?.offer
        ? [raw.offer]
        : [];

    console.log(`[IMPORT] Raw offers found: ${list.length}`);

    const normalized = list
      .map((offer: any) => {
        const id = this.extractValue(offer.id ?? offer.$?.id);
        const name = this.extractValue(offer.name ?? offer.$?.name);
        const price = this.extractValue(offer.price ?? offer.$?.price);
        const categoryIdRaw = this.extractValue(
          offer.categoryId ?? offer.$?.categoryId,
        );
        const categoryId = this.normalizeId(categoryIdRaw);

        console.log(
          `[IMPORT] Offer "${name}" → categoryId raw="${categoryIdRaw}" → normalized="${categoryId}"`,
        );

        if (!name || !price) return null;

        return {
          id,
          name,
          price,
          currencyId:
            this.extractValue(offer.currencyId ?? offer.$?.currencyId) ?? 'RUB',
          categoryId,
          description: this.extractValue(
            offer.description ?? offer.$?.description,
          ),
          picture: this.extractValue(offer.picture ?? offer.$?.picture) ?? null,
          quantity: isNaN(
            parseInt(
              this.extractValue(offer.count ?? offer.$?.count) || '0',
              10,
            ),
          )
            ? null
            : parseInt(
                this.extractValue(offer.count ?? offer.$?.count) || '0',
                10,
              ),
        };
      })
      .filter(Boolean) as NormalizedOffer[];

    console.log(
      '[IMPORT] Final normalized offers:',
      normalized.map((o) => ({ name: o.name, categoryId: o.categoryId })),
    );
    return normalized;
  }

  // ----------------------------
  // CATEGORY SYNC (Обновлено)
  // ----------------------------

  private async syncCategories(
    categories: NormalizedCategory[],
    importBatchId: string,
  ) {
    const categoryMap = new Map<string, string>();
    let createdCount = 0;
    let existingCount = 0;

    console.log('[IMPORT] === STARTING CATEGORY SYNC ===', categories.length);

    for (const cat of categories) {
      let dbCategory = await this.prisma.category.findFirst({
        where: { name: cat.name },
      });

      if (dbCategory) {
        // Категория уже существует. Обновляем importBatchId,
        // чтобы она принадлежала текущему импорту и удалилась вместе с ним.
        dbCategory = await this.prisma.category.update({
          where: { id: dbCategory.id },
          data: { importBatchId },
        });
        existingCount++;
      } else {
        dbCategory = await this.prisma.category.create({
          data: {
            name: cat.name,
            parentId: null,
            importBatchId,
          },
        });
        createdCount++;
      }

      categoryMap.set(cat.id, dbCategory.id);

      console.log(
        `[IMPORT] Category "${cat.name}" (xmlId=${cat.id}) → dbId=${dbCategory.id} (UPDATED/CREATED)`,
      );
    }

    // Проставляем parentId
    for (const cat of categories) {
      if (!cat.parentId) continue;

      const parentDbId = categoryMap.get(cat.parentId);
      const childDbId = categoryMap.get(cat.id);

      if (parentDbId && childDbId) {
        await this.prisma.category.update({
          where: { id: childDbId },
          data: { parentId: parentDbId },
        });
        console.log(
          `[IMPORT] Set parent for "${cat.name}": ${parentDbId} → ${childDbId}`,
        );
      } else {
        console.log(`[IMPORT] WARNING: Could not set parent for ${cat.name}`);
      }
    }

    console.log('[IMPORT] Final categoryMap:', Object.fromEntries(categoryMap));
    return { categoryMap, createdCount, existingCount };
  }

  // ----------------------------
  // PRODUCT IMPORT
  // ----------------------------

  private async importProducts(
    offers: NormalizedOffer[],
    categoryMap: Map<string, string>,
    importBatchId: string,
  ) {
    const productIds: string[] = [];

    console.log('[IMPORT] === STARTING PRODUCT IMPORT ===', offers.length);

    for (const offer of offers) {
      const categoryDbId = offer.categoryId
        ? categoryMap.get(offer.categoryId)
        : null;

      console.log(
        `[IMPORT] Product "${offer.name}" → xmlCatId=${offer.categoryId} → dbCatId=${categoryDbId || 'NULL'}`,
      );

      const data: Prisma.ProductUncheckedCreateInput = {
        externalId: offer.id || `no-id-${offer.name}`,
        name: offer.name,
        price: offer.price,
        priceUnit: offer.currencyId,
        subtitle: offer.description?.slice(0, 255) ?? null,
        image: offer.picture ?? null,
        quantity: offer.quantity ?? 0,
        categoryId: categoryDbId ?? null,
        importBatchId,
      };

      const result = await this.prisma.product.upsert({
        where: { externalId: data.externalId as string },
        update: data,
        create: data,
      });

      productIds.push(result.id);

      console.log(
        `[IMPORT] Upserted product "${offer.name}" (id=${result.id}, categoryId=${result.categoryId})`,
      );
    }

    return productIds;
  }

  // ----------------------------
  // MAIN FLOW
  // ----------------------------

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
      console.log(
        `[IMPORT] === START PROCESSING FILE: ${file.originalname} ===`,
      );

      const content = file.buffer.toString('utf-8');

      const shop = file.originalname.endsWith('.xml')
        ? await this.parseXml(content)
        : this.parseJson(content);

      const categories = this.normalizeCategories(shop.categories);
      const offers = this.normalizeOffers(shop.offers);

      const { categoryMap } = await this.syncCategories(categories, importId);

      // Передаем importId для сохранения связи с продуктами
      const productIds = await this.importProducts(
        offers,
        categoryMap,
        importId,
      );

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

      console.log(`[IMPORT] === IMPORT COMPLETED SUCCESSFULLY ===`);
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

  // ----------------------------
  // ANALYZE
  // ----------------------------

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

  // ----------------------------
  // PUBLISH
  // ----------------------------

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

  // ----------------------------
  // API
  // ----------------------------

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
