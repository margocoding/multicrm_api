import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type as TransformerType  } from 'class-transformer';
import { IsArray} from 'class-validator';


export class PaginationRdo<T> {
  @ApiProperty({ 
    description: 'Общее количество элементов',
    example: 100,
  })
  @Expose()
  total: number;

  @ApiProperty({ 
    description: 'Список элементов',
    isArray: true,
  })
  @Expose()
  items: T[];
}

export function PaginatedRdo<T>(itemClass: Type<T>) {
  class PaginatedResponse {
    @ApiProperty({ 
      type: () => [itemClass], // Функция нужна для корректной генерации Swagger
      description: 'Список элементов',
    })
    @IsArray()
    @TransformerType(() => itemClass) // <-- ЗДЕСЬ МЫ ПЕРЕДАЕМ РЕАЛЬНЫЙ КЛАСС, а не абстрактный T
    @Expose()
    items: T[];

    @ApiProperty({ 
      description: 'Общее количество элементов',
      example: 100,
    })
    @Expose()
    total: number;
  }

  // Этот хак нужен, чтобы в Swagger документации классы назывались красиво 
  // (например, PaginatedSiteRdoResponse), а не безымянными классами
  Object.defineProperty(PaginatedResponse, 'name', { 
    value: `Paginated${itemClass.name}Response` 
  });

  return PaginatedResponse;
}