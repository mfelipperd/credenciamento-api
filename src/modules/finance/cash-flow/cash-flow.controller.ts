import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CashFlowService } from './cash-flow.service';
import { CreateCashFlowDto } from './dto/create-cash-flow.dto';
import { UpdateCashFlowDto } from './dto/update-cash-flow.dto';

@ApiTags('finance-cash-flow')
@ApiBearerAuth('JWT-auth')
@Controller('cash-flow')
export class CashFlowController {
  constructor(private readonly cashFlowService: CashFlowService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar fluxo de caixa',
    description:
      'Cria um novo registro de fluxo de caixa para uma feira específica',
  })
  @ApiBody({
    type: CreateCashFlowDto,
    description: 'Dados para criação do fluxo de caixa',
    examples: {
      exemplo1: {
        summary: 'Criação com valores fornecidos',
        value: {
          fairId: 'uuid-da-feira',
          period: '2025-01-31',
          totalRevenue: 15000.0,
          totalExpenses: 8000.0,
          notes: 'Janeiro 2025 - Alta temporada',
        },
      },
      exemplo2: {
        summary: 'Cálculo automático',
        value: {
          fairId: 'uuid-da-feira',
          period: '2025-01-31',
          notes: 'Cálculo automático de receitas e despesas',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Fluxo de caixa criado com sucesso',
    schema: {
      example: {
        id: 'uuid',
        fairId: 'uuid-da-feira',
        period: '2025-01-31',
        totalRevenue: 15000.0,
        totalExpenses: 8000.0,
        netBalance: 7000.0,
        profitMargin: 46.67,
        notes: 'Janeiro 2025 - Alta temporada',
        createdAt: '2025-01-31T00:00:00.000Z',
        updatedAt: '2025-01-31T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos fornecidos',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token JWT inválido',
  })
  create(@Body() createCashFlowDto: CreateCashFlowDto) {
    return this.cashFlowService.create(createCashFlowDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos os fluxos de caixa',
    description:
      'Retorna todos os registros de fluxo de caixa de todas as feiras',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de fluxos de caixa retornada com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'uuid' },
          fairId: { type: 'string', example: 'uuid-da-feira' },
          period: { type: 'string', example: '2025-01-31' },
          totalRevenue: { type: 'number', example: 15000.0 },
          totalExpenses: { type: 'number', example: 8000.0 },
          netBalance: { type: 'number', example: 7000.0 },
          profitMargin: { type: 'number', example: 46.67 },
        },
      },
    },
  })
  findAll() {
    return this.cashFlowService.findAll();
  }

  @Get('fair/:fairId')
  @ApiOperation({
    summary: 'Buscar fluxos de caixa por feira',
    description: 'Retorna todos os fluxos de caixa de uma feira específica',
  })
  @ApiParam({
    name: 'fairId',
    description: 'ID da feira',
    example: 'uuid-da-feira',
  })
  @ApiResponse({
    status: 200,
    description: 'Fluxos de caixa da feira retornados com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Feira não encontrada',
  })
  findByFair(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.cashFlowService.findByFair(fairId);
  }

  @Get('period')
  @ApiOperation({
    summary: 'Buscar fluxos de caixa por período',
    description: 'Retorna fluxos de caixa dentro de um período específico',
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Data de início (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Data de fim (YYYY-MM-DD)',
    example: '2025-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Fluxos de caixa do período retornados com sucesso',
  })
  findByPeriod(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.cashFlowService.findByPeriod(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar fluxo de caixa específico',
    description: 'Retorna um fluxo de caixa pelo ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do fluxo de caixa',
    example: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Fluxo de caixa encontrado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Fluxo de caixa não encontrado',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cashFlowService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar fluxo de caixa',
    description: 'Atualiza um fluxo de caixa existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do fluxo de caixa',
    example: 'uuid',
  })
  @ApiBody({
    type: UpdateCashFlowDto,
    description: 'Dados para atualização do fluxo de caixa',
  })
  @ApiResponse({
    status: 200,
    description: 'Fluxo de caixa atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Fluxo de caixa não encontrado',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCashFlowDto: UpdateCashFlowDto,
  ) {
    return this.cashFlowService.update(id, updateCashFlowDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Excluir fluxo de caixa',
    description: 'Remove um fluxo de caixa do sistema',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do fluxo de caixa',
    example: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Fluxo de caixa excluído com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Fluxo de caixa não encontrado',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.cashFlowService.remove(id);
  }

  // Endpoints de Relatórios e Análises

  @Get('report/consolidated/:fairId')
  @ApiOperation({
    summary: 'Relatório consolidado por feira',
    description:
      'Gera um relatório consolidado de receitas, despesas e lucratividade para uma feira',
  })
  @ApiParam({
    name: 'fairId',
    description: 'ID da feira',
    example: 'uuid-da-feira',
  })
  @ApiResponse({
    status: 200,
    description: 'Relatório consolidado gerado com sucesso',
    schema: {
      example: {
        fairId: 'uuid-da-feira',
        totalRevenue: 15000.0,
        totalExpenses: 8000.0,
        netBalance: 7000.0,
        profitMargin: 46.67,
        isProfitable: true,
        summary: 'Feira lucrativa com margem de 46.67%',
      },
    },
  })
  generateConsolidatedReport(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.cashFlowService.generateConsolidatedReport(fairId);
  }

  @Get('report/trends/:fairId')
  @ApiOperation({
    summary: 'Análise de tendências',
    description: 'Analisa a evolução financeira de uma feira ao longo do tempo',
  })
  @ApiParam({
    name: 'fairId',
    description: 'ID da feira',
    example: 'uuid-da-feira',
  })
  @ApiQuery({
    name: 'months',
    description: 'Número de meses para análise',
    required: false,
    example: 6,
  })
  @ApiResponse({
    status: 200,
    description: 'Análise de tendências gerada com sucesso',
    schema: {
      example: {
        periods: [
          '2024-08',
          '2024-09',
          '2024-10',
          '2024-11',
          '2024-12',
          '2025-01',
        ],
        revenues: [12000, 13500, 14200, 15800, 16800, 15000],
        expenses: [7500, 8200, 8800, 9200, 9500, 8000],
        balances: [4500, 5300, 5400, 6600, 7300, 7000],
        trend: 'increasing',
      },
    },
  })
  analyzeTrends(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Query('months', ParseIntPipe) months: number = 6,
  ) {
    return this.cashFlowService.analyzeTrends(fairId, months);
  }

  @Get('report/compare')
  @ApiOperation({
    summary: 'Comparar feiras',
    description: 'Compara a lucratividade entre múltiplas feiras',
  })
  @ApiQuery({
    name: 'fairIds',
    description: 'IDs das feiras separados por vírgula',
    example: 'uuid1,uuid2,uuid3',
  })
  @ApiResponse({
    status: 200,
    description: 'Comparação entre feiras gerada com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fairId: { type: 'string', example: 'uuid1' },
          totalRevenue: { type: 'number', example: 15000.0 },
          totalExpenses: { type: 'number', example: 8000.0 },
          netBalance: { type: 'number', example: 7000.0 },
          profitMargin: { type: 'number', example: 46.67 },
          rank: { type: 'number', example: 1 },
        },
      },
    },
  })
  compareFairs(@Query('fairIds') fairIds: string) {
    const fairIdsArray = fairIds.split(',').filter((id) => id.trim());
    return this.cashFlowService.compareFairs(fairIdsArray);
  }

  // Endpoint para cálculo automático
  @Post('calculate/:fairId')
  @ApiOperation({
    summary: 'Cálculo automático para feira',
    description:
      'Calcula automaticamente o fluxo de caixa para uma feira específica',
  })
  @ApiParam({
    name: 'fairId',
    description: 'ID da feira',
    example: 'uuid-da-feira',
  })
  @ApiBody({
    type: CreateCashFlowDto,
    description: 'Dados básicos para cálculo automático',
    examples: {
      exemplo1: {
        summary: 'Cálculo automático simples',
        value: {
          period: '2025-01-31',
          notes: 'Cálculo automático janeiro 2025',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Fluxo de caixa calculado automaticamente com sucesso',
  })
  calculateForFair(
    @Param('fairId', ParseUUIDPipe) fairId: string,
    @Body() createCashFlowDto: CreateCashFlowDto,
  ) {
    // Sobrescrever o fairId com o da URL
    createCashFlowDto.fairId = fairId;
    return this.cashFlowService.create(createCashFlowDto);
  }

  // Endpoint para dashboard
  @Get('dashboard/summary')
  @ApiOperation({
    summary: 'Dashboard - Resumo geral',
    description: 'Retorna resumo geral de todas as feiras para dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo do dashboard retornado com sucesso',
  })
  getDashboardSummary() {
    // Retornar resumo geral de todas as feiras
    return this.cashFlowService.findAll();
  }

  // Endpoint para análise de lucratividade
  @Get('analysis/profitability')
  @ApiOperation({
    summary: 'Análise de lucratividade',
    description: 'Retorna análise de lucratividade geral de todas as feiras',
  })
  @ApiResponse({
    status: 200,
    description: 'Análise de lucratividade retornada com sucesso',
  })
  getProfitabilityAnalysis() {
    // Retornar análise de lucratividade geral
    return this.cashFlowService.findAll();
  }

  // Endpoint para análise completa de fluxo de caixa de uma feira
  @Get('analysis/fair/:fairId')
  @ApiOperation({
    summary: 'Análise completa de fluxo de caixa por feira',
    description: 'Retorna análise detalhada de receitas, despesas, lucro e recomendações para uma feira específica',
  })
  @ApiParam({
    name: 'fairId',
    description: 'ID da feira para análise',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Análise de fluxo de caixa retornada com sucesso',
    schema: {
      type: 'object',
      properties: {
        fairId: { type: 'string', description: 'ID da feira' },
        totalRevenue: { type: 'number', description: 'Receita total' },
        totalExpenses: { type: 'number', description: 'Despesa total' },
        netProfit: { type: 'number', description: 'Lucro líquido' },
        profitMargin: { type: 'number', description: 'Margem de lucro (%)' },
        isProfitable: { type: 'boolean', description: 'Se é lucrativo' },
        revenueCount: { type: 'number', description: 'Quantidade de receitas' },
        expenseCount: { type: 'number', description: 'Quantidade de despesas' },
        averageRevenue: { type: 'number', description: 'Média por receita' },
        averageExpense: { type: 'number', description: 'Média por despesa' },
        largestRevenue: { type: 'number', description: 'Maior receita' },
        largestExpense: { type: 'number', description: 'Maior despesa' },
        performance: { 
          type: 'string', 
          enum: ['excellent', 'good', 'average', 'poor'],
          description: 'Classificação de performance' 
        },
        recommendations: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Recomendações baseadas na análise' 
        },
        summary: { type: 'string', description: 'Resumo executivo' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Feira não encontrada' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async getFairCashFlowAnalysis(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return await this.cashFlowService.getFairCashFlowAnalysis(fairId);
  }
}
