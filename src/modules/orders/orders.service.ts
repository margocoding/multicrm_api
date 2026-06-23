import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { OrderRdo } from './rdo/order.rdo.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { fillDto } from '../../common/utils/fillDto.js';
import { LogsService } from '../logs/logs.service.js';
import { LogType } from '../../../generated/prisma/client.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  async create(dto: CreateOrderDto): Promise<OrderRdo> {
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missing = productIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Товары не найдены: ${missing.join(', ')}`);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalPrice = 0;
    const preparedItems: {
      productId: string;
      quantity: number;
      price: number;
      name: string;
    }[] = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;

      if (product.quantity < item.quantity) {
        throw new BadRequestException(
          `Недостаточно товара "${product.name}" на складе. Доступно: ${product.quantity}, запрошено: ${item.quantity}`,
        );
      }

      const price = parseFloat(product.price);
      if (isNaN(price)) {
        throw new BadRequestException(
          `Некорректная цена у товара "${product.name}"`,
        );
      }

      totalPrice += price * item.quantity;
      preparedItems.push({
        productId: product.id,
        quantity: item.quantity,
        price,
        name: product.name,
      });
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          email: dto.email,
          comment: dto.comment ?? null,
          status: 'NEW',
          totalPrice: totalPrice.toFixed(2),
          currency: 'RUB',
          items: {
            create: preparedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price.toFixed(2),
              name: item.name,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      for (const item of preparedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      return created;
    });

    await this.logsService.create({
      type: LogType.success,
      message: `Создан новый заказ #${order.id.slice(0, 8)} от ${order.email} на сумму ${order.totalPrice} ${order.currency}`,
    });

    return fillDto(OrderRdo, order);
  }

  async findAll(): Promise<OrderRdo[]> {
    const orders = await this.prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => fillDto(OrderRdo, order));
  }

  async findOne(id: string): Promise<OrderRdo> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                image: true,
                subtitle: true,
                standard: true,
                length: true,
                weight: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Заказ ${id} не найден`);
    }

    const mappedItems = order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      subtitle: item.product?.subtitle ?? null,
      standard: item.product?.standard ?? null,
      length: item.product?.length ?? null,
      weight: item.product?.weight ?? null,
      image: item.product?.image ?? null,
      quantity: item.quantity,
      price: item.price,
    }));

    return fillDto(OrderRdo, {
      ...order,
      items: mappedItems,
    });
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<OrderRdo> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Заказ ${id} не найден`);
    }

    if (order.status === dto.status) {
      return fillDto(OrderRdo, order);
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException(
        'Нельзя изменить статус отменённого заказа',
      );
    }

    if (dto.status === 'CANCELLED') {
      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.order.update({
          where: { id },
          data: { status: 'CANCELLED' },
          include: { items: true },
        });

        // АРХИТЕКТУРНОЕ РЕШЕНИЕ: 
        // Возвращаем остатки на склад ТОЛЬКО для тех товаров, которые еще существуют в БД.
        // Если товар был удален (например, вместе с импортом), item.productId будет null,
        // и возвращать его на склад бессмысленно, так как самого товара больше нет.
        const validItems = order.items.filter((item) => item.productId !== null);

        for (const item of validItems) {
          await tx.product.update({
            where: { id: item.productId as string },
            data: { quantity: { increment: item.quantity } },
          });
        }

        return result;
      });

      await this.logsService.create({
        type: LogType.warning,
        message: `Заказ #${id.slice(0, 8)} отменен. Остатки возвращены для существующих товаров.`,
      });

      return fillDto(OrderRdo, updated);
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: { items: true },
    });

    await this.logsService.create({
      type: LogType.info,
      message: `Статус заказа #${id.slice(0, 8)} изменен на ${dto.status}`,
    });

    return fillDto(OrderRdo, updated);
  }

  async remove(id: string): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Заказ ${id} не найден`);
    }

    if (order.status !== 'CANCELLED') {
      const full = await this.prisma.order.findUnique({
        where: { id },
        include: { items: true },
      });

      await this.prisma.$transaction(async (tx) => {
        // АРХИТЕКТУРНОЕ РЕШЕНИЕ:
        // При удалении заказа возвращаем остатки только для физически существующих товаров.
        // Позиции с productId === null (удаленные товары) игнорируются.
        const validItems = full!.items.filter((item) => item.productId !== null);

        for (const item of validItems) {
          await tx.product.update({
            where: { id: item.productId as string },
            data: { quantity: { increment: item.quantity } },
          });
        }
        await tx.order.delete({ where: { id } });
      });
      
      await this.logsService.create({
        type: LogType.warning,
        message: `Заказ #${id.slice(0, 8)} удален. Остатки возвращены для существующих товаров.`,
      });
    } else {
      await this.prisma.order.delete({ where: { id } });
      
      await this.logsService.create({
        type: LogType.warning,
        message: `Заказ #${id.slice(0, 8)} удален.`,
      });
    }
  }
}