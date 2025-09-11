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

  @Get('fair/:fairId')
  getCategoriesByFair(@Param('fairId') fairId: string) {
    return this.categoriesService.getCategoriesByFair(fairId);
  }

  @Get('fair/:fairId/required')
  getRequiredCategoriesByFair(@Param('fairId') fairId: string) {
    return this.categoriesService.getRequiredCategoriesByFair(fairId);
  }

  @Get('fair/:fairId/optional')
  getOptionalCategoriesByFair(@Param('fairId') fairId: string) {
    return this.categoriesService.getOptionalCategoriesByFair(fairId);
  }

  @Get('fair/:fairId/required/summary')
  getRequiredCategoriesSummary(@Param('fairId') fairId: string) {
    return this.categoriesService.getRequiredCategoriesSummary(fairId);
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

  @Put(':id/toggle-required')
  toggleRequired(@Param('id') id: string) {
    return this.categoriesService.toggleRequired(id);
  }

  @Delete(':id')
  deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id);
  }
}
