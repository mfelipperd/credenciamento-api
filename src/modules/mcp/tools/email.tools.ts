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

  registerToolWithInput(
    server,
    'get_campaign_html_reference',
    'Retorna o HTML completo de uma campanha de email já enviada, para usar como referência de estilo/identidade visual ao escrever uma nova campanha (cores, fontes, estrutura do template da ExpoMultiMix).',
    {
      campaignId: z
        .string()
        .describe('id da campanha, obtido via list_email_campaigns'),
    },
    async ({ campaignId }) =>
      textResult(await emailsService.getCampaignHtmlContent(campaignId)),
    { readOnlyHint: true, title: 'Referência de HTML de campanha' },
  );

  const audienceConditionSchema = z.object({
    fairId: z.string().describe('id da feira, obtido via list_fairs'),
    status: z
      .enum(['registered', 'present', 'absent'])
      .describe(
        '"registered" = cadastrado na feira (foi ou não); "present" = fez checkin (compareceu); "absent" = cadastrado mas NÃO fez checkin',
      ),
  });

  registerToolWithInput(
    server,
    'preview_marketing_email',
    'Prepara uma campanha de email marketing e mostra quantos destinatários ela vai atingir, SEM enviar nada. Use antes de send_marketing_email. O htmlContent deve seguir a identidade visual da ExpoMultiMix — use get_campaign_html_reference numa campanha anterior antes de escrever o HTML. Para o público-alvo, use OU (targetFairId + templateFairId + sendTo) para o caso simples, OU audienceQuery para segmentação combinando múltiplas feiras — não os dois.',
    {
      title: z.string().describe('título interno da campanha (para o painel de campanhas)'),
      subject: z
        .string()
        .describe(
          'assunto do email. Pode incluir {{VISITOR_NAME}} para personalizar com o nome do destinatário.',
        ),
      htmlContent: z
        .string()
        .describe(
          'HTML completo do email. Pode incluir {{VISITOR_NAME}} no corpo para personalização.',
        ),
      targetFairId: z
        .string()
        .optional()
        .describe(
          'Caso simples: id da feira principal do público-alvo, obtido via list_fairs. Use com templateFairId + sendTo, OU use audienceQuery em vez disso.',
        ),
      templateFairId: z
        .string()
        .optional()
        .describe('Caso simples: id da feira usada como referência de template (geralmente igual a targetFairId). Só faz sentido junto de targetFairId.'),
      additionalFairIds: z
        .array(z.string())
        .optional()
        .describe('Caso simples: ids de feiras adicionais para combinar público (dedup por email, sempre OR). Só faz sentido junto de targetFairId.'),
      sendTo: z
        .enum(['all', 'absent'])
        .optional()
        .describe('Caso simples: "all" = todos os cadastrados; "absent" = só quem não fez checkin. Só faz sentido junto de targetFairId.'),
      audienceQuery: z
        .object({
          operator: z
            .enum(['AND', 'OR'])
            .describe(
              'AND = interseção (precisa satisfazer todas as condições). OR = união (satisfaz qualquer uma, com dedup por email). ATENÇÃO: "cadastrado mas não foi em nenhuma das duas feiras" é AND de absent+absent (interseção de quem faltou nas duas), NÃO OR — usar OR aqui pegaria quase todo mundo, já que basta faltar em uma das duas.',
            ),
          conditions: z
            .array(audienceConditionSchema)
            .min(1)
            .describe('Lista de condições de presença/cadastro por feira, combinadas pelo operator.'),
        })
        .optional()
        .describe(
          'Segmentação avançada combinando condições entre múltiplas feiras. Exemplos: {operator:"AND",conditions:[{fairId:X,status:"absent"},{fairId:Y,status:"absent"}]} = cadastrado em X e Y mas não foi em nenhuma das duas. {operator:"AND",conditions:[{fairId:X,status:"registered"},{fairId:Y,status:"present"}]} = cadastrado em X e foi em Y. Use isso OU targetFairId+templateFairId+sendTo, não os dois.',
        ),
    },
    async (params) => textResult(await emailsService.previewMarketingEmail(params)),
    { readOnlyHint: true, title: 'Pré-visualizar campanha (não envia)' },
  );

  registerToolWithInput(
    server,
    'send_marketing_email',
    'ENVIA DE VERDADE uma campanha de email marketing para os destinatários reais. Exige um previewId obtido via preview_marketing_email — sempre confirme os números do preview com o usuário antes de chamar esta tool.',
    {
      previewId: z
        .string()
        .describe('id retornado por preview_marketing_email'),
    },
    async ({ previewId }) =>
      textResult(await emailsService.confirmMarketingEmail(previewId)),
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
      title: 'Enviar campanha de email (ação real, irreversível)',
    },
  );
}
