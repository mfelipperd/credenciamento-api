import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DashboardService } from 'src/modules/dashboard/dashboard.service';
import { ExpensesService } from 'src/modules/finance/expenses/expenses.service';
import { McpRequestUser } from '../oauth/mcp-auth.guard';
import { textResult, registerToolWithInput, assertFairAccess } from './common';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/**
 * Grupos de palavras-chave usados pra casar um canal de aquisição
 * (howDidYouKnow) com despesas financeiras cuja descrição ou categoria
 * mencione o meio pago correspondente. Necessário porque as despesas de
 * mídia paga ficam todas na mesma categoria global "MARKETING" — o que
 * distingue uma da outra é o texto da descrição (ex: "Facebook/Instagram
 * Ads (Meta)...", "Google Ads..."), não a categoria.
 */
const CHANNEL_KEYWORD_GROUPS: Record<string, string[]> = {
  meta: ['meta', 'facebook', 'instagram', 'fb ads'],
  google: ['google'],
  trafego: ['trafego', 'site'],
  email: ['email marketing', 'e-mail', 'mailing'],
  tv: ['tv', 'televisao'],
  outdoor: ['outdoor', 'midia externa'],
};

/**
 * Decide a qual grupo de palavras-chave um canal pertence, comparando o
 * nome do canal (normalizado) com os gatilhos de cada grupo. Retorna a
 * CHAVE do grupo (ex: "meta"), não a lista de palavras — várias respostas
 * de canal (ex: "instagram" e "facebook") podem cair no mesmo grupo porque
 * são pagas pela mesma verba (Meta Ads), e nesse caso o gasto não pode ser
 * contado uma vez por canal — teria que ser somado uma vez só pro grupo.
 */
function keywordGroupForChannel(channel: string): string | null {
  const normalizedChannel = normalize(channel ?? '');
  for (const [groupKey, keywords] of Object.entries(CHANNEL_KEYWORD_GROUPS)) {
    const matches = keywords.some((keyword) => {
      const normalizedKeyword = normalize(keyword);
      return (
        normalizedChannel.includes(normalizedKeyword) ||
        normalizedKeyword.includes(normalizedChannel)
      );
    });
    if (matches) return groupKey;
  }
  return null;
}

interface MatchableExpense {
  descricao: string | null;
  categoryName: string | null;
  valor: number;
}

/**
 * Verifica se a descrição ou o nome da categoria de uma despesa contém
 * alguma das palavras-chave do grupo.
 */
function expenseMatchesKeywords(
  expense: Pick<MatchableExpense, 'descricao' | 'categoryName'>,
  keywords: string[],
): boolean {
  const text = normalize(
    `${expense.descricao ?? ''} ${expense.categoryName ?? ''}`,
  );
  return keywords.some((keyword) => text.includes(normalize(keyword)));
}

/** Soma o valor das despesas (diretas + overhead alocado) que casam com o grupo de palavras-chave. */
function spendForKeywords(
  matchableExpenses: MatchableExpense[],
  keywords: string[],
): { spend: number; matchedCount: number } {
  const matched = matchableExpenses.filter((e) =>
    expenseMatchesKeywords(e, keywords),
  );
  return {
    spend: matched.reduce((sum, e) => sum + e.valor, 0),
    matchedCount: matched.length,
  };
}

async function buildMatchableExpenses(
  expensesService: ExpensesService,
  fairId: string,
): Promise<MatchableExpense[]> {
  const [directExpenses, overheadAllocated] = await Promise.all([
    expensesService.findAllByFair(fairId),
    expensesService.findOverheadAllocatedForFair(fairId),
  ]);

  return [
    ...directExpenses.map((e) => ({
      descricao: e.descricao ?? null,
      categoryName: e.category?.nome ?? null,
      valor: Number(e.valor),
    })),
    ...overheadAllocated.map((e) => ({
      descricao: e.descricao,
      categoryName: e.category?.name ?? null,
      valor: e.valorAlocado,
    })),
  ];
}

export interface ChannelPerformanceItem {
  channel: string;
  totalRegistered: number;
  totalCheckIns: number;
  visitorsWithCheckins: number;
  conversionRate: number;
  percentOfTotal: number;
}

export interface ChannelPerformanceData {
  fairId: string;
  totalVisitors: number;
  channels: ChannelPerformanceItem[];
}

export async function getChannelPerformanceData(
  dashboardService: DashboardService,
  fairId: string,
): Promise<ChannelPerformanceData> {
  const { conversions } =
    await dashboardService.getConversionsByHowDidYouKnow(fairId);

  const totalVisitors = conversions.reduce(
    (sum, c) => sum + c.totalRegistered,
    0,
  );

  const channels = conversions.map((c) => ({
    channel: c.howDidYouKnow,
    totalRegistered: c.totalRegistered,
    totalCheckIns: c.totalCheckIns,
    visitorsWithCheckins: c.visitorsWithCheckins,
    conversionRate: c.conversionRate,
    percentOfTotal:
      totalVisitors > 0
        ? Math.round((c.totalRegistered / totalVisitors) * 10000) / 100
        : 0,
  }));

  return { fairId, totalVisitors, channels };
}

export interface ChannelPerformanceCostItem extends ChannelPerformanceItem {
  spend: number | null;
  cpl: number | null;
  cpa: number | null;
  /**
   * Outras respostas de canal (howDidYouKnow) que compartilham a mesma
   * verba/despesa que este — ex: "instagram" e "facebook" quando o gasto
   * registrado é uma única despesa "Facebook/Instagram Ads (Meta)". O
   * `spend` aqui NÃO deve ser somado entre canais que aparecem na lista uns
   * dos outros, senão o mesmo gasto é contado mais de uma vez.
   */
  sharedWithChannels: string[];
  note?: string;
}

export interface ChannelPerformanceWithCostData {
  fairId: string;
  totalVisitors: number;
  channels: ChannelPerformanceCostItem[];
}

/**
 * Como getChannelPerformanceData, mas decorado com o gasto de mídia paga
 * casado por palavra-chave. Mantém uma linha por resposta de canal
 * (howDidYouKnow) — não agrupa "instagram" e "facebook" numa linha só, pois
 * o gráfico de performance por canal precisa comparar cada resposta
 * individualmente. Quando duas respostas compartilham a mesma despesa
 * (mesma verba paga), isso fica explícito em `sharedWithChannels`, pra quem
 * consumir os dados não somar o mesmo gasto duas vezes.
 */
export async function getChannelPerformanceWithCostData(
  dashboardService: DashboardService,
  expensesService: ExpensesService,
  fairId: string,
): Promise<ChannelPerformanceWithCostData> {
  const [{ conversions }, matchableExpenses] = await Promise.all([
    dashboardService.getConversionsByHowDidYouKnow(fairId),
    buildMatchableExpenses(expensesService, fairId),
  ]);

  const totalVisitors = conversions.reduce(
    (sum, c) => sum + c.totalRegistered,
    0,
  );

  // Agrupa só pra saber quais canais compartilham verba e pra calcular o
  // gasto do grupo uma única vez (evita casar a mesma despesa N vezes).
  const groupKeyByChannel = new Map<string, string>();
  const channelsByGroupKey = new Map<string, string[]>();
  for (const c of conversions) {
    const groupKey = keywordGroupForChannel(c.howDidYouKnow ?? '');
    if (!groupKey) continue;
    groupKeyByChannel.set(c.howDidYouKnow, groupKey);
    const list = channelsByGroupKey.get(groupKey) ?? [];
    list.push(c.howDidYouKnow);
    channelsByGroupKey.set(groupKey, list);
  }

  const spendByGroupKey = new Map<string, number | null>();
  for (const groupKey of channelsByGroupKey.keys()) {
    const { spend, matchedCount } = spendForKeywords(
      matchableExpenses,
      CHANNEL_KEYWORD_GROUPS[groupKey],
    );
    spendByGroupKey.set(groupKey, matchedCount > 0 ? spend : null);
  }

  const channels: ChannelPerformanceCostItem[] = conversions.map((c) => {
    const percentOfTotal =
      totalVisitors > 0
        ? Math.round((c.totalRegistered / totalVisitors) * 10000) / 100
        : 0;

    const groupKey = groupKeyByChannel.get(c.howDidYouKnow);
    const base = {
      channel: c.howDidYouKnow,
      totalRegistered: c.totalRegistered,
      totalCheckIns: c.totalCheckIns,
      visitorsWithCheckins: c.visitorsWithCheckins,
      conversionRate: c.conversionRate,
      percentOfTotal,
    };

    if (!groupKey) {
      return {
        ...base,
        spend: null,
        cpl: null,
        cpa: null,
        sharedWithChannels: [],
        note: 'Canal sem grupo de palavras-chave de mídia paga associado (provável canal orgânico/gratuito)',
      };
    }

    const spend = spendByGroupKey.get(groupKey) ?? null;
    const sharedWithChannels = (channelsByGroupKey.get(groupKey) ?? []).filter(
      (name) => name !== c.howDidYouKnow,
    );

    if (spend === null) {
      return {
        ...base,
        spend: null,
        cpl: null,
        cpa: null,
        sharedWithChannels,
        note: `Nenhuma despesa encontrada com as palavras-chave: ${CHANNEL_KEYWORD_GROUPS[groupKey].join(', ')}`,
      };
    }

    const cpl = c.totalRegistered > 0 ? spend / c.totalRegistered : null;
    const cpa =
      c.visitorsWithCheckins > 0 ? spend / c.visitorsWithCheckins : null;

    return {
      ...base,
      spend: Math.round(spend * 100) / 100,
      cpl: cpl !== null ? Math.round(cpl * 100) / 100 : null,
      cpa: cpa !== null ? Math.round(cpa * 100) / 100 : null,
      sharedWithChannels,
    };
  });

  return { fairId, totalVisitors, channels };
}

export interface ChannelCostItem {
  channel: string;
  channels: string[];
  totalRegistered: number;
  visitorsWithCheckins: number;
  conversionRate: number;
  spend: number | null;
  cpl: number | null;
  cpa: number | null;
  flaggedExpensive: boolean;
  matchedExpenses?: number;
  note?: string;
}

export interface ChannelCostEffectivenessData {
  fairId: string;
  cpaThreshold: number | null;
  channels: ChannelCostItem[];
}

export async function getChannelCostEffectivenessData(
  dashboardService: DashboardService,
  expensesService: ExpensesService,
  fairId: string,
  cpaThreshold?: number,
): Promise<ChannelCostEffectivenessData> {
  const [{ conversions }, matchableExpenses] = await Promise.all([
    dashboardService.getConversionsByHowDidYouKnow(fairId),
    buildMatchableExpenses(expensesService, fairId),
  ]);

  const avgConversionRate =
    conversions.length > 0
      ? conversions.reduce((sum, c) => sum + c.conversionRate, 0) /
        conversions.length
      : 0;

  // Agrupa as respostas de canal (howDidYouKnow) pelo grupo de palavras-chave
  // que casam com elas. Duas respostas diferentes (ex: "instagram" e
  // "facebook") podem cair no mesmo grupo por serem pagas pela mesma verba
  // (Meta Ads) — nesse caso o gasto tem que ser contado uma vez só pro grupo
  // inteiro, senão a mesma despesa apareceria duplicada em cada canal.
  const groups = new Map<
    string,
    { channels: typeof conversions; keywords: string[] }
  >();
  const ungrouped: typeof conversions = [];

  for (const c of conversions) {
    const groupKey = keywordGroupForChannel(c.howDidYouKnow ?? '');
    if (!groupKey) {
      ungrouped.push(c);
      continue;
    }
    const existing = groups.get(groupKey);
    if (existing) {
      existing.channels.push(c);
    } else {
      groups.set(groupKey, {
        channels: [c],
        keywords: CHANNEL_KEYWORD_GROUPS[groupKey],
      });
    }
  }

  const channels: ChannelCostItem[] = [];

  for (const c of ungrouped) {
    channels.push({
      channel: c.howDidYouKnow,
      channels: [c.howDidYouKnow],
      totalRegistered: c.totalRegistered,
      visitorsWithCheckins: c.visitorsWithCheckins,
      conversionRate: c.conversionRate,
      spend: null,
      cpl: null,
      cpa: null,
      flaggedExpensive: false,
      note: 'Canal sem grupo de palavras-chave de mídia paga associado (provável canal orgânico/gratuito)',
    });
  }

  for (const { channels: groupChannels, keywords } of groups.values()) {
    const totalRegistered = groupChannels.reduce(
      (sum, c) => sum + c.totalRegistered,
      0,
    );
    const visitorsWithCheckins = groupChannels.reduce(
      (sum, c) => sum + c.visitorsWithCheckins,
      0,
    );
    const conversionRate =
      totalRegistered > 0
        ? Math.round((visitorsWithCheckins / totalRegistered) * 10000) / 100
        : 0;
    const channelLabel = groupChannels.map((c) => c.howDidYouKnow).join(' + ');

    const { spend, matchedCount } = spendForKeywords(
      matchableExpenses,
      keywords,
    );

    if (matchedCount === 0) {
      channels.push({
        channel: channelLabel,
        channels: groupChannels.map((c) => c.howDidYouKnow),
        totalRegistered,
        visitorsWithCheckins,
        conversionRate,
        spend: null,
        cpl: null,
        cpa: null,
        flaggedExpensive: false,
        note: `Nenhuma despesa encontrada com as palavras-chave: ${keywords.join(', ')}`,
      });
      continue;
    }

    const cpl = totalRegistered > 0 ? spend / totalRegistered : null;
    const cpa = visitorsWithCheckins > 0 ? spend / visitorsWithCheckins : null;

    const flaggedExpensive =
      cpaThreshold !== undefined &&
      cpa !== null &&
      cpa > cpaThreshold &&
      conversionRate > avgConversionRate;

    channels.push({
      channel: channelLabel,
      channels: groupChannels.map((c) => c.howDidYouKnow),
      totalRegistered,
      visitorsWithCheckins,
      conversionRate,
      spend: Math.round(spend * 100) / 100,
      cpl: cpl !== null ? Math.round(cpl * 100) / 100 : null,
      cpa: cpa !== null ? Math.round(cpa * 100) / 100 : null,
      flaggedExpensive,
      matchedExpenses: matchedCount,
    });
  }

  channels.sort((a, b) => {
    if (a.cpa === null && b.cpa === null) return 0;
    if (a.cpa === null) return 1;
    if (b.cpa === null) return -1;
    return a.cpa - b.cpa;
  });

  return { fairId, cpaThreshold: cpaThreshold ?? null, channels };
}

export function registerChannelTools(
  server: McpServer,
  dashboardService: DashboardService,
  expensesService: ExpensesService,
  user: McpRequestUser,
) {
  registerToolWithInput(
    server,
    'get_channel_performance',
    'Retorna, por canal de aquisição (campo "como conheceu a feira" do visitante), o total de cadastrados, total de check-ins, taxa de conversão cadastro→check-in e % do total de visitantes que aquele canal representa.',
    { fairId: z.string().describe('id da feira, obtido via list_fairs') },
    async ({ fairId }) => {
      assertFairAccess(user, fairId);
      return textResult(await getChannelPerformanceData(dashboardService, fairId));
    },
  );

  registerToolWithInput(
    server,
    'get_channel_cost_effectiveness',
    'Cruza o desempenho por canal de aquisição com as despesas financeiras da feira (categoria de despesa com o mesmo nome do canal) e retorna, por canal: custo por lead (CPL = investimento / cadastrados), custo por comparecimento (CPA = investimento / check-ins), ranqueados do mais barato ao mais caro. Canais sem despesa correspondente vêm com custo nulo. Se cpaThreshold for informado, sinaliza canais com alta conversão mas CPA acima do limite (eficazes porém caros).',
    {
      fairId: z.string().describe('id da feira, obtido via list_fairs'),
      cpaThreshold: z
        .number()
        .optional()
        .describe(
          'limite de custo por comparecimento (R$), opcional. Canais com conversão acima da média do conjunto e CPA acima desse valor são marcados com flaggedExpensive.',
        ),
    },
    async ({ fairId, cpaThreshold }) => {
      assertFairAccess(user, fairId);
      return textResult(
        await getChannelCostEffectivenessData(
          dashboardService,
          expensesService,
          fairId,
          cpaThreshold,
        ),
      );
    },
  );
}
