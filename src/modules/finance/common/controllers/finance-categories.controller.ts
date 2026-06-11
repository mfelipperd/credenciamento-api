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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FinanceCategoriesService } from '../services/finance-categories.service';
import { CreateFinanceCategoryDto } from '../dto/create-finance-category.dto';
import { UpdateFinanceCategoryDto } from '../dto/update-finance-category.dto';
import {
  FinanceCategoryResponseDto,
  RequiredCategoriesSummaryDto,
} from '../dto/finance-category-response.dto';

@ApiTags('Categorias Financeiras')
@ApiBearerAuth('JWT-auth')
@Controller('finance/categories')
export class FinanceCategoriesController {
  constructor(private readonly categoriesService: FinanceCategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar categoria financeira', description: 'Cria uma nova categoria para classificação de despesas. Use isGlobal: true para categorias de overhead.' })
  @ApiBody({ type: CreateFinanceCategoryDto })
  @ApiResponse({ status: 201, description: 'Categoria criada com sucesso', type: FinanceCategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  create(@Body() createCategoryDto: CreateFinanceCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as categorias financeiras' })
  @ApiResponse({ status: 200, description: 'Lista de todas as categorias financeiras', type: [FinanceCategoryResponseDto] })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get('fair/:fairId')
  @ApiOperation({ summary: 'Listar categorias de uma feira', description: 'Retorna categorias globais + categorias específicas da feira.' })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Categorias da feira', type: [FinanceCategoryResponseDto] })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  findByFair(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.categoriesService.findByFair(fairId);
  }

  @Get('fair/:fairId/required')
  @ApiOperation({
    summary: 'Listar categorias obrigatórias de uma feira',
    description: 'Retorna todas as categorias de despesas marcadas como obrigatórias para a feira.',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Lista de categorias obrigatórias', type: [FinanceCategoryResponseDto] })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  findRequiredByFair(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.categoriesService.findRequiredByFair(fairId);
  }

  @Get('fair/:fairId/optional')
  @ApiOperation({
    summary: 'Listar categorias opcionais de uma feira',
    description: 'Retorna todas as categorias de despesas marcadas como opcionais para a feira.',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Lista de categorias opcionais', type: [FinanceCategoryResponseDto] })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  findOptionalByFair(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.categoriesService.findOptionalByFair(fairId);
  }

  @Get('fair/:fairId/required/summary')
  @ApiOperation({
    summary: 'Resumo das categorias obrigatórias',
    description: 'Retorna um resumo das categorias obrigatórias com contadores e informações básicas.',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Resumo das categorias obrigatórias', type: RequiredCategoriesSummaryDto })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  getRequiredCategoriesSummary(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.categoriesService.getRequiredCategoriesSummary(fairId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar categoria financeira por ID' })
  @ApiParam({ name: 'id', description: 'ID da categoria (UUID)' })
  @ApiResponse({ status: 200, description: 'Categoria encontrada', type: FinanceCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar categoria financeira' })
  @ApiParam({ name: 'id', description: 'ID da categoria (UUID)' })
  @ApiBody({ type: UpdateFinanceCategoryDto })
  @ApiResponse({ status: 200, description: 'Categoria atualizada com sucesso', type: FinanceCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateFinanceCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Patch(':id/toggle-required')
  @ApiOperation({
    summary: 'Alternar status obrigatório de uma categoria',
    description: 'Alterna o status de obrigatória/opcional de uma categoria de despesas.',
  })
  @ApiParam({ name: 'id', description: 'ID da categoria' })
  @ApiResponse({ status: 200, description: 'Status obrigatório alterado com sucesso', type: FinanceCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  toggleRequired(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.toggleRequired(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover categoria financeira' })
  @ApiParam({ name: 'id', description: 'ID da categoria (UUID)' })
  @ApiResponse({ status: 200, description: 'Categoria removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(id);
  }
}
