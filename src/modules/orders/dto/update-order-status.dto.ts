import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '../../../../generated/prisma/enums';

export class UpdateOrderStatusDto {
  @ApiProperty({ description: 'Новый статус', enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}