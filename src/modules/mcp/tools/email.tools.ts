import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EmailsService } from 'src/modules/emails/emails.service';
import { textResult, registerToolWithInput } from './common';

export function registerEmailTools(
  server: McpServer,
  emailsService: EmailsService,
) {
  server.registerTool(
    'list_email_campaigns',
    {
      description:
        'Lista as campanhas de email marketing já enviadas, mais recentes primeiro, com id, título, assunto e total de destinatários.',
    },
    async () => textResult(await emailsService.getCampaigns()),
  );

  registerToolWithInput(
    server,
    'get_email_campaign_stats',
    'Retorna as estatísticas de entrega/abertura/clique de uma campanha de email específica (via Brevo).',
    {
      campaignId: z
        .string()
        .describe('id da campanha, obtido via list_email_campaigns'),
    },
    async ({ campaignId }) =>
      textResult(await emailsService.getCampaignStats(campaignId)),
  );
}
