import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

export class CategoryChildRdo {
  @ApiProperty({ description: 'ID категории', example: 'clx123abc' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Название категории', example: 'Рельсы Р65' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Количество товаров', example: 12 })
  @Expose()
  productsCount: number;
}

export class CategoryRdo {
  @ApiProperty({ description: 'ID категории', example: 'clx123abc' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Название категории', example: 'Рельсы' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'ID родительской категории' })
  @Expose()
  parentId?: string | null;

  @ApiProperty({ description: 'Количество товаров в категории', example: 45 })
  @Expose()
  productsCount: number;

  @ApiPropertyOptional({ description: 'Дочерние категории', type: [CategoryChildRdo] })
  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryChildRdo)
  children?: CategoryChildRdo[];

  @ApiProperty({ description: 'Дата создания' })
  @Expose()
  createdAt: Date;
}