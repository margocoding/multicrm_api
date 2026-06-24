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
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseFilePipe,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { PublishToSiteDto } from './dto/publish-to-site.dto.js';
import { GetProductsDto } from './dto/get-products.dto.js';
import { ProductRdo } from './rdo/product.rdo.js';
import {
  PaginatedRdo,
  PaginationRdo,
} from '../../common/rdo/pagination.rdo.js';
import {
  IMAGE_MIME_TYPE,
  MAX_FILE_SIZE,
} from '../../common/utils/constants.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Public } from '../auth/decorators/public.decorator.js';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить список товаров' })
  @ApiResponse({ status: 200, type: PaginatedRdo(ProductRdo) })
  findAll(@Query() query: GetProductsDto): Promise<PaginationRdo<ProductRdo>> {
    return this.productsService.findAll(query);
  }

  @Post('by-domain')
  @Public()
  @ApiOperation({ summary: 'Получить товары по домену сайта' })
  @ApiResponse({ status: 200, type: PaginatedRdo(ProductRdo) })
  @ApiNotFoundResponse({ description: 'Сайт не найден' })
  findByDomain(
    @Body('domain') domain: string,
    @Query() query: GetProductsDto,
  ): Promise<PaginationRdo<ProductRdo>> {
    return this.productsService.findByDomain(domain, query);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Получить товар по slug' })
  @ApiParam({ name: 'slug', type: String, description: 'Slug (ЧПУ) товара' })
  @ApiResponse({ status: 200, type: ProductRdo })
  @ApiNotFoundResponse({ description: 'Товар не найден' })
  findOne(@Param('slug') slug: string): Promise<ProductRdo> {
    return this.productsService.fetchBySlug(slug);
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateProductDto })
  @ApiOperation({ summary: 'Создать товар' })
  @ApiResponse({ status: 201, type: ProductRdo })
  create(
    @Body() dto: CreateProductDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_FILE_SIZE,
            message: 'Размер изображения не должен превышать 15 МБ',
          }),
          new FileTypeValidator({ fileType: IMAGE_MIME_TYPE }),
        ],
        fileIsRequired: false,
      }),
    )
    image?: Express.Multer.File,
  ): Promise<ProductRdo> {
    return this.productsService.create({ ...dto, image });
  }

  @Post('publish')
  @ApiOperation({
    summary: 'Опубликовать или скрыть товар на конкретном сайте',
  })
  @ApiResponse({ status: 200, type: ProductRdo })
  @ApiNotFoundResponse({ description: 'Товар или сайт не найден' })
  publishToSite(@Body() dto: PublishToSiteDto): Promise<ProductRdo> {
    return this.productsService.publishToSite(dto);
  }

  @Patch(':idOrSlug')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Обновить товар (данные + массовое назначение сайтов)',
  })
  @ApiParam({ name: 'idOrSlug', type: String, description: 'ID или Slug товара' })
  @ApiResponse({ status: 200, type: ProductRdo })
  @ApiNotFoundResponse({ description: 'Товар не найден' })
  update(
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: UpdateProductDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_FILE_SIZE,
            message: 'Размер изображения не должен превышать 15 МБ',
          }),
          new FileTypeValidator({ fileType: IMAGE_MIME_TYPE }),
        ],
        fileIsRequired: false,
      }),
    )
    image?: Express.Multer.File,
  ): Promise<ProductRdo> {
    return this.productsService.update(idOrSlug, { ...dto, image });
  }

  @Delete(':idOrSlug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить товар' })
  @ApiParam({ name: 'idOrSlug', type: String, description: 'ID или Slug товара' })
  @ApiNoContentResponse({ description: 'Товар удален' })
  @ApiNotFoundResponse({ description: 'Товар не найден' })
  remove(@Param('idOrSlug') idOrSlug: string): Promise<void> {
    return this.productsService.remove(idOrSlug);
  }
}