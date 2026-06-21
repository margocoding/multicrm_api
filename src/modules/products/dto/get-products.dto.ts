import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SearchDto } from '../../../common/dto/search.dto';

export class GetProductsDto extends SearchDto {
  @ApiPropertyOptional({
    description: 'Фильтр по типу продукта',
    enum: ['rail', 'component'],
  })
  @IsOptional()
  @IsEnum(['rail', 'component'])
  type?: 'rail' | 'component';

  @ApiPropertyOptional({
    description: 'Фильтр по статусу наличия',
    enum: ['IN STOCK', 'OUT OF STOCK'],
  })
  @IsOptional()
  @IsEnum(['IN STOCK', 'OUT OF STOCK'])
  status?: 'IN STOCK' | 'OUT OF STOCK';

  @ApiPropertyOptional({
    description: 'Фильтр по категории (включая подкатегории)',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
