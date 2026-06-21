import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ParseProductsDto {
  @ApiProperty({
    description: 'Домен сайта для парсинга',
    example: 'example.com',
  })
  @IsString()
  @IsNotEmpty()
  domain!: string;
}