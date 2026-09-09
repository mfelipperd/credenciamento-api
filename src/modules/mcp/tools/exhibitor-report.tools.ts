import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FairsService } from 'src/modules/fairs/fairs.service';
import { DashboardService } from 'src/modules/dashboard/dashboard.service';
import { CheckInsService } from 'src/modules/checkins/checkins.service';
import { ExpensesService } from 'src/modules/finance/expenses/expenses.service';
import { ChartsService } from 'src/modules/finance/charts/charts.service';
import { RevenueChartsService } from 'src/modules/finance/revenues/revenue-charts.service';
import {
  getChannelPerformanceData,
  getChannelCostEffectivenessData,
} from './channel.tools';
import {
  fairSummary,
  getFairComparisonData,
  getMarketingRecommendationsData,
} from './marketing-insights.tools';
import { McpRequestUser } from '../oauth/mcp-auth.guard';
import { textResult, registerToolWithInput, assertFairAccess } from './common';

const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n: number) => `${n.toLocaleString('pt-BR')}%`;

const GLOSSARY = [
  {
    id: 'totalCadastrados',
    label: 'Total de cadastrados',
    explanation: 'Quantas pessoas se inscreveram para a feira antes do evento.',
  },
  {
    id: 'totalCheckins',
    label: 'Total de check-ins',
    explanation:
      'Quantas dessas pessoas realmente compareceram e passaram pela credencial.',
  },
  {
    id: 'showRate',
    label: 'Taxa de comparecimento (show rate)',
    formula: 'check-ins ÷ cadastros',
    explanation:
      'De cada 10 inscritos, quantos vieram de fato. Feiras costumam ficar entre 30% e 50% — é o padrão do setor, não um problema.',
  },
  {
    id: 'noShowRate',
    label: 'Taxa de no-show',
    formula: '1 − show rate',
    explanation:
      "Quanto do investimento em captação 'evapora' antes do evento.",
  },
  {
    id: 'cplPorCanal',
    label: 'Custo por lead (CPL) por canal',
    formula: 'investimento ÷ cadastros do canal',
    explanation:
      'Quanto custou, em média, cada pessoa cadastrada por aquele canal.',
  },
  {
    id: 'cpaPorCanal',
    label: 'Custo por comparecimento (CPA) por canal',
    formula: 'investimento ÷ check-ins do canal',
    explanation:
      'Quanto custou, em média, cada pessoa que de fato apareceu vinda daquele canal — a métrica mais realista, porque cadastro sem comparecimento não gera negócio.',
  },
  {
    id: 'roiEvento',
    label: 'ROI do evento (aproximado)',
    formula: '(receita − custo) ÷ custo × 100',
    explanation:
      'Retorno financeiro do evento como um todo. Eventos B2B costumam ficar entre 20% e 60% de ROI. Aproximado porque não atribuímos receita por canal individualmente — é a receita total da feira contra o total de despesas.',
  },
  {
    id: 'comparativoEdicaoAnterior',
    label: 'Comparativo com edição anterior',
    explanation:
      'Como os números desta edição se comparam com a edição passada na mesma cidade.',
  },
  {
    id: 'recomendacoes',
    label: 'Recomendações',
    explanation:
      'Quais canais reforçar, quais reduzir, e quando começar a campanha na próxima edição.',
  },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildReportHtml(data: {
  fair: { name: string; edition: string | null; city: string | null };
  overview: { totalVisitors: number; totalCheckIns: number };
  showRate: number;
  noShowRate: number;
  checkinsPerHour: {
    hours: string[];
    data: Array<{ name: string; data: number[] }>;
  };
  channelPerformance: Array<{
    channel: string;
    totalRegistered: number;
    conversionRate: number;
    percentOfTotal: number;
  }>;
  channelCost: Array<{
    channel: string;
    spend: number | null;
    cpl: number | null;
    cpa: number | null;
  }>;
  kpi: { despesas: { total: number }; receita: { totalContrato: number } };
  roi: number | null;
  comparison: Awaited<ReturnType<typeof getFairComparisonData>> | null;
  recommendations: Awaited<ReturnType<typeof getMarketingRecommendationsData>>;
}): string {
  const { fair, overview, showRate, noShowRate } = data;

  const glossaryRow = (id: string) => {
    const g = GLOSSARY.find((x) => x.id === id)!;
    return `<p class="glossary">${escapeHtml(g.explanation)}</p>`;
  };

  const checkinsPerHourRows = data.checkinsPerHour.hours
    .map((hour, hourIndex) => {
      const cells = data.checkinsPerHour.data
        .map((day) => `<td class="cell num">${day.data[hourIndex] ?? 0}</td>`)
        .join('');
      return `<tr class="table-row"><td class="cell">${hour}</td>${cells}</tr>`;
    })
    .join('');

  const checkinsPerHourHeader = data.checkinsPerHour.data
    .map((day) => `<th class="header-cell num">${escapeHtml(day.name)}</th>`)
    .join('');

  const channelPerformanceRows = data.channelPerformance
    .map(
      (c) => `
      <tr>
        <td class="cell">${escapeHtml(c.channel)}</td>
        <td class="cell num">${c.totalRegistered}</td>
        <td class="cell num">${pct(c.conversionRate)}</td>
        <td class="cell num">${pct(c.percentOfTotal)}</td>
      </tr>`,
    )
    .join('');

  const channelCostRows = data.channelCost
    .map(
      (c) => `
      <tr>
        <td class="cell">${escapeHtml(c.channel)}</td>
        <td class="cell num">${c.spend !== null ? money(c.spend) : '—'}</td>
        <td class="cell num">${c.cpl !== null ? money(c.cpl) : '—'}</td>
        <td class="cell num">${c.cpa !== null ? money(c.cpa) : '—'}</td>
      </tr>`,
    )
    .join('');

  const recommendationRows = data.recommendations.recommendations
    .map(
      (r) => `
      <tr>
        <td class="cell">${escapeHtml(r.channel)}</td>
        <td class="cell action-${r.action}">${r.action.toUpperCase()}</td>
        <td class="cell">${escapeHtml(r.reason)}</td>
      </tr>`,
    )
    .join('');

  const comparisonSection = data.comparison
    ? `
    <div class="section">
      <h2>Comparativo com edição anterior</h2>
      ${glossaryRow('comparativoEdicaoAnterior')}
      <table class="table-container">
        <thead><tr class="table-header">
          <th class="header-cell">Métrica</th>
          <th class="header-cell num">${escapeHtml(data.comparison.fairs.baseline.name)}</th>
          <th class="header-cell num">${escapeHtml(data.comparison.fairs.current.name)}</th>
          <th class="header-cell num">Variação</th>
        </tr></thead>
        <tbody>
          <tr class="table-row">
            <td class="cell">Total de cadastrados</td>
            <td class="cell num">${data.comparison.overview.baseline.totalVisitors}</td>
            <td class="cell num">${data.comparison.overview.current.totalVisitors}</td>
            <td class="cell num">${data.comparison.overview.delta.totalVisitors.abs >= 0 ? '+' : ''}${data.comparison.overview.delta.totalVisitors.abs}</td>
          </tr>
          <tr class="table-row">
            <td class="cell">Total de check-ins</td>
            <td class="cell num">${data.comparison.overview.baseline.totalCheckIns}</td>
            <td class="cell num">${data.comparison.overview.current.totalCheckIns}</td>
            <td class="cell num">${data.comparison.overview.delta.totalCheckIns.abs >= 0 ? '+' : ''}${data.comparison.overview.delta.totalCheckIns.abs}</td>
          </tr>
          <tr class="table-row">
            <td class="cell">Lucro realizado</td>
            <td class="cell num">${money(data.comparison.financial.baseline.resultado.lucroRealizado)}</td>
            <td class="cell num">${money(data.comparison.financial.current.resultado.lucroRealizado)}</td>
            <td class="cell num">${data.comparison.financial.delta.lucroRealizado.abs >= 0 ? '+' : ''}${money(data.comparison.financial.delta.lucroRealizado.abs)}</td>
          </tr>
        </tbody>
      </table>
    </div>`
    : `
    <div class="section">
      <h2>Comparativo com edição anterior</h2>
      ${glossaryRow('comparativoEdicaoAnterior')}
      <p class="empty-note">Nenhuma edição anterior encontrada na mesma cidade para comparar.</p>
    </div>`;

  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <title>Relatório do Expositor - ${escapeHtml(fair.name)}</title>
    <style>
      @page { size: A4 landscape; margin: 15mm; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; color: #14293D; margin: 0; padding: 15px; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      h2 { font-size: 15px; margin: 0 0 6px; border-bottom: 1px solid #E4E4E7; padding-bottom: 4px; }
      .subtitle { color: #71717A; font-size: 12px; margin: 0 0 20px; }
      .section { margin-bottom: 24px; page-break-inside: avoid; }
      .kpi-row { display: flex; gap: 16px; margin-bottom: 8px; flex-wrap: wrap; }
      .kpi-card { border: 1px solid #E4E4E7; border-radius: 6px; padding: 10px 14px; min-width: 140px; }
      .kpi-card .value { font-size: 18px; font-weight: bold; }
      .kpi-card .label { font-size: 10px; color: #71717A; }
      .glossary { font-size: 10px; color: #71717A; margin: 0 0 8px; font-style: italic; }
      .empty-note { font-size: 11px; color: #71717A; }
      .table-container { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      .table-header { background-color: #FAFAFA; border-bottom: 1px solid #E4E4E7; }
      .table-row { border-bottom: 1px solid #E4E4E7; }
      .cell { font-size: 10px; padding: 5px 6px; vertical-align: top; }
      .header-cell { font-size: 10px; font-weight: bold; color: #71717A; padding: 5px 6px; text-align: left; }
      .num { text-align: right; }
      .action-aumentar { color: #16794c; font-weight: bold; }
      .action-reduzir { color: #b42318; font-weight: bold; }
      .action-testar { color: #b54708; font-weight: bold; }
      .action-manter { color: #475467; font-weight: bold; }
    </style>
  </head>
  <body>
    <h1>Relatório do Expositor — ${escapeHtml(fair.name)}${fair.edition ? ` (${escapeHtml(fair.edition)})` : ''}</h1>
    <p class="subtitle">${fair.city ? escapeHtml(fair.city) + ' — ' : ''}Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>

    <div class="section">
      <h2>Visão geral</h2>
      <div class="kpi-row">
        <div class="kpi-card"><div class="value">${overview.totalVisitors}</div><div class="label">Total de cadastrados</div></div>
        <div class="kpi-card"><div class="value">${overview.totalCheckIns}</div><div class="label">Total de check-ins</div></div>
        <div class="kpi-card"><div class="value">${pct(showRate)}</div><div class="label">Show rate</div></div>
        <div class="kpi-card"><div class="value">${pct(noShowRate)}</div><div class="label">Taxa de no-show</div></div>
        <div class="kpi-card"><div class="value">${data.roi !== null ? pct(data.roi) : '—'}</div><div class="label">ROI do evento (aprox.)</div></div>
      </div>
      ${glossaryRow('totalCadastrados')}
      ${glossaryRow('totalCheckins')}
      ${glossaryRow('showRate')}
      ${glossaryRow('noShowRate')}
      ${glossaryRow('roiEvento')}
    </div>

    <div class="section">
      <h2>Distribuição de check-ins por hora</h2>
      ${
        data.checkinsPerHour.data.length > 0
          ? `<table class="table-container">
        <thead><tr class="table-header">
          <th class="header-cell">Horário</th>
          ${checkinsPerHourHeader}
        </tr></thead>
        <tbody>${checkinsPerHourRows}</tbody>
      </table>`
          : '<p class="empty-note">Nenhum check-in registrado ainda.</p>'
      }
    </div>

    <div class="section">
      <h2>Desempenho por canal</h2>
      <table class="table-container">
        <thead><tr class="table-header">
          <th class="header-cell">Canal</th>
          <th class="header-cell num">Cadastrados</th>
          <th class="header-cell num">Conversão</th>
          <th class="header-cell num">% do total</th>
        </tr></thead>
        <tbody>${channelPerformanceRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Custo por canal (CPL / CPA)</h2>
      ${glossaryRow('cplPorCanal')}
      ${glossaryRow('cpaPorCanal')}
      <table class="table-container">
        <thead><tr class="table-header">
          <th class="header-cell">Canal</th>
          <th class="header-cell num">Investimento</th>
          <th class="header-cell num">CPL</th>
          <th class="header-cell num">CPA</th>
        </tr></thead>
        <tbody>${channelCostRows}</tbody>
      </table>
    </div>

    ${comparisonSection}

    <div class="section">
      <h2>Recomendações</h2>
      ${glossaryRow('recomendacoes')}
      <table class="table-container">
        <thead><tr class="table-header">
          <th class="header-cell">Canal</th>
          <th class="header-cell">Ação</th>
          <th class="header-cell">Motivo</th>
        </tr></thead>
        <tbody>${recommendationRows}</tbody>
      </table>
    </div>
  </body>
  </html>`;
}

export function registerExhibitorReportTools(
  server: McpServer,
  fairsService: FairsService,
  dashboardService: DashboardService,
  checkInsService: CheckInsService,
  expensesService: ExpensesService,
  chartsService: ChartsService,
  revenueChartsService: RevenueChartsService,
  user: McpRequestUser,
) {
  registerToolWithInput(
    server,
    'generate_exhibitor_report',
    'Gera um relatório completo da feira para o expositor: visão geral, distribuição de check-ins por hora, desempenho por canal, CPL/CPA por canal, comparativo com a edição anterior (se existir) e recomendações — com glossário explicando cada índice em linguagem simples. Retorna os dados estruturados e um HTML pronto para impressão/PDF (o consumidor da tool decide como renderizar/converter).',
    { fairId: z.string().describe('id da feira, obtido via list_fairs') },
    async ({ fairId }) => {
      assertFairAccess(user, fairId);
      const [
        fair,
        overview,
        checkinsPerHour,
        channelPerformance,
        channelCost,
        kpi,
        recommendations,
      ] = await Promise.all([
        fairSummary(fairsService, fairId),
        dashboardService.getOverview(fairId),
        checkInsService.getCheckinsPerHour(fairId),
        getChannelPerformanceData(dashboardService, fairId),
        getChannelCostEffectivenessData(
          dashboardService,
          expensesService,
          fairId,
        ),
        chartsService.fairKpi(fairId),
        getMarketingRecommendationsData(
          fairsService,
          dashboardService,
          expensesService,
          fairId,
        ),
      ]);

      if (!overview) {
        throw new Error(
          `Não foi possível calcular o overview da feira ${fairId} (erro interno ao consultar visitantes/check-ins)`,
        );
      }

      const showRate =
        overview.totalVisitors > 0
          ? round2((overview.totalCheckIns / overview.totalVisitors) * 100)
          : 0;
      const noShowRate = round2(100 - showRate);
      const roi =
        kpi.despesas.total > 0
          ? round2(
              ((kpi.receita.totalContrato - kpi.despesas.total) /
                kpi.despesas.total) *
                100,
            )
          : null;

      const previousFair = await fairsService.findPreviousEdition(fairId);
      const comparison = previousFair
        ? await getFairComparisonData(
            fairsService,
            dashboardService,
            chartsService,
            revenueChartsService,
            fairId,
            previousFair.id,
          )
        : null;

      const html = buildReportHtml({
        fair,
        overview,
        showRate,
        noShowRate,
        checkinsPerHour,
        channelPerformance: channelPerformance.channels,
        channelCost: channelCost.channels,
        kpi,
        roi,
        comparison,
        recommendations,
      });

      return textResult({
        fairId,
        generatedAt: new Date().toISOString(),
        fair,
        overview,
        showRate,
        noShowRate,
        roi,
        checkinsPerHour,
        channelPerformance: channelPerformance.channels,
        channelCost: channelCost.channels,
        financial: kpi,
        comparison,
        recommendations,
        glossary: GLOSSARY,
        html,
      });
    },
  );
}
