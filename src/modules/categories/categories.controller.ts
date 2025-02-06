import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './categories.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  createCategory(@Body() data: CreateCategoryDto) {
    return this.categoriesService.createCategory(data);
  }

  @Get(':fairId')
  getCategoriesByFair(@Param('fairId') fairId: string) {
    return this.categoriesService.getCategoriesByFair(fairId);
  }
}
