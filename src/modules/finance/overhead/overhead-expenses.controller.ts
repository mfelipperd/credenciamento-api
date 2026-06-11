import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OverheadExpensesService } from './overhead-expenses.service';
import {
  CreateOverheadExpenseDto,
  UpdateOverheadExpenseDto,
} from './dto/overhead-expense.dto';

@ApiTags('Overhead (Despesas Rateadas)')
@ApiBearerAuth('JWT-auth')
@Controller('overhead-expenses')
export class OverheadExpensesController {
  private readonly logger = new Logger(OverheadExpensesController.name);

  constructor(private readonly overheadExpensesService: OverheadExpensesService) {}

  @Get('categories')
  @ApiOperation({
    summary: 'Listar categorias globais de overhead',
    description: 'Retorna as finance_categories marcadas como global: true. Use esses IDs no campo categoryId ao criar despesas overhead.',
  })
  @ApiResponse({ status: 200, description: 'Lista de categorias globais' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async findGlobalCategories() {
    return this.overheadExpensesService.findGlobalCategories();
  }

  @Post()
  @ApiOperation({
    summary: 'Criar despesa overhead',
    description: 'Lança uma nova despesa overhead e distribui o custo entre as feiras informadas. Se percentuais forem omitidos, faz divisão igualitária.',
  })
  @ApiBody({ type: CreateOverheadExpenseDto })
  @ApiResponse({ status: 201, description: 'Despesa overhead criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos (categoryId obrigatório, fairs com ao menos 1 item)' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async create(@Body() dto: CreateOverheadExpenseDto) {
    return this.overheadExpensesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todas as despesas overhead',
    description: 'Retorna todas as despesas overhead com suas alocações por feira.',
  })
  @ApiResponse({ status: 200, description: 'Lista de despesas overhead com alocações' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async findAll() {
    return this.overheadExpensesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar despesa overhead por ID' })
  @ApiParam({ name: 'id', description: 'ID da despesa overhead (UUID)' })
  @ApiResponse({ status: 200, description: 'Despesa overhead encontrada' })
  @ApiResponse({ status: 404, description: 'Despesa overhead não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.overheadExpensesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar despesa overhead',
    description: 'Atualiza campos da despesa. Se o campo "fairs" for enviado, substitui completamente as alocações anteriores.',
  })
  @ApiParam({ name: 'id', description: 'ID da despesa overhead (UUID)' })
  @ApiBody({ type: UpdateOverheadExpenseDto })
  @ApiResponse({ status: 200, description: 'Despesa overhead atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Despesa overhead não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOverheadExpenseDto) {
    return this.overheadExpensesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover despesa overhead', description: 'Remove a despesa overhead e todas as suas alocações (CASCADE).' })
  @ApiParam({ name: 'id', description: 'ID da despesa overhead (UUID)' })
  @ApiResponse({ status: 200, description: 'Despesa overhead removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Despesa overhead não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.overheadExpensesService.remove(id);
  }
}
