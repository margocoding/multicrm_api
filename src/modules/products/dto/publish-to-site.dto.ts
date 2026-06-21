import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';

export class PublishToSiteDto {
  @ApiProperty({ description: 'ID товара' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'ID сайта' })
  @IsString()
  @IsNotEmpty()
  siteId: string;

  @ApiProperty({ description: 'Опубликовать (true) или скрыть (false)' })
  @IsBoolean()
  isPublished: boolean;
}