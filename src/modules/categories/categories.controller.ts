import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './categories.dto';

@ApiTags('Categorias de Visitantes')
@ApiBearerAuth('JWT-auth')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar categoria', description: 'Cria uma nova categoria de visitante para a feira.' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: 'Categoria criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  createCategory(@Body() data: CreateCategoryDto) {
    return this.categoriesService.createCategory(data);
  }

  @Get('fair/:fairId')
  @ApiOperation({ summary: 'Listar categorias da feira' })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Lista de categorias' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  getCategoriesByFair(@Param('fairId') fairId: string) {
    return this.categoriesService.getCategoriesByFair(fairId);
  }

  @Get('fair/:fairId/required')
  @ApiOperation({ summary: 'Listar categorias obrigatórias da feira' })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Lista de categorias obrigatórias' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  getRequiredCategoriesByFair(@Param('fairId') fairId: string) {
    return this.categoriesService.getRequiredCategoriesByFair(fairId);
  }

  @Get('fair/:fairId/optional')
  @ApiOperation({ summary: 'Listar categorias opcionais da feira' })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Lista de categorias opcionais' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  getOptionalCategoriesByFair(@Param('fairId') fairId: string) {
    return this.categoriesService.getOptionalCategoriesByFair(fairId);
  }

  @Get('fair/:fairId/required/summary')
  @ApiOperation({ summary: 'Resumo das categorias obrigatórias da feira' })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Resumo com contadores de categorias obrigatórias' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  getRequiredCategoriesSummary(@Param('fairId') fairId: string) {
    return this.categoriesService.getRequiredCategoriesSummary(fairId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar categoria por ID' })
  @ApiParam({ name: 'id', description: 'ID da categoria' })
  @ApiResponse({ status: 200, description: 'Categoria encontrada' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  getCategoryById(@Param('id') id: string) {
    return this.categoriesService.getCategoryById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar categoria' })
  @ApiParam({ name: 'id', description: 'ID da categoria' })
  @ApiResponse({ status: 200, description: 'Categoria atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  updateCategory(@Param('id') id: string, @Body() data: Partial<CreateCategoryDto>) {
    return this.categoriesService.updateCategory(id, data);
  }

  @Put(':id/toggle-required')
  @ApiOperation({ summary: 'Alternar obrigatoriedade da categoria' })
  @ApiParam({ name: 'id', description: 'ID da categoria' })
  @ApiResponse({ status: 200, description: 'Status alterado com sucesso' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  toggleRequired(@Param('id') id: string) {
    return this.categoriesService.toggleRequired(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover categoria' })
  @ApiParam({ name: 'id', description: 'ID da categoria' })
  @ApiResponse({ status: 200, description: 'Categoria removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id);
  }
}
