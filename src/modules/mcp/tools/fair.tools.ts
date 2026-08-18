import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FairsService } from 'src/modules/fairs/fairs.service';
import { DashboardService } from 'src/modules/dashboard/dashboard.service';
import { textResult, registerToolWithInput } from './common';

export function registerFairTools(
  server: McpServer,
  fairsService: FairsService,
  dashboardService: DashboardService,
) {
  server.registerTool(
    'list_fairs',
    {
      description:
        'Lista todas as feiras cadastradas no sistema, com id, nome, edição, cidade, status e datas. Use o id retornado aqui para chamar as demais tools que pedem fairId.',
    },
    async () => {
      const fairs = await fairsService.findAll();
      const summary = fairs.map((f) => ({
        id: f.id,
        name: f.name,
        edition: f.edition,
        city: f.city,
        state: f.state,
        status: f.status,
        startDate: f.startDate,
        endDate: f.endDate,
      }));
      return textResult(summary);
    },
  );

  registerToolWithInput(
    server,
    'get_fair_overview',
    'Retorna o total de visitantes cadastrados e de checkins realizados em uma feira específica.',
    { fairId: z.string().describe('id da feira, obtido via list_fairs') },
    async ({ fairId }) => textResult(await dashboardService.getOverview(fairId)),
  );

  server.registerTool(
    'get_fair_stats',
    {
      description:
        'Retorna estatísticas gerais de todas as feiras: total de feiras, feiras ativas/inativas, receita e lucro esperados agregados.',
    },
    async () => textResult(await fairsService.getFairStats()),
  );
}
