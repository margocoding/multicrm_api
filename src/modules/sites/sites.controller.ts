import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';

import { SitesService } from './sites.service.js';
import { CreateSiteDto } from './dto/create-site.dto.js';
import { UpdateSiteDto } from './dto/update-site.dto.js';
import { GetSitesDto } from './dto/get-sites.dto.js';
import { SiteRdo } from './rdo/site.rdo.js';
import {
  PaginatedRdo,
  PaginationRdo,
} from '../../common/rdo/pagination.rdo.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Sites')
@Controller('sites')
@UseGuards(JwtAuthGuard)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  @ApiOperation({ summary: 'Получить список сайтов' })
  @ApiResponse({ status: 200, type: PaginatedRdo(SiteRdo) })
  findAll(@Query() query: GetSitesDto): Promise<PaginationRdo<SiteRdo>> {
    return this.sitesService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: 'Создать сайт' })
  @ApiResponse({ status: 201, type: SiteRdo })
  @ApiConflictResponse({ description: 'Сайт с таким доменом уже существует' })
  create(@Body() dto: CreateSiteDto): Promise<SiteRdo> {
    return this.sitesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить сайт' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: SiteRdo })
  @ApiNotFoundResponse({ description: 'Сайт не найден' })
  @ApiConflictResponse({ description: 'Сайт с таким доменом уже существует' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
  ): Promise<SiteRdo> {
    return this.sitesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить сайт' })
  @ApiParam({ name: 'id', type: String })
  @ApiNoContentResponse({ description: 'Сайт удален' })
  @ApiNotFoundResponse({ description: 'Сайт не найден' })
  remove(@Param('id') id: string): Promise<void> {
    return this.sitesService.remove(id);
  }
}
