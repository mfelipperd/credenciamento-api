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
        'Lista as campanhas de WhatsApp, mais recentes primeiro, com id, título e totais de enfileirados/enviados/falhados.',
    },
    async () => textResult(await whatsappService.getCampaigns()),
  );

  registerToolWithInput(
    server,
    'get_whatsapp_campaign_stats',
    'Retorna os totais de enfileirados/enviados/falhados de uma campanha de WhatsApp específica.',
    {
      campaignId: z
        .string()
        .describe('id da campanha, obtido via list_whatsapp_campaigns'),
    },
    async ({ campaignId }) => {
      const campaigns = await whatsappService.getCampaigns();
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (!campaign) {
        return textResult({ error: `Campanha ${campaignId} não encontrada` });
      }
      return textResult(campaign);
    },
  );
}
