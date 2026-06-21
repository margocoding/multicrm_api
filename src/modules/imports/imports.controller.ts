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
  ParseArrayPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportsService } from './imports.service.js';
import { ImportBatchRdo } from './rdo/import-batch.rdo.js';

@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  // ----------------------------
  // List imports
  // ----------------------------
  @Get()
  async findAll(): Promise<ImportBatchRdo[]> {
    return this.importsService.findAll();
  }

  // ----------------------------
  // Analyze file (preview)
  // ----------------------------
  @Post('analyze')
  @UseInterceptors(FileInterceptor('file'))
  async analyze(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ productsCount: number; categories: string[] }> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.importsService.analyze(file);
  }

  // ----------------------------
  // Create import
  // ----------------------------
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('targetSiteIds', new ParseArrayPipe({ items: String, separator: ',', optional: false }))
    targetSiteIds: string[],
  ): Promise<ImportBatchRdo> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!targetSiteIds || targetSiteIds.length === 0) {
      throw new BadRequestException('targetSiteIds is required');
    }

    return this.importsService.create({
      file,
      targetSiteIds,
    });
  }

  // ----------------------------
  // Delete import
  // ----------------------------
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    return this.importsService.remove(id);
  }
}