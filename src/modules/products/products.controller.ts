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
  ApiConflictResponse,
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
  @Public() // 🟢 Публичный роут для фронтенда (SSR)
  @ApiOperation({ summary: 'Получить товары по домену сайта' })
  @ApiResponse({ status: 200, type: PaginatedRdo(ProductRdo) })
  @ApiNotFoundResponse({ description: 'Сайт не найден' })
  findByDomain(
    @Body('domain') domain: string,
    @Query() query: GetProductsDto,
  ): Promise<PaginationRdo<ProductRdo>> {
    return this.productsService.findByDomain(domain, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить товар по ID с опубликованными сайтами' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ProductRdo })
  @ApiNotFoundResponse({ description: 'Товар не найден' })
  findOne(@Param('id') id: string): Promise<ProductRdo> {
    return this.productsService.fetchById(id);
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

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary:
      'Обновить товар (данные + массовое назначение сайтов через siteIds)',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ProductRdo })
  @ApiNotFoundResponse({ description: 'Товар не найден' })
  update(
    @Param('id') id: string,
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
    return this.productsService.update(id, { ...dto, image });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить товар' })
  @ApiParam({ name: 'id', type: String })
  @ApiNoContentResponse({ description: 'Товар удален' })
  @ApiNotFoundResponse({ description: 'Товар не найден' })
  remove(@Param('id') id: string): Promise<void> {
    return this.productsService.remove(id);
  }
}
