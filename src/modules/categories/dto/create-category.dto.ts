import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Название категории', example: 'Рельсы' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'ID родительской категории', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  parentId?: string;
}