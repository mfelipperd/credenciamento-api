import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ExpensesService } from 'src/modules/finance/expenses/expenses.service';
import { FinanceCategoriesService } from 'src/modules/finance/common/services/finance-categories.service';
import { AccountsService } from 'src/modules/finance/common/services/accounts.service';
import { McpRequestUser } from '../oauth/mcp-auth.guard';
import { textResult, registerToolWithInput, assertFairAccess } from './common';

export function registerExpenseTools(
  server: McpServer,
  expensesService: ExpensesService,
  categoriesService: FinanceCategoriesService,
  accountsService: AccountsService,
  user: McpRequestUser,
) {
  registerToolWithInput(
    server,
    'list_expense_categories',
    'Lista as categorias de despesa disponíveis pra uma feira (específicas da feira + globais). Use antes de create_expense ' +
      'pra sugerir a categoria certa ao usuário. Se nenhuma servir, use create_expense_category pra criar uma nova específica ' +
      'da feira.',
    { fairId: z.string().describe('id da feira, obtido via list_fairs') },
    async ({ fairId }) => {
      assertFairAccess(user, fairId);
      const categories = await categoriesService.findByFair(fairId);
      return textResult(
        categories.map((c) => ({
          id: c.id,
          nome: c.nome,
          global: c.global,
          isRequired: c.isRequired,
        })),
      );
    },
  );

  registerToolWithInput(
    server,
    'create_expense_category',
    'Cria uma categoria de despesa nova, específica de uma feira (não global). Use quando nenhuma categoria existente em ' +
      'list_expense_categories servir pro tipo de gasto da nota que o usuário mandou.',
    {
      fairId: z.string().describe('id da feira à qual a categoria vai pertencer'),
      nome: z.string().describe('nome da categoria, ex: "Comunicação Visual", "Equipamentos"'),
      description: z.string().optional().describe('descrição opcional do que essa categoria cobre'),
    },
    async ({ fairId, nome, description }) => {
      assertFairAccess(user, fairId);
      const category = await categoriesService.create({
        nome,
        fairId,
        global: false,
        description,
      });
      return textResult(category);
    },
  );

  server.registerTool(
    'list_accounts',
    {
      description:
        'Lista as contas bancárias/financeiras cadastradas no sistema. Use pra saber qual accountId passar em create_expense.',
    },
    async () => {
      const accounts = await accountsService.findAll();
      return textResult(
        accounts.map((a) => ({ id: a.id, nomeConta: a.nomeConta, banco: a.banco })),
      );
    },
  );

  registerToolWithInput(
    server,
    'find_similar_expenses',
    'Busca despesas parecidas já cadastradas (mesma feira, direta ou rateada entre feiras) — use SEMPRE antes de create_expense ' +
      'pra checar se a nota que o usuário mandou já não foi lançada. Informe pelo menos um dos filtros (valor, ' +
      'descricaoContains ou data).',
    {
      fairId: z.string().describe('id da feira'),
      valor: z.number().positive().optional().describe('valor da despesa, em reais — busca com tolerância de R$0,50'),
      descricaoContains: z
        .string()
        .optional()
        .describe('trecho de texto pra buscar na descrição (ex: nome do fornecedor)'),
      data: z.string().optional().describe('data da despesa (YYYY-MM-DD) — busca com tolerância de dias'),
      diasTolerancia: z.number().int().positive().optional().describe('tolerância em dias pra comparar com "data" (padrão: 45)'),
    },
    async ({ fairId, valor, descricaoContains, data, diasTolerancia }) => {
      assertFairAccess(user, fairId);
      const similares = await expensesService.findSimilarExpenses({
        fairId,
        valor,
        descricaoContains,
        data,
        diasTolerancia,
      });
      return textResult(
        similares.map((e) => ({
          id: e.id,
          descricao: e.descricao,
          valor: Number(e.valor),
          data: e.data,
          isOverhead: e.isOverhead,
          categoria: e.category?.nome ?? null,
          rateioComFeiras: e.fairAllocations?.map((a) => a.fairId) ?? [],
        })),
      );
    },
  );

  registerToolWithInput(
    server,
    'create_expense',
    'Cadastra uma despesa a partir de dados já extraídos de uma nota/comprovante (a extração da imagem/PDF é feita por quem ' +
      'está chamando esse tool, não por esse endpoint). Fluxo recomendado: 1) list_fairs pra achar a feira certa; ' +
      '2) find_similar_expenses pra checar duplicidade; 3) list_expense_categories (ou create_expense_category se nenhuma ' +
      'servir) pra escolher a categoria; 4) list_accounts pra escolher a conta; 5) chamar esse tool. Se a despesa for ' +
      'compartilhada entre feiras (rateio), passe overheadFairs com o rateio — a feira em fairId é usada só pra criar o ' +
      'registro inicial, o rateio real vem de overheadFairs.',
    {
      fairId: z.string().describe('id da feira principal (obtido via list_fairs)'),
      categoryId: z.string().describe('id da categoria (obtido via list_expense_categories ou create_expense_category)'),
      accountId: z.string().describe('id da conta bancária (obtido via list_accounts)'),
      descricao: z.string().describe('descrição da despesa, ex: "Segurança - CRL Serviços (Crissy River)"'),
      valor: z.number().positive().describe('valor da despesa em reais'),
      data: z.string().describe('data do pagamento, formato YYYY-MM-DD'),
      observacoes: z
        .string()
        .optional()
        .describe(
          'observações — SEMPRE inclua a origem do dado (ex: "comprovante PIX anexado no chat", "confirmado verbalmente pelo usuário, sem comprovante")',
        ),
      overheadFairs: z
        .array(
          z.object({
            fairId: z.string(),
            percentual: z
              .number()
              .min(0.0001)
              .max(1)
              .optional()
              .describe('percentual decimal (0-1). Se omitido em todos os itens, divide igualmente.'),
          }),
        )
        .min(1)
        .optional()
        .describe('se a despesa é compartilhada entre feiras, o rateio completo (incluindo a feira de fairId, se aplicável)'),
    },
    async ({ fairId, categoryId, accountId, descricao, valor, data, observacoes, overheadFairs }) => {
      assertFairAccess(user, fairId);
      for (const alloc of overheadFairs ?? []) assertFairAccess(user, alloc.fairId);

      const expense = await expensesService.create({
        fairId,
        categoryId,
        accountId,
        descricao,
        valor,
        data,
        observacoes,
      });

      if (overheadFairs && overheadFairs.length > 0) {
        const updated = await expensesService.setOverhead(expense.id, {
          fairs: overheadFairs,
        });
        return textResult(updated);
      }

      return textResult(expense);
    },
  );
}
