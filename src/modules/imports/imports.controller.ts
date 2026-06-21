import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportsService } from './imports.service.js';
import { ImportBatchRdo } from './rdo/import-batch.rdo.js';

@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get()
  async findAll(): Promise<ImportBatchRdo[]> {
    return this.importsService.findAll();
  }

  @Post('analyze')
  @UseInterceptors(FileInterceptor('file'))
  async analyze(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ productsCount: number; categories: string[] }> {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    return this.importsService.analyze(file);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ): Promise<ImportBatchRdo> {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    return this.importsService.create({
      file,
      targetSiteIds: body.targetSiteIds,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.importsService.remove(id);
  }
}