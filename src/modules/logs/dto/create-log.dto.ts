import { IsEnum, IsString } from 'class-validator';
import { LogType } from '../../../../generated/prisma/enums';

export class CreateLogDto {
  @IsEnum(LogType)
  type: LogType;

  @IsString()
  message: string;
}