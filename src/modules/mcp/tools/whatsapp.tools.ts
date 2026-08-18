import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WhatsappService } from 'src/modules/whatsapp/whatsapp.service';
import { textResult, registerToolWithInput } from './common';

export function registerWhatsappTools(
  server: McpServer,
  whatsappService: WhatsappService,
) {
  server.registerTool(
    'list_whatsapp_campaigns',
    {
      description:
        'Lista as campanhas de WhatsApp, mais recentes primeiro, com id, título, status e totais de elegíveis/enfileirados/enviados/falhados.',
    },
    async () => textResult(await whatsappService.getCampaigns()),
  );

  registerToolWithInput(
    server,
    'get_whatsapp_campaign_stats',
    'Retorna os destinatários de uma campanha de WhatsApp, agrupados por status (enfileirado, enviado, falhado, pulado).',
    {
      campaignId: z
        .string()
        .describe('id da campanha, obtido via list_whatsapp_campaigns'),
    },
    async ({ campaignId }) => {
      const recipients = await whatsappService.getCampaignRecipients(campaignId);
      const byStatus: Record<string, number> = {};
      for (const r of recipients) {
        byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      }
      return textResult({
        campaignId,
        totalRecipients: recipients.length,
        byStatus,
      });
    },
  );
}
