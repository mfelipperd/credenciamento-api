import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { ExpensesService } from '../finance/expenses/expenses.service';
import { getChannelPerformanceWithCostData } from '../mcp/tools/channel.tools';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly expensesService: ExpensesService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Visão geral da feira', description: 'Retorna um resumo consolidado com inscrições, check-ins e receitas.' })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Dados de visão geral da feira' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getOverview(@Query('fairId') fairId: string) {
    return this.dashboardService.getOverview(fairId);
  }

  @Get('absent-visitors')
  @ApiOperation({ summary: 'Visitantes ausentes', description: 'Retorna visitantes inscritos que não fizeram check-in na feira.' })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Lista de visitantes ausentes' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getAbsentVisitors(@Query('fairId') fairId: string) {
    return await this.dashboardService.getAbsentVisitors(fairId);
  }

  @Get('top-frequent-visitors')
  @ApiOperation({ summary: 'Visitantes mais frequentes', description: 'Retorna os visitantes que mais participaram de feiras.' })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Lista de visitantes frequentes com contagem' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getTopFrequentVisitors(@Query('fairId') fairId: string) {
    return this.dashboardService.getTopFrequentVisitors(fairId);
  }

  @Get('checkins/today')
  @ApiOperation({ summary: 'Check-ins do dia', description: 'Retorna os check-ins realizados hoje na feira.' })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Lista de check-ins do dia' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getCheckinsToday(@Query('fairId') fairId: string) {
    return await this.dashboardService.getCheckinsToday(fairId);
  }

  @Get('visitors/count')
  @ApiOperation({ summary: 'Total de visitantes inscritos', description: 'Retorna o número total de visitantes inscritos na feira.' })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Total de visitantes', schema: { example: { total: 320 } } })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getTotalVisitors(@Query('fairId') fairId: string) {
    return await this.dashboardService.getTotalVisitors(fairId);
  }

  @Get('visitors/checked-in')
  @ApiOperation({ summary: 'Total de visitantes com check-in', description: 'Retorna quantos visitantes já realizaram check-in.' })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Total de check-ins', schema: { example: { total: 180 } } })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getCheckedInVisitors(@Query('fairId') fairId: string) {
    return this.dashboardService.getCheckedInVisitors(fairId);
  }

  @Get('visitors/category')
  @ApiOperation({ summary: 'Visitantes por categoria', description: 'Agrupa e conta visitantes por categoria (ex: Visitante, Expositor).' })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Contagem de visitantes por categoria', schema: { example: [{ category: 'Visitante', count: 250 }, { category: 'Expositor', count: 70 }] } })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getVisitorsByCategory(@Query('fairId') fairId: string) {
    return this.dashboardService.getVisitorsByCategory(fairId);
  }

  @Get('visitors/origin')
  @ApiOperation({ summary: 'Visitantes por estado de origem', description: 'Agrupa visitantes por UF de origem.' })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Contagem de visitantes por UF', schema: { example: [{ state: 'AM', count: 210 }, { state: 'PA', count: 45 }] } })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getVisitorsByOrigin(@Query('fairId') fairId: string) {
    return this.dashboardService.getVisitorsByOrigin(fairId);
  }

  @Get('visitors/sectors')
  @ApiOperation({ summary: 'Visitantes por setor de atuação', description: 'Agrupa visitantes pelos setores de atuação selecionados no cadastro.' })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira' })
  @ApiResponse({ status: 200, description: 'Contagem por setor', schema: { example: [{ sector: 'Tecnologia', count: 98 }] } })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getVisitorsBySectors(@Query('fairId') fairId: string) {
    return await this.dashboardService.getVisitorsBySectors(fairId);
  }

  @Get('conversions/how-did-you-know')
  @ApiOperation({
    summary: 'Visitantes por canal de aquisição',
    description:
      'Agrupa visitantes pela resposta "como ficou sabendo" do evento, com o gasto de mídia paga casado por palavra-chave (spend/cpl/cpa). Quando duas respostas compartilham a mesma verba (ex: "instagram" e "facebook" pagos pela mesma despesa de Meta Ads), o campo sharedWithChannels avisa quais — o spend não deve ser somado entre elas.',
  })
  @ApiQuery({ name: 'fairId', required: true, description: 'ID da feira' })
  @ApiResponse({
    status: 200,
    description: 'Contagem por canal, com custo',
    schema: {
      example: {
        fairId: '...',
        conversions: [
          {
            howDidYouKnow: 'instagram',
            totalRegistered: 307,
            visitorsWithCheckins: 79,
            totalCheckIns: 89,
            conversionRate: 25.73,
            percentOfTotal: 34.2,
            spend: 8397.83,
            cpl: 27.35,
            cpa: 106.3,
            sharedWithChannels: ['facebook'],
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getConversionsByHowDidYouKnow(@Query('fairId') fairId: string) {
    const { totalVisitors, channels } = await getChannelPerformanceWithCostData(
      this.dashboardService,
      this.expensesService,
      fairId,
    );

    return {
      fairId,
      totalVisitors,
      conversions: channels.map(({ channel, ...rest }) => ({
        howDidYouKnow: channel,
        ...rest,
      })),
    };
  }
}
