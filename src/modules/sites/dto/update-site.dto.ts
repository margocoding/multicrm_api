import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { SiteType } from './create-site.dto.js';

export class UpdateSiteDto {
  @ApiPropertyOptional({
    description: 'Название сайта',
    example: 'Новое название',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Домен сайта',
    example: 'new-domain.com',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({
    description: 'Тип сайта',
    enum: SiteType,
    example: SiteType.ARTICLE,
  })
  @IsEnum(SiteType)
  @IsOptional()
  type?: SiteType;
}