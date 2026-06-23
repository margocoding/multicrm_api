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
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportsService } from './imports.service.js';
import { ImportBatchRdo } from './rdo/import-batch.rdo.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('imports')
@UseGuards(JwtAuthGuard)
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
      throw new BadRequestException('File is required');
    }
    return this.importsService.analyze(file);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body(
      'targetSiteIds',
      new ParseArrayPipe({ items: String, separator: ',', optional: false }),
    )
    targetSiteIds: string[],
  ): Promise<ImportBatchRdo> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!targetSiteIds || targetSiteIds.length === 0) {
      throw new BadRequestException('targetSiteIds is required');
    }
    return this.importsService.create({ file, targetSiteIds });
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    if (!id) {
      throw new BadRequestException('id is required');
    }
    return this.importsService.remove(id);
  }
}
