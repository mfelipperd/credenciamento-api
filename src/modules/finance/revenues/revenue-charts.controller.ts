import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RevenueChartsService } from './revenue-charts.service';

@ApiTags('Gráficos de Receitas')
@Controller('finance/revenues/charts')
export class RevenueChartsController {
  constructor(private readonly revenueChartsService: RevenueChartsService) {}

  @Get('by-period')
  @ApiOperation({ summary: 'Receitas por período (mensal, semanal, diário)' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira específica',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Período de agrupamento',
    enum: ['daily', 'weekly', 'monthly'],
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Data inicial (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Data final (ISO format)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados de receitas por período',
  })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async getRevenuesByPeriod(
    @Query('fairId') fairId: string,
    @Query('period') period: string = 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!fairId) {
      throw new BadRequestException('fairId é obrigatório');
    }

    return await this.revenueChartsService.getRevenuesByPeriod(
      fairId,
      period,
      startDate,
      endDate,
    );
  }

  @Get('by-status')
  @ApiOperation({ summary: 'Receitas agrupadas por status' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados de receitas por status',
  })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async getRevenuesByStatus(@Query('fairId') fairId: string) {
    if (!fairId) {
      throw new BadRequestException('fairId é obrigatório');
    }

    return await this.revenueChartsService.getRevenuesByStatus(fairId);
  }

  @Get('by-payment-method')
  @ApiOperation({ summary: 'Receitas agrupadas por método de pagamento' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados de receitas por método de pagamento',
  })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async getRevenuesByPaymentMethod(@Query('fairId') fairId: string) {
    if (!fairId) {
      throw new BadRequestException('fairId é obrigatório');
    }

    return await this.revenueChartsService.getRevenuesByPaymentMethod(fairId);
  }

  @Get('executive-summary')
  @ApiOperation({ summary: 'Resumo executivo das receitas' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo executivo das receitas',
  })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async getExecutiveSummary(@Query('fairId') fairId: string) {
    if (!fairId) {
      throw new BadRequestException('fairId é obrigatório');
    }

    return await this.revenueChartsService.getExecutiveSummary(fairId);
  }

  @Get('overdue-installments')
  @ApiOperation({ summary: 'Análise de parcelas em atraso' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados de parcelas em atraso',
  })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async getOverdueInstallments(@Query('fairId') fairId: string) {
    if (!fairId) {
      throw new BadRequestException('fairId é obrigatório');
    }

    return await this.revenueChartsService.getOverdueInstallments(fairId);
  }

  @Get('top-clients')
  @ApiOperation({ summary: 'Top clientes por receita' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira específica',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Número de clientes (padrão: 10, máx: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Top clientes por receita',
  })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async getTopClients(
    @Query('fairId') fairId: string,
    @Query('limit') limit: number = 10,
  ) {
    if (!fairId) {
      throw new BadRequestException('fairId é obrigatório');
    }

    const validLimit = Math.min(Math.max(1, Number(limit) || 10), 50);

    return await this.revenueChartsService.getTopClients(fairId, validLimit);
  }

  @Get('installment-conversion')
  @ApiOperation({ summary: 'Análise de conversão de parcelas' })
  @ApiQuery({
    name: 'fairId',
    required: true,
    description: 'ID da feira específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados de conversão de parcelas',
  })
  @ApiResponse({ status: 400, description: 'fairId é obrigatório' })
  async getInstallmentConversion(@Query('fairId') fairId: string) {
    if (!fairId) {
      throw new BadRequestException('fairId é obrigatório');
    }

    return await this.revenueChartsService.getInstallmentConversion(fairId);
  }
}
