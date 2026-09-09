import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CheckInsService } from 'src/modules/checkins/checkins.service';
import { McpRequestUser } from '../oauth/mcp-auth.guard';
import { textResult, registerToolWithInput, assertFairAccess } from './common';

export function registerCheckinTools(
  server: McpServer,
  checkInsService: CheckInsService,
  user: McpRequestUser,
) {
  registerToolWithInput(
    server,
    'get_checkins_summary',
    'Retorna os checkins realizados em uma feira, incluindo a distribuição por hora.',
    { fairId: z.string().describe('id da feira, obtido via list_fairs') },
    async ({ fairId }) => {
      assertFairAccess(user, fairId);
      const [{ checkIns }, perHour] = await Promise.all([
        checkInsService.getCheckIns(fairId),
        checkInsService.getCheckinsPerHour(fairId),
      ]);
      return textResult({ fairId, totalCheckins: checkIns.length, perHour });
    },
  );
}
