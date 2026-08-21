import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FairsService } from 'src/modules/fairs/fairs.service';
import { DashboardService } from 'src/modules/dashboard/dashboard.service';
import { ExpensesService } from 'src/modules/finance/expenses/expenses.service';
import { ChartsService } from 'src/modules/finance/charts/charts.service';
import { RevenueChartsService } from 'src/modules/finance/revenues/revenue-charts.service';
import {
  getChannelPerformanceData,
  getChannelCostEffectivenessData,
  ChannelPerformanceItem,
  ChannelCostItem,
} from './channel.tools';
import { textResult, registerToolWithInput } from './common';

const round2 = (n: number) => Math.round(n * 100) / 100;

function delta(current: number, baseline: number) {
  const abs = round2(current - baseline);
  const pct = baseline !== 0 ? round2((abs / baseline) * 100) : null;
  return { abs, pct };
}

async function fairSummary(fairsService: FairsService, fairId: string) {
  const fair = await fairsService.findOne(fairId);
  return {
    id: fair.id,
    name: fair.name,
    edition: fair.edition ?? null,
    city: fair.city ?? null,
    startDate: fair.startDate ?? null,
    endDate: fair.endDate ?? null,
  };
}

async function fairEditionSnapshot(
  fairsService: FairsService,
  dashboardService: DashboardService,
  chartsService: ChartsService,
  revenueChartsService: RevenueChartsService,
  fairId: string,
) {
  const [fair, overview, channels, kpi, revenueSummary] = await Promise.all([
    fairSummary(fairsService, fairId),
    dashboardService.getOverview(fairId),
    getChannelPerformanceData(dashboardService, fairId),
    chartsService.fairKpi(fairId),
    revenueChartsService.getExecutiveSummary(fairId),
  ]);

  if (!overview) {
    throw new Error(
      `Não foi possível calcular o overview da feira ${fairId} (erro interno ao consultar visitantes/check-ins)`,
    );
  }

  return { fair, overview, channels, kpi, revenueSummary };
}

export function registerMarketingInsightsTools(
  server: McpServer,
  fairsService: FairsService,
  dashboardService: DashboardService,
  expensesService: ExpensesService,
  chartsService: ChartsService,
  revenueChartsService: RevenueChartsService,
) {
  registerToolWithInput(
    server,
    'compare_fair_editions',
    'Compara duas edições de feira lado a lado: visitantes, check-ins, canais de aquisição e financeiro (receita/despesa/lucro), com delta absoluto e percentual. fairId = edição atual, compareToFairId = edição base da comparação (ex.: a edição anterior). Ambos os ids vêm de list_fairs.',
    {
      fairId: z
        .string()
        .describe('id da feira "atual" (a que está sendo avaliada)'),
      compareToFairId: z
        .string()
        .describe(
          'id da feira usada como base de comparação (ex.: edição anterior)',
        ),
    },
    async ({ fairId, compareToFairId }) => {
      const [current, baseline] = await Promise.all([
        fairEditionSnapshot(
          fairsService,
          dashboardService,
          chartsService,
          revenueChartsService,
          fairId,
        ),
        fairEditionSnapshot(
          fairsService,
          dashboardService,
          chartsService,
          revenueChartsService,
          compareToFairId,
        ),
      ]);

      const overview = {
        current: current.overview,
        baseline: baseline.overview,
        delta: {
          totalVisitors: delta(
            current.overview.totalVisitors,
            baseline.overview.totalVisitors,
          ),
          totalCheckIns: delta(
            current.overview.totalCheckIns,
            baseline.overview.totalCheckIns,
          ),
        },
      };

      const financial = {
        current: current.kpi,
        baseline: baseline.kpi,
        delta: {
          receitaTotalContrato: delta(
            current.kpi.receita.totalContrato,
            baseline.kpi.receita.totalContrato,
          ),
          despesasTotal: delta(
            current.kpi.despesas.total,
            baseline.kpi.despesas.total,
          ),
          lucroRealizado: delta(
            current.kpi.resultado.lucroRealizado,
            baseline.kpi.resultado.lucroRealizado,
          ),
          margemRealizada: delta(
            current.kpi.resultado.margemRealizada,
            baseline.kpi.resultado.margemRealizada,
          ),
          custoPorVisitante: delta(
            current.kpi.visitantes.custoPorVisitante,
            baseline.kpi.visitantes.custoPorVisitante,
          ),
        },
      };

      const channelNames = new Set([
        ...current.channels.channels.map((c) => c.channel),
        ...baseline.channels.channels.map((c) => c.channel),
      ]);

      const byChannel = (list: ChannelPerformanceItem[], name: string) =>
        list.find((c) => c.channel === name) ?? null;

      const channels = Array.from(channelNames).map((name) => {
        const cur = byChannel(current.channels.channels, name);
        const base = byChannel(baseline.channels.channels, name);
        return {
          channel: name,
          current: cur,
          baseline: base,
          delta:
            cur && base
              ? {
                  totalRegistered: delta(
                    cur.totalRegistered,
                    base.totalRegistered,
                  ),
                  conversionRate: delta(
                    cur.conversionRate,
                    base.conversionRate,
                  ),
                }
              : null,
        };
      });

      return textResult({
        fairs: { current: current.fair, baseline: baseline.fair },
        overview,
        financial: {
          current: financial.current,
          baseline: financial.baseline,
          delta: financial.delta,
        },
        revenueSummary: {
          current: current.revenueSummary,
          baseline: baseline.revenueSummary,
        },
        channels,
      });
    },
  );

  registerToolWithInput(
    server,
    'get_marketing_recommendations',
    'Gera recomendações por canal de aquisição para uma feira: quais canais aumentar, manter, reduzir ou testar (baseado em conversão e CPA relativos à média da própria feira), e uma estimativa de quando começar a campanha de cada canal na próxima edição, baseada em quando os cadastros começaram a chegar na edição anterior na mesma cidade (se existir).',
    { fairId: z.string().describe('id da feira, obtido via list_fairs') },
    async ({ fairId }) => {
      const [fair, performance, cost] = await Promise.all([
        fairSummary(fairsService, fairId),
        getChannelPerformanceData(dashboardService, fairId),
        getChannelCostEffectivenessData(
          dashboardService,
          expensesService,
          fairId,
        ),
      ]);

      const avgConversionRate =
        performance.channels.length > 0
          ? performance.channels.reduce((s, c) => s + c.conversionRate, 0) /
            performance.channels.length
          : 0;

      const channelsWithCpa = cost.channels.filter(
        (c): c is ChannelCostItem & { cpa: number } => c.cpa !== null,
      );
      const avgCpa =
        channelsWithCpa.length > 0
          ? channelsWithCpa.reduce((s, c) => s + c.cpa, 0) /
            channelsWithCpa.length
          : null;

      const volumeFloor = Math.max(10, performance.totalVisitors * 0.05);

      const costByChannel = new Map(cost.channels.map((c) => [c.channel, c]));

      const recommendations = performance.channels.map((p) => {
        const c = costByChannel.get(p.channel) ?? null;
        const cpa = c?.cpa ?? null;

        if (p.totalRegistered < volumeFloor) {
          return {
            channel: p.channel,
            action: 'testar' as const,
            reason: `Apenas ${p.totalRegistered} cadastros — volume baixo demais para avaliar com confiança (piso considerado: ${Math.round(volumeFloor)}).`,
            totalRegistered: p.totalRegistered,
            conversionRate: p.conversionRate,
            cpa,
          };
        }

        const goodConversion = p.conversionRate >= avgConversionRate;
        const cheapOrUnknownCost =
          cpa === null || avgCpa === null || cpa <= avgCpa;
        const expensiveCost = cpa !== null && avgCpa !== null && cpa > avgCpa;

        if (goodConversion && cheapOrUnknownCost) {
          return {
            channel: p.channel,
            action: 'aumentar' as const,
            reason: `Conversão de ${p.conversionRate}% está acima da média (${round2(avgConversionRate)}%)${cpa !== null ? ` e o CPA (R$ ${cpa}) está dentro da média` : ' e não há custo registrado que indique risco'}.`,
            totalRegistered: p.totalRegistered,
            conversionRate: p.conversionRate,
            cpa,
          };
        }

        if (!goodConversion && expensiveCost) {
          return {
            channel: p.channel,
            action: 'reduzir' as const,
            reason: `Conversão de ${p.conversionRate}% está abaixo da média (${round2(avgConversionRate)}%) e o CPA (R$ ${cpa}) está acima da média (R$ ${avgCpa !== null ? round2(avgCpa) : 'N/A'}).`,
            totalRegistered: p.totalRegistered,
            conversionRate: p.conversionRate,
            cpa,
          };
        }

        return {
          channel: p.channel,
          action: 'manter' as const,
          reason:
            'Desempenho e custo dentro da média — sem sinal claro para mudar o investimento.',
          totalRegistered: p.totalRegistered,
          conversionRate: p.conversionRate,
          cpa,
        };
      });

      const previousFair = await fairsService.findPreviousEdition(fairId);

      let whenToStart: unknown;
      if (!previousFair) {
        whenToStart = {
          note: 'Nenhuma edição anterior encontrada na mesma cidade — sem histórico para basear uma recomendação de timing.',
        };
      } else if (!previousFair.startDate) {
        whenToStart = {
          previousFairId: previousFair.id,
          previousFairName: previousFair.name,
          note: 'A edição anterior encontrada não tem data de início registrada — sem como calcular dias de antecedência.',
        };
      } else {
        const rampUp = await dashboardService.getFirstRegistrationByChannel(
          previousFair.id,
        );
        const previousStart = new Date(previousFair.startDate);

        const channels = rampUp.map((r) => {
          const firstRegistration = new Date(r.firstRegistrationDate);
          const daysBeforeEvent = Math.round(
            (previousStart.getTime() - firstRegistration.getTime()) /
              86_400_000,
          );
          const suggestedStartDate =
            fair.startDate && daysBeforeEvent >= 0
              ? new Date(
                  new Date(fair.startDate).getTime() -
                    daysBeforeEvent * 86_400_000,
                )
              : null;

          return {
            channel: r.howDidYouKnow,
            daysBeforeEventLastEdition: daysBeforeEvent,
            suggestedStartDate,
          };
        });

        whenToStart = {
          previousFairId: previousFair.id,
          previousFairName: previousFair.name,
          previousEventDate: previousFair.startDate,
          channels,
        };
      }

      return textResult({
        fairId,
        summary: {
          avgConversionRate: round2(avgConversionRate),
          avgCpa: avgCpa !== null ? round2(avgCpa) : null,
        },
        recommendations,
        whenToStart,
      });
    },
  );
}
