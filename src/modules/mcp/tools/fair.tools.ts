import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FairsService } from 'src/modules/fairs/fairs.service';
import { DashboardService } from 'src/modules/dashboard/dashboard.service';
import { EUserRole } from 'src/enum/role';
import { McpRequestUser } from '../oauth/mcp-auth.guard';
import { textResult, registerToolWithInput, assertFairAccess } from './common';

export function registerFairTools(
  server: McpServer,
  fairsService: FairsService,
  dashboardService: DashboardService,
  user: McpRequestUser,
) {
  server.registerTool(
    'list_fairs',
    {
      description:
        'Lista as feiras que o usuário logado pode ver (admin vê todas; sócio vê só as feiras em que é sócio; outros ' +
        'perfis veem as feiras associadas ao seu usuário). Use o id retornado aqui para chamar as demais tools que pedem ' +
        'fairId.',
    },
    async () => {
      const allFairs = await fairsService.findAll();
      const fairs =
        user.role === EUserRole.ADMIN
          ? allFairs
          : allFairs.filter((f) => user.fairIds.includes(f.id));
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
    async ({ fairId }) => {
      assertFairAccess(user, fairId);
      return textResult(await dashboardService.getOverview(fairId));
    },
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
