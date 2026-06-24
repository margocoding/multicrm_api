import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { ProductCondition } from '../../../../generated/prisma/enums';

export class OrderItemCharacteristicRdo {
  @ApiProperty({ description: 'Название характеристики', example: 'Вес' })
  @Expose()
  title: string;

  @ApiProperty({ description: 'Значение характеристики', example: '2.5 кг' })
  @Expose()
  value: string;
}

export class OrderItemRdo {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiPropertyOptional()
  @Expose()
  productId?: string | null;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  subtitle?: string | null;

  @ApiPropertyOptional({ description: 'Slug товара на момент заказа' })
  @Expose()
  slug?: string | null;

  @ApiPropertyOptional()
  @Expose()
  image?: string | null;

  @ApiProperty()
  @Expose()
  quantity: number;

  @ApiProperty()
  @Expose()
  price: string;

  @ApiProperty({ description: 'Единица измерения товара', example: 'шт' })
  @Expose()
  unit: string;

  @ApiProperty({ enum: ProductCondition })
  @Expose()
  condition: ProductCondition;

  @ApiProperty({ type: [OrderItemCharacteristicRdo] })
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemCharacteristicRdo)
  characteristics: OrderItemCharacteristicRdo[];
}

export class OrderRdo {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiPropertyOptional()
  @Expose()
  comment?: string | null;

  @ApiProperty({ enum: ['NEW', 'PROCESSED', 'CANCELLED'] })
  @Expose()
  status: 'NEW' | 'PROCESSED' | 'CANCELLED';

  @ApiProperty()
  @Expose()
  totalPrice: string;

  @ApiProperty()
  @Expose()
  currency: string;

  @ApiProperty({ type: [OrderItemRdo] })
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemRdo)
  items: OrderItemRdo[];

  @ApiProperty()
  @Expose()
  createdAt: Date;
}