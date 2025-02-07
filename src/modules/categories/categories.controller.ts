import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
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

  @Get(':id')
  getCategoryById(@Param('id') id: string) {
    return this.categoriesService.getCategoryById(id);
  }

  @Put(':id')
  updateCategory(
    @Param('id') id: string,
    @Body() data: Partial<CreateCategoryDto>,
  ) {
    return this.categoriesService.updateCategory(id, data);
  }

  @Delete(':id')
  deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id);
  }
}
