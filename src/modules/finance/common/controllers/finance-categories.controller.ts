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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FinanceCategoriesService } from '../services/finance-categories.service';
import { CreateFinanceCategoryDto } from '../dto/create-finance-category.dto';
import { UpdateFinanceCategoryDto } from '../dto/update-finance-category.dto';
import { FinanceCategoryResponseDto, RequiredCategoriesSummaryDto } from '../dto/finance-category-response.dto';

@ApiTags('Finance Categories')
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

  @Get('fair/:fairId/required')
  @ApiOperation({
    summary: 'Listar categorias obrigatórias de uma feira',
    description: 'Retorna todas as categorias de despesas marcadas como obrigatórias para uma feira específica'
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorias obrigatórias retornada com sucesso',
    type: [FinanceCategoryResponseDto]
  })
  findRequiredByFair(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.categoriesService.findRequiredByFair(fairId);
  }

  @Get('fair/:fairId/optional')
  @ApiOperation({
    summary: 'Listar categorias opcionais de uma feira',
    description: 'Retorna todas as categorias de despesas marcadas como opcionais para uma feira específica'
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorias opcionais retornada com sucesso',
    type: [FinanceCategoryResponseDto]
  })
  findOptionalByFair(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.categoriesService.findOptionalByFair(fairId);
  }

  @Get('fair/:fairId/required/summary')
  @ApiOperation({
    summary: 'Resumo das categorias obrigatórias',
    description: 'Retorna um resumo das categorias obrigatórias de uma feira com contadores e informações básicas'
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Resumo das categorias obrigatórias retornado com sucesso',
    type: RequiredCategoriesSummaryDto
  })
  getRequiredCategoriesSummary(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.categoriesService.getRequiredCategoriesSummary(fairId);
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

  @Patch(':id/toggle-required')
  @ApiOperation({
    summary: 'Alternar status obrigatório de uma categoria',
    description: 'Alterna o status de obrigatória/opcional de uma categoria de despesas'
  })
  @ApiParam({ name: 'id', description: 'ID da categoria' })
  @ApiResponse({
    status: 200,
    description: 'Status obrigatório alterado com sucesso',
    type: FinanceCategoryResponseDto
  })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  toggleRequired(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.toggleRequired(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(id);
  }
}
