import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsArray,
  IsEnum,
  IsInt,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Название товара',
    example: 'Рельса',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Подзаголовок',
    example: 'Алюминиевый профиль',
  })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiPropertyOptional({ description: 'Стандарт', example: 'VESA' })
  @IsString()
  @IsOptional()
  standard?: string;

  @ApiPropertyOptional({ description: 'Длина', example: '1000 мм' })
  @IsString()
  @IsOptional()
  length?: string;

  @ApiPropertyOptional({ description: 'Вес', example: '2.5 кг' })
  @IsString()
  @IsOptional()
  weight?: string;

  @ApiProperty({ description: 'Цена товара', example: '1500' })
  @IsString()
  @IsNotEmpty()
  price: string;

  @ApiProperty({ description: 'Единица измерения цены', example: 'RUB' })
  @IsString()
  @IsNotEmpty()
  priceUnit: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description:
      'Изображение товара (до 15 МБ, форматы: jpg, jpeg, png, gif, webp)',
  })
  @IsOptional()
  image?: Express.Multer.File;

  @ApiProperty({ description: 'Количество на складе', example: 100 })
  @IsInt()
  quantity: number;

  @ApiPropertyOptional({
    description: 'ID сайтов для публикации',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  siteIds?: string[];

  @ApiPropertyOptional({ description: 'ID категории' })
  @IsOptional()
  @IsString()
  categoryId?: string | null;
}
