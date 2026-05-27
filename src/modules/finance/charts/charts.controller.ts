import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ChartsService, parseFairIds } from './charts.service';

@Controller('charts')
export class ChartsController {
  constructor(private readonly chartsService: ChartsService) {}

  // ─── KPI Cards ─────────────────────────────────────────────────────────────
  //
  //  Retorna todos os KPIs de uma feira em uma única chamada.
  //  Use os campos individuais para cada card separado no frontend:
  //
  //  receita.totalContrato    → Card "Receita Total"
  //  receita.totalRecebido    → Card "Recebido"
  //  receita.totalAReceber    → Card "A Receber"
  //  receita.totalVencido     → Card "Em Atraso"
  //  receita.inadimplencia    → Card "Inadimplência %" (badge colorido)
  //  despesas.total           → Card "Total de Despesas"
  //  resultado.lucroLiquido   → Card "Lucro Líquido"
  //  resultado.margemLiquida  → Card "Margem Líquida %"
  //  visitantes.total         → Card "Inscritos"
  //  visitantes.checkins      → Card "Check-ins"
  //  visitantes.taxaComparecimento → Card "Taxa de Comparecimento %"
  //  visitantes.custoPorVisitante  → Card "Custo por Visitante"

  @Get('fair/:fairId/kpi')
  fairKpi(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.chartsService.fairKpi(fairId);
  }

  // ─── Gráficos por feira ────────────────────────────────────────────────────

  // Donut — distribuição de despesas por categoria (inclui rateadas)
  // ApexCharts: type: 'donut' | options.labels = labels | series = values
  @Get('fair/:fairId/expenses-by-category')
  expensesByCategory(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.chartsService.expensesByCategory(fairId);
  }

  // Donut — receitas por status (PAGO / EM_ANDAMENTO / PENDENTE / EM_ATRASO)
  // ApexCharts: type: 'donut'
  @Get('fair/:fairId/revenues-by-status')
  revenuesByStatus(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.chartsService.revenuesByStatus(fairId);
  }

  // Stacked Bar — parcelas a receber e vencidas agrupadas por mês
  // ApexCharts: type: 'bar', stacked: true, colors: ['#008FFB','#FF4560']
  @Get('fair/:fairId/revenue-forecast')
  revenueForecast(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.chartsService.revenueForecast(fairId);
  }

  // Line — evolução de inscrições ao longo do tempo (acumulado + diário)
  // ApexCharts: type: 'line' | series[0]=acumulado (eixo y), series[1]=diário (barras)
  @Get('fair/:fairId/visitors-timeline')
  visitorsTimeline(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.chartsService.visitorsTimeline(fairId);
  }

  // Bar — check-ins por horário do dia (00h–23h)
  // ApexCharts: type: 'bar' | mostra pico de movimento na feira
  @Get('fair/:fairId/checkins-by-hour')
  checkinsByHour(@Param('fairId', ParseUUIDPipe) fairId: string) {
    return this.chartsService.checkinsByHour(fairId);
  }

  // ─── Gráficos comparativos (múltiplas feiras) ─────────────────────────────
  //
  //  Todos aceitam: ?fairIds=uuid1,uuid2,uuid3
  //  Se fairIds for omitido → retorna arrays vazios.

  // Grouped Bar — Receita / Despesas / Lucro por feira
  // ApexCharts: type: 'bar', colors: ['#00E396','#FF4560','#008FFB']
  @Get('compare')
  compareRevenueVsExpenses(@Query('fairIds') fairIds?: string) {
    return this.chartsService.compareRevenueVsExpenses(parseFairIds(fairIds));
  }

  // Horizontal Bar — Margem Líquida % por feira (ranking)
  // ApexCharts: type: 'bar', horizontal: true
  @Get('compare/margins')
  compareMargins(@Query('fairIds') fairIds?: string) {
    return this.chartsService.compareMargins(parseFairIds(fairIds));
  }

  // Stacked Bar — Despesas diretas vs rateadas por feira
  // ApexCharts: type: 'bar', stacked: true
  @Get('compare/expenses-breakdown')
  compareExpensesBreakdown(@Query('fairIds') fairIds?: string) {
    return this.chartsService.compareExpensesBreakdown(parseFairIds(fairIds));
  }
}
