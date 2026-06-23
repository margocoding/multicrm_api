import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { OrderRdo } from './rdo/order.rdo.js';
import { OrdersService } from './orders.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js'; 
import { Public } from '../auth/decorators/public.decorator.js'; 

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard) 
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Создать заказ' })
  @ApiResponse({ status: 201, type: OrderRdo })
  @ApiBadRequestResponse({ description: 'Недостаточно товара на складе' })
  @ApiNotFoundResponse({ description: 'Товар не найден' })
  create(@Body() dto: CreateOrderDto): Promise<OrderRdo> {
    return this.ordersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все заказы' })
  @ApiResponse({ status: 200, type: [OrderRdo] })
  findAll(): Promise<OrderRdo[]> {
    return this.ordersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить заказ по ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: OrderRdo })
  @ApiNotFoundResponse({ description: 'Заказ не найден' })
  findOne(@Param('id') id: string): Promise<OrderRdo> {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Изменить статус заказа' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: OrderRdo })
  @ApiNotFoundResponse({ description: 'Заказ не найден' })
  @ApiBadRequestResponse({ description: 'Нельзя изменить статус отменённого заказа' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderRdo> {
    return this.ordersService.updateStatus(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить заказ' })
  @ApiParam({ name: 'id', type: String })
  @ApiNoContentResponse({ description: 'Заказ удалён' })
  @ApiNotFoundResponse({ description: 'Заказ не найден' })
  remove(@Param('id') id: string): Promise<void> {
    return this.ordersService.remove(id);
  }
}