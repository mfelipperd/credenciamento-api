import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DashboardService } from 'src/modules/dashboard/dashboard.service';
import { ExpensesService } from 'src/modules/finance/expenses/expenses.service';
import { McpRequestUser } from '../oauth/mcp-auth.guard';
import { textResult, registerToolWithInput, assertFairAccess } from './common';

const normalize = (value: string) => value.trim().toLowerCase();

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

export interface ChannelCostItem {
  channel: string;
  totalRegistered: number;
  visitorsWithCheckins: number;
  conversionRate: number;
  spend: number | null;
  cpl: number | null;
  cpa: number | null;
  flaggedExpensive: boolean;
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
  const [{ conversions }, spendByCategory] = await Promise.all([
    dashboardService.getConversionsByHowDidYouKnow(fairId),
    expensesService.getTotalByCategoryWithNames(fairId),
  ]);

  const spendByName = new Map<string, number>();
  for (const s of spendByCategory) {
    if (!s.categoryName) continue;
    spendByName.set(normalize(s.categoryName), Number(s.total));
  }

  const avgConversionRate =
    conversions.length > 0
      ? conversions.reduce((sum, c) => sum + c.conversionRate, 0) /
        conversions.length
      : 0;

  const channels: ChannelCostItem[] = conversions.map((c) => {
    const spend = spendByName.get(normalize(c.howDidYouKnow ?? ''));

    if (spend === undefined) {
      return {
        channel: c.howDidYouKnow,
        totalRegistered: c.totalRegistered,
        visitorsWithCheckins: c.visitorsWithCheckins,
        conversionRate: c.conversionRate,
        spend: null,
        cpl: null,
        cpa: null,
        flaggedExpensive: false,
        note: 'Nenhuma despesa com esse nome encontrada nas categorias financeiras da feira',
      };
    }

    const cpl = c.totalRegistered > 0 ? spend / c.totalRegistered : null;
    const cpa =
      c.visitorsWithCheckins > 0 ? spend / c.visitorsWithCheckins : null;

    const flaggedExpensive =
      cpaThreshold !== undefined &&
      cpa !== null &&
      cpa > cpaThreshold &&
      c.conversionRate > avgConversionRate;

    return {
      channel: c.howDidYouKnow,
      totalRegistered: c.totalRegistered,
      visitorsWithCheckins: c.visitorsWithCheckins,
      conversionRate: c.conversionRate,
      spend,
      cpl: cpl !== null ? Math.round(cpl * 100) / 100 : null,
      cpa: cpa !== null ? Math.round(cpa * 100) / 100 : null,
      flaggedExpensive,
    };
  });

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
