import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';

export enum SiteType {
  PRODUCT = 'product',
  ARTICLE = 'article',
}

export class CreateSiteDto {
  @ApiProperty({
    description: 'Название сайта',
    example: 'Мой сайт',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Домен сайта',
    example: 'example.com',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  domain!: string;

  @ApiProperty({
    description: 'Тип сайта',
    enum: SiteType,
    example: SiteType.PRODUCT,
  })
  @IsEnum(SiteType)
  type!: SiteType;
}