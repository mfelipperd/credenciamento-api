import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ChartsService } from 'src/modules/finance/charts/charts.service';
import { RevenueChartsService } from 'src/modules/finance/revenues/revenue-charts.service';
import { textResult, registerToolWithInput } from './common';

export function registerFinanceTools(
  server: McpServer,
  chartsService: ChartsService,
  revenueChartsService: RevenueChartsService,
) {
  registerToolWithInput(
    server,
    'get_fair_financial_summary',
    'Retorna o resumo financeiro de uma feira: KPIs (receita, despesas, lucro, margem) e o resumo executivo de receitas (pagas, pendentes, vencidas).',
    { fairId: z.string().describe('id da feira, obtido via list_fairs') },
    async ({ fairId }) => {
      const [kpi, revenueSummary] = await Promise.all([
        chartsService.fairKpi(fairId),
        revenueChartsService.getExecutiveSummary(fairId),
      ]);
      return textResult({ kpi, revenueSummary });
    },
  );
}
