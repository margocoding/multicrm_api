import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { ProductCondition } from '../../../../generated/prisma/enums';

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

export class CharacteristicRdo {
  @ApiProperty({ description: 'ID характеристики', example: 'uuid-123' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Название характеристики', example: 'Вес' })
  @Expose()
  title: string;

  @ApiProperty({ description: 'Значение характеристики', example: '2.5 кг' })
  @Expose()
  value: string;
}

export class ProductRdo {
  @ApiProperty({
    description: 'ID товара',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Slug (ЧПУ) товара', example: 'relysa-alyuminievaya' })
  @Expose()
  slug: string;

  @ApiProperty({ description: 'Название товара', example: 'Рельса' })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: 'Подзаголовок',
    example: 'Алюминиевый профиль',
  })
  @Expose()
  subtitle?: string;

  @ApiProperty({ description: 'Цена', example: '1500' })
  @Expose()
  price: string;

  @ApiProperty({ description: 'Валюта цены', example: 'RUB' })
  @Expose()
  priceUnit: string;

  @ApiProperty({
    description: 'URL изображения',
    example: 'https://example.com/image.jpg',
  })
  @Expose()
  image: string | null;

  @ApiProperty({ description: 'Количество на складе', example: 100 })
  @Expose()
  quantity: number;

  @ApiProperty({ description: 'Единица измерения товара', example: 'шт' })
  @Expose()
  unit: string;

  @ApiProperty({ 
    description: 'Состояние товара', 
    enum: ProductCondition,
    example: ProductCondition.NEW 
  })
  @Expose()
  condition: ProductCondition;

  @ApiPropertyOptional({ description: 'ID категории' })
  @Expose()
  categoryId?: string | null;

  @ApiProperty({ description: 'Характеристики товара', type: [CharacteristicRdo] })
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacteristicRdo)
  characteristics: CharacteristicRdo[];

  @ApiProperty({
    description: 'Количество сайтов, на которых опубликован',
    example: 3,
  })
  @Expose()
  publishedSitesCount: number;

  @ApiPropertyOptional({
    description: 'Список опубликованных сайтов (заполняется при получении одного товара)',
    type: [PublishedSiteRdo],
  })
  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublishedSiteRdo)
  publishedSites?: PublishedSiteRdo[];

  @ApiProperty({
    description: 'Дата создания',
    example: '2026-01-15T10:30:00.000Z',
  })
  @Expose()
  createdAt: Date;
}