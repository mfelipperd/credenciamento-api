import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VisitorsService } from 'src/modules/visitors/visitors.service';
import { User } from 'src/modules/users/entitie/users.entity';
import { EUserRole } from 'src/enum/role';
import { McpRequestUser } from '../oauth/mcp-auth.guard';
import { textResult, registerToolWithInput, assertFairAccess } from './common';

export function registerVisitorTools(
  server: McpServer,
  visitorsService: VisitorsService,
  user: McpRequestUser,
) {
  registerToolWithInput(
    server,
    'get_visitor_stats',
    'Retorna estatísticas de visitantes: total, cadastrados nos últimos 7 dias, empresas únicas e percentual recente. Se fairId não for informado, considera todas as feiras.',
    {
      fairId: z
        .string()
        .optional()
        .describe(
          'id da feira, obtido via list_fairs. Omitir para ver todas as feiras (só permitido pra admin).',
        ),
    },
    async ({ fairId }) => {
      if (fairId) {
        assertFairAccess(user, fairId);
      } else if (user.role !== EUserRole.ADMIN) {
        throw new Error(
          'Informe um fairId — apenas administradores podem ver estatísticas agregadas de todas as feiras.',
        );
      }

      // getVisitorsStats only reads user.role internally; the MCP token's decoded
      // payload carries that (and nothing else the method needs), so it stands in
      // for the full User entity here without querying the DB again.
      return textResult(
        await visitorsService.getVisitorsStats(user as unknown as User, fairId),
      );
    },
  );
}
