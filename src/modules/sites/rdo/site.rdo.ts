import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SiteRdo {
  @ApiProperty({ description: 'ID сайта', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Название сайта', example: 'Мой сайт' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Домен', example: 'example.com' })
  @Expose()
  domain: string;

  @ApiProperty({ description: 'Тип сайта', example: 'product' })
  @Expose()
  type: string;

  @ApiProperty({ description: 'Статус сайта', example: 'live' })
  @Expose()
  status: string;

  @ApiProperty({ description: 'Количество товаров', example: 42 })
  @Expose()
  productsCount: number;

  @ApiProperty({ description: 'Количество статей', example: 15 })
  @Expose()
  articlesCount: number;

  @ApiProperty({ description: 'Дата создания', example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  createdAt: Date;
}