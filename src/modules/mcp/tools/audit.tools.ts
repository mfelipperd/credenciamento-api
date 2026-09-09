import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AuditReportService } from 'src/modules/finance/audit-report/audit-report.service';
import { McpRequestUser } from '../oauth/mcp-auth.guard';
import { textResult, registerToolWithInput, assertFairAccess } from './common';

export function registerAuditTools(
  server: McpServer,
  auditReportService: AuditReportService,
  user: McpRequestUser,
) {
  registerToolWithInput(
    server,
    'get_fair_full_audit',
    'Auditoria financeira completa e detalhada de uma feira: cada receita e despesa individualmente (direta e rateada com ' +
      'outras feiras), cálculo de impostos (Simples Nacional) e divisão do lucro líquido entre os sócios cadastrados para ' +
      'a feira. Mesma fonte de dados usada no PDF de auditoria (GET /fairs/:fairId/audit-report/pdf) — use este tool quando ' +
      'precisar dos números para análise/conversa, e o endpoint PDF quando precisar do documento formatado.',
    {
      fairId: z.string().describe('id da feira, obtido via list_fairs'),
      rbt12: z
        .number()
        .positive()
        .optional()
        .describe(
          "RBT12 real da Oficina d'Ideias em reais, se conhecido. Se omitido, usa a soma de receitas de todas as feiras do mesmo ano cadastradas como estimativa.",
        ),
      annex: z
        .enum(['III', 'V'])
        .optional()
        .describe('Anexo do Simples Nacional a aplicar, se validado contabilmente. Padrão: III.'),
    },
    async ({ fairId, rbt12, annex }) => {
      assertFairAccess(user, fairId);
      const data = await auditReportService.buildReportData(fairId, { rbt12, annex });
      return textResult(data);
    },
  );
}
