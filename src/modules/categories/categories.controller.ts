import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CategoryRdo } from './rdo/category.rdo.js';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Создать категорию' })
  @ApiResponse({ status: 201, type: CategoryRdo })
  create(@Body() dto: CreateCategoryDto): Promise<CategoryRdo> {
    return this.categoriesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все категории (дерево)' })
  @ApiResponse({ status: 200, type: [CategoryRdo] })
  findAll(): Promise<CategoryRdo[]> {
    return this.categoriesService.findAll();
  }

  @Get('by-domain')
  @ApiOperation({ summary: 'Получить категории по домену (только с товарами)' })
  @ApiResponse({ status: 200, type: [CategoryRdo] })
  @ApiNotFoundResponse({ description: 'Сайт не найден' })
  findByDomain(@Query('domain') domain: string): Promise<CategoryRdo[]> {
    return this.categoriesService.findByDomain(domain);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить категорию по ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: CategoryRdo })
  @ApiNotFoundResponse({ description: 'Категория не найдена' })
  findOne(@Param('id') id: string): Promise<CategoryRdo> {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить категорию' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: CategoryRdo })
  @ApiNotFoundResponse({ description: 'Категория не найдена' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryRdo> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить категорию' })
  @ApiParam({ name: 'id', type: String })
  @ApiNoContentResponse({ description: 'Категория удалена' })
  @ApiNotFoundResponse({ description: 'Категория не найдена или имеет дочерние' })
  remove(@Param('id') id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}