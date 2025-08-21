import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FinanceCategoriesService } from '../services/finance-categories.service';
import { CreateFinanceCategoryDto } from '../dto/create-finance-category.dto';
import { UpdateFinanceCategoryDto } from '../dto/update-finance-category.dto';

@Controller('finance/categories')
export class FinanceCategoriesController {
  constructor(private readonly categoriesService: FinanceCategoriesService) {}

  @Post()
  create(@Body() createCategoryDto: CreateFinanceCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get('fair/:fairId')
  findByFair(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.categoriesService.findByFair(fairId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateFinanceCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(id);
  }
}
