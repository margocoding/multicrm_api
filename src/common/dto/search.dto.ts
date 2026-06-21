import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from './pagination.dto.js';

export class SearchDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Поисковый запрос',
    example: 'example.com',
  })
  @IsString()
  @IsOptional()
  search?: string;
}