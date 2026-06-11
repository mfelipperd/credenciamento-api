import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChartsService, parseFairIds } from './charts.service';

@ApiTags('Gráficos & KPIs')
@ApiBearerAuth('JWT-auth')
@Controller('charts')
export class ChartsController {
  constructor(private readonly chartsService: ChartsService) {}

  @Get('fair/:fairId/kpi')
  @ApiOperation({
    summary: 'KPIs consolidados da feira',
    description: `Retorna todos os KPIs de uma feira em uma única chamada.
Campos de referência para os cards do frontend:
- receita.totalContrato → "Receita Total"
- receita.totalRecebido → "Recebido"
- receita.totalAReceber → "A Receber"
- receita.totalVencido  → "Em Atraso"
- receita.inadimplencia → "Inadimplência %"
- despesas.total        → "Total de Despesas"
- resultado.lucroLiquido → "Lucro Líquido"
- resultado.margemLiquida → "Margem Líquida %"
- visitantes.total      → "Inscritos"
- visitantes.checkins   → "Check-ins"
- visitantes.taxaComparecimento → "Taxa de Comparecimento %"
- visitantes.custoPorVisitante  → "Custo por Visitante"`,
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiResponse({ status: 200, description: 'KPIs consolidados da feira' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  fairKpi(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.chartsService.fairKpi(fairId);
  }

  @Get('fair/:fairId/expenses-by-category')
  @ApiOperation({
    summary: 'Despesas por categoria (Donut)',
    description: 'Inclui despesas diretas e rateadas. Use com ApexCharts type: "donut" — options.labels = labels, series = values.',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiResponse({ status: 200, description: 'Dados para gráfico donut de despesas por categoria', schema: { example: { labels: ['Marketing', 'Estrutura'], series: [3500, 7000] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  expensesByCategory(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.chartsService.expensesByCategory(fairId);
  }

  @Get('fair/:fairId/revenues-by-status')
  @ApiOperation({
    summary: 'Receitas por status (Donut)',
    description: 'Agrupa receitas por status: PAGO, EM_ANDAMENTO, PENDENTE, EM_ATRASO. Use com ApexCharts type: "donut".',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiResponse({ status: 200, description: 'Dados para gráfico donut de receitas por status' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  revenuesByStatus(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.chartsService.revenuesByStatus(fairId);
  }

  @Get('fair/:fairId/revenue-forecast')
  @ApiOperation({
    summary: 'Previsão de receitas por mês (Stacked Bar)',
    description: 'Parcelas a receber e vencidas agrupadas por mês. Use com ApexCharts type: "bar", stacked: true, colors: ["#008FFB","#FF4560"].',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiResponse({ status: 200, description: 'Dados para gráfico de previsão de receitas por mês' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  revenueForecast(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.chartsService.revenueForecast(fairId);
  }

  @Get('fair/:fairId/visitors-timeline')
  @ApiOperation({
    summary: 'Evolução de inscrições ao longo do tempo (Line)',
    description: 'series[0] = acumulado (line), series[1] = diário (bar). Use com ApexCharts type: "line".',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiResponse({ status: 200, description: 'Dados para gráfico de linha de inscrições ao longo do tempo' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  visitorsTimeline(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.chartsService.visitorsTimeline(fairId);
  }

  @Get('fair/:fairId/checkins-by-hour')
  @ApiOperation({
    summary: 'Check-ins por hora do dia (Bar)',
    description: 'Mostra o pico de movimento na feira hora a hora (00h–23h). Use com ApexCharts type: "bar".',
  })
  @ApiParam({ name: 'fairId', description: 'ID da feira (UUID)' })
  @ApiResponse({ status: 200, description: 'Dados para gráfico de barras de check-ins por hora' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  checkinsByHour(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.chartsService.checkinsByHour(fairId);
  }

  @Get('compare')
  @ApiOperation({
    summary: 'Comparativo: Receita vs Despesas vs Lucro por feira (Grouped Bar)',
    description: 'Aceita múltiplas feiras via ?fairIds=uuid1,uuid2,uuid3. Se fairIds for omitido, retorna arrays vazios. Use com ApexCharts type: "bar", colors: ["#00E396","#FF4560","#008FFB"].',
  })
  @ApiQuery({ name: 'fairIds', required: false, description: 'Lista de IDs de feiras separados por vírgula' })
  @ApiResponse({ status: 200, description: 'Dados comparativos de receita, despesas e lucro por feira' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  compareRevenueVsExpenses(@Query('fairIds') fairIds?: string) {
    return this.chartsService.compareRevenueVsExpenses(parseFairIds(fairIds));
  }

  @Get('compare/margins')
  @ApiOperation({
    summary: 'Comparativo: Margem Líquida % por feira (Horizontal Bar)',
    description: 'Ranking de feiras por margem líquida. Use com ApexCharts type: "bar", horizontal: true.',
  })
  @ApiQuery({ name: 'fairIds', required: false, description: 'Lista de IDs de feiras separados por vírgula' })
  @ApiResponse({ status: 200, description: 'Dados de margem líquida por feira' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  compareMargins(@Query('fairIds') fairIds?: string) {
    return this.chartsService.compareMargins(parseFairIds(fairIds));
  }

  @Get('compare/expenses-breakdown')
  @ApiOperation({
    summary: 'Comparativo: Despesas diretas vs rateadas por feira (Stacked Bar)',
    description: 'Detalha a composição das despesas de cada feira. Use com ApexCharts type: "bar", stacked: true.',
  })
  @ApiQuery({ name: 'fairIds', required: false, description: 'Lista de IDs de feiras separados por vírgula' })
  @ApiResponse({ status: 200, description: 'Dados de breakdown de despesas por feira' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  compareExpensesBreakdown(@Query('fairIds') fairIds?: string) {
    return this.chartsService.compareExpensesBreakdown(parseFairIds(fairIds));
  }
}
