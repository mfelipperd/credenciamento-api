import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CheckInsService } from 'src/modules/checkins/checkins.service';
import { textResult, registerToolWithInput } from './common';

export function registerCheckinTools(
  server: McpServer,
  checkInsService: CheckInsService,
) {
  registerToolWithInput(
    server,
    'get_checkins_summary',
    'Retorna os checkins realizados em uma feira, incluindo a distribuição por hora.',
    { fairId: z.string().describe('id da feira, obtido via list_fairs') },
    async ({ fairId }) => {
      const [{ checkIns }, perHour] = await Promise.all([
        checkInsService.getCheckIns(fairId),
        checkInsService.getCheckinsPerHour(fairId),
      ]);
      return textResult({ fairId, totalCheckins: checkIns.length, perHour });
    },
  );
}
