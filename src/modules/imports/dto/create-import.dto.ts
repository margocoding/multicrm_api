import { IsArray, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateImportDto {
  @IsString()
  targetSiteIds: string[]; // Придет как JSON string из FormData

  file: Express.Multer.File;
}