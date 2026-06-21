import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

export class OrderItemRdo {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  productId: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  subtitle?: string | null;

  @ApiPropertyOptional()
  @Expose()
  standard?: string | null;

  @ApiPropertyOptional()
  @Expose()
  length?: string | null;

  @ApiPropertyOptional()
  @Expose()
  weight?: string | null;

  @ApiPropertyOptional()
  @Expose()
  image?: string | null;

  @ApiProperty()
  @Expose()
  quantity: number;

  @ApiProperty()
  @Expose()
  price: string;
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