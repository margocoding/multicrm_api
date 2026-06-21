// product.rdo.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

export class PublishedSiteRdo {
  @ApiProperty({
    description: 'ID сайта',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Домен сайта', example: 'example.com' })
  @Expose()
  domain: string;
}

export class ProductRdo {
  @ApiProperty({
    description: 'ID товара',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Название товара', example: 'Рельса' })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: 'Подзаголовок',
    example: 'Алюминиевый профиль',
  })
  @Expose()
  subtitle?: string;

  @ApiPropertyOptional({ description: 'Стандарт', example: 'VESA' })
  @Expose()
  standard?: string;

  @ApiPropertyOptional({ description: 'Длина', example: '1000 мм' })
  @Expose()
  length?: string;

  @ApiPropertyOptional({ description: 'Вес', example: '2.5 кг' })
  @Expose()
  weight?: string;

  @ApiProperty({ description: 'Цена', example: '1500' })
  @Expose()
  price: string;

  @ApiProperty({ description: 'Единица измерения цены', example: 'RUB' })
  @Expose()
  priceUnit: string;

  @ApiProperty({ description: 'Статус наличия', example: 'IN STOCK' })
  @Expose()
  status: 'IN STOCK' | 'OUT OF STOCK';

  @ApiProperty({
    description: 'URL изображения',
    example: 'https://example.com/image.jpg',
  })
  @Expose()
  image: string;

  @ApiProperty({ description: 'Тип продукта', example: 'rail' })
  @Expose()
  type: 'rail' | 'component';

  @ApiProperty({
    description: 'Количество сайтов, на которых опубликован',
    example: 3,
  })
  @Expose()
  publishedSitesCount: number;

  @ApiProperty({
    description: 'Дата создания',
    example: '2026-01-15T10:30:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiPropertyOptional({
    description:
      'Список опубликованных сайтов (заполняется только в fetchById)',
    type: [PublishedSiteRdo],
  })
  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublishedSiteRdo)
  publishedSites?: PublishedSiteRdo[];

  @ApiProperty()
  @Expose()
  quantity: number;

  @ApiPropertyOptional({ description: 'ID категории' })
  @Expose()
  categoryId?: string | null;
}
