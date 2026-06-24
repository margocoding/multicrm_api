import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import { ProductCondition } from "../../../../generated/prisma/enums";

export class CharacteristicDto {
  @ApiProperty({ description: 'Название характеристики' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Значение характеристики' })
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class CreateProductDto {
  @ApiProperty({ description: 'Название товара', example: 'Рельса', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Подзаголовок', example: 'Алюминиевый профиль' })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiProperty({ description: 'Цена товара', example: '1500' })
  @IsString()
  @IsNotEmpty()
  price: string;

  @ApiProperty({ description: 'Единица измерения цены', example: 'RUB' })
  @IsString()
  @IsNotEmpty()
  priceUnit: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Изображение товара' })
  @IsOptional()
  image?: Express.Multer.File;

  @ApiProperty({ description: 'Количество на складе', example: 100 })
  @IsInt()
  quantity: number;

  @ApiPropertyOptional({ description: 'Единица измерения товара', example: 'шт', default: 'единица' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({ enum: ProductCondition, description: 'Состояние товара', default: ProductCondition.NEW })
  @IsEnum(ProductCondition)
  @IsOptional()
  condition?: ProductCondition;

  @ApiPropertyOptional({ description: 'ID сайтов для публикации', isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  siteIds?: string[];

  @ApiPropertyOptional({ description: 'ID категории' })
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiPropertyOptional({ type: [CharacteristicDto], description: 'Массив характеристик' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacteristicDto)
  characteristics?: CharacteristicDto[];
}