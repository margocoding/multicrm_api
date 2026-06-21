import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CategoryRdo } from './rdo/category.rdo.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { fillDto } from '../../common/utils/fillDto.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { LogsService } from '../logs/logs.service.js';
import { LogType } from '../../../generated/prisma/client.js';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  async create(dto: CreateCategoryDto): Promise<CategoryRdo> {
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Родительская категория ${dto.parentId} не найдена`,
        );
      }
    }

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        parentId: dto.parentId ?? null,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    await this.logsService.create({
      type: LogType.success,
      message: `Создана категория: ${category.name}`,
    });

    return fillDto(CategoryRdo, {
      ...category,
      productsCount: category._count.products,
    });
  }

  async findAll(): Promise<CategoryRdo[]> {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        _count: {
          select: { products: true },
        },
        children: {
          include: {
            _count: {
              select: { products: true },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) =>
      fillDto(CategoryRdo, {
        ...cat,
        productsCount: cat._count.products,
        children: cat.children.map((child) => ({
          id: child.id,
          name: child.name,
          productsCount: child._count.products,
        })),
      }),
    );
  }

  async findByDomain(domain: string): Promise<CategoryRdo[]> {
    const site = await this.prisma.site.findUnique({
      where: { domain },
    });

    if (!site) {
      throw new NotFoundException(`Сайт с доменом ${domain} не найден`);
    }

    // 1. Загружаем ВСЕ категории и считаем количество товаров для каждой.
    // Это гарантирует, что мы не потеряем пустые корневые категории,
    // у которых товары есть только у детей.
    const allCategories = await this.prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: {
              where: {
                sites: {
                  some: {
                    siteId: site.id,
                    isPublished: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Вспомогательный интерфейс для построения дерева
    interface CategoryNode {
      id: string;
      name: string;
      parentId: string | null;
      productsCount: number;
      totalProducts: number; // Свои товары + товары всех потомков
      children: CategoryNode[];
    }

    const map = new Map<string, CategoryNode>();

    // 2. Инициализируем узлы дерева
    allCategories.forEach((cat) => {
      map.set(cat.id, {
        id: cat.id,
        name: cat.name,
        parentId: cat.parentId,
        productsCount: cat._count.products,
        totalProducts: cat._count.products,
        children: [],
      });
    });

    // 3. Связываем детей с родителями
    allCategories.forEach((cat) => {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        const parent = map.get(cat.parentId)!;
        parent.children.push(node);
      }
    });

    // 4. Собираем корневые узлы (у которых нет parentId или родитель отсутствует)
    const roots: CategoryNode[] = [];
    allCategories.forEach((cat) => {
      if (!cat.parentId || !map.has(cat.parentId)) {
        roots.push(map.get(cat.id)!);
      }
    });

    // 5. Рекурсивно вычисляем totalProducts снизу вверх
    const calculateTotals = (nodes: CategoryNode[]) => {
      nodes.forEach((node) => {
        calculateTotals(node.children); // Сначала считаем для детей
        const childrenTotal = node.children.reduce(
          (sum, child) => sum + child.totalProducts,
          0,
        );
        node.totalProducts += childrenTotal; // Добавляем товары детей к своим
      });
    };

    calculateTotals(roots);

    // 6. Фильтруем пустые ветки и формируем DTO рекурсивно
    const filterAndMap = (nodes: CategoryNode[]): CategoryRdo[] => {
      return nodes
        .filter((node) => node.totalProducts > 0) // Оставляем только ветки, где есть товары
        .map((node) => {
          return fillDto(CategoryRdo, {
            id: node.id,
            name: node.name,
            parentId: node.parentId,
            productsCount: node.productsCount,
            children: filterAndMap(node.children), // Рекурсия для любого уровня вложенности
          });
        });
    };

    return filterAndMap(roots);
  }

  async findOne(id: string): Promise<CategoryRdo> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
        children: {
          include: {
            _count: {
              select: { products: true },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Категория ${id} не найдена`);
    }

    return fillDto(CategoryRdo, {
      ...category,
      productsCount: category._count.products,
      children: category.children.map((child) => ({
        id: child.id,
        name: child.name,
        productsCount: child._count.products,
      })),
    });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryRdo> {
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Категория ${id} не найдена`);
    }

    if (dto.parentId === id) {
      throw new NotFoundException(
        'Категория не может быть родителем самой себя',
      );
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Родительская категория ${dto.parentId} не найдена`,
        );
      }
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        parentId:
          dto.parentId !== undefined ? (dto.parentId ?? null) : undefined,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    await this.logsService.create({
      type: LogType.info,
      message: `Обновлена категория: ${category.name}`,
    });

    return fillDto(CategoryRdo, {
      ...category,
      productsCount: category._count.products,
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Категория ${id} не найдена`);
    }

    if (existing._count.children > 0) {
      throw new NotFoundException(
        'Нельзя удалить категорию с дочерними категориями. Сначала удалите или перенесите их.',
      );
    }

    try {
      await this.prisma.category.delete({ where: { id } });

      await this.logsService.create({
        type: LogType.warning,
        message: `Удалена категория: ${existing.name}`,
      });
    } catch (error) {
      await this.logsService.create({
        type: LogType.error,
        message: `Ошибка удаления категории: ${existing.name}`,
      });
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Категория ${id} не найдена`);
      }
      throw error;
    }
  }
}
