import { plainToInstance } from 'class-transformer';
import { Type } from '@nestjs/common';


export function fillDto<T>(DtoClass: Type<T>, plainObject: any): T {
  return plainToInstance(DtoClass, plainObject, {
    excludeExtraneousValues: true,
    enableImplicitConversion: true,
  });
}