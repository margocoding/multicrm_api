import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CreateImportDto } from './dto/create-import.dto.js';
import { fillDto } from '../../common/utils/fillDto.js';
import { LogsService } from '../logs/logs.service.js';
import { LogType, Prisma } from '../../../generated/prisma/client.js';
import * as xml2js from 'xml2js';
import { ImportBatchRdo } from './rdo/import-batch.rdo.js';

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  async findAll(): Promise<ImportBatchRdo[]> {
    const imports = await this.prisma.importBatch.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return imports.map((imp) => fillDto(ImportBatchRdo, imp));
  }

  async analyze(file: Express.Multer.File): Promise<{
    productsCount: number;
    categories: string[];
  }> {
    const isXml = file.originalname.endsWith('.xml');
    const isJson = file.originalname.endsWith('.json');

    if (!isXml && !isJson) {
      throw new BadRequestException('Поддерживаются только XML и JSON файлы');
    }

    try {
      const content = file.buffer.toString('utf-8');
      let parsedData: any;

      if (isXml) {
        parsedData = await this.parseXml(content);
      } else {
        parsedData = this.parseJson(content);
      }

      const { categories, offers } = this.extractData(parsedData);
      
      if (categories.length === 0) {
        throw new BadRequestException('В файле отсутствуют категории');
      }
      
      if (offers.length === 0) {
        throw new BadRequestException('В файле отсутствуют товары');
      }

      const productsCount = offers.filter((offer: any) => offer.name && offer.price).length;

      const categoryNames = categories
        .map((cat: any) => cat.value || cat.name || cat._)
        .filter(Boolean)
        .slice(0, 10);

      return {
        productsCount,
        categories: categoryNames,
      };
    } catch (error: any) {
      throw new BadRequestException(`Ошибка анализа файла: ${error.message}`);
    }
  }

  async create(dto: CreateImportDto): Promise<ImportBatchRdo> {
    let targetSiteIds: string[];
    try {
      targetSiteIds = JSON.parse(dto.targetSiteIds);
    } catch {
      throw new BadRequestException('Некорректный формат targetSiteIds');
    }

    if (!targetSiteIds || targetSiteIds.length === 0) {
      throw new BadRequestException('Не выбраны сайты для импорта');
    }

    const file = dto.file;
    const isXml = file.originalname.endsWith('.xml');
    const isJson = file.originalname.endsWith('.json');

    if (!isXml && !isJson) {
      throw new BadRequestException('Поддерживаются только XML и JSON файлы');
    }

    const importBatch = await this.prisma.importBatch.create({
      data: {
        name: `${file.originalname} - ${new Date().toLocaleDateString('ru-RU')}`,
        type: isXml ? 'xml' : 'json',
        status: 'processing',
        targetSiteIds,
      },
    });

    await this.logsService.create({
      type: LogType.info,
      message: `Начат импорт "${importBatch.name}"`,
    });

    this.processImport(importBatch.id, file, targetSiteIds).catch((error) => {
      console.error('Import processing error:', error);
    });

    return fillDto(ImportBatchRdo, importBatch);
  }

  private async processImport(
    importId: string,
    file: Express.Multer.File,
    targetSiteIds: string[],
  ): Promise<void> {
    try {
      const content = file.buffer.toString('utf-8');
      let parsedData: any;

      if (file.originalname.endsWith('.xml')) {
        parsedData = await this.parseXml(content);
      } else {
        parsedData = this.parseJson(content);
      }

      const { categories, offers } = this.extractData(parsedData);
      
      if (categories.length === 0) {
        throw new Error('В файле отсутствуют категории');
      }
      
      if (offers.length === 0) {
        throw new Error('В файле отсутствуют товары');
      }

      // Маппинг категорий: feedId -> dbId
      const { categoryMap, createdCount, existingCount, skippedCount } = await this.syncCategories(categories);
      
      // Импорт товаров
      let productsCount = 0;
      let productsWithoutCategory = 0;
      const productIds: string[] = [];

      for (const offer of offers) {
        const result = await this.createOrUpdateProduct(offer, categoryMap);
        if (result.productId) {
          productIds.push(result.productId);
          productsCount++;
          if (result.missingCategory) {
            productsWithoutCategory++;
          }
        }
      }

      // Публикация на сайты
      if (productIds.length > 0 && targetSiteIds.length > 0) {
        await this.publishToSites(productIds, targetSiteIds);
      }

      await this.prisma.importBatch.update({
        where: { id: importId },
        data: {
          status: 'completed',
          productsCount,
        },
      });

      const message = `Импорт завершен: ${productsCount} товаров, ${createdCount} новых категорий, ${existingCount} существующих${skippedCount > 0 ? `, ${skippedCount} пропущено` : ''}${productsWithoutCategory > 0 ? `, ${productsWithoutCategory} товаров без категории` : ''}`;
      
      await this.logsService.create({
        type: LogType.success,
        message,
      });
    } catch (error: any) {
      await this.prisma.importBatch.update({
        where: { id: importId },
        data: { status: 'failed' },
      });

      await this.logsService.create({
        type: LogType.error,
        message: `Ошибка импорта: ${error.message}`,
      });
    }
  }

  private async parseXml(content: string): Promise<any> {
    const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
    const result = await parser.parseStringPromise(content);
    
    if (!result.yml_catalog || !result.yml_catalog.shop) {
      throw new Error('Некорректная структура XML: отсутствует yml_catalog.shop');
    }
    
    return result.yml_catalog.shop;
  }

  private parseJson(content: string): any {
    const data = JSON.parse(content);
    
    if (!data.shop || !data.shop.categories || !data.shop.offers) {
      throw new Error('Некорректная структура JSON: отсутствует shop.categories или shop.offers');
    }
    
    return data.shop;
  }

  private extractData(shop: any): { categories: any[]; offers: any[] } {
    // Используем nullish coalescing для обработки null и undefined
    let categories = shop.categories?.category ?? shop.categories ?? [];
    let offers = shop.offers?.offer ?? shop.offers ?? [];

    if (!Array.isArray(categories)) categories = [categories];
    if (!Array.isArray(offers)) offers = [offers];

    return { categories, offers };
  }

  private async syncCategories(categories: any[]): Promise<{
    categoryMap: Map<string, string>;
    createdCount: number;
    existingCount: number;
    skippedCount: number;
  }> {
    const categoryMap = new Map<string, string>();
    let createdCount = 0;
    let existingCount = 0;
    let skippedCount = 0;
    
    // Топологическая сортировка
    const processed = new Set<string>();
    const remaining = [...categories];
    
    while (remaining.length > 0) {
      const initialLength = remaining.length;
      
      for (let i = remaining.length - 1; i >= 0; i--) {
        const cat = remaining[i];
        const feedId = cat.id;
        
        // Проверяем, что feedId существует
        if (!feedId) {
          console.warn('Категория без ID пропущена:', cat);
          skippedCount++;
          remaining.splice(i, 1);
          continue;
        }
        
        // Обрабатываем пустые строки в parentId
        const feedParentId = (cat.parentId || cat.parentid || '').toString().trim() || null;
        
        // Если у категории нет родителя или родитель уже обработан
        if (!feedParentId || processed.has(feedParentId)) {
          const name = cat.value || cat.name || cat._;
          
          if (!name || !name.toString().trim()) {
            console.warn('Категория без имени пропущена:', cat);
            skippedCount++;
            remaining.splice(i, 1);
            continue;
          }
          
          let parentDbId: string | null = null;
          if (feedParentId && categoryMap.has(feedParentId)) {
            parentDbId = categoryMap.get(feedParentId)!;
          } else if (feedParentId) {
            // Родитель не найден в categoryMap, пропускаем эту категорию
            console.warn(`Родитель ${feedParentId} не найден для категории ${feedId}`);
            continue;
          }
          
          try {
            const existing = await this.prisma.category.findFirst({
              where: { name, parentId: parentDbId },
            });
            
            if (existing) {
              categoryMap.set(feedId, existing.id);
              existingCount++;
            } else {
              const created = await this.prisma.category.create({
                data: { name, parentId: parentDbId },
              });
              categoryMap.set(feedId, created.id);
              createdCount++;
            }
            
            processed.add(feedId);
            remaining.splice(i, 1);
          } catch (error: any) {
            console.error(`Ошибка создания категории ${feedId}:`, error.message);
            skippedCount++;
            remaining.splice(i, 1);
          }
        }
      }
      
      // Если за итерацию ничего не обработали, пропускаем оставшиеся
      if (remaining.length === initialLength && remaining.length > 0) {
        console.warn(`${remaining.length} категорий не удалось обработать (возможны циклические зависимости или отсутствующие родители)`);
        skippedCount += remaining.length;
        remaining.length = 0;
      }
    }
    
    return { categoryMap, createdCount, existingCount, skippedCount };
  }

  private async createOrUpdateProduct(
    offer: any,
    categoryMap: Map<string, string>,
  ): Promise<{ productId: string | null; missingCategory: boolean }> {
    const externalId = offer.id;
    const name = offer.name;
    const price = offer.price;
    const currencyId = offer.currencyId || offer.currencyid || 'RUB';
    const description = offer.description;
    const picture = offer.picture;
    
    // Обрабатываем пустые строки в categoryId
    const feedCategoryId = (offer.categoryId || offer.categoryid || '').toString().trim() || null;
    
    if (!name || !price) {
      return { productId: null, missingCategory: false };
    }

    const data: Record<string, any> = {
      name,
      subtitle: description?.substring(0, 255) || null,
      price: String(price),
      priceUnit: currencyId,
      image: null,
    };

    if (picture) {
      const pic = Array.isArray(picture) ? picture[0] : picture;
      const picStr = typeof pic === 'string' ? pic : (pic?._ || pic?.value || '');
      if (typeof picStr === 'string' && picStr.startsWith('http')) {
        data.image = picStr;
      }
    }

    let missingCategory = false;
    if (feedCategoryId) {
      if (categoryMap.has(feedCategoryId)) {
        data.categoryId = categoryMap.get(feedCategoryId);
      } else {
        console.warn(`Категория ${feedCategoryId} не найдена для товара ${externalId}`);
        missingCategory = true;
      }
    }

    if (offer.weight) data.weight = String(offer.weight);
    if (offer.length) data.length = String(offer.length);
    if (offer.standard) data.standard = String(offer.standard);

    try {
      const existing = await this.prisma.product.findUnique({
        where: { externalId },
      });

      if (existing) {
        const updated = await this.prisma.product.update({
          where: { externalId },
          data: data as Prisma.ProductUncheckedUpdateInput, 
        });
        return { productId: updated.id, missingCategory };
      } else {
        const created = await this.prisma.product.create({
          data: {
            ...data,
            externalId,
          } as Prisma.ProductUncheckedCreateInput,
        });
        return { productId: created.id, missingCategory };
      }
    } catch (error: any) {
      console.error(`Error processing product ${externalId}:`, error.message || error);
      return { productId: null, missingCategory: false };
    }
  }

  private async publishToSites(productIds: string[], siteIds: string[]): Promise<void> {
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

  async remove(id: string): Promise<void> {
    const imp = await this.prisma.importBatch.findUnique({ where: { id } });
    if (!imp) {
      throw new BadRequestException('Импорт не найден');
    }
    
    await this.prisma.importBatch.delete({ where: { id } });
    
    await this.logsService.create({
      type: LogType.warning,
      message: `Удален импорт: ${imp.name}`,
    });
  }
}